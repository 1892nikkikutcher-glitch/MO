"use client";

/** "Registrar atención de hoy" — contenedor de las 6 secciones guiadas que
 * sustituyen el formulario PSOAP visible (ver el plan de rediseño). Decide
 * CON QUÉ nota arrancar (recuperar un borrador existente, avisar de un
 * duplicado, o empezar una nueva) y delega el ciclo de vida de esa nota
 * concreta a `useAutoguardadoNota`. */

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { buscarBorradorLocalPorCita, buscarBorradorLocalPorPaciente } from "@/lib/borradorLocalNota";
import { detectarConflictoBorrador, type RegistroBorradorLocal } from "@/lib/borradorLocalNotaPuro";
import {
  estadoSeccion,
  notaEvolucionV2Inicial,
  obtenerFaltantesNota,
  type EncabezadoNota,
  type NotaEvolucionV2,
  type SeccionNota,
} from "@/lib/notasEvolucion";
import { useAutoguardadoNota } from "./useAutoguardadoNota";
import { botonPrimario, botonSecundario, EstadoGuardadoIndicador, SeccionAcordeon } from "./NotaUI";
import SeccionComoLlega from "./SeccionComoLlega";
import SeccionQueEncontraste from "./SeccionQueEncontraste";
import SeccionDiagnostico from "./SeccionDiagnostico";
import SeccionProcedimiento from "./SeccionProcedimiento";
import SeccionEstadoFinal from "./SeccionEstadoFinal";
import SeccionIndicaciones from "./SeccionIndicaciones";

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

export default function RegistrarAtencionHoy({
  patientId,
  citaId,
  onFirmada,
}: {
  patientId: string;
  citaId?: string | null;
  onFirmada: (notaId: string) => void;
}) {
  const { clinicUid, miUid, patients, recursos, citas, clinicInfo, notasEvolucionPorPaciente } = usePatientData();

  const [fase, setFase] = useState<"buscando" | "recuperar" | "duplicado" | "editando">("buscando");
  const [registroLocal, setRegistroLocal] = useState<RegistroBorradorLocal | null>(null);
  const [notaFirestoreExistente, setNotaFirestoreExistente] = useState<NotaEvolucionV2 | null>(null);
  const [hayConflicto, setHayConflicto] = useState(false);
  const [notaInicial, setNotaInicial] = useState<NotaEvolucionV2 | null>(null);
  const [forzarNueva, setForzarNueva] = useState(false);

  const paciente = patients.find((p) => p.id === patientId);
  const medico = recursos.find((r) => r.tipo === "medico")?.nombre ?? "";
  const cita = citaId ? citas.find((c) => c.id === citaId) : undefined;

  const encabezado: EncabezadoNota = useMemo(
    () => ({
      patientId,
      pacienteNombreSnapshot: paciente?.name ?? "",
      citaId: citaId ?? null,
      motivoAgendadoSnapshot: cita ? [cita.tratamientos.join(", "), cita.comentarios].filter(Boolean).join(" — ") : undefined,
      clinicaNombreSnapshot: clinicInfo?.nombre,
      medico,
      organosDentales: [],
    }),
    [patientId, paciente?.name, citaId, cita, clinicInfo?.nombre, medico]
  );

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
      const local = citaId
        ? await buscarBorradorLocalPorCita(clinicUid, citaId)
        : await buscarBorradorLocalPorPaciente(clinicUid, patientId);
      if (cancelado) return;

      const remotaVigente = (notasEvolucionPorPaciente[patientId] ?? []).find(
        (n): n is NotaEvolucionV2 =>
          "version" in n &&
          n.version === 2 &&
          n.estado !== "firmada" &&
          (citaId ? n.encabezado.citaId === citaId : true)
      );

      if (!local && !remotaVigente) {
        setNotaInicial(notaEvolucionV2Inicial(encabezado, "rapido", miUid));
        setFase("editando");
        return;
      }

      setRegistroLocal(local);
      setNotaFirestoreExistente(remotaVigente ?? null);

      if (local && remotaVigente) {
        const conflicto = detectarConflictoBorrador(
          { actualizadoEnBaseLocal: local.metadataLocal.ultimaSincronizacionExitosaEn ?? local.nota.actualizadoEn },
          { actualizadoEn: remotaVigente.actualizadoEn }
        );
        setHayConflicto(conflicto.hayConflicto);
      }

      setFase(citaId && (local || remotaVigente) ? "duplicado" : "recuperar");
    }
    void buscar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicUid, patientId, citaId, forzarNueva]);

  function continuarBorrador(usarRemoto: boolean) {
    const base = usarRemoto ? notaFirestoreExistente : registroLocal?.nota ?? notaFirestoreExistente;
    if (base) setNotaInicial(base);
    else setNotaInicial(notaEvolucionV2Inicial(encabezado, "rapido", miUid));
    setFase("editando");
  }

  function empezarNueva() {
    setForzarNueva(true);
    setNotaInicial(notaEvolucionV2Inicial(encabezado, "rapido", miUid));
    setFase("editando");
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
            Encontramos una versión más reciente de esta nota que la que quedó en este dispositivo.
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

  if (!notaInicial) return null;

  return (
    <FormularioNota
      patientId={patientId}
      citaId={citaId}
      notaInicial={notaInicial}
      tratamientosSugeridos={cita?.tratamientos ?? []}
      onFirmada={onFirmada}
    />
  );
}

