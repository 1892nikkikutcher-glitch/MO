"use client";

/** "Registrar atención de hoy" — contenedor de las 6 secciones guiadas que
 * sustituyen el formulario PSOAP visible (ver el plan de rediseño, V4).
 * Decide CON QUÉ nota arrancar (recuperar un borrador existente, avisar de
 * un duplicado, o empezar una nueva) — y con qué estado de sincronización
 * (existe en Firestore / cuál es la última revisión que este dispositivo
 * conoce) — y delega el ciclo de vida de esa nota concreta a
 * `useAutoguardadoNota`. */

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { Recurso } from "@/lib/patientData";
import { buscarBorradorLocalPorCita, buscarBorradorLocalPorPaciente } from "@/lib/borradorLocalNota";
import { detectarConflictoBorrador, type RegistroBorradorLocal } from "@/lib/borradorLocalNotaPuro";
import {
  citaIdDeNota,
  esNotaV2,
  estadoSeccion,
  normalizarRevision,
  notaEvolucionV2Inicial,
  obtenerFaltantesNota,
  type EncabezadoNota,
  type NotaEvolucionV2,
  type SeccionNota,
} from "@/lib/notasEvolucion";
import { useAutoguardadoNota, type EstadoSincronizacionInicial } from "./useAutoguardadoNota";
import { botonPrimario, botonSecundario, EstadoGuardadoIndicador, SeccionAcordeon } from "./NotaUI";
import NotaAdministrativaRapida from "./NotaAdministrativaRapida";
import SeccionComoLlega from "./SeccionComoLlega";
import SeccionQueEncontraste from "./SeccionQueEncontraste";
import SeccionDiagnostico from "./SeccionDiagnostico";
import SeccionProcedimiento from "./SeccionProcedimiento";
import SeccionEstadoFinal from "./SeccionEstadoFinal";
import SeccionIndicaciones from "./SeccionIndicaciones";

const ESTATUS_CITA_SIN_ATENDER = ["Cancelada", "Reagendada", "No Asistió"] as const;

const seccionesOrden: { id: SeccionNota; titulo: string }[] = [
  { id: "como_llega", titulo: "¿Cómo llega hoy?" },
  { id: "que_encontraste", titulo: "¿Qué encontraste?" },
  { id: "diagnostico", titulo: "Diagnóstico" },
  { id: "procedimiento", titulo: "¿Qué hiciste hoy?" },
  { id: "estado_final", titulo: "¿Cómo terminó el paciente?" },
  { id: "indicaciones", titulo: "Indicaciones y siguiente paso" },
];

function formatFechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** Nota con la que arranca el formulario + lo que este dispositivo sabe de
 * su relación con Firestore (si ya existe ahí, y cuál fue la última
 * revisión que confirmamos sincronizada) — nunca se separan en dos estados
 * independientes para que no puedan desincronizarse entre sí. */
type ArranqueNota = { nota: NotaEvolucionV2; sincronizacion: EstadoSincronizacionInicial };

