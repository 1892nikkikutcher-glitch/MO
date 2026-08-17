"use client";

import { useState } from "react";
import { elegirColorDisponible, RECURSO_COLOR_PALETTE, type Recurso } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { inputClass } from "@/lib/agendaHelpers";

export default function AgendaRecursoDialog({
  inicial,
  coloresEnUso,
  onClose,
  onSave,
}: {
  inicial?: Recurso;
  coloresEnUso: string[];
  onClose: () => void;
  onSave: (recurso: { nombre: string; tipo: "medico" | "unidad"; color: string }) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [tipo, setTipo] = useState<"medico" | "unidad">(inicial?.tipo ?? "medico");
  const [color, setColor] = useState(() => inicial?.color ?? elegirColorDisponible(coloresEnUso));

  const puedeGuardar = nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar Recurso" : "Nuevo Recurso"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Un recurso puede ser un médico o una unidad/consultorio — lo importante es cómo organizas
          tu agenda.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tipo</label>
            <div className="flex gap-2">
              {(["medico", "unidad"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    tipo === t
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-edge/15 text-ink/50 hover:border-accent/40"
                  }`}
                >
                  {t === "medico" ? "Médico" : "Unidad"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => (tipo === "medico" ? manejarCambioNombre(e, setNombre) : setNombre(e.target.value))}
              placeholder={tipo === "medico" ? "Ej. Dra. Fernanda Ruiz" : "Ej. Unidad 3 · Consultorio C"}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Color de identificación en agenda
            </label>
            <p className="mb-1.5 text-[11px] text-ink/40">
              Se utilizará para identificar visualmente al médico o unidad en las citas.
            </p>
            <div className="flex flex-wrap gap-2">
              {RECURSO_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "rgb(var(--ink-rgb))" : "transparent",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onSave({ nombre: nombre.trim(), tipo, color })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inicial ? "Guardar" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
