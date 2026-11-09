"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  avanceTutorial,
  claveTutorial,
  leerEstadoTutorial,
  pasoEstaHecho,
  pasosParaRol,
  type DatosTutorial,
  type DestinoTutorial,
} from "@/lib/tutorialInicio";

/** Evento para volver a abrir el tutorial desde cualquier parte (ej. el botón del asistente). */
export const EVENTO_ABRIR_TUTORIAL = "mo:abrir-tutorial";

/** Cuánto se espera a que lleguen los datos de la clínica antes de decidir si el tutorial sale solo:
 * quien ya tiene pacientes o citas no es nuevo y no necesita que se le enseñe lo básico. */
const ESPERA_DATOS_MS = 2500;

function guardar(uid: string, estado: { visto: boolean; paso: number }) {
  try {
    localStorage.setItem(claveTutorial(uid), JSON.stringify(estado));
  } catch {
    // Sin almacenamiento: el tutorial funciona igual, solo no recuerda el avance.
  }
}

function leer(uid: string) {
  try {
    return leerEstadoTutorial(localStorage.getItem(claveTutorial(uid)));
  } catch {
    return leerEstadoTutorial(null);
  }
}

/** Guía de "primeros pasos": una ventana con los pasos principales de la plataforma en el orden en que conviene
 * hacerlos. Sale sola una vez, justo después del aviso de confidencialidad, a quien entra por primera vez; después se
 * abre desde el botón de ayuda. Marca como hechos los pasos que los datos de la clínica ya cubren. */
export default function TutorialInicio({
  uid,
  avisoListo,
  onIr,
}: {
  uid: string;
  avisoListo: boolean;
  onIr: (destino: DestinoTutorial) => void;
}) {
  const { clinicInfo, recursos, patients, citas, presupuestosPorPaciente, pagosPorPaciente, miRol, pendingInvite } =
    usePatientData();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);

  const pasos = useMemo(() => pasosParaRol(miRol), [miRol]);

  const datos: DatosTutorial = useMemo(
    () => ({
      consultorioCapturado: !!(clinicInfo?.nombre?.trim() && (clinicInfo.telefono?.trim() || clinicInfo.direccion?.trim())),
      hayMedicos: recursos.some((r) => r.tipo === "medico"),
      hayMedicoConCedula: recursos.some((r) => r.tipo === "medico" && !!r.cedulaProfesional?.trim()),
      hayPacientes: patients.length > 0,
      hayCitas: citas.length > 0,
      hayPresupuestos: Object.values(presupuestosPorPaciente).some((l) => l.length > 0),
      hayPagos: Object.values(pagosPorPaciente).some((l) => l.length > 0),
    }),
    [clinicInfo, recursos, patients, citas, presupuestosPorPaciente, pagosPorPaciente],
  );
  const yaTieneActividad = datos.hayPacientes || datos.hayCitas;

  const abrir = useCallback(() => {
    setPaso(Math.min(leer(uid).paso, Math.max(pasos.length - 1, 0)));
    setAbierto(true);
  }, [uid, pasos.length]);

  // Sale solo, una vez: después del aviso, sin invitación pendiente y solo si la clínica todavía está vacía.
  useEffect(() => {
    if (!avisoListo || pendingInvite || !miRol) return;
    if (leer(uid).visto) return;
    const t = setTimeout(() => {
      if (yaTieneActividad) {
        guardar(uid, { visto: true, paso: 0 });
        return;
      }
      abrir();
    }, ESPERA_DATOS_MS);
    return () => clearTimeout(t);
  }, [avisoListo, pendingInvite, miRol, uid, yaTieneActividad, abrir]);

  useEffect(() => {
    window.addEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
  }, [abrir]);

  useEffect(() => {
    if (!abierto) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar(false);
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, paso]);

  function cerrar(terminado: boolean) {
    guardar(uid, { visto: true, paso: terminado ? 0 : paso });
    setAbierto(false);
  }

  function irA(nuevo: number) {
    setPaso(nuevo);
    guardar(uid, { visto: false, paso: nuevo });
  }

  if (!abierto || pasos.length === 0) return null;

  const actual = pasos[Math.min(paso, pasos.length - 1)];
  const esUltimo = paso >= pasos.length - 1;
  const hecho = pasoEstaHecho(actual, datos);
  const { hechos, total } = avanceTutorial(pasos, datos);

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Primeros pasos en MO"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-edge/10 bg-modal-solid shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Primeros pasos en MO</p>
            <p className="mt-0.5 text-xs text-ink/50">
              Paso {paso + 1} de {pasos.length}
              {total > 0 && ` · ${hechos} de ${total} listos`}
            </p>
          </div>
          <button
            onClick={() => cerrar(false)}
            aria-label="Cerrar tutorial"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex gap-1 px-5" aria-hidden>
          {pasos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1 flex-1 rounded-full ${
                i === paso ? "bg-accent" : pasoEstaHecho(p, datos) ? "bg-success/70" : "bg-ink/15"
              }`}
            />
          ))}
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{actual.titulo}</h3>
            {hecho && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                Ya lo hiciste
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-ink/70">{actual.que}</p>

          <ol className="mt-4 space-y-2">
            {actual.como.map((linea, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                  {i + 1}
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ol>

          {actual.accion && (
            <button
              onClick={() => {
                guardar(uid, { visto: false, paso });
                setAbierto(false);
                onIr(actual.accion!.destino);
              }}
              className="mt-5 w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
            >
              {actual.accion.etiqueta} →
            </button>
          )}
          {actual.accion && (
            <p className="mt-2 text-center text-[11px] text-ink/40">
              Para volver a esta guía usa el botón de ayuda (?) y elige «Primeros pasos».
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge/10 px-5 py-3">
          <button
            onClick={() => cerrar(false)}
            className="text-xs text-ink/50 underline-offset-2 hover:text-ink hover:underline"
          >
            Ahora no
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => irA(paso - 1)}
              disabled={paso === 0}
              className="rounded-lg border border-edge/10 px-3 py-2 text-sm text-ink/70 hover:bg-surface disabled:opacity-30"
            >
              Anterior
            </button>
            {esUltimo ? (
              <button
                onClick={() => cerrar(true)}
                className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25"
              >
                Terminar
              </button>
            ) : (
              <button
                onClick={() => irA(paso + 1)}
                className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25"
              >
                Siguiente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
