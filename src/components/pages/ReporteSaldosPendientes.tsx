"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import type { PagosSinLigar, SaldoPendienteEntry } from "@/lib/saldosPendientes";
import type { PosibleDuplicado, PresupuestoDeCitaNoAtendida } from "@/lib/saldosFalsos";
import { textoAutoriaPresupuesto } from "@/lib/autoriaRegistros";
import type { PropuestaControl } from "@/lib/controlesPorError";

export default function ReporteSaldosPendientes() {
  const {
    saldosPendientes,
    irAExpediente,
    recalcularSaldosPendientes,
    quitarPresupuestosDeCitasNoAtendidas,
    unirPresupuestoDuplicado,
    corregirControlPorError,
    puedeVerFinanzas,
  } = usePatientData();
  const [corrigiendoControles, setCorrigiendoControles] = useState(false);
  const [mensajesControl, setMensajesControl] = useState<Record<string, { ok: boolean; texto: string }>>({});
  const [controlesOmitidos, setControlesOmitidos] = useState<Set<string>>(new Set());
  const [limpiando, setLimpiando] = useState(false);
  const [mensajeLimpieza, setMensajeLimpieza] = useState("");
  const [uniendo, setUniendo] = useState<string | null>(null);
  const [mensajesUnion, setMensajesUnion] = useState<Record<string, { ok: boolean; texto: string }>>({});
  const [recalculando, setRecalculando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{
    pacientes: number;
    conSaldo: number;
    sinLigar: PagosSinLigar[];
    porPaciente: Record<string, SaldoPendienteEntry>;
    noAtendidas: PresupuestoDeCitaNoAtendida[];
    duplicados: PosibleDuplicado[];
    controles: PropuestaControl[];
  } | null>(null);
  const [calculadoEl, setCalculadoEl] = useState<Date | null>(null);
  const [errorRecalculo, setErrorRecalculo] = useState("");

  const recalcular = async () => {
    setRecalculando(true);
    setErrorRecalculo("");
    setResultado(null);
    try {
      setResultado(await recalcularSaldosPendientes((hechos, total) => setProgreso({ hechos, total })));
      setCalculadoEl(new Date());
    } catch (err) {
      console.error("No se pudo recalcular los saldos", err);
      setErrorRecalculo("No se pudieron recalcular los saldos. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setRecalculando(false);
      setProgreso(null);
    }
  };

  const quitarNoAtendidas = async () => {
    if (!resultado || resultado.noAtendidas.length === 0) return;
    const n = resultado.noAtendidas.length;
    if (!window.confirm(`Se quitarán ${n} presupuestos de citas que nunca se atendieron y que nadie ha pagado. Quedan guardados en la Papelera. ¿Continuar?`)) return;
    setLimpiando(true);
    setMensajeLimpieza("");
    try {
      const quitados = await quitarPresupuestosDeCitasNoAtendidas(resultado.noAtendidas);
      setMensajeLimpieza(`Listo: se quitaron ${quitados} presupuestos. Recalculando saldos…`);
      await recalcular();
      setMensajeLimpieza(`Listo: se quitaron ${quitados} presupuestos (están en Administración → Papelera).`);
    } catch (err) {
      console.error("No se pudieron quitar los presupuestos", err);
      setMensajeLimpieza("No se pudo completar. Intenta de nuevo.");
    } finally {
      setLimpiando(false);
    }
  };

  const aplicarControles = async (items: PropuestaControl[]) => {
    const aplicables = items.filter((c) => c.accion !== "revisar");
    if (aplicables.length === 0) return;
    const pasan = aplicables.filter((c) => c.accion === "pasar_pagos").length;
    const texto =
      `Se corregirán ${aplicables.length} presupuestos de control` +
      (pasan > 0 ? ` (${pasan} con pagos que pasan al presupuesto principal de ortodoncia)` : "") +
      ". Los quitados quedan en la Papelera y el dinero cobrado no cambia. ¿Continuar?";
    if (!window.confirm(texto)) return;
    setCorrigiendoControles(true);
    const nuevos: Record<string, { ok: boolean; texto: string }> = {};
    for (const c of aplicables) {
      const r = await corregirControlPorError(c);
      nuevos[c.presupuestoId] = { ok: r.ok, texto: r.mensaje };
    }
    setMensajesControl((m) => ({ ...m, ...nuevos }));
    setCorrigiendoControles(false);
    await recalcular();
  };

  const unir = async (d: PosibleDuplicado) => {
    setUniendo(d.presupuestoCitaId);
    const r = await unirPresupuestoDuplicado(d);
    setMensajesUnion((m) => ({ ...m, [d.presupuestoCitaId]: { ok: r.ok, texto: r.mensaje } }));
    setUniendo(null);
    if (r.ok) await recalcular();
  };

  // Al abrir el reporte se calcula con los presupuestos y pagos REALES de cada
  // expediente (no con el resumen guardado, que puede estar desfasado). Mientras
  // termina, se muestra el resumen guardado marcado como provisional.
  const yaCalculo = useRef(false);
  useEffect(() => {
    if (!puedeVerFinanzas || yaCalculo.current) return;
    yaCalculo.current = true;
    void recalcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeVerFinanzas]);

  const lista = Object.values(resultado?.porPaciente ?? saldosPendientes.porPaciente).sort(
    (a, b) => b.totalPresupuestado - b.totalPagado - (a.totalPresupuestado - a.totalPagado)
  );
  const totalPendiente = lista.reduce((s, e) => s + (e.totalPresupuestado - e.totalPagado), 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Saldos Pendientes
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Los saldos se calculan al abrir este reporte con los presupuestos y pagos reales de cada
          expediente.
          {recalculando && " Mientras termina se muestra el último resumen guardado (provisional)."}
          {!recalculando &&
            calculadoEl &&
            ` Calculado hoy a las ${calculadoEl.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}.`}
        </p>
        {puedeVerFinanzas && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={recalcular}
              disabled={recalculando}
              className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-xs font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-50"
            >
              {recalculando
                ? progreso
                  ? `Recalculando… ${progreso.hechos} de ${progreso.total}`
                  : "Recalculando…"
                : "Volver a calcular"}
            </button>
            {errorRecalculo && <span className="text-xs text-danger">{errorRecalculo}</span>}
          </div>
        )}
      </div>

      {resultado && (
        <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-5">
          <p className="text-sm text-ink/80">
            Listo: se revisaron {resultado.pacientes} expedientes y {resultado.conSaldo}{" "}
            {resultado.conSaldo === 1 ? "paciente tiene" : "pacientes tienen"} saldo pendiente.
          </p>
          {resultado.noAtendidas.length > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
              <p className="text-sm font-semibold text-danger">
                {resultado.noAtendidas.length} presupuestos son de citas que nunca se atendieron (
                {formatCurrency(resultado.noAtendidas.reduce((sum, x) => sum + x.total, 0))}) y nadie los ha pagado
              </p>
              <p className="mt-1 text-xs text-ink/60">
                Cada cita con costo crea su presupuesto; si la cita se canceló, se reagendó o el paciente no llegó,
                ese presupuesto se quedaba como deuda que nadie puede pagar. Quitarlos baja el saldo a lo real
                (quedan guardados en la Papelera y se pueden restaurar).
              </p>
              <ul className="mt-2 max-h-40 divide-y divide-edge/5 overflow-y-auto text-xs text-ink/70">
                {resultado.noAtendidas.map((x) => (
                  <li key={x.presupuestoId} className="flex justify-between gap-3 py-1">
                    <button onClick={() => irAExpediente(x.patientId, "Pagos")} className="text-left underline decoration-ink/20 underline-offset-2 hover:text-accent">
                      {x.patientName}
                    </button>
                    <span className="shrink-0">
                      {formatCurrency(x.total)} · cita {x.citaEstatus}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={quitarNoAtendidas}
                disabled={limpiando}
                className="mt-3 rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
              >
                {limpiando ? "Quitando…" : `Quitar estos ${resultado.noAtendidas.length} presupuestos`}
              </button>
            </div>
          )}
          {mensajeLimpieza && <p className="text-xs text-success">{mensajeLimpieza}</p>}

          {resultado.controles.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-semibold text-warning">
                {resultado.controles.length} presupuestos son controles o mensualidades que se crearon solos
              </p>
              <p className="mt-1 text-xs text-ink/60">
                Un control o una mensualidad es una visita de un tratamiento que ya tiene su presupuesto, no un
                tratamiento nuevo. Los que no tienen pagos se quitan; si ya tenían un pago, ese pago pasa antes al
                presupuesto principal de ortodoncia del paciente. Todo queda en la Papelera y el dinero cobrado no
                cambia. Quita la palomita a los que quieras conservar.
              </p>
              <ul className="mt-2 max-h-72 divide-y divide-edge/5 overflow-y-auto text-xs text-ink/70">
                {resultado.controles.map((c) => (
                  <li key={c.presupuestoId} className="py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0"
                          disabled={c.accion === "revisar"}
                          checked={c.accion !== "revisar" && !controlesOmitidos.has(c.presupuestoId)}
                          onChange={(e) =>
                            setControlesOmitidos((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.delete(c.presupuestoId);
                              else n.add(c.presupuestoId);
                              return n;
                            })
                          }
                        />
                        <span className="min-w-0">
                          <button
                            onClick={() => irAExpediente(c.patientId, "Pagos")}
                            className="text-left underline decoration-ink/20 underline-offset-2 hover:text-accent"
                          >
                            {c.patientName}
                          </button>{" "}
                          · {c.procedimientos.join(", ")} · {formatCurrency(c.total)}
                          <span className="block text-[11px] text-ink/40">
                            {textoAutoriaPresupuesto({ id: c.presupuestoId, creadoPorEmail: c.creadoPorEmail })}
                          </span>
                        </span>
                      </label>
                      <span className="shrink-0 text-right">
                        {c.accion === "quitar" && <span className="text-ink/50">Sin pagos: se quita</span>}
                        {c.accion === "pasar_pagos" && (
                          <span className="text-success">
                            Pagó {formatCurrency(c.pagado)} → pasa al presupuesto {c.destinoFolio}
                          </span>
                        )}
                        {c.accion === "revisar" && <span className="text-warning">Revisar a mano</span>}
                      </span>
                    </div>
                    {c.accion === "revisar" && c.motivoRevisar && (
                      <p className="mt-0.5 pl-6 text-[11px] text-warning/80">{c.motivoRevisar}</p>
                    )}
                    {mensajesControl[c.presupuestoId] && (
                      <p className={`mt-0.5 pl-6 ${mensajesControl[c.presupuestoId].ok ? "text-success" : "text-danger"}`}>
                        {mensajesControl[c.presupuestoId].texto}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {(() => {
                const marcados = resultado.controles.filter((c) => c.accion !== "revisar" && !controlesOmitidos.has(c.presupuestoId));
                return (
                  <button
                    onClick={() => aplicarControles(marcados)}
                    disabled={corrigiendoControles || marcados.length === 0}
                    className="mt-3 rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-50"
                  >
                    {corrigiendoControles ? "Corrigiendo…" : `Corregir los ${marcados.length} marcados`}
                  </button>
                );
              })()}
            </div>
          )}

          {resultado.duplicados.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-semibold text-warning">
                {resultado.duplicados.length} pacientes tienen el mismo trabajo dos veces: una vez pagado y otra como deuda
              </p>
              <p className="mt-1 text-xs text-ink/60">
                Pasa cuando el pago se registra como «extra» en lugar de ligarlo al presupuesto de la cita. «Unir» pasa el
                pago al presupuesto de la cita y quita el duplicado (queda en la Papelera). El dinero cobrado no cambia.
              </p>
              <ul className="mt-2 divide-y divide-edge/5 text-xs text-ink/70">
                {resultado.duplicados.map((d) => (
                  <li key={d.presupuestoCitaId} className="py-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <button onClick={() => irAExpediente(d.patientId, "Pagos")} className="text-left underline decoration-ink/20 underline-offset-2 hover:text-accent">
                        {d.patientName} · {formatCurrency(d.total)}
                      </button>
                      {d.unibleAutomaticamente ? (
                        <button
                          onClick={() => unir(d)}
                          disabled={uniendo === d.presupuestoCitaId}
                          className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-3 py-1 font-semibold text-accent hover:bg-accent/25 disabled:opacity-50"
                        >
                          {uniendo === d.presupuestoCitaId ? "Uniendo…" : "Unir"}
                        </button>
                      ) : (
                        <span className="shrink-0 text-ink/40">Revisar a mano</span>
                      )}
                    </div>
                    {mensajesUnion[d.presupuestoCitaId] && (
                      <p className={`mt-1 ${mensajesUnion[d.presupuestoCitaId].ok ? "text-success" : "text-danger"}`}>
                        {mensajesUnion[d.presupuestoCitaId].texto}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.sinLigar.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-warning">
                {resultado.sinLigar.length} {resultado.sinLigar.length === 1 ? "paciente tiene" : "pacientes tienen"}{" "}
                pagos que no están ligados a ningún tratamiento
              </p>
              <p className="mt-1 text-xs text-ink/50">
                Ese dinero sí entró a caja, pero no descuenta de ningún presupuesto — por eso siguen
                apareciendo con saldo. Abre su expediente → Pagos → Editar el pago y elige el tratamiento
                que se pagó (no «Otro concepto»).
              </p>
              <ul className="mt-2 divide-y divide-edge/5 text-sm">
                {resultado.sinLigar.map((e) => (
                  <li key={e.patientId} className="flex items-center justify-between gap-3 py-1.5">
                    <button
                      onClick={() => irAExpediente(e.patientId, "Pagos")}
                      className="text-left font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent"
                    >
                      {e.patientName}
                    </button>
                    <span className="shrink-0 text-ink/60">
                      {formatCurrency(e.monto)} · {e.cantidad} {e.cantidad === 1 ? "pago" : "pagos"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-ink/50">Ningún pago quedó sin ligar a un tratamiento.</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-danger">{formatCurrency(totalPendiente)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
          Total pendiente ({lista.length} {lista.length === 1 ? "paciente" : "pacientes"})
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay saldos pendientes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 text-right font-medium">Presupuestado</th>
                <th className="px-6 py-3 text-right font-medium">Pagado</th>
                <th className="px-6 py-3 text-right font-medium">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.patientId} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3">
                    <button
                      onClick={() => irAExpediente(e.patientId, "Pagos")}
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {e.patientName}
                    </button>
                    {resultado?.sinLigar.find((x) => x.patientId === e.patientId) && (
                      <p className="mt-0.5 text-[11px] text-warning">
                        Tiene {formatCurrency(resultado.sinLigar.find((x) => x.patientId === e.patientId)!.monto)} cobrados
                        sin ligar a un tratamiento
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-ink/70">
                    {formatCurrency(e.totalPresupuestado)}
                  </td>
                  <td className="px-6 py-3 text-right text-success">
                    {formatCurrency(e.totalPagado)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-danger">
                    {formatCurrency(e.totalPresupuestado - e.totalPagado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
