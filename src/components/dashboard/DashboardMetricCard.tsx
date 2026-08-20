"use client";

import type { ReactNode } from "react";
import { usePrivacidad } from "@/context/PrivacidadContext";

/** Franja de acento + resplandor neón muy sutil — mismo tratamiento que el
 * resto de las tarjetas KPI del dashboard (ver Inicio.tsx). */
function neonShadow(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `inset 3px 0 0 0 ${hex}, 0 0 14px -4px rgba(${r}, ${g}, ${b}, 0.55)`;
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Tarjeta KPI reutilizable del Dashboard Principal. `wide` la hace ocupar
 * dos columnas del grid para las tarjetas "destacadas" (ej. Ingresos).
 * `children` permite agregar contenido secundario (desglose, barra de
 * progreso) debajo del valor principal. */
export default function DashboardMetricCard({
  label,
  value,
  color,
  tooltip,
  comparison,
  onClick,
  wide,
  sensible,
  children,
}: {
  label: string;
  value: string;
  color: string;
  tooltip?: string;
  comparison?: { pct: number; favorable: boolean } | null;
  onClick?: () => void;
  wide?: boolean;
  /** true en cifras financieras — se enmascaran cuando el candado de
   * privacidad del Dashboard Principal está cerrado. */
  sensible?: boolean;
  children?: ReactNode;
}) {
  const { oculto } = usePrivacidad();
  const enmascarado = sensible && oculto;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl border border-edge/10 bg-surface p-4 text-left ${wide ? "sm:col-span-2" : ""} ${
        onClick ? "transition-transform hover:-translate-y-0.5" : ""
      }`}
      style={{ boxShadow: neonShadow(color) }}
    >
      <div className="flex items-center gap-1.5">
        <div className={`text-xl font-bold text-ink ${enmascarado ? "blur-[6px] select-none" : ""}`}>
          {enmascarado ? "••••••" : value}
        </div>
        {comparison && !enmascarado && (
          <span
            className={`text-xs font-semibold ${comparison.favorable ? "text-success" : "text-danger"}`}
            title="vs. periodo anterior"
          >
            {comparison.favorable ? "↑" : "↓"} {Math.abs(comparison.pct)}%
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-ink/40">
        {label}
        {tooltip && (
          <span title={tooltip} className="text-ink/30">
            <InfoIcon />
          </span>
        )}
      </div>
      {!enmascarado && children}
    </Wrapper>
  );
}
