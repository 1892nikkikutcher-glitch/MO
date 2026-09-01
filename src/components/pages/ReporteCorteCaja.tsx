"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function hoyIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function ReporteCorteCaja() {
  const { finanzas } = usePatientData();
  const [fecha, setFecha] = useState(hoyIso());

  const cobrosBrutos = finanzas.porFecha[fecha] ?? 0;
  const devolucionesMonto = finanzas.devolucionesPorFecha?.[fecha] ?? 0;
  const neto = cobrosBrutos - devolucionesMonto;
  const porForma = finanzas.porFechaYFormaPago?.[fecha] ?? {};
  const formas = Object.entries(porForma).sort((a, b) => b[1] - a[1]);
  const porMetodoDevolucion = finanzas.devolucionesPorFechaYMetodo?.[fecha] ?? {};
  const metodosDevolucion = Object.entries(porMetodoDevolucion).sort((a, b) => b[1] - a[1]);

  const ultimosDias = Object.entries(finanzas.porFecha)
    .filter(([, monto]) => monto !== 0)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-edge/10 bg-surface p-6">
          <label className="mb-1 block text-xs font-medium text-ink/60">Fecha del corte</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${inputClass} max-w-xs`}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-edge/10 bg-inset p-5">
              <div className="text-2xl font-bold text-success">{formatCurrency(cobrosBrutos)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">Cobros brutos</div>
            </div>
            <div className="rounded-xl border border-edge/10 bg-inset p-5">
              <div className="text-2xl font-bold text-danger">−{formatCurrency(devolucionesMonto)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">Devoluciones</div>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-5">
              <div className="text-2xl font-bold text-accent">{formatCurrency(neto)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">Ingreso neto</div>
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
                : "No hay pagos registrados en esta fecha."}
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

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
          Últimos días con cobros
        </h3>
        {ultimosDias.length === 0 ? (
          <p className="text-xs text-ink/30">Aún no hay pagos registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {ultimosDias.map(([iso, monto]) => (
              <button
                key={iso}
                onClick={() => setFecha(iso)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-inset ${
                  iso === fecha ? "bg-accent/10 text-accent" : "text-ink/70"
                }`}
              >
                <span>{iso}</span>
                <span className="font-semibold">{formatCurrency(monto)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
