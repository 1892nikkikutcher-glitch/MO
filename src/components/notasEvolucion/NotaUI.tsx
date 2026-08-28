"use client";

/** Primitivas visuales compartidas por las 6 secciones de "Registrar
 * atención de hoy" — mismos tokens ya usados en el resto de MO (bg-surface,
 * text-ink, accent, border-edge/10), nada nuevo. */

import type { ReactNode } from "react";
import type { EstadoSeccion, SeccionNota } from "@/lib/notasEvolucion";

export const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";
export const labelClass = "mb-1 block text-xs font-medium text-ink/60";
export const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const botonSecundario =
  "rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export function Chip({
  seleccionado,
  onClick,
  children,
}: {
  seleccionado: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        seleccionado
          ? "border-accent/60 bg-accent/15 text-accent"
          : "border-edge/15 bg-field text-ink/60 hover:border-edge/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const iconoEstadoSeccion: Record<EstadoSeccion, string> = {
  pendiente: "○",
  completa: "✓",
  atencion: "⚠",
};
const colorEstadoSeccion: Record<EstadoSeccion, string> = {
  pendiente: "text-ink/30",
  completa: "text-success",
  atencion: "text-warning",
};

export function SeccionAcordeon({
  id,
  titulo,
  subtitulo,
  estado,
  activa,
  onSeleccionar,
  children,
}: {
  id: SeccionNota;
  titulo: string;
  subtitulo?: string;
  estado: EstadoSeccion;
  activa: boolean;
  onSeleccionar: (id: SeccionNota) => void;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border ${activa ? "border-accent/40" : "border-edge/10"} bg-surface`}>
      <button
        type="button"
        onClick={() => onSeleccionar(id)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base ${colorEstadoSeccion[estado]}`}>{iconoEstadoSeccion[estado]}</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{titulo}</span>
          {subtitulo && <span className="block text-xs text-ink/50">{subtitulo}</span>}
        </span>
        <span className="text-ink/40">{activa ? "▲" : "▼"}</span>
      </button>
      {activa && <div className="space-y-3 border-t border-edge/10 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

export function EstadoGuardadoIndicador({
  estado,
  onReintentar,
}: {
  estado: "guardando" | "guardado" | "sin_conexion_local" | "pendiente_sincronizar" | "error_sincronizacion";
  onReintentar: () => void;
}) {
  const textos: Record<typeof estado, string> = {
    guardando: "Guardando…",
    guardado: "Guardado",
    sin_conexion_local: "Sin conexión — tus cambios están protegidos en este dispositivo",
    pendiente_sincronizar: "Cambios pendientes de sincronizar",
    error_sincronizacion: "Error de sincronización",
  };
  const colores: Record<typeof estado, string> = {
    guardando: "text-ink/40",
    guardado: "text-success",
    sin_conexion_local: "text-warning",
    pendiente_sincronizar: "text-ink/50",
    error_sincronizacion: "text-danger",
  };
  return (
    <div className={`flex items-center gap-2 text-xs ${colores[estado]}`}>
      <span>{textos[estado]}</span>
      {estado === "error_sincronizacion" && (
        <button type="button" onClick={onReintentar} className="font-semibold underline hover:no-underline">
          Volver a intentar
        </button>
      )}
    </div>
  );
}
