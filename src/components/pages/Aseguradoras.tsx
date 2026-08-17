"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { Aseguradora } from "@/lib/catalogosVarios";
import { manejarCambioNombre } from "@/lib/textoNombre";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function vacia(): Omit<Aseguradora, "id"> {
  return { nombre: "", contacto: "", telefono: "", correo: "", notas: "" };
}

function AseguradoraDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Aseguradora | null;
  onClose: () => void;
  onGuardar: (data: Omit<Aseguradora, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Aseguradora, "id">>(inicial ?? vacia());
  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{inicial ? "Editar Aseguradora" : "Nueva Aseguradora"}</h3>
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
              placeholder="Ej. GNP Seguros"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Contacto</label>
            <input
              type="text"
              value={form.contacto}
              onChange={(e) => manejarCambioNombre(e, (v) => setForm((p) => ({ ...p, contacto: v })))}
              placeholder="Nombre del ejecutivo/agente"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Correo</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              rows={3}
              placeholder="Coberturas, condiciones, procedimiento para reembolsos..."
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onGuardar({ ...form, nombre: form.nombre.trim() })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Aseguradoras() {
  const { aseguradoras, setAseguradoras } = usePatientData();
  const [editando, setEditando] = useState<Aseguradora | "nuevo" | null>(null);
  const [aseguradoraAEliminar, setAseguradoraAEliminar] = useState<Aseguradora | null>(null);

  const guardar = (data: Omit<Aseguradora, "id">) => {
    if (editando && editando !== "nuevo") {
      setAseguradoras((prev) => prev.map((a) => (a.id === editando.id ? { ...a, ...data } : a)));
    } else {
      const nueva: Aseguradora = { id: `aseg${Date.now()}`, ...data };
      setAseguradoras((prev) => [nueva, ...prev]);
    }
    setEditando(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/40">Aseguradoras con las que trabajas o has trabajado.</p>
        <button
          onClick={() => setEditando("nuevo")}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Nueva Aseguradora
        </button>
      </div>

      {aseguradoras.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay aseguradoras registradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aseguradoras.map((a) => (
            <div key={a.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
              <p className="text-sm font-semibold text-ink">{a.nombre}</p>
              {a.contacto && <p className="mt-1 text-xs text-ink/50">{a.contacto}</p>}
              {a.telefono && <p className="text-xs text-ink/50">{a.telefono}</p>}
              {a.correo && <p className="text-xs text-ink/50">{a.correo}</p>}
              {a.notas && <p className="mt-2 text-xs text-ink/40">{a.notas}</p>}
              <div className="mt-3 flex items-center gap-2 border-t border-edge/10 pt-3">
                <button onClick={() => setEditando(a)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2">
                  Editar
                </button>
                <button
                  onClick={() => setAseguradoraAEliminar(a)}
                  className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <AseguradoraDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}

      {aseguradoraAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta aseguradora?"
          mensaje={`Vas a eliminar "${aseguradoraAEliminar.nombre}" del catálogo. Esta acción no se puede deshacer.`}
          onCancel={() => setAseguradoraAEliminar(null)}
          onConfirm={() => {
            setAseguradoras((prev) => prev.filter((x) => x.id !== aseguradoraAEliminar.id));
            setAseguradoraAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