export default function RegistrarAtencionHoy({
  patientId,
  citaId,
  onFirmada,
  onGuardado,
}: {
  patientId: string;
  citaId?: string | null;
  onFirmada: (notaId: string) => void;
  onGuardado: () => void;
}) {
  const { clinicUid, miUid, patients, recursos, citas, clinicInfo, notasEvolucionPorPaciente } = usePatientData();

  const [fase, setFase] = useState<"buscando" | "recuperar" | "duplicado" | "editando">("buscando");
  const [registroLocal, setRegistroLocal] = useState<RegistroBorradorLocal | null>(null);
  const [notaFirestoreExistente, setNotaFirestoreExistente] = useState<NotaEvolucionV2 | null>(null);
  const [hayConflicto, setHayConflicto] = useState(false);
  const [arranqueNota, setArranqueNota] = useState<ArranqueNota | null>(null);
  const [forzarNueva, setForzarNueva] = useState(false);
  const [notaCompletaForzada, setNotaCompletaForzada] = useState(false);

  const paciente = patients.find((p) => p.id === patientId);
  const medicos = useMemo(() => recursos.filter((r) => r.tipo === "medico"), [recursos]);
  const cita = citaId ? citas.find((c) => c.id === citaId) : undefined;

  // Sugerencia inicial de "quién atiende" — nunca un valor fijo de perfil:
  // prioriza el médico de LA cita de esta nota (si viene de Agenda), luego
  // el de la cita más cercana del paciente, y solo al final el primer
  // médico dado de alta. Siempre editable después desde el encabezado de
  // la nota (ver el <select> en FormularioNota) — esto es solo el punto de
  // partida.
  const medico = useMemo(() => {
    if (cita?.medicoId) {
      const nombre = recursos.find((r) => r.id === cita.medicoId)?.nombre;
      if (nombre) return nombre;
    }
    const hoyISO = new Date().toISOString().slice(0, 10);
    const citasPaciente = citas.filter((c) => c.patientId === patientId && c.estatus !== "Cancelada");
    const proxima = citasPaciente
      .filter((c) => c.fecha >= hoyISO)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))[0];
    const pasada = citasPaciente.filter((c) => c.fecha < hoyISO).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const citaRelevante = proxima ?? pasada;
    const nombreSugerido = citaRelevante?.medicoId ? recursos.find((r) => r.id === citaRelevante.medicoId)?.nombre : undefined;
    return nombreSugerido || medicos[0]?.nombre || "";
  }, [cita, citas, recursos, patientId, medicos]);

  const encabezado: EncabezadoNota = useMemo(
    () => ({
      patientId,
      pacienteNombreSnapshot: paciente?.name ?? "",
      citaId: citaId ?? null,
      // Nunca `undefined` explícito aquí — Firestore rechaza ese valor en
      // setDoc ("Unsupported field value: undefined"). No depende de la
      // opción `ignoreUndefinedProperties` del cliente de Firestore (que en
      // la práctica puede no estar activa si ese Firestore cayó a su
      // configuración de respaldo, ver firebase.ts) — el campo simplemente
      // nunca toma ese valor.
      motivoAgendadoSnapshot: cita ? [cita.tratamientos.join(", "), cita.comentarios].filter(Boolean).join(" — ") : "",
      clinicaNombreSnapshot: clinicInfo?.nombre ?? "",
      medico,
      organosDentales: [],
    }),
    [patientId, paciente?.name, citaId, cita, clinicInfo?.nombre, medico]
  );

  function notaNuevaComoArranque(): ArranqueNota {
    return {
      nota: notaEvolucionV2Inicial(encabezado, "rapido", miUid),
      sincronizacion: { existeEnFirestore: false, ultimaRevisionSincronizada: 0 },
    };
  }

  // Búsqueda de recuperación/duplicado — solo al montar (o si cambia de
  // paciente/cita), nunca se repite mientras se edita.
  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      if (!clinicUid || forzarNueva) {
        setFase("editando");
        return;
      }
      setFase("buscando");
      try {
        // IndexedDB puede fallar (modo privado, cuota llena, navegador
        // viejo) — si eso pasa, nunca debe dejar al usuario atorado sin
        // poder escribir su nota; se sigue con la búsqueda solo en
        // Firestore y, si tampoco hay nada ahí, se empieza una nueva.
        let local = null;
        try {
          local = citaId
            ? await buscarBorradorLocalPorCita(clinicUid, citaId)
            : await buscarBorradorLocalPorPaciente(clinicUid, patientId);
        } catch (err) {
          console.error("No se pudo consultar el borrador local (IndexedDB) — se continúa sin él", err);
        }
        if (cancelado) return;

        const remotaVigente = (notasEvolucionPorPaciente[patientId] ?? []).find(
          (n): n is NotaEvolucionV2 =>
            "version" in n &&
            n.version === 2 &&
            n.estado !== "firmada" &&
            (citaId ? n.encabezado.citaId === citaId : true)
        );

        if (!local && !remotaVigente) {
          setArranqueNota(notaNuevaComoArranque());
          setFase("editando");
          return;
        }

        setRegistroLocal(local);
        setNotaFirestoreExistente(remotaVigente ? normalizarRevision(remotaVigente) : null);

        // El chequeo de conflicto por revisión solo tiene sentido cuando el
        // local y el remoto son LA MISMA nota (mismo notaId) — si son
        // borradores distintos del mismo paciente, no es un conflicto de
        // revisión, es simplemente que hay más de un borrador (la pantalla
        // "duplicado" ya cubre ese caso a otro nivel).
        if (local && remotaVigente && local.notaId === remotaVigente.id) {
          const conflicto = detectarConflictoBorrador(
            { ultimaRevisionSincronizada: local.metadataLocal.sincronizacion?.ultimaRevisionSincronizada ?? 0 },
            { revision: normalizarRevision(remotaVigente).revision }
          );
          setHayConflicto(conflicto.hayConflicto);
        } else {
          setHayConflicto(false);
        }

        setFase(citaId && (local || remotaVigente) ? "duplicado" : "recuperar");
      } catch (err) {
        // Última red de seguridad: cualquier error inesperado en la
        // búsqueda de recuperación jamás debe impedir registrar la
        // atención de hoy — se empieza una nota nueva en vez de dejar la
        // pantalla atorada en "Buscando…".
        console.error("Error inesperado buscando borradores previos — se inicia una nota nueva", err);
        if (!cancelado) {
          setArranqueNota(notaNuevaComoArranque());
          setFase("editando");
        }
      }
    }
    void buscar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicUid, patientId, citaId, forzarNueva]);

  function continuarBorrador(usarRemoto: boolean) {
    if (usarRemoto && notaFirestoreExistente) {
      setArranqueNota({
        nota: notaFirestoreExistente,
        sincronizacion: { existeEnFirestore: true, ultimaRevisionSincronizada: notaFirestoreExistente.revision },
      });
    } else if (registroLocal) {
      // "¿Existe ya en Firestore?" se responde buscando por el ID EXACTO de
      // este borrador local en la copia ya sincronizada en memoria — no
      // comparando contra `notaFirestoreExistente` (que puede ser un
      // documento vigente DISTINTO del mismo paciente/cita). Así no
      // depende de metadata local legada que pudiera faltar.
      const notaRemotaDeEsteBorrador = (notasEvolucionPorPaciente[patientId] ?? []).find(
        (n): n is NotaEvolucionV2 => "version" in n && n.version === 2 && n.id === registroLocal.notaId
      );
      setArranqueNota({
        nota: normalizarRevision(registroLocal.nota),
        sincronizacion: {
          existeEnFirestore: !!notaRemotaDeEsteBorrador,
          ultimaRevisionSincronizada: registroLocal.metadataLocal.sincronizacion?.ultimaRevisionSincronizada ?? 0,
        },
      });
    } else if (notaFirestoreExistente) {
      setArranqueNota({
        nota: notaFirestoreExistente,
        sincronizacion: { existeEnFirestore: true, ultimaRevisionSincronizada: notaFirestoreExistente.revision },
      });
    } else {
      setArranqueNota(notaNuevaComoArranque());
    }
    setFase("editando");
  }

  function empezarNueva() {
    setForzarNueva(true);
    setArranqueNota(notaNuevaComoArranque());
    setFase("editando");
  }

  // Cita Cancelada/Reagendada/No Asistió sin ninguna nota todavía: el
  // formulario clínico de 6 secciones no aplica (nunca hubo atención que
  // documentar) — se ofrece una nota corta en su lugar. También se ofrece
  // si lo único que existe es un borrador v2 SIN FIRMAR (alguien empezó el
  // formulario completo, típicamente escribió el motivo en "¿Cómo llega
  // hoy?", y quiere terminar ahí) — un borrador nunca es parte del
  // expediente definitivo, así que cambiar de flujo en ese punto es seguro.
  // Si ya existe una nota FIRMADA/lista_revision, o hay más de una nota
  // para esta cita, o el usuario pidió explícitamente el formulario
  // completo, se sigue el flujo normal de abajo sin interrumpirlo.
  const notasDeEstaCita = citaId
    ? (notasEvolucionPorPaciente[patientId] ?? []).filter((n) => citaIdDeNota(n) === citaId)
    : [];
  const borradorV2Descartable =
    notasDeEstaCita.length === 1 && esNotaV2(notasDeEstaCita[0]) && notasDeEstaCita[0].estado === "borrador"
      ? notasDeEstaCita[0]
      : null;
  const citaSinAtender = !!cita && (ESTATUS_CITA_SIN_ATENDER as readonly string[]).includes(cita.estatus);
  // `fase !== "editando"` es a propósito: una vez que el usuario ya está
  // escribiendo en el formulario completo (llegó ahí por su cuenta o por
  // "Necesito una nota clínica completa"), esta oferta nunca debe
  // reaparecer a medio re-render y sacarlo de lo que está escribiendo.
  const puedeOfrecerNotaRapida =
    fase !== "editando" && citaSinAtender && (notasDeEstaCita.length === 0 || !!borradorV2Descartable);

  if (citaId && cita && puedeOfrecerNotaRapida && !notaCompletaForzada) {
    return (
      <NotaAdministrativaRapida
        patientId={patientId}
        citaId={citaId}
        cita={cita}
        notaLibreSugerida={borradorV2Descartable?.comoLlegaHoy.textoLibre}
        onGuardado={onGuardado}
        onQuiereNotaCompleta={() => setNotaCompletaForzada(true)}
      />
    );
  }

  if (fase === "buscando") {
    return <p className="text-sm text-ink/50">Buscando atenciones en progreso…</p>;
  }

  if (fase === "duplicado") {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
        <h3 className="mb-2 text-sm font-semibold text-ink">Ya existe una nota en progreso para esta atención</h3>
        <p className="mb-4 text-sm text-ink/60">Evita capturar la misma atención dos veces sin querer.</p>
        <div className="flex gap-2">
          <button onClick={() => continuarBorrador(!!notaFirestoreExistente)} className={botonPrimario}>
            Continuar nota
          </button>
          <button onClick={empezarNueva} className={botonSecundario}>
            Crear otra nota
          </button>
        </div>
      </div>
    );
  }

  if (fase === "recuperar") {
    const base = notaFirestoreExistente ?? registroLocal?.nota;
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <h3 className="mb-2 text-sm font-semibold text-ink">Hay una atención pendiente</h3>
        <div className="mb-4 space-y-1 text-sm text-ink/70">
          <p>Paciente: {base?.encabezado.pacienteNombreSnapshot}</p>
          {base?.detalleProcedimiento?.actividadRealizada && <p>Actividad: {base.detalleProcedimiento.actividadRealizada}</p>}
          <p>Iniciada: {base && formatFechaHora(base.creadoEn)}</p>
          <p>Último cambio: {base && formatFechaHora(base.actualizadoEn)}</p>
        </div>
        {hayConflicto && (
          <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            Encontramos cambios en Firestore (otra sesión/dispositivo) que este dispositivo no sincronizó.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {hayConflicto ? (
            <>
              <button onClick={() => continuarBorrador(true)} className={botonPrimario}>
                Usar versión más reciente
              </button>
              <button onClick={() => continuarBorrador(false)} className={botonSecundario}>
                Revisar la de este dispositivo
              </button>
            </>
          ) : (
            <button onClick={() => continuarBorrador(!!notaFirestoreExistente)} className={botonPrimario}>
              Continuar atención
            </button>
          )}
          <button onClick={empezarNueva} className="text-xs text-ink/40 hover:text-danger">
            Descartar borrador
          </button>
        </div>
      </div>
    );
  }

  if (!arranqueNota) return null;

  return (
    <FormularioNota
      patientId={patientId}
      citaId={citaId}
      notaInicial={arranqueNota.nota}
      arranqueSincronizacion={arranqueNota.sincronizacion}
      tratamientosSugeridos={cita?.tratamientos ?? []}
      medicos={medicos}
      onFirmada={onFirmada}
      onGuardado={onGuardado}
    />
  );
}

