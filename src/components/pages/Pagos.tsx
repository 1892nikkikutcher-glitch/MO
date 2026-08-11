"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatCurrency,
  buildReciboTexto,
  computeTratamientosPendientes,
  type SavedBudget,
  type TratamientoPendiente,
  type LineaPago,
  type Pago,
} from "@/lib/patientData";

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
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-[#111] p-6">
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
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function SignaturePad({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleLimpiar = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleGuardar = () => {
    if (!hasSignature) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-ink/70">Firma del paciente</p>
        <canvas
          ref={canvasRef}
          width={440}
          height={160}
          className="w-full touch-none rounded-lg border border-edge/15 bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <p className="mt-1 text-xs text-ink/30">Dibuja la firma dentro del recuadro.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          onClick={handleLimpiar}
          className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
        >
          Limpiar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!hasSignature}
          className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function ReciboActions({
  patientName,
  pago,
  onDone,
}: {
  patientName: string;
  pago: Pago;
  onDone: () => void;
}) {
  const handleImprimir = () => {
    window.print();
  };

  const handleEnviarCorreo = () => {
    const asunto = encodeURIComponent(`Recibo de pago — ${patientName}`);
    const cuerpo = encodeURIComponent(buildReciboTexto(patientName, pago));
    window.open(`mailto:?subject=${asunto}&body=${cuerpo}`, "_blank");
  };

  const handleEnviarWhatsApp = () => {
    const mensaje = encodeURIComponent(buildReciboTexto(patientName, pago));
    window.open(`https://wa.me/?text=${mensaje}`, "_blank");
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
        className="w-full rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
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
  patientName,
  saldoPendienteTotal,
  tratamientosPendientes,
  onClose,
  onSave,
}: {
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
              className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
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
          <SignaturePad
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
          <ReciboActions patientName={patientName} pago={pagoGuardado} onDone={onClose} />
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
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
  patientName,
  presupuestos,
  pagos,
  setPagos,
}: {
  patientName: string;
  presupuestos: SavedBudget[];
  pagos: Pago[];
  setPagos: Dispatch<SetStateAction<Pago[]>>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [printTarget, setPrintTarget] = useState<Pago | null>(null);

  useEffect(() => {
    if (printTarget) {
      window.print();
    }
  }, [printTarget]);

  const tratamientosPendientes: TratamientoPendiente[] = computeTratamientosPendientes(
    presupuestos,
    pagos
  );

  const totalPresupuestado = presupuestos.reduce((sum, p) => sum + p.total, 0);
  const totalPagado = pagos.reduce((sum, p) => sum + p.total, 0);
  const saldoPendiente = totalPresupuestado - totalPagado;
  const saldoPendienteTratamientos = tratamientosPendientes.reduce(
    (sum, t) => sum + t.pendiente,
    0
  );

  const upsertPago = (pago: Pago) => {
    setPagos((prev) => {
      const existe = prev.some((p) => p.id === pago.id);
      if (existe) return prev.map((p) => (p.id === pago.id ? pago : p));
      return [pago, ...prev];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pagos</h3>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          + Agregar Pago
        </button>
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
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id} className="border-b border-edge/5 last:border-0">
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
                        onClick={() =>
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(buildReciboTexto(patientName, pago))}`,
                            "_blank"
                          )
                        }
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
                </tr>
              ))}
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
          patientName={patientName}
          saldoPendienteTotal={saldoPendienteTratamientos}
          tratamientosPendientes={tratamientosPendientes}
          onClose={() => setShowDialog(false)}
          onSave={upsertPago}
        />
      )}
    </div>
  );
}
