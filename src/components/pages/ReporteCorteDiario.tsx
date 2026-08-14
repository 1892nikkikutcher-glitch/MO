"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

function hoyIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function ReporteCorteDiario() {
  const { finanzas } = usePatientData();
  const iso = hoyIso();
  const total = finanzas.porFecha[iso] ?? 0;
  const porForma = finanzas.porFechaYFormaPago?.[iso] ?? {};
  const formas = Object.entries(porForma).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Corte Diario — {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
        </h3>
        <div className="mt-4 rounded-xl border border-edge/10 bg-inset p-5">
          <div className="text-3xl font-bold text-success">{formatCurrency(total)}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">Total cobrado hoy</div>
        </div>

        {formas.length === 0 ? (
          <p className="mt-4 text-sm text-ink/40">
            {total > 0
              ? "Este total incluye pagos registrados antes de activarse el desglose por forma de pago — los pagos nuevos sí aparecerán desglosados aquí."
              : "Aún no se registran pagos hoy."}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
              Desglose por forma de pago
            </h4>
            {formas.map(([forma, monto]) => (
              <div
                key={forma}
                className="flex items-center justify-between rounded-lg border border-edge/10 bg-inset px-4 py-2.5 text-sm"
              >
                <span className="text-ink/80">{forma}</span>
                <span className="font-semibold text-ink">{formatCurrency(monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