function ComparacionNota({ nota, titulo }: { nota: NotaEvolucionV2; titulo: string }) {
  return (
    <div className="rounded-lg border border-edge/10 bg-field p-3 text-xs text-ink/70">
      <p className="mb-1 font-semibold text-ink/80">{titulo}</p>
      <p>Actividad: {nota.detalleProcedimiento?.actividadRealizada || "—"}</p>
      <p>Estado final: {nota.estadoFinal?.chips?.join(", ") || "—"}</p>
      <p>Revisión: {nota.revision}</p>
      <p>Última actualización: {formatFechaHora(nota.actualizadoEn)}</p>
    </div>
  );
}

function FormularioNota({
  patientId,
  citaId,
  notaInicial,
  arranqueSincronizacion,
  tratamientosSugeridos,
  medicos,
  onFirmada,
  onGuardado,
}: {
  patientId: string;
  citaId?: string | null;
  notaInicial: NotaEvolucionV2;
  arranqueSincronizacion: EstadoSincronizacionInicial;
  tratamientosSugeridos: string[];
  medicos: Recurso[];
  onFirmada: (notaId: string) => void;
  onGuardado: () => void;
}) {
  const {
    nota,
    registrarCambio,
    flushInmediato,
    seccionActiva,
    irASeccion,
    estadoGuardado,
    reintentarSincronizacion,
    firmar,
    firmando,
    guardarYSalir,
    conflictoRemoto,
    resolverUsarRemoto,
    resolverMantenerComoCopia,
  } = useAutoguardadoNota(patientId, citaId, notaInicial, arranqueSincronizacion);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [revisandoConflicto, setRevisandoConflicto] = useState(false);
  const [resolviendoConflicto, setResolviendoConflicto] = useState(false);
  const [errorConflicto, setErrorConflicto] = useState<string | null>(null);

  const faltantes = obtenerFaltantesNota(nota);

  // El médico que atiende SIEMPRE queda editable — el valor inicial es solo
  // una sugerencia (ver el cálculo en RegistrarAtencionHoy), nunca un dato
  // fijo. Es una selección estructurada (§7.2.1 del plan) — se persiste de
  // inmediato.
  function cambiarMedico(nombre: string) {
    registrarCambio((prev) => ({ ...prev, encabezado: { ...prev.encabezado, medico: nombre } }), { inmediato: true });
  }

  async function onFirmar() {
    setErrorFirma(null);
    const resultado = await firmar();
    if (resultado.ok) {
      setConfirmando(false);
      onFirmada(nota.id);
    } else {
      setErrorFirma(resultado.error);
    }
  }

  async function onGuardarYSalir() {
    setErrorGuardado(null);
    setGuardando(true);
    const resultado = await guardarYSalir();
    setGuardando(false);
    if (resultado.ok) {
      onGuardado();
    } else {
      // El borrador ya quedó protegido localmente (ver guardarYSalir) — se
      // avisa del error de sincronización y se deja decidir al usuario si
      // sale de todas formas, en vez de ocultar el problema saliendo solo.
      setErrorGuardado(resultado.error);
    }
  }

  async function onMantenerComoCopia() {
    setErrorConflicto(null);
    setResolviendoConflicto(true);
    const resultado = await resolverMantenerComoCopia();
    setResolviendoConflicto(false);
    if (!resultado.ok) setErrorConflicto(resultado.error);
    else setRevisandoConflicto(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-ink/60">
          <span className="font-medium text-ink">{nota.encabezado.pacienteNombreSnapshot}</span>
          {nota.encabezado.motivoAgendadoSnapshot && <span> · {nota.encabezado.motivoAgendadoSnapshot}</span>}
        </div>
        <EstadoGuardadoIndicador estado={estadoGuardado} onReintentar={reintentarSincronizacion} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-ink/50">Atiende:</label>
        {medicos.length > 0 ? (
          <select
            value={nota.encabezado.medico}
            onChange={(e) => cambiarMedico(e.target.value)}
            className="rounded-lg border border-edge/10 bg-field px-2 py-1 text-sm text-ink outline-none focus:border-accent/60"
          >
            {!medicos.some((m) => m.nombre === nota.encabezado.medico) && nota.encabezado.medico && (
              <option value={nota.encabezado.medico}>{nota.encabezado.medico}</option>
            )}
            {!nota.encabezado.medico && <option value="">Sin asignar</option>}
            {medicos.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={nota.encabezado.medico}
            onChange={(e) => cambiarMedico(e.target.value)}
            placeholder="Nombre de quien atiende"
            className="rounded-lg border border-edge/10 bg-field px-2 py-1 text-sm text-ink outline-none focus:border-accent/60"
          />
        )}
      </div>

      {conflictoRemoto && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <h3 className="mb-1 text-sm font-semibold text-danger">Encontramos cambios realizados desde otra sesión</h3>
          <p className="mb-3 text-xs text-ink/60">
            Otra sesión o dispositivo guardó cambios en esta nota que este dispositivo no conoce. Para no perder información de
            ninguno de los dos lados, no se sobrescribe automáticamente.
          </p>
          {revisandoConflicto && (
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ComparacionNota nota={nota} titulo="Tu borrador (este dispositivo)" />
              <ComparacionNota nota={conflictoRemoto} titulo="Versión remota (otra sesión)" />
            </div>
          )}
          {errorConflicto && <p className="mb-2 text-xs text-danger">{errorConflicto}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRevisandoConflicto((v) => !v)} className={botonSecundario}>
              {revisandoConflicto ? "Ocultar comparación" : "Revisar cambios"}
            </button>
            <button onClick={resolverUsarRemoto} className={botonSecundario}>
              Usar versión remota
            </button>
            <button onClick={onMantenerComoCopia} disabled={resolviendoConflicto} className={botonPrimario}>
              {resolviendoConflicto ? "Guardando copia…" : "Mantener mi borrador como copia separada"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <SeccionAcordeon
          id="como_llega"
          titulo="¿Cómo llega hoy?"
          estado={estadoSeccion(nota, "como_llega")}
          activa={seccionActiva === "como_llega"}
          onSeleccionar={irASeccion}
        >
          <SeccionComoLlega valor={nota.comoLlegaHoy} onChange={registrarCambio} onBlurTexto={flushInmediato} />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="que_encontraste"
          titulo="¿Qué encontraste?"
          estado={estadoSeccion(nota, "que_encontraste")}
          activa={seccionActiva === "que_encontraste"}
          onSeleccionar={irASeccion}
        >
          <SeccionQueEncontraste
            valor={nota.queEncontraste}
            patientId={nota.encabezado.patientId}
            tipoProcedimientoSeleccionado={nota.detalleProcedimiento?.tipo}
            onChange={registrarCambio}
            onBlurTexto={flushInmediato}
          />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="diagnostico"
          titulo="Diagnóstico"
          estado={estadoSeccion(nota, "diagnostico")}
          activa={seccionActiva === "diagnostico"}
          onSeleccionar={irASeccion}
        >
          <SeccionDiagnostico
            patientId={patientId}
            notaId={nota.id}
            valor={nota.diagnostico}
            organosSugeridos={nota.queEncontraste.organosDentales}
            onChange={registrarCambio}
          />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="procedimiento"
          titulo="¿Qué hiciste hoy?"
          estado={estadoSeccion(nota, "procedimiento")}
          activa={seccionActiva === "procedimiento"}
          onSeleccionar={irASeccion}
        >
          <SeccionProcedimiento
            detalle={nota.detalleProcedimiento}
            justificacionSinProcedimiento={nota.justificacionSinProcedimiento}
            tratamientosSugeridos={tratamientosSugeridos}
            organosPorDefecto={nota.queEncontraste.organosDentales}
            onChange={registrarCambio}
            onBlurTexto={flushInmediato}
          />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="estado_final"
          titulo="¿Cómo terminó el paciente?"
          estado={estadoSeccion(nota, "estado_final")}
          activa={seccionActiva === "estado_final"}
          onSeleccionar={irASeccion}
        >
          <SeccionEstadoFinal valor={nota.estadoFinal} onChange={registrarCambio} onBlurTexto={flushInmediato} />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="indicaciones"
          titulo="Indicaciones y siguiente paso"
          estado={estadoSeccion(nota, "indicaciones")}
          activa={seccionActiva === "indicaciones"}
          onSeleccionar={irASeccion}
        >
          <SeccionIndicaciones valor={nota.indicaciones} onChange={registrarCambio} onBlurTexto={flushInmediato} />
        </SeccionAcordeon>
      </div>

      <div className="sticky bottom-24 z-10 rounded-2xl border border-edge/10 bg-modal p-4 shadow-card">
        {faltantes.length > 0 && !confirmando && (
          <div className="mb-3 text-xs text-ink/60">
            <p className="mb-1 font-medium text-ink/80">Tu nota está casi lista — falta confirmar:</p>
            <ul className="space-y-0.5">
              {faltantes.map((f, i) => (
                <li key={i}>
                  <button onClick={() => irASeccion(f.seccion)} className="text-accent hover:underline">
                    {f.mensaje}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {errorFirma && <p className="mb-2 text-xs text-danger">{errorFirma} Tu información sigue protegida — puedes volver a intentar.</p>}
        {errorGuardado && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            <span>{errorGuardado}</span>
            <button onClick={onGuardarYSalir} disabled={guardando} className="font-semibold underline">
              Reintentar
            </button>
            <button onClick={onGuardado} className="ml-auto font-semibold underline">
              Salir de todas formas
            </button>
          </div>
        )}
        {!confirmando ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={onGuardarYSalir} disabled={guardando} className={`${botonSecundario} sm:w-auto`}>
              {guardando ? "Guardando…" : "Guardar y continuar después"}
            </button>
            <button
              onClick={() => setConfirmando(true)}
              disabled={faltantes.length > 0 || !!conflictoRemoto}
              className={`${botonPrimario} flex-1`}
            >
              Firmar y finalizar nota
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink/70">
              Una vez firmada, la nota no podrá modificarse; las correcciones se realizan mediante aclaraciones.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(false)} className={botonSecundario} disabled={firmando}>
                Cancelar
              </button>
              <button onClick={onFirmar} className={`${botonPrimario} flex-1`} disabled={firmando}>
                {firmando ? "Firmando…" : "Confirmar y firmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
