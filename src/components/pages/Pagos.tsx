"use client";

import { Fragment, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatCurrency,
  tratamientosDeDisponibles,
  motivoDevolucionLabel,
  type SavedBudget,
  type Tratamiento,
  type LineaPago,
  type Pago,
  type DevolucionPago,
} from "@/lib/patientData";
import { usePatientData } from "@/context/PatientDataContext";
import FirmaCanvas from "@/components/FirmaCanvas";
import ReciboPagoPanel from "@/components/ReciboPagoPanel";
import RegistrarDevolucionDialog from "@/components/RegistrarDevolucionDialog";
import { calcularDisponibleDevolucion, resumenDesdeDevoluciones } from "@/lib/devolucionesPago";
import { fechaPagoAIso } from "@/lib/metas";
import { medicoPredeterminadoParaPago } from "@/lib/medicoDelPago";
import { formaPagoHabitual } from "@/lib/formaPagoHabitual";
import { FORMA_PAGO_CASHBACK, baseCashbackDePago, calcularCashback, esFormaPagoCashback, montoMaximoCanje, otorgarCashbackAPago, puedeOtorgarCashback } from "@/lib/cashback";
import { avisoCashbackEnPago } from "@/lib/cashbackTextos";
import { toISODate } from "@/lib/agendaHelpers";
import {
  aceptarRenglones,
  calcularCuenta,
  conServicios,
  crearServicioRealizado,
  idServicio,
  marcarAvance,
  renglonesCobrables,
  type RenglonCobrable,
} from "@/lib/cuentaPaciente";

