"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { MedicamentoCatalogo, TipoPacienteMedicamento } from "@/lib/medicamentos";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function medicamentoVacio(): Omit<MedicamentoCatalogo, "id"> {
  return { nombre: "", tipoPaciente: "adulto", dosisFrecuencia: "", periodo: "" };
}

function MedicamentoDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: MedicamentoCatalogo | null;
  onClose: () => void;
  onGuardar: (data: Omit<MedicamentoCatalogo, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<MedicamentoCatalogo, "id">>(inicial ?? medicamentoVacio());

  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{inicial ? "Editar medicamento" : "Agregar medicamento"}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tipo de paciente</label>
            <div className="flex gap-2">
              {(["adulto", "pediatrico"] as TipoPacienteMedicamento[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((prev) => ({ ...prev, tipoPaciente: t }))}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    form.tipoPaciente === t ? "border-accent bg-accent/15 text-accent" : "border-edge/15 text-ink/50 hover:border-accent/40"
                  }`}
                >
                  {t === "adulto" ? "Adulto" : "Pediátrico (dosis por peso)"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Medicamento - presentación</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. AMOXICILINA SUSPENSIÓN 250mg/5ml"
              className={inputClass}
            />
          </div>

          {form.tipoPaciente === "adulto" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Dosis - Frecuencia</label>
                <input
                  type="text"
                  value={form.dosisFrecuencia ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, dosisFrecuencia: e.target.value }))}
                  placeholder="Ej. Tomar una tableta cada ocho horas"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Periodo</label>
                <input
                  type="text"
                  value={form.periodo ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodo: e.target.value }))}
                  placeholder="Ej. Durante cinco días"
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Dosis mín. (mg/kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.mgPorKgMin ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, mgPorKgMin: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Dosis máx. (mg/kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.mgPorKgMax ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, mgPorKgMax: Number(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Frecuencia</label>
                  <input
                    type="text"
                    value={form.frecuenciaPediatrica ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, frecuenciaPediatrica: e.target.value }))}
                    placeholder="Ej. cada 8 horas"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Duración</label>
                  <input
                    type="text"
                    value={form.duracionPediatrica ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, duracionPediatrica: e.target.value }))}
                    placeholder="Ej. durante 7 días"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Dosis máxima por toma (mg)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.dosisMaximaMg ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, dosisMaximaMg: Number(e.target.value) || undefined }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Concentración</label>
                  <input
                    type="text"
                    value={form.concentracion ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, concentracion: e.target.value }))}
                    placeholder="Ej. 250 mg / 5 ml"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onGuardar(form)}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Medicamentos() {
  const { miRol, catalogoMedicamentos, setCatalogoMedicamentos } = usePatientData();
  const [editando, setEditando] = useState<MedicamentoCatalogo | "nuevo" | null>(null);
  const [medicamentoAEliminar, setMedicamentoAEliminar] = useState<MedicamentoCatalogo | null>(null);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar los medicamentos.
      </div>
    );
  }

  const guardarMedicamento = (data: Omit<MedicamentoCatalogo, "id">) => {
    if (editando && editando !== "nuevo") {
      setCatalogoMedicamentos((prev) => prev.map((m) => (m.id === editando.id ? { ...m, ...data } : m)));
    } else {
      const nuevo: MedicamentoCatalogo = { id: `med${Date.now()}`, ...data };
      setCatalogoMedicamentos((prev) => [...prev, nuevo]);
    }
    setEditando(null);
  };

  const eliminarMedicamento = (id: string) => {
    setCatalogoMedicamentos((prev) => prev.filter((m) => m.id !== id));
  };

  const adultos = catalogoMedicamentos.filter((m) => m.tipoPaciente === "adulto");
  const pediatricos = catalogoMedicamentos.filter((m) => m.tipoPaciente === "pediatrico");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-xs text-ink/40">
          Este catálogo alimenta el buscador de medicamentos en Recetas. Los de tipo pediátrico calculan
          la dosis a partir del peso del paciente — verifica siempre el resultado antes de recetar.
        </p>
        <button
          onClick={() => setEditando("nuevo")}
          className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar medicamento
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Adulto</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {adultos.map((m) => (
            <div key={m.id} className="min-w-0 rounded-lg border border-edge/10 bg-surface p-3 text-sm">
              <p className="break-words font-medium text-ink">{m.nombre}</p>
              <p className="mt-0.5 text-ink/60">
                {m.dosisFrecuencia}
                {m.periodo && `. ${m.periodo}`}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEditando(m)} className="text-xs font-semibold text-ink/60 hover:text-ink">
                  Editar
                </button>
                <button onClick={() => setMedicamentoAEliminar(m)} className="text-xs font-semibold text-danger hover:text-danger">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {adultos.length === 0 && <p className="text-xs text-ink/30">Sin medicamentos de adulto.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
          Pediátrico (dosis por peso)
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pediatricos.map((m) => (
            <div key={m.id} className="min-w-0 rounded-lg border border-edge/10 bg-surface p-3 text-sm">
              <p className="break-words font-medium text-ink">{m.nombre}</p>
              <p className="mt-0.5 text-ink/60">
                {m.mgPorKgMin}–{m.mgPorKgMax} mg/kg, {m.frecuenciaPediatrica}, {m.duracionPediatrica}
              </p>
              {m.dosisMaximaMg && <p className="text-xs text-ink/40">Máximo {m.dosisMaximaMg} mg por toma</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEditando(m)} className="text-xs font-semibold text-ink/60 hover:text-ink">
                  Editar
                </button>
                <button onClick={() => setMedicamentoAEliminar(m)} className="text-xs font-semibold text-danger hover:text-danger">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {pediatricos.length === 0 && <p className="text-xs text-ink/30">Sin medicamentos pediátricos.</p>}
        </div>
      </div>

      {editando && (
        <MedicamentoDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardarMedicamento}
        />
      )}

      {medicamentoAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este medicamento?"
          mensaje={`Vas a eliminar "${medicamentoAEliminar.nombre}" del catálogo. Esta acción no se puede deshacer.`}
          onCancel={() => setMedicamentoAEliminar(null)}
          onConfirm={() => {
            eliminarMedicamento(medicamentoAEliminar.id);
            setMedicamentoAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
