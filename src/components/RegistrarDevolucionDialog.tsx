"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import FirmaCanvas from "@/components/FirmaCanvas";
import {
  calcularDisponibleDevolucion,
  devolucionValida,
  resumenDesdeDevoluciones,
  type DevolucionInput,
  type ItemDevolucionInput,
} from "@/lib/devolucionesPago";
import { subirFirmaRecepcionDevolucion, dataUrlABlob } from "@/lib/firmaRecepcionDevolucion";
import { generarComprobanteDevolucionPdf } from "@/lib/generarComprobanteDevolucionPdf";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import AbrirWhatsAppPrompt from "@/components/AbrirWhatsAppPrompt";
import { slugify } from "@/lib/textoNombre";
import {
  formatCurrency,
  motivoDevolucionOptions,
  motivoDevolucionLabel,
  efectoTratamientoOptions,
  efectoTratamientoLabel,
  metodoDevolucionOptions,
  metodoDevolucionLabel,
  relacionReceptorDevolucionLabel,
  type DevolucionPago,
  type EfectoTratamiento,
  type MetodoDevolucion,
  type MotivoDevolucion,
  type Pago,
  type RelacionReceptorDevolucion,
} from "@/lib/patientData";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

type PasoDevolucion = "seleccion-pago" | "detalle" | "metodo" | "confirmar" | "firma" | "comprobante";

type ItemUI = { seleccionado: boolean; monto: string; efecto: EfectoTratamiento | "" };