const formasDePago = ["Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Transferencia", "Cheque"];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function PrinterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-8 0 .8 12.1a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L18 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EliminarPagoDialog({
  pago,
  onClose,
  onConfirm,
}: {
  pago: Pago;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const puedeEliminar = motivo.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">Eliminar pago</h3>
        <p className="mt-2 text-sm text-ink/70">
          Vas a eliminar el pago de <span className="font-semibold text-ink">{formatCurrency(pago.total)}</span>{" "}
          del {pago.fecha}. Este registro se guarda en Reportes → Pagos para auditarlo y también en Administración → Papelera, desde donde un administrador puede restaurarlo.
        </p>
        <label className="mb-1 mt-4 block text-xs font-medium text-ink/60">
          Motivo de la eliminación
        </label>
        <textarea
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Se registró por error / Pago duplicado / El paciente canceló..."
          rows={3}
          className={inputClass}
        />
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => puedeEliminar && onConfirm(motivo.trim())}
            disabled={!puedeEliminar}
            className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditarPagoDialog({
  pago,
  presupuestos,
  onClose,
  onSave,
}: {
  pago: Pago;
  presupuestos: SavedBudget[];
  onClose: () => void;
  onSave: (pago: Pago) => void;
}) {
  const [lineas, setLineas] = useState<LineaPago[]>(() => pago.lineas.map((l) => ({ ...l })));
  const [formaPago, setFormaPago] = useState(pago.formaPago);
  const [claveEdit, setClaveEdit] = useState(pago.clavePago ?? "");
  const { recursos: recursosEdicion } = usePatientData();
  const [medicoEdit, setMedicoEdit] = useState(pago.medico);
  const medicosParaEditar = Array.from(new Set([pago.medico, ...recursosEdicion.filter((r) => r.tipo === "medico").map((r) => r.nombre)])).filter(Boolean);
  const fechaOriginalIso = fechaPagoAIso(pago.fecha) ?? "";
  const [fechaIso, setFechaIso] = useState(fechaOriginalIso);
  const hoyIso = toISODate(new Date());
  const total = lineas.reduce((sum, l) => sum + l.monto, 0);
  const puedeGuardar = total > 0;
  const tratamientosDisponibles: Tratamiento[] = tratamientosDeDisponibles(presupuestos);

  const actualizarMonto = (id: string, monto: number) => {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, monto: Math.max(0, monto) } : l)));
  };

  /** Reasigna a qué tratamiento pertenece un renglón — por ejemplo, cuando
   * se anotó el pago en el tratamiento equivocado (dos citas del mismo tipo
   * en el paciente, y se confundió cuál era cuál). "__otro__" lo deja como
   * concepto libre, sin ligarlo a ningún renglón del presupuesto. */
  const actualizarTratamiento = (id: string, valor: string) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (valor === "__otro__") {
          const { sinAsignar: _quitado, ...resto } = l;
          return { ...resto, tratamientoId: null, folio: null };
        }
        // Dinero recibido sin asignar (anticipo): se conserva como saldo a favor del paciente.
        if (valor === "__saldo_favor__") return { ...l, tratamientoId: null, folio: null, sinAsignar: true };
        const t = tratamientosDisponibles.find((x) => x.id === valor);
        if (!t) return l;
        // Asignar a un tratamiento es APLICAR el saldo a favor: la línea deja de ser "sin asignar".
        const { sinAsignar: _aplicado, ...resto } = l;
        return { ...resto, tratamientoId: t.id, folio: t.folio, label: t.label };
      })
    );
  };

  const actualizarLabelLibre = (id: string, label: string) => {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, label } : l)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Editar Pago</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Corrige el monto o el tratamiento de cada concepto, o la forma de pago — por ejemplo, si
          se anotó de menos o de más, se ligó al tratamiento equivocado, o se registró como
          efectivo un pago que en realidad fue con tarjeta. Si cambias la fecha, el pago pasa al
          corte y a los reportes del día que elijas.
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink/60">Médico tratante</label>
          <select
            value={medicoEdit}
            onChange={(e) => setMedicoEdit(e.target.value)}
            className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          >
            {medicosParaEditar.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink/40">De aquí sale cuánto ingresó a cada doctor en Fondos y en el corte de caja.</p>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink/60">Fecha del pago</label>
          <input
            type="date"
            value={fechaIso}
            max={hoyIso}
            onChange={(e) => setFechaIso(e.target.value)}
            className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink/60">Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          >
            {formasDePago.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Clave de pago <span className="font-normal text-ink/40">(opcional)</span>
          </label>
          <input
            type="text"
            maxLength={60}
            value={claveEdit}
            onChange={(e) => setClaveEdit(e.target.value)}
            placeholder="Folio o referencia"
            className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
        </div>
        <div className="space-y-2">
          {lineas.map((l) => {
            const esLibre =
              !l.tratamientoId || !tratamientosDisponibles.some((t) => t.id === l.tratamientoId);
            return (
              <div
                key={l.id}
                className="space-y-1.5 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={l.sinAsignar && !l.tratamientoId ? "__saldo_favor__" : esLibre ? "__otro__" : l.tratamientoId!}
                    onChange={(e) => actualizarTratamiento(l.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-edge/10 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
                  >
                    {tratamientosDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.folio} — {t.label}
                      </option>
                    ))}
                    <option value="__saldo_favor__">Sin asignar — saldo a favor del paciente</option>
                    <option value="__otro__">Otro concepto (texto libre)</option>
                  </select>
                  <span className="flex shrink-0 items-center gap-1 text-ink/60">
                    $
                    <input
                      type="number"
                      min={0}
                      value={l.monto}
                      onChange={(e) => actualizarMonto(l.id, Number(e.target.value))}
                      className="w-24 rounded-md border border-edge/10 bg-field px-1.5 py-1 text-right text-sm text-ink outline-none focus:border-accent/60"
                    />
                  </span>
                </div>
                {esLibre && l.sinAsignar && (
                  <p className="text-[11px] text-ink/50">
                    Este dinero queda a favor del paciente. Para aplicarlo, elige arriba el tratamiento al que corresponde.
                  </p>
                )}
                {esLibre && !l.sinAsignar && (
                  <p className="text-[11px] text-warning">
                    Este concepto NO descuenta de ningún tratamiento: el paciente seguirá apareciendo con saldo.
                  </p>
                )}
                {esLibre && (
                  <input
                    type="text"
                    value={l.label}
                    onChange={(e) => actualizarLabelLibre(l.id, e.target.value)}
                    placeholder="Ej. Membresía, concepto libre..."
                    className="w-full rounded-md border border-edge/10 bg-field px-2 py-1.5 text-xs text-ink placeholder-ink/30 outline-none focus:border-accent/60"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-edge/10 bg-inset px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-ink/40">Nuevo total</span>
          <span className="text-lg font-bold text-success">{formatCurrency(total)}</span>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!puedeGuardar) return;
              // Si no tocó la fecha se conserva el texto original tal cual; si la cambió, se guarda como DD/MM/AAAA.
              const fecha =
                fechaIso && fechaIso !== fechaOriginalIso ? `${fechaIso.slice(8, 10)}/${fechaIso.slice(5, 7)}/${fechaIso.slice(0, 4)}` : pago.fecha;
              const { clavePago: _anterior, ...sinClave } = pago;
              onSave({ ...sinClave, lineas, total, formaPago, fecha, medico: medicoEdit, ...(claveEdit.trim() ? { clavePago: claveEdit.trim() } : {}) });
            }}
            disabled={!puedeGuardar || !fechaIso}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

/** Un servicio realizado, o un anticipo sin asignar, que se agrega al cobrar. */
type ExtraPago = { id: string; tipo: "servicio" | "anticipo"; label: string; monto: number; origenId?: string };

export function AgregarPagoDialog({
  patientId,
  patientName,
  saldoPendienteTotal,
  saldoAFavor = 0,
  tratamientosPendientes,
  servicioSugerido,
  formaPagoInicial,
  onClose,
  onSave,
}: {
  patientId: string;
  patientName: string;
  /** Saldo por cobrar: cargos menos pagos aplicados. */
  saldoPendienteTotal: number;
  /** Dinero recibido disponible para aplicar (anticipos y pagos sin asignar). */
  saldoAFavor?: number;
  /** Lo que se puede cobrar: cargos ya generados y, aparte, lo aceptado aún sin realizar (anticipo). */
  tratamientosPendientes: RenglonCobrable[];
  /** Servicio que la cita sugiere cobrar (concepto y costo): se ofrece ya capturado, y se registra al guardar. */
  servicioSugerido?: { origenId: string; concepto: string; monto: number };
  /** Con "Cashback" el pago se abre listo para pagarse con el saldo del paciente (si tiene). */
  formaPagoInicial?: string;
  onClose: () => void;
  onSave: (pago: Pago) => void;
}) {
  // Mismo criterio que ya usa Corte de Caja/Comisiones (ver
  // ReporteCorteCaja.tsx): el médico tratante viene de los Recursos reales
  // de la clínica (Agenda → Recursos), nunca de una lista genérica — así
  // "Médico" en el recibo es el mismo nombre que alimenta el desglose de
  // ingresos por médico, en vez de un valor que nadie más lee.
  const { recursos, saldoCashbackDe, cashbackConfig, patients, citas, presupuestosPorPaciente, pagosPorPaciente, setPresupuestosPaciente, userEmail } = usePatientData();
  const medicosDisponibles = recursos.filter((r) => r.tipo === "medico").map((r) => r.nombre);
  const saldoCashbackPaciente = saldoCashbackDe(patientId);
  const cashbackDisponible = saldoCashbackPaciente.disponible;
  const avisoCashback = avisoCashbackEnPago(saldoCashbackPaciente, cashbackConfig);
  const [sinCashback, setSinCashback] = useState(false);
  // Una promoción, cortesía o tarifa especial no acumula ni se paga con cashback.
  const formasDisponibles = cashbackDisponible > 0 && !sinCashback ? [...formasDePago, FORMA_PAGO_CASHBACK] : formasDePago;

  const [paso, setPaso] = useState<"form" | "firma" | "recibo">("form");
  const [pagoGuardado, setPagoGuardado] = useState<Pago | null>(null);

  // A quién se le atribuye el pago (de aquí sale lo que ingresó a cada doctor y su comisión): el médico responsable del
  // paciente, el de su cita de hoy o el de su última cita. Si no hay ninguno claro, quien cobra lo elige (no se adivina).
  const ahoraPago = new Date();
  const hoyIsoPago = ahoraPago.getFullYear() + "-" + String(ahoraPago.getMonth() + 1).padStart(2, "0") + "-" + String(ahoraPago.getDate()).padStart(2, "0");
  const medicoSugerido =
    medicoPredeterminadoParaPago({
      patientId,
      medicoResponsableId: patients.find((p) => p.id === patientId)?.medicoResponsableId,
      recursos,
      citas,
      hoyISO: hoyIsoPago,
    }) || (medicosDisponibles.length === 1 ? medicosDisponibles[0] : "");
  const [medico, setMedico] = useState(medicoSugerido);
  // La forma de pago que este paciente normalmente usa (la que más veces ha usado). Sin historial no se adivina:
  // quien cobra la elige.
  const formaHabitual = formaPagoHabitual(pagosPorPaciente[patientId] ?? [], formasDePago);
  const [formaPago, setFormaPago] = useState(
    formaPagoInicial === FORMA_PAGO_CASHBACK && cashbackDisponible > 0 ? FORMA_PAGO_CASHBACK : formaHabitual ?? ""
  );
  const [clavePago, setClavePago] = useState("");
  // Autocompletado de "Tratamientos": se escribe y se ofrecen los de la lista; lo que no esté se agrega como servicio.
  const [consulta, setConsulta] = useState("");
  const [listaAbierta, setListaAbierta] = useState(false);
  const [opcionActiva, setOpcionActiva] = useState(0);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [montos, setMontos] = useState<Record<string, number>>({});
  /** En lo aceptado que aún no se realiza: encendido = se hizo hoy (se marca terminado y genera su cargo); apagado = anticipo. */
  const [realizadoHoy, setRealizadoHoy] = useState<Record<string, boolean>>({});
  // Si la cita ya tiene su servicio registrado (un pago anterior), no se vuelve a ofrecer: aparece como cargo por cobrar.
  const sugerenciaYaRegistrada = servicioSugerido
    ? (presupuestosPorPaciente[patientId] ?? []).some((p) => p.id === idServicio(servicioSugerido.origenId))
    : false;
  const [extras, setExtras] = useState<ExtraPago[]>(() =>
    servicioSugerido && !sugerenciaYaRegistrada
      ? [{ id: `sug-${servicioSugerido.origenId}`, tipo: "servicio", label: servicioSugerido.concepto, monto: servicioSugerido.monto, origenId: servicioSugerido.origenId }]
      : []
  );
  const [facturar, setFacturar] = useState(false);
  // Guardar dos veces el mismo cobro (doble clic, reintento) nunca debe duplicar el pago ni el servicio.
  const guardandoRef = useRef(false);

  const toggleTratamiento = (t: RenglonCobrable) => {
    setSeleccionados((prev) => {
      if (prev.includes(t.id)) return prev.filter((s) => s !== t.id);
      setMontos((m) => (m[t.id] !== undefined ? m : { ...m, [t.id]: t.pendiente }));
      return [...prev, t.id];
    });
  };

  const totalTratamientosSeleccionados = seleccionados.reduce(
    (sum, id) => sum + (montos[id] ?? 0),
    0
  );
  /** Un servicio que no estaba presupuestado, o un anticipo: se agrega con el texto escrito y se le captura el monto. */
  const agregarExtra = (tipo: "servicio" | "anticipo") => {
    setExtras((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        tipo,
        label: consulta.trim() || (tipo === "servicio" ? "Servicio realizado" : "Anticipo"),
        monto: 0,
      },
    ]);
    setConsulta("");
    setListaAbierta(false);
  };
  const cambiarMontoExtra = (id: string, monto: number) =>
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, monto: Math.max(0, monto) } : e)));
  const totalExtras = extras.reduce((sum, e) => sum + e.monto, 0);

  // Opciones del autocompletado: los tratamientos de la lista que coinciden con lo escrito (sin acentos ni mayúsculas)
  // y, aparte, agregar lo escrito como servicio no presupuestado o dejar el pago como anticipo.
  const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const textoBuscado = sinAcentos(consulta.trim());
  const sugerencias = tratamientosPendientes.filter(
    (t) => !seleccionados.includes(t.id) && (textoBuscado === "" || sinAcentos(`${t.label} ${t.folio}`).includes(textoBuscado))
  );
  type OpcionLista =
    | { clave: string; tipo: "tratamiento"; renglon: RenglonCobrable }
    | { clave: string; tipo: "servicio" | "anticipo" };
  const opcionesLista: OpcionLista[] = [
    ...sugerencias.map((renglon): OpcionLista => ({ clave: renglon.id, tipo: "tratamiento", renglon })),
    ...(consulta.trim() ? [{ clave: "__servicio__", tipo: "servicio" } as OpcionLista] : []),
    { clave: "__anticipo__", tipo: "anticipo" },
  ];
  const elegirOpcion = (o: OpcionLista) => {
    if (o.tipo === "tratamiento") {
      toggleTratamiento(o.renglon);
      setConsulta("");
      setOpcionActiva(0);
    } else {
      agregarExtra(o.tipo);
    }
  };
  const totalAPagar = totalTratamientosSeleccionados + totalExtras;

  const pagaConCashback = esFormaPagoCashback(formaPago);
  // Lo que se puede cubrir con saldo: lo menor entre el saldo, el % del valor de los tratamientos que se pagan y el tope por visita.
  const valorAtencion =
    seleccionados.reduce((sum, id) => sum + (tratamientosPendientes.find((t) => t.id === id)?.price ?? 0), 0) + totalExtras;
  const maxCashbackAhora = montoMaximoCanje(cashbackDisponible, valorAtencion, cashbackConfig);
  const excedeCashback = pagaConCashback && totalAPagar > maxCashbackAhora + 0.001;
  useEffect(() => {
    // Al marcar promoción o cortesía ya no se puede pagar con cashback.
    if (sinCashback && esFormaPagoCashback(formaPago)) setFormaPago(formaHabitual ?? "");
  }, [sinCashback, formaPago, formaHabitual]);
  // Un servicio o anticipo agregado sin monto no se puede guardar: se le captura primero.
  const puedeGuardar = totalAPagar > 0 && medico !== "" && formaPago !== "" && extras.every((e) => e.monto > 0) && !excedeCashback;

  const handleGuardar = () => {
    if (!puedeGuardar || guardandoRef.current) return;
    guardandoRef.current = true;

    const ahora = new Date();
    const pagoId = `${ahora.getTime()}`;
    const fecha = ahora.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
    const fechaISO = toISODate(ahora);
    const seleccion = tratamientosPendientes.filter((t) => seleccionados.includes(t.id));

    const lineasTratamientos: LineaPago[] = seleccion.map((t) => ({
      id: `${pagoId}-${t.id}`,
      tratamientoId: t.id,
      folio: t.folio,
      label: t.label,
      monto: montos[t.id] ?? 0,
    }));

    // Un servicio nuevo se registra de forma EXPLÍCITA (con su cargo) y el pago se liga a él: el pago por sí solo
    // nunca crea presupuestos. Un anticipo queda como saldo a favor hasta que se asigne a un tratamiento.
    const serviciosNuevos: SavedBudget[] = [];
    const lineasExtras: LineaPago[] = extras.map((e, i) => {
      if (e.tipo === "anticipo") {
        return { id: `${pagoId}-x${i}`, tratamientoId: null, folio: null, label: e.label, monto: e.monto, sinAsignar: true };
      }
      const servicio = crearServicioRealizado({
        origenId: e.origenId ?? `pago-${pagoId}-${i}`,
        concepto: e.label,
        precio: e.monto,
        medico,
        fecha,
        fechaISO,
        porEmail: userEmail,
      });
      serviciosNuevos.push(servicio);
      return { id: `${pagoId}-x${i}`, tratamientoId: servicio.items[0].id, folio: servicio.folio, label: e.label, monto: e.monto };
    });

    // Lo presupuestado que el paciente viene a pagar sin haberlo aceptado antes: cobrarlo registra su aceptación.
    const aceptadosAlCobrar = seleccion.filter((t) => t.tipo === "propuesta").map((t) => t.id);
    // Lo aceptado que se realizó hoy queda terminado: es lo que lo convierte en cargo cuando se cobra al realizar.
    const terminadosHoy = seleccion.filter((t) => t.tipo !== "cargo" && (realizadoHoy[t.id] ?? true)).map((t) => t.id);
    if (serviciosNuevos.length > 0 || terminadosHoy.length > 0 || aceptadosAlCobrar.length > 0) {
      setPresupuestosPaciente(patientId, (prev) =>
        marcarAvance(
          aceptarRenglones(conServicios(prev, serviciosNuevos), aceptadosAlCobrar, { fechaISO, porEmail: userEmail, ahoraISO: ahora.toISOString() }),
          terminadosHoy,
          "terminado",
          fechaISO
        )
      );
    }

    const pago: Pago = {
      id: pagoId,
      fecha,
      medico,
      formaPago,
      lineas: [...lineasTratamientos, ...lineasExtras],
      total: totalAPagar,
      facturar,
      firma: null,
      ...(sinCashback && !pagaConCashback ? { sinCashback: true } : {}),
      ...(clavePago.trim() ? { clavePago: clavePago.trim() } : {}),
    };

    onSave(pago);
    setPagoGuardado(pago);
    setPaso("recibo");
  };

  if (paso === "firma" && pagoGuardado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">Solicitar Firma</h2>
          <FirmaCanvas
            etiqueta="Firma del paciente"
            onCancel={() => setPaso("recibo")}
            onSave={(dataUrl) => {
              const actualizado = { ...pagoGuardado, firma: dataUrl };
              setPagoGuardado(actualizado);
              onSave(actualizado);
              setPaso("recibo");
            }}
          />
        </div>
      </div>
    );
  }

  if (paso === "recibo" && pagoGuardado) {
    const acumulaHoy = cashbackConfig.activo ? calcularCashback(baseCashbackDePago(pagoGuardado), cashbackConfig.porcentaje) : 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:bg-transparent">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6 print:border-none print:bg-transparent print:p-0">
          {acumulaHoy > 0 && (
            <p className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success print:hidden">
              Hoy acumulaste <span className="font-semibold">{formatCurrency(acumulaHoy)}</span> de Cashback para tu próxima atención. Se libera a partir de mañana{cashbackConfig.aprobarAutomaticamente ? "" : ", una vez aprobado"}.
            </p>
          )}
          <ReciboPagoPanel
            patientId={patientId}
            patientName={patientName}
            pago={pagoGuardado}
            onDone={onClose}
            onSolicitarFirma={() => setPaso("firma")}
          />
        </div>
      </div>
    );
  }

  const hayPropuestas = tratamientosPendientes.some((t) => t.tipo === "propuesta");
  const renglonesElegidos = seleccionados
    .map((id) => tratamientosPendientes.find((t) => t.id === id))
    .filter((t): t is RenglonCobrable => Boolean(t));
  // Qué falta para poder guardar (solo se avisa cuando ya hay algo que cobrar, para no llenar de avisos la ventana vacía).
  const faltantes: string[] = [];
  if (totalAPagar > 0 || extras.length > 0) {
    if (medico === "") faltantes.push("el médico tratante");
    if (formaPago === "") faltantes.push("la forma de pago");
    if (extras.some((e) => e.monto <= 0)) faltantes.push("el monto del servicio o anticipo");
  }
  const inputMontoClass =
    "w-24 rounded-md border border-edge/10 bg-field px-1.5 py-1 text-right text-sm text-ink outline-none focus:border-accent/60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-ink">Agregar Pago</h2>
            <p className="truncate text-sm text-ink/60" title={patientName}>
              {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wide text-ink/50">Saldo por cobrar</span>
              <span className="text-lg font-bold text-accent">{formatCurrency(saldoPendienteTotal)}</span>
            </div>
            {saldoAFavor > 0 && (
              <span className="text-xs text-ink/60" title="Anticipos o pagos sin asignar">
                A favor: <span className="font-semibold text-success">{formatCurrency(saldoAFavor)}</span>
              </span>
            )}
            {hayPropuestas && (
              <p className="basis-full text-[11px] text-ink/60">
                Hay presupuestos sin aceptar (no cuentan como saldo). Al cobrarlos se registra su aceptación.
              </p>
            )}
          </div>

          {avisoCashback && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-success">💰 {avisoCashback.titulo}</p>
                {avisoCashback.puedeUsar && !sinCashback && (
                  <button
                    type="button"
                    onClick={() => setFormaPago(pagaConCashback ? formaHabitual ?? "" : FORMA_PAGO_CASHBACK)}
                    className="shrink-0 rounded-lg border border-success/50 px-2.5 py-1 font-semibold text-success transition-colors hover:bg-success/10"
                  >
                    {pagaConCashback ? "Quitar Cashback" : "Usar Cashback"}
                  </button>
                )}
              </div>
              {avisoCashback.detalle.map((linea) => (
                <p key={linea} className="mt-0.5 text-ink/60">
                  {linea}
                </p>
              ))}
              {avisoCashback.puedeUsar && sinCashback && (
                <p className="mt-0.5 text-ink/60">No se puede usar en una promoción, cortesía o tarifa especial.</p>
              )}
              {avisoCashback.puedeUsar && !sinCashback && seleccionados.length > 0 && (
                <p className="mt-0.5 text-ink/60">Con lo que vas a cobrar puede cubrir hasta {formatCurrency(maxCashbackAhora)} ahora.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pago-medico" className="mb-1 block text-xs font-medium text-ink/60">
                Médico tratante
              </label>
              {medicosDisponibles.length > 0 ? (
                <select id="pago-medico" value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                  {!medico && (
                    <option value="" disabled>
                      Elige quién atendió
                    </option>
                  )}
                  {medicosDisponibles.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  No hay médicos configurados. Ve a Agenda → Recursos → + para agregar uno.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pago-forma" className="mb-1 block text-xs font-medium text-ink/60">
                Forma de pago
                {formaHabitual && formaPago === formaHabitual && <span className="ml-1 font-normal text-ink/40">· la habitual</span>}
              </label>
              <select id="pago-forma" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClass}>
                {formaPago === "" && (
                  <option value="" disabled>
                    Elige una…
                  </option>
                )}
                {formasDisponibles.map((f) => (
                  <option key={f} value={f}>
                    {f === FORMA_PAGO_CASHBACK ? `Cashback (disponible ${formatCurrency(cashbackDisponible)})` : f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {excedeCashback && (
            <p className="text-[11px] text-danger">
              Con Cashback solo puedes cubrir {formatCurrency(maxCashbackAhora)} (lo menor entre tu saldo de {formatCurrency(cashbackDisponible)}, {cashbackConfig.porcentajeMaxCanje}% de la atención y el tope por visita). Baja el
              monto y cobra el resto en otro pago.
            </p>
          )}
          {pagaConCashback && valorAtencion === 0 && (
            <p className="text-[11px] text-ink/50">El Cashback se aplica a un tratamiento o a un servicio realizado: agrégalo abajo.</p>
          )}
          {pagaConCashback && valorAtencion > 0 && !excedeCashback && (
            <p className="text-[11px] text-ink/50">Puedes cubrir hasta {formatCurrency(maxCashbackAhora)} con Cashback en esta atención; el resto cóbralo en otro pago.</p>
          )}

          <div>
            <label htmlFor="pago-tratamientos" className="mb-1 block text-xs font-medium text-ink/60">
              Tratamientos
            </label>
            <div className="relative">
              <input
                id="pago-tratamientos"
                type="text"
                autoFocus
                autoComplete="off"
                role="combobox"
                aria-expanded={listaAbierta}
                aria-controls="pago-opciones"
                aria-autocomplete="list"
                value={consulta}
                onChange={(e) => {
                  setConsulta(e.target.value);
                  setListaAbierta(true);
                  setOpcionActiva(0);
                }}
                onFocus={() => setListaAbierta(true)}
                onBlur={() => setListaAbierta(false)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setListaAbierta(true);
                    setOpcionActiva((i) => Math.min(i + 1, opcionesLista.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setOpcionActiva((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const o = opcionesLista[Math.min(opcionActiva, opcionesLista.length - 1)];
                    if (listaAbierta && o) elegirOpcion(o);
                  } else if (e.key === "Escape" && listaAbierta) {
                    e.stopPropagation();
                    setListaAbierta(false);
                  }
                }}
                placeholder={tratamientosPendientes.length > 0 ? "Escribe para buscar el tratamiento…" : "Escribe el servicio que se cobra…"}
                className={inputClass}
              />
              {listaAbierta && (
                <ul
                  id="pago-opciones"
                  role="listbox"
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-edge/15 bg-modal py-1 shadow-card"
                >
                  {opcionesLista.map((o, i) => (
                    <li key={o.clave} role="option" aria-selected={i === opcionActiva}>
                      <button
                        type="button"
                        onClick={() => elegirOpcion(o)}
                        onMouseEnter={() => setOpcionActiva(i)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                          i === opcionActiva ? "bg-surface" : ""
                        }`}
                      >
                        {o.tipo === "tratamiento" ? (
                          <>
                            <span className="min-w-0 flex-1 truncate text-ink/80">
                              <span className="mr-1 text-ink/40">#{o.renglon.folio}</span>
                              {o.renglon.label}
                              {o.renglon.tipo === "propuesta" && <span className="ml-2 text-[10px] font-semibold text-warning">sin aceptar</span>}
                              {o.renglon.tipo === "anticipo" && <span className="ml-2 text-[10px] font-semibold text-accent">por realizar</span>}
                            </span>
                            <span className="shrink-0 text-xs text-ink/50">{formatCurrency(o.renglon.pendiente)}</span>
                          </>
                        ) : o.tipo === "servicio" ? (
                          <span className="min-w-0 truncate text-accent">+ Servicio no presupuestado: «{consulta.trim()}»</span>
                        ) : (
                          <span className="min-w-0 truncate text-ink/70">
                            + Anticipo{consulta.trim() ? ` «${consulta.trim()}»` : " o pago sin asignar"}{" "}
                            <span className="text-ink/40">(queda a favor del paciente)</span>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {tratamientosPendientes.length === 0 && extras.length === 0 && (
              <p className="mt-1 text-[11px] text-ink/50">Este paciente no tiene presupuestos por cobrar. Si se le hizo un servicio, escríbelo y agrégalo.</p>
            )}

            {(renglonesElegidos.length > 0 || extras.length > 0) && (
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {renglonesElegidos.map((t) => (
                  <div key={t.id} className="rounded-lg border border-edge/10 bg-inset px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-ink/80" title={t.label}>
                        <span className="mr-1 text-ink/40">#{t.folio}</span>
                        {t.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink/40">de {formatCurrency(t.pendiente)}</span>
                      <span className="flex shrink-0 items-center gap-1 text-ink/60">
                        $
                        <input
                          type="number"
                          min={0}
                          max={t.pendiente}
                          value={montos[t.id] ?? t.pendiente}
                          aria-label={`Monto a pagar de ${t.label}`}
                          onChange={(e) =>
                            setMontos((prev) => ({ ...prev, [t.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), t.pendiente) }))
                          }
                          className={inputMontoClass}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleTratamiento(t)}
                        className="shrink-0 text-ink/30 hover:text-danger"
                        title="Quitar"
                        aria-label={`Quitar ${t.label}`}
                      >
                        ✕
                      </button>
                    </div>
                    {t.tipo !== "cargo" && (
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-ink/50">
                        <span>{t.tipo === "propuesta" ? "Sin aceptar: al cobrarlo se registra su aceptación." : "Aceptado, por realizar."}</span>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={realizadoHoy[t.id] ?? true}
                            onChange={(e) => setRealizadoHoy((prev) => ({ ...prev, [t.id]: e.target.checked }))}
                            className="h-3.5 w-3.5 accent-accent"
                          />
                          Se realizó hoy{(realizadoHoy[t.id] ?? true) ? "" : " (queda como anticipo)"}
                        </label>
                      </div>
                    )}
                  </div>
                ))}

                {extras.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-2.5 py-1.5 text-sm">
                    <span className="shrink-0 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                      {e.tipo === "servicio" ? "Servicio" : "Anticipo"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink/80" title={e.label}>
                      {e.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-ink/60">
                      $
                      <input
                        type="number"
                        min={0}
                        autoFocus={e.monto === 0}
                        value={e.monto === 0 ? "" : e.monto}
                        placeholder="Monto"
                        aria-label={`Monto de ${e.label}`}
                        onChange={(ev) => cambiarMontoExtra(e.id, Number(ev.target.value) || 0)}
                        className={inputMontoClass}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtras((prev) => prev.filter((x) => x.id !== e.id))}
                      className="shrink-0 text-ink/30 hover:text-danger"
                      title="Quitar"
                      aria-label={`Quitar ${e.label}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pago-clave" className="mb-1 block text-xs font-medium text-ink/60">
                Clave de pago <span className="font-normal text-ink/40">(opcional)</span>
              </label>
              <input
                id="pago-clave"
                type="text"
                maxLength={60}
                autoComplete="off"
                value={clavePago}
                onChange={(e) => setClavePago(e.target.value)}
                placeholder="Folio o referencia"
                className={inputClass}
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-ink/60">Total a pagar</div>
              <div className="flex min-h-[38px] items-center rounded-lg border border-edge/10 bg-inset px-3 text-lg font-bold text-success">
                {formatCurrency(totalAPagar)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink/70">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={facturar}
                onChange={(e) => setFacturar(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Activo para facturar
            </label>
            {cashbackConfig.activo && !pagaConCashback && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sinCashback}
                  onChange={(e) => setSinCashback(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Promoción o cortesía (sin Cashback)
              </label>
            )}
          </div>
        </div>

        {faltantes.length > 0 && <p className="mt-3 text-[11px] text-warning">Para guardar falta: {faltantes.join(", ")}.</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Pagos({
  patientId,
  patientName,
  presupuestos,
  pagos,
  devoluciones,
  setPagos,
}: {
  patientId: string;
  patientName: string;
  presupuestos: SavedBudget[];
  pagos: Pago[];
  devoluciones: DevolucionPago[];
  setPagos: Dispatch<SetStateAction<Pago[]>>;
}) {
  const { userEmail, setPagosEliminados, setPagosRealizados, puedeVerFinanzas, cashbackConfig, cashbackMovimientos, setCashbackMovimientos, saldoCashbackDe } = usePatientData();
  const [formaPagoInicial, setFormaPagoInicial] = useState<string | undefined>(undefined);
  const [avisoOtorgado, setAvisoOtorgado] = useState("");
  const mostrarCashback = puedeVerFinanzas && cashbackConfig.activo;
  const saldoCashback = saldoCashbackDe(patientId);

  const abrirAgregarPago = (forma?: string) => {
    setFormaPagoInicial(forma);
    setShowDialog(true);
  };

  /** Genera el cashback de un pago que ya estaba registrado y no lo había generado. */
  const otorgarCashback = (pago: Pago) => {
    const r = otorgarCashbackAPago(cashbackMovimientos, pago, patientId, patientName, cashbackConfig, new Date().toISOString());
    if (r.resultado === "no-aplica") return;
    // Si el pago estaba marcado como promoción o cortesía, deja de estarlo: así el cashback no se anula al recalcular.
    if (pago.sinCashback) {
      const { sinCashback: _quitado, ...sinMarca } = pago;
      upsertPago(sinMarca);
    }
    // Idempotente por id: si el cambio del pago de arriba ya generó el cashback, esto no lo duplica.
    const ahoraIso = new Date().toISOString();
    setCashbackMovimientos((prev) => otorgarCashbackAPago(prev, pago, patientId, patientName, cashbackConfig, ahoraIso).movimientos);
    setAvisoOtorgado(
      r.resultado === "sin-espacio"
        ? "No se otorgó: el paciente ya tiene el saldo máximo acumulable."
        : r.resultado === "recortado"
        ? `Se otorgaron ${formatCurrency(r.monto)} de Cashback (limitado al saldo máximo acumulable).`
        : `Se otorgaron ${formatCurrency(r.monto)} de Cashback por el pago del ${pago.fecha}.`
    );
  };
  const [reciboAbierto, setReciboAbierto] = useState<Pago | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState<Pago | null>(null);
  const [pagoAEditar, setPagoAEditar] = useState<Pago | null>(null);
  const [pagoParaDevolver, setPagoParaDevolver] = useState<Pago | "sin-preseleccion" | null>(null);

  /** Un pago que ya tiene devoluciones completadas nunca debe poder
   * eliminarse ni bajarse de monto — rompería la invariante "nunca
   * devolver más de lo cobrado" (la próxima devolución calcularía mal el
   * disponible, y la ya completada quedaría apuntando a un pago
   * inconsistente). Único punto de modificación a estos dos flujos ya
   * existentes, estrictamente necesario para proteger esa invariante. */
  const tieneDevolucionesCompletadas = (pago: Pago) =>
    calcularDisponibleDevolucion(pago, resumenDesdeDevoluciones(pago.id, devoluciones)).totalDevuelto > 0;

  const intentarEditar = (pago: Pago) => {
    if (tieneDevolucionesCompletadas(pago)) {
      alert("Este pago ya tiene una devolución registrada — no se puede editar su monto ni sus conceptos. Si hay un error, corrígelo desde el registro de la devolución.");
      return;
    }
    setPagoAEditar(pago);
  };

  const intentarEliminar = (pago: Pago) => {
    if (tieneDevolucionesCompletadas(pago)) {
      alert("Este pago ya tiene una devolución registrada — no se puede eliminar. Si hay un error, corrígelo desde el registro de la devolución.");
      return;
    }
    setPagoAEliminar(pago);
  };

  const eliminarPagoConMotivo = (pago: Pago, motivo: string) => {
    const registro = {
      id: `pe${Date.now()}`,
      patientId,
      patientName,
      pago,
      motivo,
      eliminadoEn: new Date().toISOString(),
      eliminadoPor: userEmail,
    };
    setPagosEliminados((prev) => [registro, ...prev]);
    setPagos((prev) => prev.filter((p) => p.id !== pago.id));
    // Ya no es un pago realizado: sale de la bitácora de Reportes → Pagos (queda en "Pagos eliminados").
    setPagosRealizados((prev) => prev.filter((r) => r.id !== pago.id));
    setPagoAEliminar(null);
  };

  // Tres cosas distintas que antes se mezclaban en un solo "presupuestado": lo que el paciente solo está considerando,
  // lo que autorizó y todavía no se cobra, y lo que ya se le debe cobrar (cargos menos pagos). Ver cuentaPaciente.ts.
  const tratamientosPendientes = renglonesCobrables(presupuestos, pagos, devoluciones, { incluirPropuestas: true });
  const { resumen } = calcularCuenta(presupuestos, pagos, devoluciones);
  /** Dinero cobrado en líneas sin tratamiento que NO se dejaron a propósito como anticipo: entra a caja pero no
   * baja ningún saldo (ver calcularSaldoPendiente). */
  const montoSinLigar = pagos.reduce(
    (sum, p) => sum + p.lineas.reduce((ls, l) => ls + (!l.tratamientoId && !l.sinAsignar ? l.monto : 0), 0),
    0
  );

  const upsertPago = (pago: Pago) => {
    if (pagos.some((p) => p.id === pago.id)) {
      // Edición: también se corrige la copia de la bitácora, para que Reportes → Pagos muestre el monto, la forma y la fecha nuevos.
      setPagos((prev) => prev.map((p) => (p.id === pago.id ? pago : p)));
      setPagosRealizados((prev) => prev.map((r) => (r.id === pago.id ? { ...r, pago } : r)));
      return;
    }
    // Solo se registra en la bitácora de Pagos Realizados la primera vez (pago nuevo): editar un pago ya existente
    // (EditarPagoDialog reusa este mismo upsertPago) entra por la rama de arriba y no genera una segunda entrada.
    // Los dos setters van por separado: un efecto dentro del updater de otro se ejecutaría dos veces en desarrollo.
    setPagos((prev) => [pago, ...prev]);
    setPagosRealizados((prevRealizados) => [
      { id: pago.id, patientId, patientName, pago, registradoEn: new Date().toISOString(), registradoPor: userEmail },
      ...prevRealizados.filter((r) => r.id !== pago.id),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pagos</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPagoParaDevolver("sin-preseleccion")}
            disabled={pagos.length === 0}
            className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↩ Registrar devolución
          </button>
          <button
            onClick={() => abrirAgregarPago()}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar Pago
          </button>
        </div>
      </div>

      {montoSinLigar > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-ink/80">
          <span className="font-semibold text-warning">{formatCurrency(montoSinLigar)} cobrados no están ligados a ningún tratamiento.</span>{" "}
          Ese dinero entró a caja pero NO baja el saldo del presupuesto, por eso puede verse como si el
          paciente no hubiera pagado. Edita el pago (✎) y elige el tratamiento que se pagó, en lugar de
          «Otro concepto».
        </div>
      )}

      <div className={`grid grid-cols-1 gap-3 ${mostrarCashback ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="rounded-xl border border-edge/10 bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40" title="Lo aceptado que ya corresponde cobrar (por ejemplo, tratamientos realizados).">Cargos</div>
          <div className="mt-1 text-lg font-bold text-ink">{formatCurrency(resumen.cargos)}</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Pagado a cargos</div>
          <div className="mt-1 text-lg font-bold text-success">{formatCurrency(resumen.pagadoACargos)}</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40" title="Cargos menos pagos aplicados y ajustes. Una cotización no cuenta.">Saldo por cobrar</div>
          <div className="mt-1 text-lg font-bold text-danger">{formatCurrency(resumen.porCobrar)}</div>
        </div>
        {mostrarCashback && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-ink/40">Cashback disponible</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-lg font-bold text-success">{formatCurrency(saldoCashback.disponible)}</div>
              {saldoCashback.disponible > 0 && (
                <button
                  onClick={() => abrirAgregarPago(FORMA_PAGO_CASHBACK)}
                  title="Registrar un pago usando el saldo de Cashback del paciente"
                  className="rounded-lg border border-success/50 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success transition-colors hover:bg-success/20"
                >
                  Usar Cashback
                </button>
              )}
            </div>
            {(saldoCashback.porLiberar > 0 || saldoCashback.porAprobar > 0) && (
              <div className="mt-1 text-[11px] text-ink/50">
                {saldoCashback.porLiberar > 0 && `${formatCurrency(saldoCashback.porLiberar)} se libera mañana`}
                {saldoCashback.porLiberar > 0 && saldoCashback.porAprobar > 0 && " · "}
                {saldoCashback.porAprobar > 0 && `${formatCurrency(saldoCashback.porAprobar)} por aprobar`}
              </div>
            )}
          </div>
        )}
      </div>

      {(resumen.aFavor > 0 || resumen.aceptadoPendienteDeCobro > 0 || resumen.propuesto > 0) && (
        <p className="text-xs text-ink/50">
          {[
            resumen.aFavor > 0 && `A favor del paciente: ${formatCurrency(resumen.aFavor)}`,
            resumen.aceptadoPendienteDeCobro > 0 && `Aceptado, aún sin cobrar: ${formatCurrency(resumen.aceptadoPendienteDeCobro)}`,
            resumen.propuesto > 0 && `Propuesto (en consideración): ${formatCurrency(resumen.propuesto)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          . Solo los cargos cuentan como saldo por cobrar.
        </p>
      )}

      {avisoOtorgado && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-ink/80">
          <span>💰 {avisoOtorgado}</span>
          <button onClick={() => setAvisoOtorgado("")} className="text-ink/40 hover:text-ink" aria-label="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {pagos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay pagos registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface print:hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Conceptos</th>
                <th className="px-6 py-3 font-medium">Forma de pago</th>
                <th className="px-6 py-3 font-medium">Médico</th>
                <th className="px-6 py-3 font-medium">Factura</th>
                <th className="px-6 py-3 font-medium">Firma</th>
                <th className="px-6 py-3 font-medium">Comprobante</th>
                <th className="px-6 py-3 text-right font-medium">Monto</th>
                <th className="px-6 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => {
                const devolucionesDelPago = devoluciones
                  .filter((d) => d.pagoOrigenId === pago.id && d.estado !== "cancelada")
                  .sort((a, b) => (a.completadoEn ?? a.creadoEn).localeCompare(b.completadoEn ?? b.creadoEn));
                const disponiblePago = calcularDisponibleDevolucion(pago, resumenDesdeDevoluciones(pago.id, devoluciones));
                return (
                <Fragment key={pago.id}>
                <tr className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/70">{pago.fecha}</td>
                  <td className="px-6 py-3 text-ink/70">
                    {pago.lineas.length > 0 ? pago.lineas.map((l) => l.label).join(", ") : "—"}
                  </td>
                  <td className="px-6 py-3 text-ink/70">
                    {pago.formaPago}
                    {pago.clavePago && <span className="block text-[11px] text-ink/40">Clave: {pago.clavePago}</span>}
                  </td>
                  <td className="px-6 py-3 text-ink/70">{pago.medico}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        pago.facturar
                          ? "bg-info/10 text-info"
                          : "bg-surface2 text-ink/40"
                      }`}
                    >
                      {pago.facturar ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        pago.firma
                          ? "bg-success/10 text-success"
                          : "bg-surface2 text-ink/40"
                      }`}
                    >
                      {pago.firma ? "Firmada" : "Sin firma"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setReciboAbierto(pago)}
                        title="Recibo en PDF: ver, imprimir o compartir"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <PrinterIcon />
                      </button>
                      <button
                        onClick={() => setReciboAbierto(pago)}
                        title="Compartir recibo (PDF) por WhatsApp"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-success/30 text-success/70 transition-colors hover:border-success hover:text-success"
                      >
                        <WhatsAppIcon />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-success">
                    {formatCurrency(pago.total)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="ml-auto flex w-fit items-center gap-1.5">
                      {mostrarCashback && puedeOtorgarCashback(pago, cashbackMovimientos, cashbackConfig) && (
                        <button
                          onClick={() => otorgarCashback(pago)}
                          title="Otorgar el Cashback de este pago (no se había generado)"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-success/30 text-xs text-success/70 transition-colors hover:border-success hover:text-success"
                        >
                          💰
                        </button>
                      )}
                      {disponiblePago.disponible > 0 && (
                        <button
                          onClick={() => setPagoParaDevolver(pago)}
                          title="Registrar devolución"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                        >
                          ↩
                        </button>
                      )}
                      <button
                        onClick={() => intentarEditar(pago)}
                        title="Editar pago (monto o tratamiento)"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => intentarEliminar(pago)}
                        title="Eliminar pago"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
                {devolucionesDelPago.map((dev) => (
                  <tr key={dev.id} className="border-b border-edge/5 bg-danger/5 last:border-0">
                    <td className="px-6 py-2 pl-10 text-xs text-ink/50 whitespace-nowrap">
                      {new Date(dev.completadoEn ?? dev.creadoEn).toLocaleDateString("es-MX")}
                    </td>
                    <td colSpan={6} className="px-6 py-2 text-xs text-danger/80">
                      ↳ {dev.tipo === "total" ? "Devolución total" : "Devolución parcial"} · {motivoDevolucionLabel[dev.motivo]}
                      {dev.correccion && (
                        <span className="ml-1.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          Con corrección posterior
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-2 text-right text-xs font-semibold text-danger">−{formatCurrency(dev.monto)}</td>
                    <td />
                  </tr>
                ))}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reciboAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
            <ReciboPagoPanel
              patientId={patientId}
              patientName={patientName}
              pago={reciboAbierto}
              titulo="Recibo de pago"
              onDone={() => setReciboAbierto(null)}
            />
          </div>
        </div>
      )}

      {showDialog && (
        <AgregarPagoDialog
          patientId={patientId}
          patientName={patientName}
          saldoPendienteTotal={resumen.porCobrar}
          saldoAFavor={resumen.aFavor}
          tratamientosPendientes={tratamientosPendientes}
          formaPagoInicial={formaPagoInicial}
          onClose={() => setShowDialog(false)}
          onSave={upsertPago}
        />
      )}

      {pagoAEliminar && (
        <EliminarPagoDialog
          pago={pagoAEliminar}
          onClose={() => setPagoAEliminar(null)}
          onConfirm={(motivo) => eliminarPagoConMotivo(pagoAEliminar, motivo)}
        />
      )}

      {pagoAEditar && (
        <EditarPagoDialog
          pago={pagoAEditar}
          presupuestos={presupuestos}
          onClose={() => setPagoAEditar(null)}
          onSave={(pago) => {
            upsertPago(pago);
            setPagoAEditar(null);
          }}
        />
      )}

      {pagoParaDevolver && (
        <RegistrarDevolucionDialog
          patientId={patientId}
          patientName={patientName}
          pagos={pagos}
          pagoPreseleccionado={pagoParaDevolver === "sin-preseleccion" ? undefined : pagoParaDevolver}
          onClose={() => setPagoParaDevolver(null)}
        />
      )}
    </div>
  );
}
