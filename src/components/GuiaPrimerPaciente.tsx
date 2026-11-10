"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import GlobalNuevoPaciente from "./GlobalNuevoPaciente";
import {
  claveGuia,
  debeOfrecerGuia,
  estadoGuiaInicial,
  leerEstadoGuia,
  pasoGuiaHecho,
  pasosGuiaParaRol,
  type DatosGuia,
  type EstadoGuia,
} from "@/lib/guiaPrimerPaciente";

/** Evento para arrancar la guía desde cualquier parte (el tutorial, el botón de ayuda). */
export const EVENTO_INICIAR_GUIA = "mo:iniciar-guia-primer-paciente";

const PAGINA_CONSULTORIO = "administracion-consultorio";

type FotosGuia = {
  perfil?: unknown;
  ineFrente?: unknown;
  ineReverso?: unknown;
  extraorales?: unknown[];
  intraorales?: unknown[];
  radiografias?: unknown[];
  documentos?: unknown[];
};

function tieneFotografias(f: FotosGuia | undefined): boolean {
  if (!f) return false;
  return !!(
    f.perfil ||
    f.ineFrente ||
    f.ineReverso ||
    f.extraorales?.length ||
    f.intraorales?.length ||
    f.radiografias?.length ||
    f.documentos?.length
  );
}

function guardar(uid: string, estado: EstadoGuia) {
  try {
    localStorage.setItem(claveGuia(uid), JSON.stringify(estado));
  } catch {
    // Sin almacenamiento: la guía funciona igual, solo no recuerda el avance.
  }
}

function leer(uid: string): EstadoGuia {
  try {
    return leerEstadoGuia(localStorage.getItem(claveGuia(uid)));
  } catch {
    return estadoGuiaInicial;
  }
}

/** Tarjeta flotante que acompaña al primer paciente de la clínica: no tapa la pantalla (se puede trabajar en el
 * expediente con ella abierta) y recuerda en qué paso iba. Sale sola cuando el consultorio acaba de darse de alta;
 * también se abre desde el tutorial y desde el botón de ayuda. */
