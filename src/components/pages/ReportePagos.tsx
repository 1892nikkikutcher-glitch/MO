"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, type Pago } from "@/lib/patientData";
import type { PagoRealizado } from "@/lib/pagosRealizados";
import { calcularDisponibleDevolucion, resumenDesdeDevoluciones } from "@/lib/devolucionesPago";
import { EditarPagoDialog, EliminarPagoDialog } from "./Pagos";
import { generarPagosPdf } from "@/lib/generarPagosPdf";
import { descargarBlob } from "@/lib/pdfDocumento";
import { fechaPagoAIso } from "@/lib/metas";
import { calcularRangoPeriodo, type PeriodoId } from "@/lib/dashboardMetrics";
import PeriodSelector from "@/components/dashboard/PeriodSelector";

/** Fecha límite a partir de la cual existe la bitácora de Pagos
 * Realizados — se desplegó junto con este reporte, así que no hay forma
 * de reconstruir retroactivamente los pagos de antes de esa fecha. */
const PAGOS_REALIZADOS_DESDE = "2026-09-22";

export default function ReportePagos() {
  const {
    pagosEliminados,
    pagosRealizados,
    setPagosRealizados,
    setPagosEliminados,
    pagosPorPaciente,
    presupuestosPorPaciente,
    devolucionesPorPaciente,
    setPagosPaciente,
    cargarDatosPaciente,
    puedeVerFinanzas,
    userEmail,
    clinicInfo,
    perfilDoctor,
  } = usePatientData();
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  // Editar o eliminar desde aquí usa exactamente la misma lógica que la pestaña Pagos del expediente: se abre el
  // expediente del paciente en segundo plano (lo necesita para recalcular saldos y cortes) y se aplica el cambio.
  const [accion, setAccion] = useState<{ tipo: "editar" | "eliminar"; registro: PagoRealizado } | null>(null);
  const [aviso, setAviso] = useState("");
  const pacienteAccion = accion?.registro.patientId;
  useEffect(() => {
    if (pacienteAccion) cargarDatosPaciente(pacienteAccion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteAccion]);

  const abrirAccion = (tipo: "editar" | "eliminar", registro: PagoRealizado) => {
    setAviso("");
    setAccion({ tipo, registro });
  };
  const cerrarAccion = () => setAccion(null);

  const pagosDelPaciente = pacienteAccion ? pagosPorPaciente[pacienteAccion] : undefined;
  const presupuestosDelPaciente = pacienteAccion ? presupuestosPorPaciente[pacienteAccion] : undefined;
  const devolucionesDelPaciente = pacienteAccion ? devolucionesPorPaciente[pacienteAccion] ?? [] : [];
  const pagoVigente: Pago | undefined = accion && pagosDelPaciente ? pagosDelPaciente.find((p) => p.id === accion.registro.id) : undefined;
  const expedienteListo = !!pagosDelPaciente && !!presupuestosDelPaciente;
  const tieneDevolucion = (pago: Pago) =>
    calcularDisponibleDevolucion(pago, resumenDesdeDevoluciones(pago.id, devolucionesDelPaciente)).totalDevuelto > 0;

  const guardarEdicion = (pago: Pago) => {
    if (!accion) return;
    setPagosPaciente(accion.registro.patientId, (prev) => prev.map((p) => (p.id === pago.id ? pago : p)));
    setPagosRealizados((prev) => prev.map((r) => (r.id === pago.id ? { ...r, pago } : r)));
    setAviso("Pago actualizado. El saldo del paciente y los cortes ya se recalcularon.");
    cerrarAccion();
  };

  const eliminarPago = (pago: Pago, motivo: string) => {
    if (!accion) return;
    const { patientId, patientName } = accion.registro;
    // El registro se arma fuera del updater: dentro, React lo corre dos veces en desarrollo y quedaría duplicado.
    const registro = { id: `pe${Date.now()}`, patientId, patientName, pago, motivo, eliminadoEn: new Date().toISOString(), eliminadoPor: userEmail };
    setPagosEliminados((prev) => [registro, ...prev]);
    setPagosPaciente(patientId, (prev) => prev.filter((p) => p.id !== pago.id));
    setPagosRealizados((prev) => prev.filter((r) => r.id !== pago.id));
    setAviso("Pago eliminado. Quedó registrado en Pagos eliminados con su motivo.");
    cerrarAccion();
  };

  /** El pago ya no está en el expediente (se borró desde allá antes de que la bitácora lo siguiera): solo se limpia la lista. */
  const quitarRegistroHuerfano = () => {
    if (!accion) return;
    setPagosRealizados((prev) => prev.filter((r) => r.id !== accion.registro.id));
    setAviso("Se quitó de la lista un pago que ya no existía en el expediente.");
    cerrarAccion();
  };

  const hoy = new Date();
  const [periodoId, setPeriodoId] = useState<PeriodoId>("mes");
  const [personalizado, setPersonalizado] = useState(() => ({
    desdeISO: `${hoy.toISOString().slice(0, 7)}-01`,
    hastaISO: hoy.toISOString().slice(0, 10),
  }));
  const [anclaFecha, setAnclaFecha] = useState<Date>(() => new Date());

  const seleccionarPeriodo = (id: PeriodoId) => {
    setPeriodoId(id);
    setAnclaFecha(new Date());
  };

  const navegarPeriodo = (direccion: -1 | 1) => {
    setAnclaFecha((prev) => {
      const siguiente = new Date(prev);
      switch (periodoId) {
        case "hoy":
          siguiente.setDate(siguiente.getDate() + direccion);
          break;
        case "semana":
          siguiente.setDate(siguiente.getDate() + direccion * 7);
          break;
        case "trimestre":
          siguiente.setMonth(siguiente.getMonth() + direccion * 3);
          break;
        case "año":
          siguiente.setMonth(siguiente.getMonth() + direccion * 12);
          break;
        case "mes":
        default:
          siguiente.setMonth(siguiente.getMonth() + direccion);
      }
      return siguiente;
    });
  };

  const rango = calcularRangoPeriodo(periodoId, anclaFecha, personalizado, hoy);

  const realizadosDelPeriodo = pagosRealizados
    .filter((r) => {
      const isoFecha = fechaPagoAIso(r.pago.fecha);
      return isoFecha !== null && isoFecha >= rango.desdeISO && isoFecha <= rango.hastaISO;
    })
    .sort((a, b) => b.registradoEn.localeCompare(a.registradoEn));
  const totalRealizados = realizadosDelPeriodo.reduce((sum, r) => sum + r.pago.total, 0);

  const eliminadosDelPeriodo = pagosEliminados
    .filter((r) => {
      const isoFecha = r.eliminadoEn.slice(0, 10);
      return isoFecha >= rango.desdeISO && isoFecha <= rango.hastaISO;
    })
    .sort((a, b) => b.eliminadoEn.localeCompare(a.eliminadoEn));
  const totalEliminados = eliminadosDelPeriodo.reduce((sum, r) => sum + r.pago.total, 0);

  const descargarPdf = async () => {
    setGenerandoPdf(true);
    setErrorPdf("");
    try {
      const { blob, nombre } = await generarPagosPdf({
        periodo: rango.detalleFecha,
        desdeISO: rango.desdeISO,
        hastaISO: rango.hastaISO,
        realizados: realizadosDelPeriodo,
        eliminados: eliminadosDelPeriodo,
        clinicaNombre: clinicInfo?.nombre || "",
        direccion: perfilDoctor.direccionClinica,
        logoUrl: perfilDoctor.logoClinicaUrl,
      });
      descargarBlob(blob, nombre);
    } catch {
      setErrorPdf("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      <PeriodSelector
        periodoId={periodoId}
        onSelect={seleccionarPeriodo}
        personalizado={personalizado}
        onPersonalizadoChange={setPersonalizado}
        rango={rango}
        onNavigate={navegarPeriodo}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={descargarPdf}
          disabled={generandoPdf}
          title="Descargar en PDF los pagos realizados y eliminados de este periodo"
          className="rounded-lg border border-edge/30 bg-field px-3.5 py-2 text-sm font-semibold text-ink/90 transition-colors hover:bg-surface2 disabled:opacity-60"
        >
          {generandoPdf ? "Generando PDF…" : "Descargar PDF"}
        </button>
        {errorPdf && <span className="text-xs text-danger">{errorPdf}</span>}
      </div>

      <div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pagos Realizados</h3>
          <p className="mt-1 text-xs text-ink/40">
            Todos los pagos registrados en este periodo, de cualquier paciente. Solo incluye pagos
            registrados a partir del {PAGOS_REALIZADOS_DESDE} — los anteriores a esa fecha no quedaron
            en esta bitácora y siguen consultándose desde el expediente de cada paciente.
          </p>
        </div>

        {aviso && <p className="mt-2 text-xs text-success">{aviso}</p>}
        {realizadosDelPeriodo.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay pagos registrados en este periodo.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-6 py-3 font-medium">Fecha del pago</th>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Conceptos</th>
                  <th className="px-6 py-3 font-medium">Médico</th>
                  <th className="px-6 py-3 font-medium">Forma de pago</th>
                  <th className="px-6 py-3 text-right font-medium">Monto</th>
                  {puedeVerFinanzas && <th className="px-6 py-3 text-right font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {realizadosDelPeriodo.map((r) => (
                  <tr key={r.id} className="border-b border-edge/5 last:border-0 align-top">
                    <td className="px-6 py-3 whitespace-nowrap text-ink/60">{r.pago.fecha}</td>
                    <td className="px-6 py-3 font-medium text-ink/80">{r.patientName}</td>
                    <td className="px-6 py-3 text-ink/60">
                      {r.pago.lineas.length > 0 ? r.pago.lineas.map((l) => l.label).join(", ") : "—"}
                    </td>
                    <td className="px-6 py-3 text-ink/60">{r.pago.medico}</td>
                    <td className="px-6 py-3 text-ink/60">{r.pago.formaPago}</td>
                    <td className="px-6 py-3 text-right font-semibold text-success">
                      {formatCurrency(r.pago.total)}
                    </td>
                    {puedeVerFinanzas && (
                      <td className="px-6 py-3 text-right">
                        <div className="ml-auto flex w-fit items-center gap-1.5">
                          <button
                            onClick={() => abrirAccion("editar", r)}
                            title="Editar pago (fecha, forma de pago, monto o tratamiento)"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => abrirAccion("eliminar", r)}
                            title="Eliminar pago"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink/50">
                    Total del periodo
                  </td>
                  <td className="px-6 py-3 text-right text-base font-bold text-success">
                    {formatCurrency(totalRealizados)}
                  </td>
                  {puedeVerFinanzas && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pagos Eliminados</h3>
          <p className="mt-1 text-xs text-ink/40">
            Bitácora de auditoría: cada vez que se elimina un pago desde el expediente de un
            paciente, queda registrado aquí junto con el motivo.
          </p>
        </div>

        {eliminadosDelPeriodo.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No se ha eliminado ningún pago en este periodo.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-6 py-3 font-medium">Eliminado</th>
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Fecha del pago</th>
                  <th className="px-6 py-3 font-medium">Conceptos</th>
                  <th className="px-6 py-3 text-right font-medium">Monto</th>
                  <th className="px-6 py-3 font-medium">Motivo</th>
                  <th className="px-6 py-3 font-medium">Eliminado por</th>
                </tr>
              </thead>
              <tbody>
                {eliminadosDelPeriodo.map((r) => (
                  <tr key={r.id} className="border-b border-edge/5 last:border-0 align-top">
                    <td className="px-6 py-3 whitespace-nowrap text-ink/60">
                      {new Date(r.eliminadoEn).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3 font-medium text-ink/80">{r.patientName}</td>
                    <td className="px-6 py-3 text-ink/60">{r.pago.fecha}</td>
                    <td className="px-6 py-3 text-ink/60">
                      {r.pago.lineas.length > 0 ? r.pago.lineas.map((l) => l.label).join(", ") : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-danger">
                      {formatCurrency(r.pago.total)}
                    </td>
                    <td className="px-6 py-3 text-ink/70">{r.motivo}</td>
                    <td className="px-6 py-3 text-ink/40">{r.eliminadoPor}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink/50">
                    Total del periodo
                  </td>
                  <td className="px-6 py-3 text-right text-base font-bold text-danger">
                    {formatCurrency(totalEliminados)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {accion && !expedienteListo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border border-edge/10 bg-modal p-6 text-sm text-ink/70">Abriendo el expediente de {accion.registro.patientName}…</div>
        </div>
      )}
      {accion && expedienteListo && !pagoVigente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Este pago ya no está en el expediente</h3>
            <p className="mt-2 text-sm text-ink/70">
              El pago de {formatCurrency(accion.registro.pago.total)} de {accion.registro.patientName} se eliminó o se movió desde el expediente, pero seguía en esta lista.
              Puedes quitarlo de aquí; el dinero y el saldo del paciente no cambian.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={cerrarAccion} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
                Cancelar
              </button>
              <button onClick={quitarRegistroHuerfano} className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black hover:opacity-90">
                Quitar de la lista
              </button>
            </div>
          </div>
        </div>
      )}
      {accion && pagoVigente && tieneDevolucion(pagoVigente) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Este pago tiene una devolución</h3>
            <p className="mt-2 text-sm text-ink/70">
              Ya tiene una devolución registrada, así que no se puede {accion.tipo === "editar" ? "editar" : "eliminar"}. Si hay un error, corrígelo desde el registro de la devolución.
            </p>
            <button onClick={cerrarAccion} className="mt-6 w-full rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
              Entendido
            </button>
          </div>
        </div>
      )}
      {accion?.tipo === "editar" && pagoVigente && presupuestosDelPaciente && !tieneDevolucion(pagoVigente) && (
        <EditarPagoDialog pago={pagoVigente} presupuestos={presupuestosDelPaciente} onClose={cerrarAccion} onSave={guardarEdicion} />
      )}
      {accion?.tipo === "eliminar" && pagoVigente && !tieneDevolucion(pagoVigente) && (
        <EliminarPagoDialog pago={pagoVigente} onClose={cerrarAccion} onConfirm={(motivo) => eliminarPago(pagoVigente, motivo)} />
      )}
    </div>
  );
}
