"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { Contador } from "@/lib/catalogosVarios";
import { formatCurrency } from "@/lib/patientData";
import { inicioMes, sumarRango } from "@/lib/metas";
import { limpiarTelefono } from "@/lib/depositoDental";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

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

function vacio(): Omit<Contador, "id"> {
  return { despacho: "", contador: "", telefono: "", correo: "", notas: "" };
}

function ContadorDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Contador | null;
  onClose: () => void;
  onGuardar: (data: Omit<Contador, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Contador, "id">>(inicial ?? vacio());
  const puedeGuardar = form.despacho.trim().length > 0 || form.contador.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-8 w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar Contador" : "Nuevo Contador"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-ink/40">Llena despacho, contador, o ambos.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Despacho</label>
              <input
                type="text"
                value={form.despacho}
                onChange={(e) => setForm((p) => ({ ...p, despacho: e.target.value }))}
                placeholder="Ej. Contadores Asociados"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Contador</label>
              <input
                type="text"
                value={form.contador}
                onChange={(e) => setForm((p) => ({ ...p, contador: e.target.value }))}
                placeholder="Nombre de la persona"
                className={inputClass}
              />
            </div>
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
              rows={2}
              placeholder="RFC del consultorio, régimen fiscal, condiciones..."
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
            onClick={() =>
              puedeGuardar &&
              onGuardar({ ...form, despacho: form.despacho.trim(), contador: form.contador.trim() })
            }
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

function tituloContador(c: Contador): string {
  if (c.despacho && c.contador) return `${c.despacho} — ${c.contador}`;
  return c.despacho || c.contador || "(sin nombre)";
}

export default function Contabilidad() {
  const { contadores, setContadores, puedeVerFinanzas, finanzas, gastos } = usePatientData();
  const [editando, setEditando] = useState<Contador | "nuevo" | null>(null);
  const [contadorAEliminar, setContadorAEliminar] = useState<Contador | null>(null);

  const guardar = (data: Omit<Contador, "id">) => {
    if (editando && editando !== "nuevo") {
      setContadores((prev) => prev.map((c) => (c.id === editando.id ? { id: c.id, ...data } : c)));
    } else {
      const nuevo: Contador = { id: `contador${Date.now()}`, ...data };
      setContadores((prev) => [nuevo, ...prev]);
    }
    setEditando(null);
  };

  const enviarWhatsApp = (contador: Contador, texto: string) => {
    window.open(`https://wa.me/${limpiarTelefono(contador.telefono)}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const hoy = new Date();
  const inicioMesActual = inicioMes(hoy);
  const ingresosMes = sumarRango(finanzas.porFecha, inicioMesActual, hoy);
  const mesActualKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const gastosMes = gastos
    .filter((g) => g.fecha.slice(0, 7) === mesActualKey)
    .reduce((sum, g) => sum + g.monto, 0);

  const contadorConTelefono = contadores.find((c) => c.telefono);
  const enviarResumen = () => {
    if (!contadorConTelefono) return;
    const mesLabel = hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const texto = `Resumen de ${mesLabel} para contabilidad:\nIngresos: ${formatCurrency(
      ingresosMes
    )}\nGastos: ${formatCurrency(gastosMes)}`;
    enviarWhatsApp(contadorConTelefono, texto);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Contador</h3>
          <button
            onClick={() => setEditando("nuevo")}
            className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nuevo Contador
          </button>
        </div>

        {contadores.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            Aún no registras a tu contador o despacho contable.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contadores.map((c) => (
              <div key={c.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
                <p className="text-sm font-semibold text-ink">{tituloContador(c)}</p>
                {c.telefono && <p className="mt-1 text-xs text-ink/50">{c.telefono}</p>}
                {c.correo && <p className="text-xs text-ink/50">{c.correo}</p>}
                {c.notas && <p className="mt-2 text-xs text-ink/40">{c.notas}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge/10 pt-3">
                  {c.telefono && (
                    <button
                      onClick={() => enviarWhatsApp(c, "Hola, te contacto desde el consultorio.")}
                      className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10"
                    >
                      <WhatsAppIcon />
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => setEditando(c)}
                    className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setContadorAEliminar(c)}
                    className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {puedeVerFinanzas && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Resumen para contabilidad
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Ingresos y gastos de este mes, para compartir con tu contador. Más adelante este módulo
            podrá separar automáticamente qué ingresos requieren factura, una vez que capturemos la
            constancia de situación fiscal de los pacientes que la piden.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-edge/10 bg-surface p-5">
              <div className="text-xl font-bold text-ink">{formatCurrency(ingresosMes)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">
                Ingresos de Este Mes
              </div>
            </div>
            <div className="rounded-2xl border border-edge/10 bg-surface p-5">
              <div className="text-xl font-bold text-ink">{formatCurrency(gastosMes)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">
                Gastos de Este Mes
              </div>
            </div>
          </div>
          {contadorConTelefono && (
            <button
              onClick={enviarResumen}
              className="mt-4 flex items-center gap-2 rounded-lg border border-success/40 px-4 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10"
            >
              <WhatsAppIcon />
              Enviar resumen del mes a {tituloContador(contadorConTelefono)}
            </button>
          )}
        </div>
      )}

      {editando && (
        <ContadorDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}

      {contadorAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este contador?"
          mensaje={`Vas a eliminar "${tituloContador(contadorAEliminar)}" del catálogo. Esta acción no se puede deshacer.`}
          onCancel={() => setContadorAEliminar(null)}
          onConfirm={() => {
            setContadores((prev) => prev.filter((x) => x.id !== contadorAEliminar.id));
            setContadorAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
