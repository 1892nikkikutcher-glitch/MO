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
  const cobrosBrutos = finanzas.porFecha[iso] ?? 0;
  const devoluciones = finanzas.devolucionesPorFecha?.[iso] ?? 0;
  const neto = cobrosBrutos - devoluciones;
  const porForma = finanzas.porFechaYFormaPago?.[iso] ?? {};
  const formas = Object.entries(porForma).sort((a, b) => b[1] - a[1]);
  const porMetodoDevolucion = finanzas.devolucionesPorFechaYMetodo?.[iso] ?? {};
  const metodosDevolucion = Object.entries(porMetodoDevolucion).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Corte Diario — {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge/10 bg-inset p-4">
            <div className="text-xl font-bold text-success">{formatCurrency(cobrosBrutos)}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Cobros brutos</div>
          </div>
          <div className="rounded-xl border border-edge/10 bg-inset p-4">
            <div className="text-xl font-bold text-danger">−{formatCurrency(devoluciones)}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Devoluciones</div>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
            <div className="text-xl font-bold text-accent">{formatCurrency(neto)}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Ingreso neto</div>
          </div>
        </div>

        {metodosDevolucion.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Devoluciones por método</h4>
            {metodosDevolucion.map(([metodo, monto]) => (
              <div key={metodo} className="flex items-center justify-between rounded-lg border border-danger/15 bg-danger/5 px-4 py-2.5 text-sm">
                <span className="text-ink/80">{metodo}</span>
                <span className="font-semibold text-danger">−{formatCurrency(monto)}</span>
              </div>
            ))}
          </div>
        )}

        {formas.length === 0 ? (
          <p className="mt-4 text-sm text-ink/40">
            {cobrosBrutos > 0
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
