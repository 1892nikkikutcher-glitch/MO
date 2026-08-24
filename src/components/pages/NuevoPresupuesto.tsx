"use client";

import { useState } from "react";
import Odontograma from "./Odontograma";
import PresupuestoImpreso from "./PresupuestoImpreso";
import { usePatientData } from "@/context/PatientDataContext";
import { agruparPorEspecialidad, especialidadesPredefinidas, type Procedimiento } from "@/lib/procedimientos";
import { generarPresupuestoPdf } from "@/lib/generarPresupuestoPdf";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import { slugify } from "@/lib/textoNombre";
import type { BudgetData, LineItem, Patient } from "@/lib/patientData";

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

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function NuevoPresupuesto({
  patient,
  initialBudget,
  planTratamientoSugerido,
  onCancel,
  onSave,
}: {
  patient: Patient;
  initialBudget?: BudgetData;
  planTratamientoSugerido?: string;
  onCancel: () => void;
  onSave: (budget: BudgetData) => void;
}) {
  const patientName = patient.name;
  const { recursos, procedimientos, setProcedimientos, perfilDoctor, irAPagina } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const gruposProcedimientos = agruparPorEspecialidad(procedimientos);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  const isEditing = Boolean(initialBudget);
  const [folio] = useState(() => initialBudget?.folio ?? generateFolio());
  const [fecha] = useState(() => initialBudget?.fecha ?? todayFormatted());
  const [medico, setMedico] = useState(initialBudget?.medico ?? medicos[0]?.nombre ?? "");
  const [tipoDePrecio, setTipoDePrecio] = useState(initialBudget?.tipoDePrecio ?? tiposDePrecios[0]);
  const [especialidad, setEspecialidad] = useState(
    initialBudget?.especialidad ?? especialidadesPredefinidas[0]
  );
  const diagnostico = initialBudget?.diagnostico ?? "";
  const [notaProcedimiento, setNotaProcedimiento] = useState("");
  /** Se pueden marcar varios procedimientos a la vez (ej. acceso e
   * instrumentación + instrumentación y obturación + corona, todo en el
   * mismo OD 16) — "Agregar procedimiento" los agrega como renglones
   * independientes de una sola vez, todos con los mismos dientes marcados. */
  const [procedimientosSeleccionadosIds, setProcedimientosSeleccionadosIds] = useState<string[]>([]);
  const toggleProcedimientoSeleccionado = (id: string) => {
    setProcedimientosSeleccionadosIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const [personalizadoNombre, setPersonalizadoNombre] = useState("");
  const [personalizadoPrecio, setPersonalizadoPrecio] = useState("");
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [descuentoPct, setDescuentoPct] = useState("");
  const [items, setItems] = useState<LineItem[]>(initialBudget?.items ?? []);
  /** Id del renglón que se está editando (null = capturando uno nuevo). La
   * edición reutiliza el mismo formulario de "procedimiento no catalogado"
   * (nombre + precio libres) sin importar si el renglón se agregó
   * originalmente desde el catálogo o no — así se puede corregir cualquier
   * renglón, por ejemplo para agregar el OD que se te olvidó marcar. */
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  /** El precio siempre se multiplica por la cantidad de dientes marcados en
   * el odontograma (ej. una resina en 3 piezas cuesta 3 veces el precio
   * unitario) — "Precio Unitario" es siempre el precio por diente. Para un
   * tratamiento con un precio combinado fijo que cubre varios dientes,
   * captura el precio total y marca solo un diente representativo. */
  const procedimientosSeleccionados = procedimientos.filter((p) =>
    procedimientosSeleccionadosIds.includes(p.id)
  );
  const precioUnitarioDelCatalogo =
    procedimientosSeleccionados.length === 1 ? procedimientosSeleccionados[0].costoPaciente : undefined;
  const multiplicador = Math.max(selectedTeeth.length, 1);

  const agregarItem = (procedure: string, precioUnitario: number) => {
    const descuento = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
    const precioTotal = Math.round(precioUnitario * multiplicador * (1 - descuento / 100) * 100) / 100;
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        procedure,
        price: precioTotal,
        precioUnitario,
        cantidad: multiplicador,
        descuentoPct: descuento,
        teeth: selectedTeeth,
        note: notaProcedimiento.trim(),
      },
    ]);
    setSelectedTeeth([]);
    setDescuentoPct("");
    setNotaProcedimiento("");
  };

  /** Igual que agregarItem pero reemplaza un renglón existente en vez de
   * añadir uno — misma fórmula de precio (multiplicador × descuento). */
  const actualizarItem = (id: string, procedure: string, precioUnitario: number) => {
    const descuento = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
    const precioTotal = Math.round(precioUnitario * multiplicador * (1 - descuento / 100) * 100) / 100;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              procedure,
              price: precioTotal,
              precioUnitario,
              cantidad: multiplicador,
              descuentoPct: descuento,
              teeth: selectedTeeth,
              note: notaProcedimiento.trim(),
            }
          : it
      )
    );
    setSelectedTeeth([]);
    setDescuentoPct("");
    setNotaProcedimiento("");
  };

  const iniciarEdicionItem = (item: LineItem) => {
    setEditandoItemId(item.id);
    setSelectedTeeth(item.teeth);
    setNotaProcedimiento(item.note);
    setDescuentoPct(item.descuentoPct ? String(item.descuentoPct) : "");
    setPersonalizadoNombre(item.procedure);
    setPersonalizadoPrecio(String(item.precioUnitario ?? item.price));
    setProcedimientosSeleccionadosIds([]);
    setMostrarPersonalizado(true);
  };

  const cancelarEdicionOPersonalizado = () => {
    setMostrarPersonalizado(false);
    setPersonalizadoNombre("");
    setPersonalizadoPrecio("");
    if (editandoItemId) {
      setEditandoItemId(null);
      setSelectedTeeth([]);
      setDescuentoPct("");
      setNotaProcedimiento("");
    }
  };

  const handleAgregarDelCatalogo = () => {
    if (procedimientosSeleccionados.length === 0) return;
    procedimientosSeleccionados.forEach((procedimiento) => {
      agregarItem(procedimiento.nombre, procedimiento.costoPaciente);
    });
    setProcedimientosSeleccionadosIds([]);
  };

  /** Un procedimiento agregado aquí sin estar en el catálogo (ej. una resina
   * que todavía no se da de alta) se guarda de una vez en el catálogo con
   * el costo capturado, para que la próxima vez ya aparezca en el listado
   * normal — el costo al odontólogo y el tiempo estimado quedan en 0/30 min
   * hasta que se completen en Administración → Procedimientos. */
  const guardarProcedimientoNoCatalogadoEnCatalogo = (nombre: string, costoPaciente: number) => {
    const yaExiste = procedimientos.some(
      (p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (yaExiste) return;
    const nuevo: Procedimiento = {
      id: `nocat${Date.now()}`,
      nombre,
      especialidad,
      costoPaciente,
      costoOdontologo: 0,
      duracionMinutos: 30,
    };
    setProcedimientos((prev) => [...prev, nuevo]);
  };

  const handleAgregarPersonalizado = () => {
    const nombre = personalizadoNombre.trim();
    const precio = Number(personalizadoPrecio);
    if (!nombre || !precio) return;
    if (editandoItemId) {
      actualizarItem(editandoItemId, nombre, precio);
      setEditandoItemId(null);
    } else {
      agregarItem(nombre, precio);
      guardarProcedimientoNoCatalogadoEnCatalogo(nombre, precio);
    }
    setPersonalizadoNombre("");
    setPersonalizadoPrecio("");
    setMostrarPersonalizado(false);
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
    const tituloOriginal = document.title;
    document.title = `Presupuesto_${slugify(patientName)}_${slugify(fecha)}`;
    const restaurarTitulo = () => {
      document.title = tituloOriginal;
      window.removeEventListener("afterprint", restaurarTitulo);
    };
    window.addEventListener("afterprint", restaurarTitulo);
    window.print();
  };

  const handleEnviarWhatsApp = async () => {
    if (enviandoWhatsApp) return;
    const ventanaWhatsApp = window.open("", "_blank");
    const nombreArchivo = `Presupuesto_${slugify(patientName)}_${slugify(fecha)}.pdf`;
    const caption = `Plan de tratamiento — ${patientName} · Folio ${folio} · Total ${formatCurrency(total)}`;

    setEnviandoWhatsApp(true);
    try {
      const blob = await generarPresupuestoPdf({
        folio,
        fechaLarga: fechaLargaHoy(),
        medico,
        pacienteNombre: patientName,
        pacienteCorreo: patient.email ?? "",
        pacienteTelefono: patient.phone,
        diagnostico,
        items,
        total,
        perfilDoctor,
      });
      await enviarPdfPorWhatsapp({
        blob,
        nombreArchivo,
        telefono: patient.phone,
        caption,
        ventanaPrevia: ventanaWhatsApp,
      });
    } catch (err) {
      console.error("No se pudo generar el PDF del presupuesto", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF del presupuesto. Intenta de nuevo.");
    } finally {
      setEnviandoWhatsApp(false);
    }
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

        </div>

        <Odontograma selectedTeeth={selectedTeeth} onToggleTooth={toggleTooth} hideSummary />

        <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Órganos dentales a trabajar
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-edge/10 bg-field px-3 py-2 focus-within:border-accent/60">
              {selectedTeeth.length > 0 && (
                <span className="shrink-0 rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent">
                  OD {[...selectedTeeth].sort((a, b) => a - b).join(", ")}
                </span>
              )}
              <input
                type="text"
                value={notaProcedimiento}
                onChange={(e) => setNotaProcedimiento(e.target.value)}
                placeholder={
                  selectedTeeth.length > 0
                    ? "Detalle clínico opcional, ej. caries y resina clase I"
                    : "Marca dientes en el odontograma de abajo, o describe aquí (ej. OD 16 caries y resina clase I)"
                }
                className="w-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder-ink/30 outline-none"
              />
            </div>
          </div>

          {procedimientos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge/15 p-3 text-xs text-ink/40">
              Aún no hay procedimientos en tu catálogo — configúralos en{" "}
              <button
                onClick={() => irAPagina("administracion-procedimientos")}
                className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                Administración → Procedimientos
              </button>{" "}
              para que aparezcan aquí. Por ahora puedes agregar uno personalizado.
            </p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Listado de procedimiento
              </label>
              <p className="mb-1.5 text-[11px] text-ink/40">
                Marca uno o varios — por ejemplo, acceso e instrumentación + instrumentación y
                obturación + corona, todo en el mismo diente.
              </p>
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-edge/10 bg-field p-2">
                {gruposProcedimientos.map((grupo) => (
                  <div key={grupo.especialidad}>
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                      {grupo.especialidad}
                    </p>
                    {grupo.procedimientos.map((p) => {
                      const checked = procedimientosSeleccionadosIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors ${
                            checked ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProcedimientoSeleccionado(p.id)}
                              className="accent-[color:var(--accent)]"
                            />
                            {p.nombre}
                          </span>
                          <span className="whitespace-nowrap text-xs text-ink/50">
                            {formatCurrency(p.costoPaciente)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-ink/60">Descuento</label>
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoPct}
              onChange={(e) => setDescuentoPct(e.target.value)}
              placeholder="0"
              className="w-20 rounded-lg border border-edge/10 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            />
            <span className="text-xs text-ink/50">%</span>
          </div>

          {procedimientosSeleccionados.length > 1 ? (
            <p className="text-xs text-ink/50">
              Se agregarán {procedimientosSeleccionados.length} renglones — cada uno ×{" "}
              {multiplicador} {multiplicador === 1 ? "unidad" : "dientes"}
              {Number(descuentoPct) > 0 ? `, con ${descuentoPct}% de descuento` : ""}. Total:{" "}
              {formatCurrency(
                procedimientosSeleccionados.reduce(
                  (sum, p) =>
                    sum +
                    Math.round(p.costoPaciente * multiplicador * (1 - (Number(descuentoPct) || 0) / 100) * 100) / 100,
                  0
                )
              )}
            </p>
          ) : (
            (multiplicador > 1 || Number(descuentoPct) > 0) && (
              <p className="text-xs text-ink/50">
                {precioUnitarioDelCatalogo !== undefined ? (
                  <>
                    {formatCurrency(precioUnitarioDelCatalogo)} × {multiplicador}{" "}
                    {multiplicador === 1 ? "unidad" : "dientes"}
                    {Number(descuentoPct) > 0 ? ` − ${descuentoPct}%` : ""} ={" "}
                    {formatCurrency(
                      Math.round(precioUnitarioDelCatalogo * multiplicador * (1 - (Number(descuentoPct) || 0) / 100) * 100) /
                        100
                    )}
                  </>
                ) : (
                  `Se multiplicará el precio × ${multiplicador} ${multiplicador === 1 ? "unidad" : "dientes"}${
                    Number(descuentoPct) > 0 ? `, con ${descuentoPct}% de descuento` : ""
                  }.`
                )}
              </p>
            )
          )}

          {procedimientos.length > 0 && (
            <button
              onClick={handleAgregarDelCatalogo}
              disabled={procedimientosSeleccionadosIds.length === 0}
              className="w-full rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {procedimientosSeleccionadosIds.length > 1
                ? `+ Agregar ${procedimientosSeleccionadosIds.length} procedimientos`
                : "+ Agregar procedimiento"}
            </button>
          )}

          {!mostrarPersonalizado ? (
            <button
              onClick={() => setMostrarPersonalizado(true)}
              className="text-xs font-semibold text-ink/50 hover:text-ink"
            >
              + Agregar procedimiento no catalogado
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-edge/15 p-3">
              <p className="text-xs text-ink/40">
                {editandoItemId ? (
                  "Editando este renglón — ajusta nombre, precio, dientes o descuento y presiona \"Aplicar al renglón\". Después, no olvides guardar todo el presupuesto con el botón de hasta abajo — eso es lo que realmente lo guarda en el expediente."
                ) : (
                  <>
                    Procedimiento no catalogado: aún no está en tu catálogo, pero sí se puede
                    realizar. Se agregará también a{" "}
                    <span className="font-medium text-ink/60">{especialidad}</span> para que
                    aparezca en presupuestos futuros de cualquier paciente.
                  </>
                )}
              </p>
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
                  {editandoItemId ? "Aplicar al renglón" : "Agregar"}
                </button>
                <button
                  onClick={cancelarEdicionOPersonalizado}
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
                    {(item.cantidad ?? 1) > 1 && (
                      <div className="text-xs text-ink/40">
                        {formatCurrency(item.precioUnitario ?? item.price)} × {item.cantidad}
                        {item.descuentoPct ? ` − ${item.descuentoPct}%` : ""}
                      </div>
                    )}
                    {(item.cantidad ?? 1) <= 1 && (item.descuentoPct ?? 0) > 0 && (
                      <div className="text-xs text-ink/40">Descuento: {item.descuentoPct}%</div>
                    )}
                    {(item.teeth.length > 0 || item.note) && (
                      <div className="text-xs text-accent/80">
                        {item.teeth.length > 0 && (
                          <span className="font-semibold">
                            OD {[...item.teeth].sort((a, b) => a - b).join(", ")}
                          </span>
                        )}
                        {item.teeth.length > 0 && item.note && " — "}
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{formatCurrency(item.price)}</span>
                    <button
                      onClick={() => iniciarEdicionItem(item)}
                      className="text-ink/30 hover:text-accent print:hidden"
                      title="Editar"
                    >
                      ✎
                    </button>
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
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
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
            disabled={items.length === 0 || enviandoWhatsApp}
            className="rounded-lg border border-success/40 px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviandoWhatsApp ? "Generando PDF…" : "Enviar por WhatsApp"}
          </button>
        </div>
      </div>

      <PresupuestoImpreso
        folio={folio}
        fechaLarga={fechaLargaHoy()}
        medico={medico}
        pacienteNombre={patientName}
        pacienteCorreo={patient.email ?? ""}
        pacienteTelefono={patient.phone}
        diagnostico={diagnostico}
        items={items}
        total={total}
      />
    </div>
  );
}
