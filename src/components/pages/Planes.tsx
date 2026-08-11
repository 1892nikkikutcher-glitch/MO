"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { DURACION_PRUEBA_DIAS, planesDisponibles } from "@/lib/patientData";

function diasRestantesDePrueba(pruebaIniciadaEl: string | undefined) {
  if (!pruebaIniciadaEl) return DURACION_PRUEBA_DIAS;
  const inicio = new Date(`${pruebaIniciadaEl}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) return DURACION_PRUEBA_DIAS;
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + DURACION_PRUEBA_DIAS);
  const hoy = new Date();
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.ceil((fin.getTime() - hoy.getTime()) / msPorDia);
}

export default function Planes() {
  const { suscripcion, setSuscripcion } = usePatientData();
  const diasRestantes = diasRestantesDePrueba(suscripcion.pruebaIniciadaEl);
  const pruebaVencida = suscripcion.planActivo === "prueba" && diasRestantes <= 0;

  return (
    <div className="space-y-6">
      {suscripcion.planActivo === "prueba" && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            pruebaVencida
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {pruebaVencida
            ? "Tu periodo de prueba de 14 días ya terminó. Elige un plan para seguir usando MO sin interrupciones."
            : `Te quedan ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"} de tu prueba gratuita de ${DURACION_PRUEBA_DIAS} días.`}
        </div>
      )}

      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Esta sección todavía no procesa pagos reales — solo guarda qué plan tiene activa la cuenta.
        Conectar cobros (Stripe u otro) es un paso aparte que haremos cuando lo pidas.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {planesDisponibles.map((plan) => {
          const activo = suscripcion.planActivo === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                activo ? "border-accent bg-accent/5" : "border-edge/10 bg-surface"
              }`}
            >
              {activo && (
                <span className="mb-2 w-fit rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                  Plan actual
                </span>
              )}
              <h3 className="text-lg font-semibold text-ink">{plan.nombre}</h3>
              <p className="mt-1 text-2xl font-bold text-ink">{plan.precio}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink/40">
                {plan.unidades}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink/70">
                {plan.caracteristicas.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  setSuscripcion((prev) => ({
                    ...prev,
                    planActivo: plan.id,
                    pruebaIniciadaEl:
                      plan.id === "prueba" && !prev.pruebaIniciadaEl
                        ? new Date().toISOString().slice(0, 10)
                        : prev.pruebaIniciadaEl,
                  }))
                }
                disabled={activo}
                className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity ${
                  activo
                    ? "cursor-not-allowed border border-edge/15 text-ink/40"
                    : "bg-gradient-to-r from-accent to-orange-500 text-black hover:opacity-90"
                }`}
              >
                {activo ? "Plan activo" : "Seleccionar plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