function FormularioNota({
  patientId,
  citaId,
  notaInicial,
  tratamientosSugeridos,
  onFirmada,
}: {
  patientId: string;
  citaId?: string | null;
  notaInicial: NotaEvolucionV2;
  tratamientosSugeridos: string[];
  onFirmada: (notaId: string) => void;
}) {
  const { nota, registrarCambio, seccionActiva, irASeccion, estadoGuardado, reintentarSincronizacion, firmar, firmando } =
    useAutoguardadoNota(patientId, citaId, notaInicial);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const faltantes = obtenerFaltantesNota(nota);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-ink/60">
          <span className="font-medium text-ink">{nota.encabezado.pacienteNombreSnapshot}</span>
          {nota.encabezado.motivoAgendadoSnapshot && <span> · {nota.encabezado.motivoAgendadoSnapshot}</span>}
        </div>
        <EstadoGuardadoIndicador estado={estadoGuardado} onReintentar={reintentarSincronizacion} />
      </div>

      <div className="space-y-2.5">
        <SeccionAcordeon
          id="como_llega"
          titulo="¿Cómo llega hoy?"
          estado={estadoSeccion(nota, "como_llega")}
          activa={seccionActiva === "como_llega"}
          onSeleccionar={irASeccion}
        >
          <SeccionComoLlega valor={nota.comoLlegaHoy} onChange={registrarCambio} />
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
            tipoProcedimientoSeleccionado={nota.detalleProcedimiento?.tipo}
            onChange={registrarCambio}
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
          />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="estado_final"
          titulo="¿Cómo terminó el paciente?"
          estado={estadoSeccion(nota, "estado_final")}
          activa={seccionActiva === "estado_final"}
          onSeleccionar={irASeccion}
        >
          <SeccionEstadoFinal valor={nota.estadoFinal} onChange={registrarCambio} />
        </SeccionAcordeon>

        <SeccionAcordeon
          id="indicaciones"
          titulo="Indicaciones y siguiente paso"
          estado={estadoSeccion(nota, "indicaciones")}
          activa={seccionActiva === "indicaciones"}
          onSeleccionar={irASeccion}
        >
          <SeccionIndicaciones valor={nota.indicaciones} onChange={registrarCambio} />
        </SeccionAcordeon>
      </div>

      <div className="sticky bottom-0 rounded-2xl border border-edge/10 bg-modal p-4 shadow-card">
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
        {!confirmando ? (
          <button onClick={() => setConfirmando(true)} disabled={faltantes.length > 0} className={`${botonPrimario} w-full`}>
            Firmar y finalizar nota
          </button>
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
