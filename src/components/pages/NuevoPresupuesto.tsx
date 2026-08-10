"use client";

import { useState } from "react";
import Odontograma from "./Odontograma";
import type { BudgetData, LineItem } from "@/lib/patientData";

export type { BudgetData };

const medicos = ["Dr. Nicolás Medina González", "Dra. Ana Paola Ríos Cervantes"];

const tiposDePrecios = ["Consultorio", "Convenio", "Particular", "Seguro Dental"];

const especialidades = [
  "Odontología General",
  "Ortodoncia",
  "Endodoncia",
  "Prótesis",
  "Cirugía Oral",
  "Periodoncia",
  "Estética Dental",
];

const catalogoProcedimientos = [
  { name: "Consulta y diagnóstico", price: 300 },
  { name: "Limpieza dental (profilaxis)", price: 600 },
  { name: "Resina dental", price: 850 },
  { name: "Extracción simple", price: 700 },
  { name: "Corona de porcelana", price: 4500 },
  { name: "Prótesis removible", price: 6800 },
  { name: "Tratamiento de conducto (endodoncia)", price: 3200 },
  { name: "Blanqueamiento dental", price: 2500 },
];

function formatCurrency(value: number) {
  return `$${value.toLocaleString("es-MX")}`;
}

function generateFolio() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function NuevoPresupuesto({
  patientName,
  initialBudget,
  onCancel,
  onSave,
}: {
  patientName: string;
  initialBudget?: BudgetData;
  onCancel: () => void;
  onSave: (budget: BudgetData) => void;
}) {
  const isEditing = Boolean(initialBudget);
  const [folio] = useState(() => initialBudget?.folio ?? generateFolio());
  const [fecha] = useState(() => initialBudget?.fecha ?? todayFormatted());
  const [medico, setMedico] = useState(initialBudget?.medico ?? medicos[0]);
  const [tipoDePrecio, setTipoDePrecio] = useState(initialBudget?.tipoDePrecio ?? tiposDePrecios[0]);
  const [especialidad, setEspecialidad] = useState(initialBudget?.especialidad ?? especialidades[0]);
  const [diagnostico, setDiagnostico] = useState(initialBudget?.diagnostico ?? "");
  const [notaProcedimiento, setNotaProcedimiento] = useState("");
  const [procedimientoSeleccionado, setProcedimientoSeleccionado] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [items, setItems] = useState<LineItem[]>(initialBudget?.items ?? []);

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  const handleAgregarProcedimiento = () => {
    const procedimiento = catalogoProcedimientos.find((p) => p.name === procedimientoSeleccionado);
    if (!procedimiento) return;

    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        procedure: procedimiento.name,
        price: procedimiento.price,
        teeth: selectedTeeth,
        note: notaProcedimiento.trim(),
      },
    ]);
    setProcedimientoSeleccionado("");
    setSelectedTeeth([]);
    setNotaProcedimiento("");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleGuardar = () => {
    if (items.length === 0) return;
    onSave({ folio, fecha, medico, tipoDePrecio, especialidad, diagnostico, items, total });
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleEnviarWhatsApp = () => {
    const lineas = [
      `Presupuesto #${folio}`,
      `Paciente: ${patientName}`,
      `Fecha: ${fecha}`,
      diagnostico && `Diagnóstico y tratamiento: ${diagnostico}`,
      "",
      ...items.map(
        (item) =>
          `- ${item.note || item.procedure}${item.teeth.length ? ` (dientes ${item.teeth.sort((a, b) => a - b).join(", ")})` : ""}: ${formatCurrency(item.price)}`
      ),
      "",
      `Total: ${formatCurrency(total)}`,
    ].filter(Boolean);

    const mensaje = encodeURIComponent(lineas.join("\n"));
    window.open(`https://wa.me/?text=${mensaje}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent print:hidden"
      >
        ← Volver a Presupuestos
      </button>

      <div className="print:hidden">
        <h2 className="text-xl font-semibold text-ink">
          {isEditing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        </h2>
        <p className="mt-1 text-sm text-ink/50">Paciente: {patientName}</p>
      </div>

      <div className="space-y-6 print:hidden">
        <div className="space-y-5 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Médico que presupuesta
            </label>
            <select
              value={medico}
              onChange={(e) => setMedico(e.target.value)}
              className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            >
              {medicos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Tipos de precios
              </label>
              <select
                value={tipoDePrecio}
                onChange={(e) => setTipoDePrecio(e.target.value)}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                {tiposDePrecios.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Materias o especialidades
              </label>
              <select
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                {especialidades.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Diagnóstico y tratamiento
            </label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Describe el diagnóstico y el plan de tratamiento..."
              rows={3}
              className="w-full resize-none rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
            />
          </div>
        </div>

        <Odontograma selectedTeeth={selectedTeeth} onToggleTooth={toggleTooth} />

        <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Órganos dentales a trabajar
            </label>
            <input
              type="text"
              value={notaProcedimiento}
              onChange={(e) => setNotaProcedimiento(e.target.value)}
              placeholder="Ej. OD 16 caries y resina clase I"
              className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Listado de procedimiento
            </label>
            <select
              value={procedimientoSeleccionado}
              onChange={(e) => setProcedimientoSeleccionado(e.target.value)}
              className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            >
              <option value="">Elige un procedimiento</option>
              {catalogoProcedimientos.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} — {formatCurrency(p.price)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAgregarProcedimiento}
            disabled={!procedimientoSeleccionado}
            className="w-full rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Agregar procedimiento
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Resumen de presupuesto
            </h3>
            <p className="mt-1 text-lg font-semibold text-accent">Folio #{folio}</p>
          </div>
          <div className="text-right text-sm text-ink/50">
            <div>{fecha}</div>
            <div>{patientName}</div>
          </div>
        </div>

        {diagnostico && (
          <div className="mt-4 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm text-ink/70">
            <span className="font-medium text-ink/50">Diagnóstico y tratamiento: </span>
            {diagnostico}
          </div>
        )}

        <div className="mt-4">
          {items.length === 0 ? (
            <p className="text-sm text-ink/30">Aún no hay procedimientos agregados.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
                >
                  <div>
                    <div className="text-ink">{item.procedure}</div>
                    {item.note && (
                      <div className="text-xs text-accent/80">{item.note}</div>
                    )}
                    {item.teeth.length > 0 && (
                      <div className="text-xs text-ink/40">
                        Dientes: {item.teeth.sort((a, b) => a - b).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{formatCurrency(item.price)}</span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-ink/30 hover:text-danger print:hidden"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-edge/10 pt-3 text-sm font-semibold">
                <span className="text-ink/60">Costo Total</span>
                <span className="text-lg text-accent">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={handleGuardar}
            disabled={items.length === 0}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? "Guardar Cambios" : "Guardar Presupuesto"}
          </button>
          <button
            onClick={handleImprimir}
            disabled={items.length === 0}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            disabled={items.length === 0}
            className="rounded-lg border border-success/40 px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
