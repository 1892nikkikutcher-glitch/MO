"use client";

import type { PeriodoId, RangoPeriodo } from "@/lib/dashboardMetrics";

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
  rango,
  onNavigate,
}: {
  periodoId: PeriodoId;
  onSelect: (id: PeriodoId) => void;
  personalizado: { desdeISO: string; hastaISO: string };
  onPersonalizadoChange: (rango: { desdeISO: string; hastaISO: string }) => void;
  rango: RangoPeriodo;
  /** Mueve el periodo hacia atrás (-1) o adelante (1) un "paso" natural del
   * tipo de periodo activo (día/semana/mes/trimestre/año, o el mismo largo
   * de la ventana en "personalizado") — mismas flechas ‹ › que la Agenda. */
  onNavigate: (direccion: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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

      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(-1)}
          title="Periodo anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
        >
          ‹
        </button>
        <span className="min-w-0 truncate text-sm font-semibold text-ink">{rango.detalleFecha}</span>
        <button
          onClick={() => onNavigate(1)}
          title="Periodo siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
