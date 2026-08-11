"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import {
  especialidadesPredefinidas,
  agruparPorEspecialidad,
  formatDuracion,
  type Procedimiento,
} from "@/lib/procedimientos";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function procedimientoVacio(): Omit<Procedimiento, "id"> {
  return {
    nombre: "",
    especialidad: especialidadesPredefinidas[0],
    costoPaciente: 0,
    costoOdontologo: 0,
    duracionMinutos: 30,
  };
}

function ProcedimientoDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Procedimiento | null;
  onClose: () => void;
  onGuardar: (data: Omit<Procedimiento, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Procedimiento, "id">>(inicial ?? procedimientoVacio());
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState(
    inicial && !(especialidadesPredefinidas as readonly string[]).includes(inicial.especialidad)
      ? inicial.especialidad
      : ""
  );
  const usaOtra = !(especialidadesPredefinidas as readonly string[]).includes(form.especialidad);

  const puedeGuardar =
    form.nombre.trim().length > 0 && (!usaOtra || especialidadPersonalizada.trim().length > 0);

  const guardar = () => {
    onGuardar({
      ...form,
      nombre: form.nombre.trim(),
      especialidad: usaOtra ? especialidadPersonalizada.trim() : form.especialidad,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar procedimiento" : "Agregar procedimiento"}
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
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre del procedimiento</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Limpieza dental (profilaxis)"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Especialidad</label>
              <select
                value={usaOtra ? "__otra__" : form.especialidad}
                onChange={(e) => {
                  if (e.target.value === "__otra__") {
                    setForm((prev) => ({ ...prev, especialidad: especialidadPersonalizada || "" }));
                  } else {
                    setForm((prev) => ({ ...prev, especialidad: e.target.value }));
                  }
                }}
                className={inputClass}
              >
                {especialidadesPredefinidas.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
                <option value="__otra__">Otra especialidad...</option>
              </select>
            </div>
            {usaOtra && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">¿Cuál?</label>
                <input
                  type="text"
                  value={especialidadPersonalizada}
                  onChange={(e) => setEspecialidadPersonalizada(e.target.value)}
                  placeholder="Ej. Odontología del deporte"
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo al paciente</label>
              <input
                type="number"
                min={0}
                value={form.costoPaciente}
                onChange={(e) => setForm((prev) => ({ ...prev, costoPaciente: Number(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo al odontólogo</label>
              <input
                type="number"
                min={0}
                value={form.costoOdontologo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, costoOdontologo: Number(e.target.value) || 0 }))
                }
                className={inputClass}
                title="Lo que le corresponde al odontólogo por este procedimiento (comisión)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Tiempo estimado (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.duracionMinutos}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duracionMinutos: Number(e.target.value) || 5 }))
                }
                className={inputClass}
              />
            </div>
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
            onClick={guardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Procedimientos() {
  const { miRol, procedimientos, setProcedimientos } = usePatientData();
  const [editando, setEditando] = useState<Procedimiento | "nuevo" | null>(null);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar los procedimientos.
      </div>
    );
  }

  const guardarProcedimiento = (data: Omit<Procedimiento, "id">) => {
    if (editando && editando !== "nuevo") {
      setProcedimientos((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...data } : p)));
    } else {
      const nuevo: Procedimiento = { id: `proc${Date.now()}`, ...data };
      setProcedimientos((prev) => [...prev, nuevo]);
    }
    setEditando(null);
  };

  const eliminarProcedimiento = (id: string) => {
    setProcedimientos((prev) => prev.filter((p) => p.id !== id));
  };

  const grupos = agruparPorEspecialidad(procedimientos);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/40">
          Estos valores son la base para presupuestos, comisiones y duración de citas en otras
          áreas de la plataforma.
        </p>
        <button
          onClick={() => setEditando("nuevo")}
          className="shrink-0 rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          + Agregar procedimiento
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no agregas procedimientos.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.especialidad}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                {grupo.especialidad}
              </h3>
              <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
                <div className="grid grid-cols-[1fr_120px_130px_100px_auto] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
                  <span>Procedimiento</span>
                  <span>Costo paciente</span>
                  <span>Costo odontólogo</span>
                  <span>Tiempo</span>
                  <span className="text-right">Acción</span>
                </div>
                <div className="divide-y divide-edge/5">
                  {grupo.procedimientos.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_120px_130px_100px_auto] items-center gap-3 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-ink">{p.nombre}</span>
                      <span className="text-sm text-ink/70">{formatCurrency(p.costoPaciente)}</span>
                      <span className="text-sm text-ink/70">{formatCurrency(p.costoOdontologo)}</span>
                      <span className="text-sm text-ink/70">{formatDuracion(p.duracionMinutos)}</span>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditando(p)}
                          className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarProcedimiento(p.id)}
                          className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <ProcedimientoDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardarProcedimiento}
        />
      )}
    </div>
  );
}