function PillGroup<T extends string>({
  opciones,
  labels,
  valor,
  onChange,
}: {
  opciones: readonly T[];
  labels: Record<T, string>;
  valor: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
            valor === opt ? "border-danger/60 bg-danger/15 text-danger" : "border-edge/15 text-ink/60 hover:bg-surface"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export default function RegistrarDevolucionDialog({
  patientId,
  patientName,
  pagos,
  pagoPreseleccionado,
  onClose,
}: {
  patientId: string;
  patientName: string;
  pagos: Pago[];
  pagoPreseleccionado?: Pago;
  onClose: () => void;
}) {
  const {
    clinicUid,
    devolucionesPorPaciente,
    registrarDevolucion,
    reconciliarSaldoPendiente,
    agregarFirmaRecepcionDevolucion,
    perfilDoctor,
    clinicInfo,
  } = usePatientData();
  const devoluciones = devolucionesPorPaciente[patientId] ?? [];

  const [paso, setPaso] = useState<PasoDevolucion>(pagoPreseleccionado ? "detalle" : "seleccion-pago");
  const [pago, setPago] = useState<Pago | null>(pagoPreseleccionado ?? null);
  const [tipo, setTipo] = useState<"total" | "parcial">("parcial");
  const [desglosar, setDesglosar] = useState(false);
  const [items, setItems] = useState<Record<string, ItemUI>>({});
  const [montoLibre, setMontoLibre] = useState("");
  const [montoNoAsignado, setMontoNoAsignado] = useState("0");
  const [efectoGeneral, setEfectoGeneral] = useState<EfectoTratamiento | "">("");
  const [metodo, setMetodo] = useState<MetodoDevolucion | null>(null);
  const [motivo, setMotivo] = useState<MotivoDevolucion | null>(null);
  const [detalleMotivo, setDetalleMotivo] = useState("");
  const [recibeNombre, setRecibeNombre] = useState("");
  const [recibeRelacion, setRecibeRelacion] = useState<RelacionReceptorDevolucion | "">("");
  const [referenciaTransferencia, setReferenciaTransferencia] = useState("");
  const [devolucionId] = useState(() => `dev${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [devolucionCompletada, setDevolucionCompletada] = useState<DevolucionPago | null>(null);
  const [saldoSincronizado, setSaldoSincronizado] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");
  const [waUrlPendiente, setWaUrlPendiente] = useState<string | null>(null);

  const resumen = pago ? resumenDesdeDevoluciones(pago.id, devoluciones) : null;
  const disponible = pago ? calcularDisponibleDevolucion(pago, resumen) : null;

  const itemsAfectados: ItemDevolucionInput[] = pago
    ? pago.lineas
        .filter((l) => items[l.id]?.seleccionado)
        .map((l) => ({
          lineaPagoId: l.id,
          tratamientoId: l.tratamientoId,
          folio: l.folio,
          label: l.label,
          montoDevuelto: Number(items[l.id]?.monto) || 0,
          efectoTratamiento: (items[l.id]?.efecto || null) as EfectoTratamiento | null,
        }))
    : [];

  const montoTotal = desglosar
    ? Math.round((itemsAfectados.reduce((s, i) => s + i.montoDevuelto, 0) + (Number(montoNoAsignado) || 0)) * 100) / 100
    : Number(montoLibre) || 0;

  const input: DevolucionInput | null = pago
    ? {
        patientId,
        pagoOrigenId: pago.id,
        tipo,
        monto: montoTotal,
        metodo,
        motivo,
        detalleMotivo: detalleMotivo.trim() || undefined,
        efectoTratamiento: desglosar ? (montoNoAsignado && Number(montoNoAsignado) > 0 ? efectoGeneral || null : null) : efectoGeneral || null,
        itemsAfectados: desglosar && itemsAfectados.length ? itemsAfectados : undefined,
        montoNoAsignadoTratamientos: desglosar ? Number(montoNoAsignado) || 0 : montoTotal,
        recibidoPor: metodo === "efectivo" ? { nombre: recibeNombre, relacion: recibeRelacion || undefined } : undefined,
        referenciaTransferencia: referenciaTransferencia.trim() || undefined,
      }
    : null;

  const validacion = pago && input ? devolucionValida(input, pago, resumen) : null;

  const seleccionarPago = (p: Pago) => {
    setPago(p);
    setPaso("detalle");
  };

  const toggleItem = (lineaId: string, montoMax: number) => {
    setItems((prev) => {
      const actual = prev[lineaId];
      if (actual?.seleccionado) return { ...prev, [lineaId]: { ...actual, seleccionado: false } };
      return { ...prev, [lineaId]: { seleccionado: true, monto: actual?.monto ?? String(montoMax), efecto: actual?.efecto ?? "" } };
    });
  };

  const activarTotal = () => {
    setTipo("total");
    if (!pago || !disponible) return;
    if (desglosar) {
      const nuevos: Record<string, ItemUI> = {};
      pago.lineas.forEach((l) => {
        const devueltoPrevio = resumen?.devueltoPorLinea[l.id] ?? 0;
        const restante = Math.max(0, Math.round((l.monto - devueltoPrevio) * 100) / 100);
        if (restante > 0) nuevos[l.id] = { seleccionado: true, monto: String(restante), efecto: items[l.id]?.efecto ?? "" };
      });
      setItems(nuevos);
      setMontoNoAsignado("0");
    } else {
      setMontoLibre(String(disponible.disponible));
    }
  };

  const handleConfirmar = async () => {
    if (!pago || !input || !validacion?.valido || guardando) return;
    setGuardando(true);
    setErrorGuardar("");
    try {
      const { devolucion, saldoSincronizado: sinc } = await registrarDevolucion(devolucionId, input, patientName);
      setDevolucionCompletada(devolucion);
      setSaldoSincronizado(sinc);
      setPaso(metodo === "efectivo" ? "firma" : "comprobante");
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "No se pudo completar la devolución. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const reintentarSincronizacion = () => {
    setSincronizando(true);
    try {
      reconciliarSaldoPendiente(patientId);
      setSaldoSincronizado(true);
    } finally {
      setSincronizando(false);
    }
  };

  const enviarComprobante = async (accion: "imprimir" | "whatsapp") => {
    if (!devolucionCompletada || !pago) return;
    setGenerandoPdf(true);
    setErrorPdf("");
    const ventanaWhatsApp = accion === "whatsapp" ? window.open("", "_blank") : null;
    try {
      const blob = await generarComprobanteDevolucionPdf({
        devolucion: devolucionCompletada,
        pagoOrigen: pago,
        pacienteNombre: patientName,
        clinicaNombre: clinicInfo?.nombre || "",
        registradoPorNombre: perfilDoctor?.nombre || "",
      });
      if (accion === "imprimir") {
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        w?.addEventListener("load", () => w.print());
      } else {
        const nombreArchivo = `Devolucion_${slugify(patientName)}.pdf`;
        const caption = `Comprobante de devolución — ${patientName} · ${formatCurrency(devolucionCompletada.monto)}`;
        const resultado = await enviarPdfPorWhatsapp({ blob, nombreArchivo, caption, ventanaPrevia: ventanaWhatsApp });
        if (resultado.requiereAbrirManualmente) setWaUrlPendiente(resultado.waUrl);
      }
    } catch (err) {
      ventanaWhatsApp?.close();
      setErrorPdf(err instanceof Error ? err.message : "No se pudo generar el comprobante.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const [subiendoFirma, setSubiendoFirma] = useState(false);
  const [errorFirma, setErrorFirma] = useState("");

  const manejarFirma = async (dataUrl: string) => {
    if (!devolucionCompletada || !clinicUid) return;
    setSubiendoFirma(true);
    setErrorFirma("");
    try {
      const blob = await dataUrlABlob(dataUrl);
      const { path, url } = await subirFirmaRecepcionDevolucion(clinicUid, patientId, devolucionId, blob);
      await agregarFirmaRecepcionDevolucion(patientId, devolucionId, devolucionCompletada.pagoOrigenId, path, url);
      setDevolucionCompletada((prev) => (prev ? { ...prev, firmaRecepcionStoragePath: path, firmaRecepcionUrl: url } : prev));
      setPaso("comprobante");
    } catch (err) {
      // Nunca sugiere repetir la devolución — el dinero YA quedó registrado.
      setErrorFirma(err instanceof Error ? err.message : "No se pudo guardar la firma. Puedes continuar sin ella.");
    } finally {
      setSubiendoFirma(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-danger/20 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">↩ Registrar devolución</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>

        {paso === "seleccion-pago" && (
          <div className="space-y-2">
            <p className="text-xs text-ink/40">Selecciona el pago del que se va a devolver dinero.</p>
            {pagos.map((p) => {
              const res = resumenDesdeDevoluciones(p.id, devoluciones);
              const disp = calcularDisponibleDevolucion(p, res);
              if (disp.disponible <= 0) return null;
              return (
                <button
                  key={p.id}
                  onClick={() => seleccionarPago(p)}
                  className="w-full rounded-lg border border-edge/10 bg-inset p-3 text-left text-sm transition-colors hover:border-danger/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{p.fecha} — {p.lineas.map((l) => l.label).join(", ") || "Pago"}</span>
                    <span className="font-semibold text-ink">{formatCurrency(p.total)}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-2 text-[11px] text-ink/50">
                    <span>Original: {formatCurrency(disp.montoOriginal)}</span>
                    <span>Devuelto: {formatCurrency(disp.totalDevuelto)}</span>
                    <span>Neto: {formatCurrency(disp.neto)}</span>
                    <span className="font-semibold text-danger">Disponible: {formatCurrency(disp.disponible)}</span>
                  </div>
                </button>
              );
            })}
            {pagos.every((p) => calcularDisponibleDevolucion(p, resumenDesdeDevoluciones(p.id, devoluciones)).disponible <= 0) && (
              <p className="rounded-lg border border-dashed border-edge/15 p-4 text-center text-xs text-ink/30">
                Este paciente no tiene pagos con saldo disponible para devolver.
              </p>
            )}
          </div>
        )}

        {paso === "detalle" && pago && disponible && (
          <div className="space-y-4">
            <div className="rounded-lg border border-edge/10 bg-inset p-3 text-xs">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <span>Original: <span className="font-semibold text-ink">{formatCurrency(disponible.montoOriginal)}</span></span>
                <span>Devuelto: <span className="font-semibold text-ink">{formatCurrency(disponible.totalDevuelto)}</span></span>
                <span>Neto: <span className="font-semibold text-ink">{formatCurrency(disponible.neto)}</span></span>
                <span>Disponible: <span className="font-semibold text-danger">{formatCurrency(disponible.disponible)}</span></span>
              </div>
              {disponible.sobreDevuelto && (
                <p className="mt-2 text-danger">⚠️ Este pago muestra más devuelto que su monto original — revisa el historial antes de continuar.</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Tipo de devolución</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={activarTotal}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${tipo === "total" ? "border-danger/60 bg-danger/15 text-danger" : "border-edge/15 text-ink/60"}`}
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("parcial")}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${tipo === "parcial" ? "border-danger/60 bg-danger/15 text-danger" : "border-edge/15 text-ink/60"}`}
                >
                  Parcial
                </button>
              </div>
            </div>

            {pago.lineas.some((l) => l.tratamientoId) && (
              <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
                <input type="checkbox" checked={desglosar} onChange={(e) => setDesglosar(e.target.checked)} className="h-4 w-4 accent-danger" />
                Desglosar por renglón / tratamiento
              </label>
            )}

            {!desglosar && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Monto a devolver</label>
                <input
                  type="number"
                  min={0}
                  value={montoLibre}
                  onChange={(e) => setMontoLibre(e.target.value)}
                  disabled={tipo === "total"}
                  className={`${inputClass} ${tipo === "total" ? "cursor-not-allowed opacity-60" : ""}`}
                />
                <label className="mb-1 mt-3 block text-xs font-medium text-ink/60">¿Qué ocurre con el tratamiento relacionado?</label>
                <select value={efectoGeneral} onChange={(e) => setEfectoGeneral(e.target.value as EfectoTratamiento)} className={inputClass}>
                  <option value="">Selecciona...</option>
                  {efectoTratamientoOptions.map((e) => (
                    <option key={e} value={e}>{efectoTratamientoLabel[e]}</option>
                  ))}
                </select>
              </div>
            )}

            {desglosar && (
              <div className="space-y-2">
                {pago.lineas.map((l) => {
                  const devueltoPrevio = resumen?.devueltoPorLinea[l.id] ?? 0;
                  const restante = Math.max(0, Math.round((l.monto - devueltoPrevio) * 100) / 100);
                  if (restante <= 0) return null;
                  const it = items[l.id];
                  return (
                    <div key={l.id} className="rounded-lg border border-edge/10 bg-inset p-2.5 text-xs">
                      <label className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <input type="checkbox" checked={!!it?.seleccionado} onChange={() => toggleItem(l.id, restante)} className="h-4 w-4 accent-danger" />
                          <span className="text-ink">{l.label}</span>
                        </span>
                        <span className="text-ink/40">Disponible: {formatCurrency(restante)}</span>
                      </label>
                      {it?.seleccionado && (
                        <div className="mt-2 space-y-1.5 pl-6">
                          <input
                            type="number"
                            min={0}
                            max={restante}
                            value={it.monto}
                            onChange={(e) => setItems((prev) => ({ ...prev, [l.id]: { ...prev[l.id], monto: e.target.value } }))}
                            className={inputClass}
                          />
                          <select
                            value={it.efecto}
                            onChange={(e) => setItems((prev) => ({ ...prev, [l.id]: { ...prev[l.id], efecto: e.target.value as EfectoTratamiento } }))}
                            className={inputClass}
                          >
                            <option value="">¿Qué ocurre con este tratamiento?</option>
                            {efectoTratamientoOptions.map((e) => (
                              <option key={e} value={e}>{efectoTratamientoLabel[e]}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Monto adicional sin tratamiento asociado (opcional)</label>
                  <input type="number" min={0} value={montoNoAsignado} onChange={(e) => setMontoNoAsignado(e.target.value)} className={inputClass} />
                  {Number(montoNoAsignado) > 0 && (
                    <select value={efectoGeneral} onChange={(e) => setEfectoGeneral(e.target.value as EfectoTratamiento)} className={`${inputClass} mt-1.5`}>
                      <option value="">¿Qué ocurre con esta parte?</option>
                      {efectoTratamientoOptions.map((e) => (
                        <option key={e} value={e}>{efectoTratamientoLabel[e]}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm">
                  <span className="text-ink/50">Total a devolver: </span>
                  <span className="font-semibold text-ink">{formatCurrency(montoTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
                Cancelar
              </button>
              <button
                onClick={() => setPaso("metodo")}
                disabled={montoTotal <= 0}
                className="flex-1 rounded-lg border border-danger/50 bg-danger/15 py-2.5 text-sm font-semibold text-danger transition-opacity hover:bg-danger/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {paso === "metodo" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Método</label>
              <PillGroup opciones={metodoDevolucionOptions} labels={metodoDevolucionLabel} valor={metodo} onChange={setMetodo} />
            </div>

            {metodo === "efectivo" && (
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">¿Quién recibe el efectivo?</label>
                  <input type="text" value={recibeNombre} onChange={(e) => setRecibeNombre(e.target.value)} placeholder="Nombre de quien recibe" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Relación con el paciente</label>
                  <select value={recibeRelacion} onChange={(e) => setRecibeRelacion(e.target.value as RelacionReceptorDevolucion)} className={inputClass}>
                    <option value="">Selecciona...</option>
                    {(Object.keys(relacionReceptorDevolucionLabel) as RelacionReceptorDevolucion[]).map((r) => (
                      <option key={r} value={r}>{relacionReceptorDevolucionLabel[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {metodo === "transferencia" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Referencia bancaria / comprobante (opcional)</label>
                <input type="text" value={referenciaTransferencia} onChange={(e) => setReferenciaTransferencia(e.target.value)} className={inputClass} />
              </div>
            )}
            {metodo === "reverso_tarjeta" && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                Esto solo registra que se inició el reverso — MO no confirma automáticamente que el banco/procesador ya devolvió el dinero.
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Motivo</label>
              <select value={motivo ?? ""} onChange={(e) => setMotivo(e.target.value as MotivoDevolucion)} className={inputClass}>
                <option value="">Selecciona...</option>
                {motivoDevolucionOptions.map((m) => (
                  <option key={m} value={m}>{motivoDevolucionLabel[m]}</option>
                ))}
              </select>
              {motivo === "otro" && (
                <input
                  type="text"
                  value={detalleMotivo}
                  onChange={(e) => setDetalleMotivo(e.target.value)}
                  placeholder="Describe el motivo"
                  className={`${inputClass} mt-2`}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPaso("detalle")} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
                Atrás
              </button>
              <button
                onClick={() => setPaso("confirmar")}
                disabled={!metodo || !motivo}
                className="flex-1 rounded-lg border border-danger/50 bg-danger/15 py-2.5 text-sm font-semibold text-danger transition-opacity hover:bg-danger/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {paso === "confirmar" && pago && (
          <div className="space-y-4">
            <div className="rounded-lg border border-edge/10 bg-inset p-3 text-sm">
              <div className="flex justify-between"><span className="text-ink/50">Monto a devolver</span><span className="font-semibold text-danger">{formatCurrency(montoTotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink/50">Tipo</span><span className="text-ink">{tipo === "total" ? "Total" : "Parcial"}</span></div>
              <div className="flex justify-between"><span className="text-ink/50">Método</span><span className="text-ink">{metodo ? metodoDevolucionLabel[metodo] : "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink/50">Motivo</span><span className="text-ink">{motivo ? motivoDevolucionLabel[motivo] : "—"}</span></div>
              {metodo === "efectivo" && <div className="flex justify-between"><span className="text-ink/50">Recibe</span><span className="text-ink">{recibeNombre}</span></div>}
            </div>

            {validacion && !validacion.valido && <p className="text-xs text-danger">{validacion.motivo}</p>}
            {errorGuardar && <p className="text-xs text-danger">{errorGuardar}</p>}

            <div className="flex gap-3">
              <button onClick={() => setPaso("metodo")} disabled={guardando} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface disabled:opacity-40">
                Atrás
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!validacion?.valido || guardando}
                className="flex-1 rounded-lg border border-danger/60 bg-danger/20 py-2.5 text-sm font-semibold text-danger transition-opacity hover:bg-danger/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? "Completando…" : "Completar devolución"}
              </button>
            </div>
          </div>
        )}

        {paso === "firma" && devolucionCompletada && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-lg">✓</span>
              <span className="text-sm font-semibold">Devolución completada</span>
            </div>
            <p className="text-xs text-ink/50">
              Firma opcional de acuse de recepción — solo confirma que el dinero fue recibido, no implica renuncia de derechos.
            </p>
            {errorFirma && <p className="text-xs text-danger">{errorFirma}</p>}
            <FirmaCanvas etiqueta="Firma de quien recibe" onCancel={() => setPaso("comprobante")} onSave={manejarFirma} />
            {subiendoFirma && <p className="text-xs text-ink/40">Guardando firma…</p>}
          </div>
        )}

        {paso === "comprobante" && devolucionCompletada && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-lg">✓</span>
              <span className="text-sm font-semibold">Devolución completada</span>
            </div>
            <div className="rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm">
              <div className="flex justify-between"><span className="text-ink/50">Devuelto</span><span className="font-semibold text-danger">{formatCurrency(devolucionCompletada.monto)}</span></div>
            </div>

            <div className="space-y-1 text-xs">
              <p>Devolución: <span className="font-semibold text-success">✓ Completada</span></p>
              <p>Firma de recepción: <span className="font-semibold text-ink/60">{devolucionCompletada.firmaRecepcionUrl ? "✓ Capturada" : "○ Pendiente"}</span></p>
            </div>

            {!saldoSincronizado && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <p>La devolución quedó completada. El saldo pendiente del paciente todavía debe sincronizarse.</p>
                <button onClick={reintentarSincronizacion} disabled={sincronizando} className="mt-2 rounded-lg border border-warning/50 px-3 py-1.5 font-semibold hover:bg-warning/10 disabled:opacity-40">
                  {sincronizando ? "Sincronizando…" : "Reintentar sincronización"}
                </button>
              </div>
            )}

            {errorPdf && <p className="text-xs text-danger">{errorPdf}. <button onClick={() => enviarComprobante("imprimir")} className="underline">Generar de nuevo</button></p>}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => enviarComprobante("imprimir")} disabled={generandoPdf} className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 hover:bg-surface disabled:opacity-40">
                {generandoPdf ? "Generando…" : "Imprimir comprobante"}
              </button>
              <button onClick={() => enviarComprobante("whatsapp")} disabled={generandoPdf} className="flex-1 rounded-lg border border-success/40 py-2 text-sm font-semibold text-success hover:bg-success/10 disabled:opacity-40">
                Enviar por WhatsApp
              </button>
            </div>

            <button onClick={onClose} className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25">
              Listo
            </button>
          </div>
        )}
      </div>

      {waUrlPendiente && <AbrirWhatsAppPrompt waUrl={waUrlPendiente} onCerrar={() => setWaUrlPendiente(null)} />}
    </div>
  );
}
