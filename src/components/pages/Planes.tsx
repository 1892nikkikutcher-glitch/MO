"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  DURACION_PRUEBA_DIAS,
  diasRestantesDePrueba,
  planesDisponibles,
  pruebaVencida as calcularPruebaVencida,
  type PlanId,
} from "@/lib/patientData";

/** Fecha LOCAL en formato YYYY-MM-DD — nunca `.toISOString()`, que da la
 * fecha en UTC y podía correr el inicio de la prueba unas horas respecto a
 * cómo `diasRestantesDePrueba` la interpreta después (medianoche local). */
function hoyLocalIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function Planes() {
  const { suscripcion, setSuscripcion, clinicUid, userEmail } = usePatientData();
  const diasRestantes = diasRestantesDePrueba(suscripcion.pruebaIniciadaEl);
  const pruebaVencida = calcularPruebaVencida(suscripcion);
  const [cargando, setCargando] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  const suscribirse = async (plan: "consultorio" | "clinicas") => {
    if (!clinicUid) return;
    setError("");
    setCargando(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicUid, plan, email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "No se pudo iniciar el pago.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
      setCargando(null);
    }
  };

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

      {suscripcion.stripeStatus && (
        <div className="rounded-2xl border border-edge/10 bg-surface p-4 text-xs text-ink/50">
          Estado de tu suscripción en Stripe: <span className="font-semibold text-ink/70">{suscripcion.stripeStatus}</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</div>
      )}

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
                onClick={() => {
                  if (plan.id === "prueba") {
                    setSuscripcion((prev) => ({
                      ...prev,
                      planActivo: plan.id,
                      // Fecha LOCAL, nunca .toISOString() (da la fecha en
                      // UTC) — diasRestantesDePrueba interpreta este string
                      // como medianoche en hora local; mezclar UTC aquí con
                      // local allá corría el periodo de prueba unas horas.
                      pruebaIniciadaEl: prev.pruebaIniciadaEl || hoyLocalIso(),
                    }));
                  } else {
                    suscribirse(plan.id);
                  }
                }}
                disabled={activo || cargando !== null}
                className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity ${
                  activo
                    ? "cursor-not-allowed border border-edge/15 text-ink/40"
                    : "border border-accent/60 bg-accent/15 text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                {activo
                  ? "Plan activo"
                  : cargando === plan.id
                    ? "Abriendo pago…"
                    : plan.id === "prueba"
                      ? "Seleccionar plan"
                      : "Suscribirme"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-edge/10 bg-surface p-4 text-xs text-ink/50">
        <span className="mt-0.5 text-success">🔒</span>
        <p>
          Toda tu información está blindada y es segura: los pagos se procesan directamente por Stripe
          (cifrado y cumplimiento PCI-DSS) — MO nunca ve ni guarda los datos de tu tarjeta — y los datos de
          tu consultorio y pacientes se almacenan cifrados en Firebase.
        </p>
      </div>
    </div>
  );
}
