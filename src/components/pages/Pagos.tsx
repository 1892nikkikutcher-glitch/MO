"use client";

import { Fragment, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatCurrency,
  computeTratamientosPendientes,
  tratamientosDeDisponibles,
  motivoDevolucionLabel,
  type SavedBudget,
  type Tratamiento,
  type TratamientoPendiente,
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
import { FORMA_PAGO_CASHBACK, baseCashbackDePago, calcularCashback, esFormaPagoCashback, montoMaximoCanje, otorgarCashbackAPago, puedeOtorgarCashback } from "@/lib/cashback";
import { avisoCashbackEnPago } from "@/lib/cashbackTextos";
import { toISODate } from "@/lib/agendaHelpers";

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
        if (valor === "__otro__") return { ...l, tratamientoId: null, folio: null };
        const t = tratamientosDisponibles.find((x) => x.id === valor);
        return t ? { ...l, tratamientoId: t.id, folio: t.folio, label: t.label } : l;
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
          <label className="mb-1 block text-xs font-medium text-ink/60">Médico al que se atribuye</label>
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
                    value={esLibre ? "__otro__" : l.tratamientoId!}
                    onChange={(e) => actualizarTratamiento(l.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-edge/10 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
                  >
                    {tratamientosDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.folio} — {t.label}
                      </option>
                    ))}
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
                {esLibre && (
                  <p className="text-[11px] text-warning">
                    Este concepto NO descuenta de ningún presupuesto: el paciente seguirá apareciendo con saldo.
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
              onSave({ ...pago, lineas, total, formaPago, fecha, medico: medicoEdit });
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

export function AgregarPagoDialog({
  patientId,
  patientName,
  saldoPendienteTotal,
  tratamientosPendientes,
  formaPagoInicial,
  onClose,
  onSave,
}: {
  patientId: string;
  patientName: string;
  saldoPendienteTotal: number;
  tratamientosPendientes: TratamientoPendiente[];
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
  const { recursos, saldoCashbackDe, cashbackConfig, patients, citas } = usePatientData();
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
  const [formaPago, setFormaPago] = useState(formaPagoInicial === FORMA_PAGO_CASHBACK && cashbackDisponible > 0 ? FORMA_PAGO_CASHBACK : formasDePago[0]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ id: string; label: string; monto: number }[]>([]);
  const [extraConcepto, setExtraConcepto] = useState("");
  const [extraMonto, setExtraMonto] = useState("");
  const [facturar, setFacturar] = useState(false);

  const toggleTratamiento = (t: TratamientoPendiente) => {
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
  const extraMontoNumerico = Number(extraMonto);
  const puedeAgregarExtra = extraMontoNumerico > 0;
  const agregarExtra = () => {
    if (!puedeAgregarExtra) return;
    setExtras((prev) => [
      ...prev,
      { id: `${Date.now()}`, label: extraConcepto.trim() || "Pago extra", monto: extraMontoNumerico },
    ]);
    setExtraConcepto("");
    setExtraMonto("");
  };
  const totalExtras = extras.reduce((sum, e) => sum + e.monto, 0);
  const totalAPagar = totalTratamientosSeleccionados + totalExtras;

  const pagaConCashback = esFormaPagoCashback(formaPago);
  // Lo que se puede cubrir con saldo: lo menor entre el saldo, el % del valor de los tratamientos que se pagan y el tope por visita.
  const valorAtencion =
    seleccionados.reduce((sum, id) => sum + (tratamientosPendientes.find((t) => t.id === id)?.price ?? 0), 0) + totalExtras;
  const maxCashbackAhora = montoMaximoCanje(cashbackDisponible, valorAtencion, cashbackConfig);
  const excedeCashback = pagaConCashback && totalAPagar > maxCashbackAhora + 0.001;
  useEffect(() => {
    // Al marcar promoción o cortesía ya no se puede pagar con cashback.
    if (sinCashback && esFormaPagoCashback(formaPago)) setFormaPago(formasDePago[0]);
  }, [sinCashback, formaPago]);
  const puedeGuardar = totalAPagar > 0 && medico !== "" && !excedeCashback;

  const handleGuardar = () => {
    if (!puedeGuardar) return;

    const lineasTratamientos: LineaPago[] = tratamientosPendientes
      .filter((t) => seleccionados.includes(t.id))
      .map((t) => ({
        id: `${Date.now()}-${t.id}`,
        tratamientoId: t.id,
        folio: t.folio,
        label: t.label,
        monto: montos[t.id] ?? 0,
      }));

    const lineasExtras: LineaPago[] = extras.map((e) => ({
      id: e.id,
      tratamientoId: null,
      folio: null,
      label: e.label,
      monto: e.monto,
      // Por defecto, todo pago que no venga de un presupuesto existente se
      // refleja como su propio presupuesto — así nunca queda como saldo
      // pendiente algo que el paciente ya pagó.
      generarPresupuesto: true,
    }));

    const pago: Pago = {
      id: `${Date.now()}`,
      fecha: new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      medico,
      formaPago,
      lineas: [...lineasTratamientos, ...lineasExtras],
      total: totalAPagar,
      facturar,
      firma: null,
      ...(sinCashback && !pagaConCashback ? { sinCashback: true } : {}),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Agregar Pago</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-ink/50">
              Saldo pendiente del paciente
            </div>
            <div className="text-xl font-bold text-accent">
              {formatCurrency(saldoPendienteTotal)}
            </div>
          </div>

          {avisoCashback && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs">
              <p className="font-semibold text-success">💰 {avisoCashback.titulo}</p>
              {avisoCashback.detalle.map((linea) => (
                <p key={linea} className="mt-0.5 text-ink/60">
                  {linea}
                </p>
              ))}
              {avisoCashback.puedeUsar && sinCashback && (
                <p className="mt-1 text-ink/60">No se puede usar en una promoción, cortesía o tarifa especial.</p>
              )}
              {avisoCashback.puedeUsar && !sinCashback && (
                <>
                  {seleccionados.length > 0 && (
                    <p className="mt-0.5 text-ink/60">
                      Con lo que vas a cobrar puede cubrir hasta {formatCurrency(maxCashbackAhora)} ahora.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormaPago(pagaConCashback ? formasDePago[0] : FORMA_PAGO_CASHBACK)}
                    className="mt-2 rounded-lg border border-success/50 px-3 py-1.5 font-semibold text-success transition-colors hover:bg-success/10"
                  >
                    {pagaConCashback ? "Quitar Cashback" : "Usar Cashback"}
                  </button>
                </>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre del paciente</label>
            <input type="text" readOnly value={patientName} className={`${inputClass} cursor-not-allowed text-ink/60`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Médico al que se atribuye</label>
              {medicosDisponibles.length > 0 ? (
                <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
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
              <label className="mb-1 block text-xs font-medium text-ink/60">Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClass}>
                {formasDisponibles.map((f) => (
                  <option key={f} value={f}>
                    {f === FORMA_PAGO_CASHBACK ? `Cashback (disponible ${formatCurrency(cashbackDisponible)})` : f}
                  </option>
                ))}
              </select>
              {excedeCashback && (
                <p className="mt-1 text-[11px] text-danger">
                  Con Cashback solo puedes cubrir {formatCurrency(maxCashbackAhora)} (lo menor entre tu saldo de {formatCurrency(cashbackDisponible)}, {cashbackConfig.porcentajeMaxCanje}% de la atención y el tope por visita). Baja el
                  monto y cobra el resto en otro pago.
                </p>
              )}
              {pagaConCashback && valorAtencion === 0 && (
                <p className="mt-1 text-[11px] text-ink/50">El Cashback se aplica a un tratamiento del presupuesto o a un pago extra: márcalo o agrégalo abajo.</p>
              )}
              {pagaConCashback && valorAtencion > 0 && !excedeCashback && (
                <p className="mt-1 text-[11px] text-ink/50">Puedes cubrir hasta {formatCurrency(maxCashbackAhora)} con Cashback en esta atención; el resto cóbralo en otro pago.</p>
              )}
              {cashbackConfig.activo && !pagaConCashback && (
                <label className="mt-2 flex items-center gap-2 text-xs text-ink/70">
                  <input type="checkbox" checked={sinCashback} onChange={(e) => setSinCashback(e.target.checked)} className="h-4 w-4 rounded border-edge/30" />
                  Promoción, cortesía o tarifa especial (no genera ni usa Cashback)
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-ink/60">
                Tratamientos pendientes por pagar
              </label>
            </div>

            {tratamientosPendientes.length > 0 && (
              <p className="mb-1.5 rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] text-ink/70">
                Si este pago es de alguno de estos tratamientos, <strong>márcalo aquí abajo</strong> (no uses «Pago extra»): así el saldo del presupuesto baja. Un pago extra se cuenta como trabajo aparte y el
                tratamiento seguiría apareciendo como deuda.
              </p>
            )}
            {tratamientosPendientes.length === 0 && extras.length === 0 ? (
              <p className="rounded-lg border border-dashed border-edge/15 p-4 text-center text-xs text-ink/30">
                Este paciente no tiene tratamientos pendientes por pagar. Si necesita pagar algo, agrégalo abajo como pago extra.
              </p>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-edge/10 p-2">
                {tratamientosPendientes.map((t) => {
                  const isSelected = seleccionados.includes(t.id);
                  return (
                    <div key={t.id} className="rounded-md px-2 py-1.5 hover:bg-surface">
                      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                        <span className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTratamiento(t)}
                            className="h-4 w-4 shrink-0 accent-accent"
                          />
                          <span className="text-ink/80">
                            <span className="mr-1 text-ink/40">#{t.folio}</span>
                            {t.label}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-ink/40">
                          Pendiente: {formatCurrency(t.pendiente)}
                        </span>
                      </label>
                      {isSelected && (
                        <div className="mt-1.5 flex items-center justify-end gap-2 pl-6">
                          <span className="text-xs text-ink/40">Abono / pago:</span>
                          <span className="flex items-center gap-1 text-ink/60">
                            $
                            <input
                              type="number"
                              min={0}
                              max={t.pendiente}
                              value={montos[t.id] ?? t.pendiente}
                              onChange={(e) =>
                                setMontos((prev) => ({ ...prev, [t.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), t.pendiente) }))
                              }
                              className="w-24 rounded-md border border-edge/10 bg-field px-1.5 py-1 text-right text-sm text-ink outline-none focus:border-accent/60"
                            />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {extras.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-success/5 px-2 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2 text-ink/80">
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                        Extra
                      </span>
                      {e.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-ink/60">
                      {formatCurrency(e.monto)}
                      <button
                        onClick={() => setExtras((prev) => prev.filter((x) => x.id !== e.id))}
                        className="text-ink/30 hover:text-danger"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 rounded-lg border border-dashed border-accent/30 p-2.5">
              <p className="mb-1.5 text-[11px] text-ink/50">
                <strong className="text-ink/70">Pago extra</strong> · algo que no está presupuestado pero es necesario
                pagar (ej. medicamento recetado). Solo escribe el monto.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={extraConcepto}
                  onChange={(e) => setExtraConcepto(e.target.value)}
                  placeholder="Concepto (opcional)"
                  aria-label="Concepto del pago extra"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">$</span>
                    <input
                      type="number"
                      min={0}
                      value={extraMonto}
                      onChange={(e) => setExtraMonto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") agregarExtra();
                      }}
                      placeholder="Monto"
                      aria-label="Monto del pago extra"
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={agregarExtra}
                    disabled={!puedeAgregarExtra}
                    className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-4 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-edge/10 bg-inset px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-ink/40">Total a pagar</div>
            <div className="text-xl font-bold text-success">{formatCurrency(totalAPagar)}</div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={facturar}
              onChange={(e) => setFacturar(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Activo para facturar
          </label>
        </div>

        <div className="mt-6 flex gap-3">
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

  const tratamientosPendientes: TratamientoPendiente[] = computeTratamientosPendientes(
    presupuestos,
    pagos,
    devoluciones
  );

  const totalPresupuestado = presupuestos.reduce((sum, p) => sum + p.total, 0);
  /** Dinero cobrado en líneas sin tratamiento: entra a caja pero no descuenta
   * de ningún presupuesto (ver calcularSaldoPendiente). */
  const montoSinLigar = pagos.reduce(
    (sum, p) => sum + p.lineas.reduce((ls, l) => ls + (!l.tratamientoId ? l.monto : 0), 0),
    0
  );
  const saldoPendienteTratamientos = tratamientosPendientes.reduce(
    (sum, t) => sum + t.pendiente,
    0
  );
  /** Solo cuenta pagos ligados a un tratamiento del presupuesto — pagos
   * sueltos como membresías no cuentan como abono a un tratamiento, para
   * que Saldo Pendiente no se vea "pagado" por dinero que en realidad es
   * de otro concepto. */
  const totalPagado = totalPresupuestado - saldoPendienteTratamientos;
  const saldoPendiente = saldoPendienteTratamientos;

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
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Total Presupuestado</div>
          <div className="mt-1 text-lg font-bold text-ink">{formatCurrency(totalPresupuestado)}</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Total Pagado</div>
          <div className="mt-1 text-lg font-bold text-success">{formatCurrency(totalPagado)}</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Saldo Pendiente</div>
          <div className="mt-1 text-lg font-bold text-danger">{formatCurrency(Math.max(saldoPendiente, 0))}</div>
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
                  <td className="px-6 py-3 text-ink/70">{pago.formaPago}</td>
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
          saldoPendienteTotal={saldoPendienteTratamientos}
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
