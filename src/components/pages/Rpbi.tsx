"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { EmpresaRPBI } from "@/lib/catalogosVarios";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { limpiarTelefono } from "@/lib/depositoDental";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function vacia(): Omit<EmpresaRPBI, "id"> {
  return { nombre: "", telefono: "", correo: "", notas: "" };
}

function EmpresaRpbiDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: EmpresaRPBI | null;
  onClose: () => void;
  onGuardar: (data: Omit<EmpresaRPBI, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<EmpresaRPBI, "id">>(inicial ?? vacia());
  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar Empresa RPBI" : "Nueva Empresa RPBI"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Nombre de la empresa o responsable
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => manejarCambioNombre(e, (v) => setForm((p) => ({ ...p, nombre: v })))}
              placeholder="Ej. Recolectora RPBI del Bajío"
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
                placeholder="Para WhatsApp"
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
              placeholder="Frecuencia de recolección, número de contrato/autorización, etc."
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
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

export default function Rpbi() {
  const { empresasRpbi, setEmpresasRpbi } = usePatientData();
  const [editando, setEditando] = useState<EmpresaRPBI | "nuevo" | null>(null);

  const guardar = (data: Omit<EmpresaRPBI, "id">) => {
    if (editando && editando !== "nuevo") {
      setEmpresasRpbi((prev) => prev.map((e) => (e.id === editando.id ? { ...e, ...data } : e)));
    } else {
      const nueva: EmpresaRPBI = { id: `rpbi${Date.now()}`, ...data };
      setEmpresasRpbi((prev) => [nueva, ...prev]);
    }
    setEditando(null);
  };

  const enviarWhatsApp = (empresa: EmpresaRPBI) => {
    const texto = `Hola, te contacto desde el consultorio para coordinar la recolección de RPBI.`;
    window.open(`https://wa.me/${limpiarTelefono(empresa.telefono)}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-ink/40">
          Empresas o responsables encargados de recolectar los Residuos Peligrosos
          Biológico-Infecciosos (RPBI) de tu consultorio.
        </p>
        <button
          onClick={() => setEditando("nuevo")}
          className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Nueva Empresa RPBI
        </button>
      </div>

      {empresasRpbi.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay empresas de RPBI registradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empresasRpbi.map((e) => (
            <div key={e.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
              <p className="text-sm font-semibold text-ink">{e.nombre}</p>
              {e.telefono && <p className="mt-1 text-xs text-ink/50">{e.telefono}</p>}
              {e.correo && <p className="text-xs text-ink/50">{e.correo}</p>}
              {e.notas && <p className="mt-2 text-xs text-ink/40">{e.notas}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge/10 pt-3">
                {e.telefono && (
                  <button
                    onClick={() => enviarWhatsApp(e)}
                    className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10"
                  >
                    <WhatsAppIcon />
                    WhatsApp
                  </button>
                )}
                <button
                  onClick={() => setEditando(e)}
                  className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                >
                  Editar
                </button>
                <button
                  onClick={() => setEmpresasRpbi((prev) => prev.filter((x) => x.id !== e.id))}
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
        <EmpresaRpbiDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </div>
  );
}
