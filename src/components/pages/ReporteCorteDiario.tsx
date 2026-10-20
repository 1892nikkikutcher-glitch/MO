"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { sumarDias } from "@/lib/evaluacionSemanal";

function hoyIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

/** "martes, 20 de octubre de 2026" a partir de "2026-10-20" (sin correrse por zona horaria). */
function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function ReporteCorteDiario() {
  const { finanzas } = usePatientData();
  const hoy = hoyIso();
  const [iso, setIso] = useState(hoy);
  const esHoy = iso === hoy;
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Corte Diario — {fechaLarga(iso)}</h3>
          {/* Mismos controles que la Agenda: día anterior, día siguiente, volver a hoy y elegir una fecha. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIso((d) => sumarDias(d, -1))}
              aria-label="Día anterior"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/40 text-base text-success transition-colors hover:bg-success/10"
              style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
            >
              ‹
            </button>
            <button
              onClick={() => setIso((d) => sumarDias(d, 1))}
              disabled={esHoy}
              aria-label="Día siguiente"
              title={esHoy ? "Hoy es el último día con cobros" : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/40 text-base text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
            >
              ›
            </button>
            <button
              onClick={() => setIso(hoy)}
              disabled={esHoy}
              className="rounded-lg border border-accent/40 px-3.5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
            >
              Hoy
            </button>
            <input
              type="date"
              value={iso}
              max={hoy}
              onChange={(e) => e.target.value && setIso(e.target.value > hoy ? hoy : e.target.value)}
              aria-label="Elegir fecha"
              className="rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none"
            />
          </div>
        </div>
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
              : esHoy
                ? "Aún no se registran pagos hoy."
                : "No se registraron pagos ese día."}
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
