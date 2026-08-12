"use client";

import { useState } from "react";
import Odontograma from "./Odontograma";
import { usePatientData } from "@/context/PatientDataContext";
import { agruparPorEspecialidad, especialidadesPredefinidas, type Procedimiento } from "@/lib/procedimientos";
import type { BudgetData, LineItem } from "@/lib/patientData";

export type { BudgetData };

const tiposDePrecios = ["Consultorio", "Convenio", "Particular", "Seguro Dental"];

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
  planTratamientoSugerido,
  onCancel,
  onSave,
}: {
  patientName: string;
  initialBudget?: BudgetData;
  planTratamientoSugerido?: string;
  onCancel: () => void;
  onSave: (budget: BudgetData) => void;
}) {
  const { recursos, procedimientos, setProcedimientos } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const gruposProcedimientos = agruparPorEspecialidad(procedimientos);

  const isEditing = Boolean(initialBudget);
  const [folio] = useState(() => initialBudget?.folio ?? generateFolio());
  const [fecha] = useState(() => initialBudget?.fecha ?? todayFormatted());
  const [medico, setMedico] = useState(initialBudget?.medico ?? medicos[0]?.nombre ?? "");
  const [tipoDePrecio, setTipoDePrecio] = useState(initialBudget?.tipoDePrecio ?? tiposDePrecios[0]);
  const [especialidad, setEspecialidad] = useState(
    initialBudget?.especialidad ?? especialidadesPredefinidas[0]
  );
  const [diagnostico, setDiagnostico] = useState(initialBudget?.diagnostico ?? "");
  const [mostrarSugerenciasDiagnostico, setMostrarSugerenciasDiagnostico] = useState(false);
  const [notaProcedimiento, setNotaProcedimiento] = useState("");
  const [procedimientoSeleccionadoId, setProcedimientoSeleccionadoId] = useState("");
  const [personalizadoNombre, setPersonalizadoNombre] = useState("");
  const [personalizadoPrecio, setPersonalizadoPrecio] = useState("");
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [items, setItems] = useState<LineItem[]>(initialBudget?.items ?? []);

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  const agregarItem = (procedure: string, price: number) => {
    setItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, procedure, price, teeth: selectedTeeth, note: notaProcedimiento.trim() },
    ]);
    setSelectedTeeth([]);
    setNotaProcedimiento("");
  };

  const handleAgregarDelCatalogo = () => {
    const procedimiento = procedimientos.find((p) => p.id === procedimientoSeleccionadoId);
    if (!procedimiento) return;
    agregarItem(procedimiento.nombre, procedimiento.costoPaciente);
    setProcedimientoSeleccionadoId("");
  };

  const handleAgregarPersonalizado = () => {
    const nombre = personalizadoNombre.trim();
    const precio = Number(personalizadoPrecio);
    if (!nombre || !precio) return;
    agregarItem(nombre, precio);
    setPersonalizadoNombre("");
    setPersonalizadoPrecio("");
    setMostrarPersonalizado(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const diagnosticoTrim = diagnostico.trim();
  const sugerenciasDiagnostico =
    diagnosticoTrim.length > 0
      ? procedimientos
          .filter(
            (p) =>
              p.nombre.toLowerCase().includes(diagnosticoTrim.toLowerCase()) &&
              p.nombre.trim().toLowerCase() !== diagnosticoTrim.toLowerCase()
          )
          .slice(0, 6)
      : [];

  /** El diagnóstico y tratamiento se guarda como un procedimiento más del
   * catálogo (mismo concepto, solo con nombre distinto) para poder
   * consultarlo y reutilizarlo en presupuestos futuros — como una "skill"
   * que se va acumulando con el uso, sin tener que volver a redactarlo. */
  const guardarDiagnosticoEnCatalogoSiEsNuevo = () => {
    if (!diagnosticoTrim) return;
    const yaExiste = procedimientos.some(
      (p) => p.nombre.trim().toLowerCase() === diagnosticoTrim.toLowerCase()
    );
    if (yaExiste) return;
    const nuevo: Procedimiento = {
      id: `diag${Date.now()}`,
      nombre: diagnosticoTrim,
      especialidad,
      costoPaciente: 0,
      costoOdontologo: 0,
      duracionMinutos: 0,
    };
    setProcedimientos((prev) => [...prev, nuevo]);
  };

  const handleGuardar = () => {
    if (items.length === 0) return;
    guardarDiagnosticoEnCatalogoSiEsNuevo();
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
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
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
                {especialidadesPredefinidas.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEditing && planTratamientoSugerido && !diagnostico && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-ink/70">
              <p className="mb-1 font-semibold text-accent">
                Hay un plan de tratamiento en la Historia Clínica de este paciente
              </p>
              <p className="whitespace-pre-line text-ink/60">{planTratamientoSugerido}</p>
              <button
                type="button"
                onClick={() => setDiagnostico(planTratamientoSugerido)}
                className="mt-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                Usarlo como diagnóstico y tratamiento
              </button>
            </div>
          )}

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Diagnóstico y tratamiento
            </label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              onFocus={() => setMostrarSugerenciasDiagnostico(true)}
              onBlur={() => setTimeout(() => setMostrarSugerenciasDiagnostico(false), 150)}
              placeholder="Describe el diagnóstico y el plan de tratamiento... — se guarda para poder reutilizarlo después"
              rows={3}
              className="w-full resize-none rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
            />
            {mostrarSugerenciasDiagnostico && sugerenciasDiagnostico.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-edge/10 bg-field shadow-card">
                {sugerenciasDiagnostico.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDiagnostico(p.nombre)}
                    className="block w-full border-b border-edge/5 px-3 py-2 text-left text-sm text-ink/80 last:border-0 hover:bg-surface"
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}
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

          {procedimientos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge/15 p-3 text-xs text-ink/40">
              Aún no hay procedimientos en tu catálogo — configúralos en Administración →
              Procedimientos para que aparezcan aquí. Por ahora puedes agregar uno personalizado.
            </p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Listado de procedimiento
              </label>
              <select
                value={procedimientoSeleccionadoId}
                onChange={(e) => setProcedimientoSeleccionadoId(e.target.value)}
                className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              >
                <option value="">Elige un procedimiento</option>
                {gruposProcedimientos.map((grupo) => (
                  <optgroup key={grupo.especialidad} label={grupo.especialidad}>
                    {grupo.procedimientos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {formatCurrency(p.costoPaciente)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {procedimientos.length > 0 && (
            <button
              onClick={handleAgregarDelCatalogo}
              disabled={!procedimientoSeleccionadoId}
              className="w-full rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Agregar procedimiento
            </button>
          )}

          {!mostrarPersonalizado ? (
            <button
              onClick={() => setMostrarPersonalizado(true)}
              className="text-xs font-semibold text-ink/50 hover:text-ink"
            >
              + Agregar procedimiento personalizado (no está en el catálogo)
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-edge/15 p-3">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  type="text"
                  value={personalizadoNombre}
                  onChange={(e) => setPersonalizadoNombre(e.target.value)}
                  placeholder="Nombre del procedimiento"
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                />
                <input
                  type="number"
                  min={0}
                  value={personalizadoPrecio}
                  onChange={(e) => setPersonalizadoPrecio(e.target.value)}
                  placeholder="Precio"
                  className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAgregarPersonalizado}
                  disabled={!personalizadoNombre.trim() || !Number(personalizadoPrecio)}
                  className="flex-1 rounded-lg border border-accent/40 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Agregar
                </button>
                <button
                  onClick={() => {
                    setMostrarPersonalizado(false);
                    setPersonalizadoNombre("");
                    setPersonalizadoPrecio("");
                  }}
                  className="rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-surface"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
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
