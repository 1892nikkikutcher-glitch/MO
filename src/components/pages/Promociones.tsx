"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { promocionVigente, type Promocion } from "@/lib/catalogosVarios";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function promocionVacia(): Omit<Promocion, "id"> {
  return { nombre: "", descripcion: "", descuento: "", vigenciaInicio: "", vigenciaFin: "", activa: true };
}

function PromocionDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Promocion | null;
  onClose: () => void;
  onGuardar: (data: Omit<Promocion, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Promocion, "id">>(inicial ?? promocionVacia());
  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{inicial ? "Editar Promoción" : "Nueva Promoción"}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Limpieza + revisión gratis"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Descuento</label>
            <input
              type="text"
              value={form.descuento}
              onChange={(e) => setForm((p) => ({ ...p, descuento: e.target.value }))}
              placeholder="Ej. 20% o $200"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia desde</label>
              <input
                type="date"
                value={form.vigenciaInicio}
                onChange={(e) => setForm((p) => ({ ...p, vigenciaInicio: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia hasta</label>
              <input
                type="date"
                value={form.vigenciaFin}
                onChange={(e) => setForm((p) => ({ ...p, vigenciaFin: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))}
            />
            Promoción activa
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onGuardar({ ...form, nombre: form.nombre.trim() })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Promociones() {
  const { promociones, setPromociones } = usePatientData();
  const [editando, setEditando] = useState<Promocion | "nuevo" | null>(null);
  const hoy = hoyISO();

  const guardar = (data: Omit<Promocion, "id">) => {
    if (editando && editando !== "nuevo") {
      setPromociones((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...data } : p)));
    } else {
      const nueva: Promocion = { id: `promo${Date.now()}`, ...data };
      setPromociones((prev) => [nueva, ...prev]);
    }
    setEditando(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/40">Ofertas y descuentos que puedes mencionar a tus pacientes.</p>
        <button
          onClick={() => setEditando("nuevo")}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          + Nueva Promoción
        </button>
      </div>

      {promociones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay promociones creadas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promociones.map((p) => {
            const vigente = promocionVigente(p, hoy);
            return (
              <div key={p.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      vigente ? "bg-success/10 text-success" : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    {vigente ? "Vigente" : "No vigente"}
                  </span>
                </div>
                {p.descuento && <p className="mt-1 text-lg font-bold text-accent">{p.descuento}</p>}
                {p.descripcion && <p className="mt-1 text-xs text-ink/50">{p.descripcion}</p>}
                {(p.vigenciaInicio || p.vigenciaFin) && (
                  <p className="mt-2 text-[11px] text-ink/40">
                    {p.vigenciaInicio || "…"} — {p.vigenciaFin || "…"}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-edge/10 pt-3">
                  <button onClick={() => setEditando(p)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2">
                    Editar
                  </button>
                  <button
                    onClick={() => setPromociones((prev) => prev.filter((x) => x.id !== p.id))}
                    className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <PromocionDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </div>
  );
}
