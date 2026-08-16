"use client";

import type { PeriodoId } from "@/lib/dashboardMetrics";

const OPCIONES: { id: PeriodoId; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "año", label: "Año" },
  { id: "personalizado", label: "Personalizado" },
];

/** Selector de periodo para las filas de Finanzas, Operación y Agenda del
 * Dashboard Principal. Vive en Inicio.tsx, que calcula el rango real
 * (calcularRangoPeriodo) y lo pasa como prop a cada fila afectada.
 * Presupuestos/Laboratorios (Fila 3) y las gráficas de evolución mensual no
 * se ven afectados — son históricos o de tendencia por diseño. */
export default function PeriodSelector({
  periodoId,
  onSelect,
  personalizado,
  onPersonalizadoChange,
}: {
  periodoId: PeriodoId;
  onSelect: (id: PeriodoId) => void;
  personalizado: { desdeISO: string; hastaISO: string };
  onPersonalizadoChange: (rango: { desdeISO: string; hastaISO: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">Periodo</span>
      {OPCIONES.map((op) => (
        <button
          key={op.id}
          onClick={() => onSelect(op.id)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            periodoId === op.id
              ? "border-accent bg-accent/15 text-accent"
              : "border-edge/10 bg-surface text-ink/50 hover:text-ink/80"
          }`}
        >
          {op.label}
        </button>
      ))}
      {periodoId === "personalizado" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={personalizado.desdeISO}
            onChange={(e) => onPersonalizadoChange({ ...personalizado, desdeISO: e.target.value })}
            className="rounded-lg border border-edge/10 bg-field px-2 py-1.5 text-xs text-ink outline-none focus:border-accent/60"
          />
          <span className="text-xs text-ink/40">a</span>
          <input
            type="date"
            value={personalizado.hastaISO}
            onChange={(e) => onPersonalizadoChange({ ...personalizado, hastaISO: e.target.value })}
            className="rounded-lg border border-edge/10 bg-field px-2 py-1.5 text-xs text-ink outline-none focus:border-accent/60"
          />
        </div>
      )}
    </div>
  );
}
