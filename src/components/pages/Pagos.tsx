"use client";

import { Fragment, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatCurrency,
  buildReciboTexto,
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
import AvisoNoCabeEnHoja from "@/components/AvisoNoCabeEnHoja";
import RegistrarDevolucionDialog from "@/components/RegistrarDevolucionDialog";
import { calcularDisponibleDevolucion, resumenDesdeDevoluciones } from "@/lib/devolucionesPago";
import { renderPlantilla, formatosWhatsAppInicial, buildProximaCitaTexto } from "@/lib/formatosWhatsapp";

const medicos = ["Dr. Nicolás Medina González", "Dra. Ana Paola Ríos Cervantes"];
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

function EliminarPagoDialog({
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
          del {pago.fecha}. Este registro se guarda en Reportes → Pagos para poder auditarlo después.
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

function EditarPagoDialog({
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
          Corrige el monto o el tratamiento de cada concepto — por ejemplo, si se anotó de menos o
          de más, o si se ligó al tratamiento equivocado al registrar el pago.
        </p>
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
            onClick={() => puedeGuardar && onSave({ ...pago, lineas, total })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function AgregarPagoExtraDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (extra: { label: string; monto: number }) => void;
}) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");

  const montoNumerico = Number(monto);
  const puedeAgregar = concepto.trim().length > 0 && montoNumerico > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Pago Extra</h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Para un tratamiento o concepto que no está presupuestado pero es necesario pagar.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Medicamento recetado"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Monto</label>
            <input
              type="number"
              min={0}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!puedeAgregar) return;
              onAdd({ label: concepto.trim(), monto: montoNumerico });
            }}
            disabled={!puedeAgregar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReciboActions({
  patientId,
  patientName,
  pago,
  onDone,
}: {
  patientId: string;
  patientName: string;
  pago: Pago;
  onDone: () => void;
}) {
  const { citas, patients, clinicInfo, formatosWhatsapp } = usePatientData();

  const handleImprimir = () => {
    window.print();
  };

  const handleEnviarCorreo = () => {
    const asunto = encodeURIComponent(`Recibo de pago — ${patientName}`);
    const cuerpo = encodeURIComponent(buildReciboTexto(patientName, pago));
    window.open(`mailto:?subject=${asunto}&body=${cuerpo}`, "_blank");
  };

  const handleEnviarWhatsApp = () => {
    const plantilla = formatosWhatsapp.reciboPago ?? formatosWhatsAppInicial.reciboPago;
    const texto = renderPlantilla(plantilla, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: patientName,
      fecha: pago.fecha,
      medico: pago.medico,
      formaPago: pago.formaPago,
      conceptos: pago.lineas.map((l) => `- ${l.label}: ${formatCurrency(l.monto)}`).join("\n"),
      total: formatCurrency(pago.total),
      proximaCita: buildProximaCitaTexto(citas, patientId, pago.fecha),
    });
    // Mismo patrón que Recordatorios.tsx/enviarPdfWhatsapp.ts: sin el
    // teléfono en la URL, WhatsApp abre sin contacto seleccionado y hay que
    // buscar al paciente a mano — con el teléfono, abre directo en su chat.
    const telefono = patients.find((p) => p.id === patientId)?.phone?.replace(/\D/g, "");
    const destino = telefono ? `/${telefono}` : "/";
    window.open(`https://wa.me${destino}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-success">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-lg">
          ✓
        </span>
        <span className="text-sm font-semibold">Pago registrado correctamente</span>
      </div>

      <div className="rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm text-ink/70">
        <div className="flex justify-between">
          <span>Total pagado</span>
          <span className="font-semibold text-success">{formatCurrency(pago.total)}</span>
        </div>
        {pago.firma && (
          <div className="mt-2 border-t border-edge/10 pt-2">
            <p className="mb-1 text-xs text-ink/40">Firma registrada</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pago.firma} alt="Firma del paciente" className="h-16 rounded bg-white p-1" />
          </div>
        )}
      </div>

      <AvisoNoCabeEnHoja mostrar={pago.lineas.length > 8}>
        Este recibo tiene {pago.lineas.length} conceptos — revisa la vista previa de impresión de
        tu navegador antes de entregarlo, por si no cabe en una sola hoja.
      </AvisoNoCabeEnHoja>

      <div>
        <p className="mb-2 text-xs font-medium text-ink/60">Enviar recibo</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImprimir}
            className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarCorreo}
            className="flex-1 rounded-lg border border-info/40 py-2 text-sm font-semibold text-info transition-colors hover:bg-info/10"
          >
            Enviar por mail
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            className="flex-1 rounded-lg border border-success/40 py-2 text-sm font-semibold text-success transition-colors hover:bg-success/10"
          >
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
      >
        Listo
      </button>

      <div className="hidden print:block">
        <h2 className="text-xl font-bold">Recibo de Pago</h2>
        <p className="mt-1 text-sm">Paciente: {patientName}</p>
        <p className="text-sm">Fecha: {pago.fecha}</p>
        <p className="text-sm">Médico: {pago.medico}</p>
        <p className="text-sm">Forma de pago: {pago.formaPago}</p>
        <div className="mt-4 space-y-1">
          {pago.lineas.map((l) => (
            <div key={l.id} className="flex justify-between text-sm">
              <span>{l.label}</span>
              <span>{formatCurrency(l.monto)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t pt-2 text-sm font-bold">
          <span>Total</span>
          <span>{formatCurrency(pago.total)}</span>
        </div>
        {pago.firma && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pago.firma} alt="Firma del paciente" className="mt-4 h-20" />
        )}
      </div>
    </div>
  );
}

export function AgregarPagoDialog({
  patientId,
  patientName,
  saldoPendienteTotal,
  tratamientosPendientes,
  onClose,
  onSave,
}: {
  patientId: string;
  patientName: string;
  saldoPendienteTotal: number;
  tratamientosPendientes: TratamientoPendiente[];
  onClose: () => void;
  onSave: (pago: Pago) => void;
}) {
  const [paso, setPaso] = useState<"form" | "confirmacion" | "firma" | "recibo">("form");
  const [pagoGuardado, setPagoGuardado] = useState<Pago | null>(null);

  const [medico, setMedico] = useState(medicos[0]);
  const [formaPago, setFormaPago] = useState(formasDePago[0]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ id: string; label: string; monto: number }[]>([]);
  const [showExtraDialog, setShowExtraDialog] = useState(false);
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
  const totalExtras = extras.reduce((sum, e) => sum + e.monto, 0);
  const totalAPagar = totalTratamientosSeleccionados + totalExtras;

  const puedeGuardar = totalAPagar > 0;

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
    };

    onSave(pago);
    setPagoGuardado(pago);
    setPaso("confirmacion");
  };

  if (paso === "confirmacion" && pagoGuardado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
          <div className="flex items-center gap-2 text-success">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-lg">
              ✓
            </span>
            <span className="text-sm font-semibold">Pago registrado correctamente</span>
          </div>
          <p className="mt-3 text-sm text-ink/60">
            ¿Deseas cerrar el registro o solicitar la firma del paciente?
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setPaso("recibo")}
              className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
            >
              Aceptar
            </button>
            <button
              onClick={() => setPaso("firma")}
              className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
            >
              Solicitar Firma
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paso === "firma" && pagoGuardado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">Solicitar Firma</h2>
          <FirmaCanvas
            etiqueta="Firma del paciente"
            onCancel={() => setPaso("confirmacion")}
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:bg-transparent">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6 print:border-none print:bg-transparent print:p-0">
          <ReciboActions patientId={patientId} patientName={patientName} pago={pagoGuardado} onDone={onClose} />
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
              Total del presupuesto del paciente
            </div>
            <div className="text-xl font-bold text-accent">
              {formatCurrency(saldoPendienteTotal)}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre del paciente</label>
            <input type="text" readOnly value={patientName} className={`${inputClass} cursor-not-allowed text-ink/60`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Médico tratante</label>
              <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                {medicos.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClass}>
                {formasDePago.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-ink/60">
                Tratamientos pendientes por pagar
              </label>
              <button
                onClick={() => setShowExtraDialog(true)}
                title="Agregar pago extra (no presupuestado)"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 text-accent transition-colors hover:bg-accent/10"
              >
                +
              </button>
            </div>

            {tratamientosPendientes.length === 0 && extras.length === 0 ? (
              <p className="rounded-lg border border-dashed border-edge/15 p-4 text-center text-xs text-ink/30">
                Este paciente no tiene tratamientos pendientes por pagar. Usa el botón + para un pago
                extra.
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
                                setMontos((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
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

        {showExtraDialog && (
          <AgregarPagoExtraDialog
            onClose={() => setShowExtraDialog(false)}
            onAdd={(extra) => {
              setExtras((prev) => [...prev, { id: `${Date.now()}`, ...extra }]);
              setShowExtraDialog(false);
            }}
          />
        )}
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
  const { userEmail, setPagosEliminados, citas, patients, clinicInfo, formatosWhatsapp } = usePatientData();
  const [showDialog, setShowDialog] = useState(false);
  const [printTarget, setPrintTarget] = useState<Pago | null>(null);
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
    setPagoAEliminar(null);
  };

  useEffect(() => {
    if (printTarget) {
      window.print();
    }
  }, [printTarget]);

  const tratamientosPendientes: TratamientoPendiente[] = computeTratamientosPendientes(
    presupuestos,
    pagos,
    devoluciones
  );

  const totalPresupuestado = presupuestos.reduce((sum, p) => sum + p.total, 0);
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
    setPagos((prev) => {
      const existe = prev.some((p) => p.id === pago.id);
      if (existe) return prev.map((p) => (p.id === pago.id ? pago : p));
      return [pago, ...prev];
    });
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
            onClick={() => setShowDialog(true)}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar Pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </div>

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
                        onClick={() => setPrintTarget(pago)}
                        title="Imprimir comprobante"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <PrinterIcon />
                      </button>
                      <button
                        onClick={() => {
                          const plantilla = formatosWhatsapp.reciboPago ?? formatosWhatsAppInicial.reciboPago;
                          const texto = renderPlantilla(plantilla, {
                            clinica: clinicInfo?.nombre || "tu clínica",
                            paciente: patientName,
                            fecha: pago.fecha,
                            medico: pago.medico,
                            formaPago: pago.formaPago,
                            conceptos: pago.lineas
                              .map((l) => `- ${l.label}: ${formatCurrency(l.monto)}`)
                              .join("\n"),
                            total: formatCurrency(pago.total),
                            proximaCita: buildProximaCitaTexto(citas, patientId, pago.fecha),
                          });
                          // Mismo bug que ya se corrigió en ReciboActions: sin el
                          // teléfono en la URL, WhatsApp abre sin contacto
                          // seleccionado y hay que buscarlo a mano.
                          const telefono = patients.find((p) => p.id === patientId)?.phone?.replace(/\D/g, "");
                          const destino = telefono ? `/${telefono}` : "/";
                          window.open(`https://wa.me${destino}?text=${encodeURIComponent(texto)}`, "_blank");
                        }}
                        title="Enviar comprobante por WhatsApp"
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

      {printTarget && (
        <div className="hidden print:block">
          <h2 className="text-xl font-bold">Recibo de Pago</h2>
          <p className="mt-1 text-sm">Paciente: {patientName}</p>
          <p className="text-sm">Fecha: {printTarget.fecha}</p>
          <p className="text-sm">Médico: {printTarget.medico}</p>
          <p className="text-sm">Forma de pago: {printTarget.formaPago}</p>
          <div className="mt-4 space-y-1">
            {printTarget.lineas.map((l) => (
              <div key={l.id} className="flex justify-between text-sm">
                <span>{l.label}</span>
                <span>{formatCurrency(l.monto)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t pt-2 text-sm font-bold">
            <span>Total</span>
            <span>{formatCurrency(printTarget.total)}</span>
          </div>
          {printTarget.firma && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={printTarget.firma} alt="Firma del paciente" className="mt-4 h-20" />
          )}
        </div>
      )}

      {showDialog && (
        <AgregarPagoDialog
          patientId={patientId}
          patientName={patientName}
          saldoPendienteTotal={saldoPendienteTratamientos}
          tratamientosPendientes={tratamientosPendientes}
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