export default function GuiaPrimerPaciente({
  uid,
  avisoListo,
  paginaActiva,
}: {
  uid: string;
  avisoListo: boolean;
  paginaActiva: string;
}) {
  const {
    clinicInfo,
    patients,
    citas,
    presupuestosPorPaciente,
    pagosPorPaciente,
    notasEvolucionPorPaciente,
    historiaClinicaPorPaciente,
    membresiasPorPaciente,
    fotosPorPaciente,
    laboratoriosPorPaciente,
    miRol,
    puedeVerFinanzas,
    pendingInvite,
    irAExpediente,
    sugerirNuevaCita,
  } = usePatientData();

  const [estado, setEstado] = useState<EstadoGuia>(estadoGuiaInicial);
  const [cargado, setCargado] = useState(false);
  const [creandoPaciente, setCreandoPaciente] = useState(false);

  const pasos = useMemo(() => pasosGuiaParaRol(miRol, puedeVerFinanzas), [miRol, puedeVerFinanzas]);

  const cambiar = useCallback(
    (cambio: Partial<EstadoGuia>) => {
      setEstado((prev) => {
        const nuevo = { ...prev, ...cambio };
        guardar(uid, nuevo);
        return nuevo;
      });
    },
    [uid]
  );

  useEffect(() => {
    setEstado(leer(uid));
    setCargado(true);
  }, [uid]);

  const paciente = estado.patientId ? patients.find((p) => p.id === estado.patientId) : undefined;
  const patientId = paciente?.id ?? null;

  const datos: DatosGuia = useMemo(
    () => ({
      hayPaciente: !!paciente,
      datosPacienteCapturados: !!(paciente?.birthDate && paciente.sexo && (paciente.email || paciente.direccion)),
      historiaClinicaCapturada: patientId ? !!historiaClinicaPorPaciente[patientId]?.actualizadoEn : false,
      hayPresupuestos: patientId ? (presupuestosPorPaciente[patientId]?.length ?? 0) > 0 : false,
      hayPagos: patientId ? (pagosPorPaciente[patientId]?.length ?? 0) > 0 : false,
      hayMembresia: patientId ? (membresiasPorPaciente[patientId]?.length ?? 0) > 0 : false,
      hayFotografias: tieneFotografias(patientId ? fotosPorPaciente[patientId] : undefined),
      hayLaboratorios: patientId ? (laboratoriosPorPaciente[patientId]?.length ?? 0) > 0 : false,
      hayNotasEvolucion: patientId ? (notasEvolucionPorPaciente[patientId]?.length ?? 0) > 0 : false,
      hayCitas: patientId ? citas.some((c) => c.patientId === patientId && c.estatus !== "Cancelada") : false,
    }),
    [
      paciente,
      patientId,
      historiaClinicaPorPaciente,
      presupuestosPorPaciente,
      pagosPorPaciente,
      membresiasPorPaciente,
      fotosPorPaciente,
      laboratoriosPorPaciente,
      notasEvolucionPorPaciente,
      citas,
    ]
  );

  // Se ofrece sola justo cuando el consultorio y el responsable quedan dados de alta (de vacío a completo mientras se
  // está en Administración → Consultorio). Quien ya tenía todo capturado al entrar no la recibe: la abre desde la ayuda.
  const consultorioListo = !!(
    clinicInfo?.nombre?.trim() &&
    (clinicInfo.telefono?.trim() || clinicInfo.direccion?.trim()) &&
    clinicInfo.administradorNombre?.trim()
  );
  const listoAntes = useRef<boolean | null>(null);
  useEffect(() => {
    if (!cargado) return;
    const antes = listoAntes.current;
    listoAntes.current = consultorioListo;
    if (antes !== false || !consultorioListo) return;
    if (!avisoListo || pendingInvite || !miRol || paginaActiva !== PAGINA_CONSULTORIO) return;
    if (debeOfrecerGuia({ consultorioRecienCapturado: true, hayPacientes: patients.length > 0, estado })) {
      cambiar({ activa: true, paso: 0, patientId: null, minimizada: false });
    }
  }, [cargado, consultorioListo, avisoListo, pendingInvite, miRol, paginaActiva, patients.length, estado, cambiar]);

  const iniciar = useCallback(() => {
    const previo = leer(uid);
    const sigueExistiendo = !!previo.patientId && patients.some((p) => p.id === previo.patientId);
    cambiar({
      activa: true,
      vista: false,
      minimizada: false,
      paso: sigueExistiendo && !previo.vista ? previo.paso : 0,
      patientId: sigueExistiendo ? previo.patientId : null,
    });
  }, [uid, patients, cambiar]);

  useEffect(() => {
    window.addEventListener(EVENTO_INICIAR_GUIA, iniciar);
    return () => window.removeEventListener(EVENTO_INICIAR_GUIA, iniciar);
  }, [iniciar]);

  // Si el paciente de la guía ya no existe (se borró o se fusionó), se vuelve a empezar por el primer paso.
  useEffect(() => {
    if (!cargado || !estado.activa || !estado.patientId) return;
    if (patients.length === 0 || patients.some((p) => p.id === estado.patientId)) return;
    cambiar({ patientId: null, paso: 0 });
  }, [cargado, estado.activa, estado.patientId, patients, cambiar]);

  if (!cargado || !estado.activa || pasos.length === 0) return null;

  const indice = Math.min(estado.paso, pasos.length - 1);
  const actual = pasos[indice];
  const esUltimo = indice >= pasos.length - 1;
  const hecho = pasoGuiaHecho(actual, datos);
  const nombrePaciente = paciente?.name;

  function irAlPaso(nuevo: number) {
    const paso = pasos[nuevo];
    cambiar({ paso: nuevo });
    if (paso?.tipo === "pestana" && paso.pestana && patientId) irAExpediente(patientId, paso.pestana);
  }

  function abrirPaso() {
    if (!patientId) return;
    if (actual.tipo === "pestana" && actual.pestana) irAExpediente(patientId, actual.pestana);
    else if (actual.tipo === "cita") sugerirNuevaCita(patientId, "Consulta de valoración");
  }

  function alCrearPaciente(id: string) {
    const siguiente = pasos[indice + 1];
    cambiar({ patientId: id, paso: indice + 1 });
    if (siguiente?.tipo === "pestana" && siguiente.pestana) irAExpediente(id, siguiente.pestana);
  }

  function elegirPacienteExistente(id: string) {
    if (!id) return;
    alCrearPaciente(id);
  }

  function cerrar(terminada: boolean) {
    cambiar({ activa: false, vista: true, minimizada: false, paso: terminada ? 0 : estado.paso });
  }

  const enDerecha = estado.lado === "derecha";
  // En pantallas amplias se deja libre la columna del menú (a cualquiera de los dos lados).
  const posicion = enDerecha ? "right-4 sm:right-24" : "left-4 sm:left-24";

  if (estado.minimizada) {
    return (
      <button
        onClick={() => cambiar({ minimizada: false })}
        className={`fixed bottom-24 ${posicion} z-[65] rounded-full border border-accent/60 bg-modal-solid px-4 py-2 text-xs font-semibold text-accent shadow-xl hover:bg-accent/15 print:hidden`}
      >
        Guía del primer paciente · paso {indice + 1} de {pasos.length}
      </button>
    );
  }

  const necesitaPaciente = actual.tipo !== "paciente" && !patientId;

  return (
    <>
      <div
        role="complementary"
        aria-label="Guía del primer paciente"
        className={`fixed bottom-24 left-4 right-4 z-[65] flex max-h-[60vh] flex-col rounded-2xl border border-edge/10 bg-modal-solid shadow-2xl sm:w-[24rem] print:hidden ${
          enDerecha ? "sm:left-auto sm:right-24" : "sm:left-24 sm:right-auto"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Guía del primer paciente</p>
            <p className="mt-0.5 truncate text-xs text-ink/50">
              Paso {indice + 1} de {pasos.length}
              {nombrePaciente && ` · ${nombrePaciente}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => cambiar({ lado: enDerecha ? "izquierda" : "derecha" })}
              aria-label={enDerecha ? "Mover la guía a la izquierda" : "Mover la guía a la derecha"}
              title={enDerecha ? "Mover a la izquierda" : "Mover a la derecha"}
              className="hidden h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink sm:flex"
            >
              {enDerecha ? "←" : "→"}
            </button>
            <button
              onClick={() => cambiar({ minimizada: true })}
              aria-label="Minimizar la guía"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              –
            </button>
            <button
              onClick={() => cerrar(false)}
              aria-label="Cerrar la guía"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-0.5 px-4" aria-hidden>
          {pasos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1 flex-1 rounded-full ${
                i === indice ? "bg-accent" : pasoGuiaHecho(p, datos) ? "bg-success/70" : i < indice ? "bg-accent/40" : "bg-ink/15"
              }`}
            />
          ))}
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{actual.titulo}</h3>
            {hecho && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                Ya lo hiciste
              </span>
            )}
            {actual.opcional && !hecho && (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-medium text-ink/60">Opcional</span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink/70">{actual.que}</p>

          <ol className="mt-3 space-y-1.5">
            {actual.llenar.map((linea, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-ink/80">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                  {i + 1}
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ol>

          {actual.tipo === "paciente" && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setCreandoPaciente(true)}
                className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2 text-sm font-semibold text-accent hover:bg-accent/25"
              >
                Crear al paciente →
              </button>
              {patients.length > 0 && (
                <select
                  value=""
                  onChange={(e) => elegirPacienteExistente(e.target.value)}
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-xs text-ink/70 outline-none focus:border-accent/60"
                  aria-label="Usar un paciente que ya tengo"
                >
                  <option value="">…o recorrer la guía con un paciente que ya tengo</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {actual.tipo !== "paciente" && !necesitaPaciente && (
            <button
              onClick={abrirPaso}
              className="mt-4 w-full rounded-lg border border-accent/60 bg-accent/15 py-2 text-sm font-semibold text-accent hover:bg-accent/25"
            >
              {actual.tipo === "cita" ? "Agendar la cita →" : "Ir a esta pestaña →"}
            </button>
          )}
          {necesitaPaciente && (
            <p className="mt-4 text-xs text-warning">Primero elige o crea al paciente en el primer paso.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge/10 px-4 py-2.5">
          <button
            onClick={() => cerrar(false)}
            className="text-xs text-ink/50 underline-offset-2 hover:text-ink hover:underline"
          >
            Ahora no
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => irAlPaso(indice - 1)}
              disabled={indice === 0}
              className="rounded-lg border border-edge/10 px-3 py-1.5 text-xs text-ink/70 hover:bg-surface disabled:opacity-30"
            >
              Anterior
            </button>
            {esUltimo ? (
              <button
                onClick={() => cerrar(true)}
                className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25"
              >
                Terminar
              </button>
            ) : (
              <button
                onClick={() => irAlPaso(indice + 1)}
                disabled={actual.tipo === "paciente" && !patientId}
                className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-30"
              >
                Siguiente
              </button>
            )}
          </div>
        </div>
      </div>

      {creandoPaciente && (
        <GlobalNuevoPaciente
          onClose={() => setCreandoPaciente(false)}
          alGuardar={alCrearPaciente}
        />
      )}
    </>
  );
}
