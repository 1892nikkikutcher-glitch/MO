"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import {
  duracionOptions,
  type BeneficioPlan,
  type BeneficioTipo,
  type DuracionTipo,
  type MembershipPlan,
} from "@/lib/membresias";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function beneficioVacio(): BeneficioPlan {
  return { id: `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`, nombre: "", tipo: "uso", limite: null };
}

function planVacio(): Omit<MembershipPlan, "id"> {
  return {
    nombre: "",
    precio: 0,
    duracionTipo: "anual",
    duracionDiasPersonalizada: 30,
    renovacionAutomatica: false,
    beneficios: [],
    exclusiones: "",
  };
}

function PlanDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: MembershipPlan | null;
  onClose: () => void;
  onGuardar: (plan: Omit<MembershipPlan, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<MembershipPlan, "id">>(inicial ?? planVacio());

  const actualizarBeneficio = (id: string, cambios: Partial<BeneficioPlan>) => {
    setForm((prev) => ({
      ...prev,
      beneficios: prev.beneficios.map((b) => (b.id === id ? { ...b, ...cambios } : b)),
    }));
  };

  const agregarBeneficio = () => {
    const nuevo = beneficioVacio();
    setForm((prev) => ({ ...prev, beneficios: [...prev.beneficios, nuevo] }));
  };

  const quitarBeneficio = (id: string) => {
    setForm((prev) => ({ ...prev, beneficios: prev.beneficios.filter((b) => b.id !== id) }));
  };

  const puedeGuardar = form.nombre.trim().length > 0 && form.precio >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar membresía" : "Crear membresía"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej. Membresía Preventiva"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Precio</label>
              <input
                type="number"
                min={0}
                value={form.precio}
                onChange={(e) => setForm((prev) => ({ ...prev, precio: Number(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia</label>
              <select
                value={form.duracionTipo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duracionTipo: e.target.value as DuracionTipo }))
                }
                className={inputClass}
              >
                {duracionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {form.duracionTipo === "personalizada" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Duración (días)</label>
                <input
                  type="number"
                  min={1}
                  value={form.duracionDiasPersonalizada ?? 30}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, duracionDiasPersonalizada: Number(e.target.value) || 1 }))
                  }
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.renovacionAutomatica}
              onChange={(e) => setForm((prev) => ({ ...prev, renovacionAutomatica: e.target.checked }))}
              className="h-4 w-4 rounded border-edge/30"
            />
            Renovación automática
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-ink/60">
                Beneficios (revisiones, limpiezas, descuentos, promociones...)
              </label>
              <button
                onClick={agregarBeneficio}
                className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
              >
                + Agregar beneficio
              </button>
            </div>

            {form.beneficios.length === 0 && (
              <p className="rounded-lg border border-dashed border-edge/15 p-4 text-center text-xs text-ink/40">
                Sin beneficios todavía — agrega revisiones, limpiezas, descuentos u otros.
              </p>
            )}

            <div className="space-y-3">
              {form.beneficios.map((b) => (
                <div key={b.id} className="rounded-lg border border-edge/10 bg-surface p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                    <input
                      type="text"
                      value={b.nombre}
                      onChange={(e) => actualizarBeneficio(b.id, { nombre: e.target.value })}
                      placeholder="Ej. Limpieza dental"
                      className={inputClass}
                    />
                    <select
                      value={b.tipo}
                      onChange={(e) =>
                        actualizarBeneficio(b.id, { tipo: e.target.value as BeneficioTipo })
                      }
                      className={inputClass}
                    >
                      <option value="uso">Uso limitado</option>
                      <option value="descuento">Descuento</option>
                    </select>
                    {b.tipo === "uso" ? (
                      <input
                        type="number"
                        min={0}
                        value={b.limite ?? ""}
                        placeholder="Ilimitado"
                        onChange={(e) =>
                          actualizarBeneficio(b.id, {
                            limite: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className={`${inputClass} sm:w-28`}
                        title="Veces disponibles durante la vigencia — vacío = ilimitado"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={b.descuentoPorcentaje ?? 0}
                        onChange={(e) =>
                          actualizarBeneficio(b.id, { descuentoPorcentaje: Number(e.target.value) || 0 })
                        }
                        className={`${inputClass} sm:w-24`}
                        title="Porcentaje de descuento"
                      />
                    )}
                    <button
                      onClick={() => quitarBeneficio(b.id)}
                      className="rounded-lg border border-danger/30 px-2 text-xs font-semibold text-danger hover:bg-danger/10"
                    >
                      Quitar
                    </button>
                  </div>
                  {b.tipo === "descuento" && (
                    <input
                      type="text"
                      value={b.tratamientosAplicables ?? ""}
                      onChange={(e) =>
                        actualizarBeneficio(b.id, { tratamientosAplicables: e.target.value })
                      }
                      placeholder="Tratamientos a los que aplica (ej. Resinas, Extracciones)"
                      className={`${inputClass} mt-2`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Exclusiones (qué no participa, promociones no acumulables, etc.)
            </label>
            <textarea
              value={form.exclusiones}
              onChange={(e) => setForm((prev) => ({ ...prev, exclusiones: e.target.value }))}
              rows={3}
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
            onClick={() => puedeGuardar && onGuardar(form)}
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

export default function Membresias() {
  const { miRol, membershipPlanes, setMembershipPlanes } = usePatientData();
  const [editando, setEditando] = useState<MembershipPlan | "nuevo" | null>(null);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar las membresías.
      </div>
    );
  }

  const guardarPlan = (data: Omit<MembershipPlan, "id">) => {
    if (editando && editando !== "nuevo") {
      setMembershipPlanes((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...data } : p)));
    } else {
      const nuevo: MembershipPlan = { id: `plan${Date.now()}`, ...data };
      setMembershipPlanes((prev) => [...prev, nuevo]);
    }
    setEditando(null);
  };

  const eliminarPlan = (id: string) => {
    setMembershipPlanes((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditando("nuevo")}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Crear membresía
        </button>
      </div>

      {membershipPlanes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no tienes membresías configuradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {membershipPlanes.map((plan) => (
            <div key={plan.id} className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{plan.nombre}</h3>
                  <p className="text-xs text-ink/40">
                    {formatCurrency(plan.precio)} ·{" "}
                    {duracionOptions.find((o) => o.value === plan.duracionTipo)?.label}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {plan.beneficios.map((b) => (
                  <p key={b.id} className="text-xs text-ink/60">
                    {b.tipo === "uso"
                      ? `🦷 ${b.nombre} — ${b.limite === null ? "ilimitado" : `${b.limite}x/vigencia`}`
                      : `💰 ${b.nombre} — ${b.descuentoPorcentaje ?? 0}%`}
                  </p>
                ))}
                {plan.beneficios.length === 0 && <p className="text-xs text-ink/30">Sin beneficios</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditando(plan)}
                  className="flex-1 rounded-lg border border-edge/15 py-1.5 text-xs font-semibold text-ink/80 hover:bg-surface2"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarPlan(plan.id)}
                  className="flex-1 rounded-lg border border-danger/30 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <PlanDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardarPlan}
        />
      )}
    </div>
  );
}
