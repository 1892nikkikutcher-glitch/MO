"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import type { PagosSinLigar, SaldoPendienteEntry } from "@/lib/saldosPendientes";

export default function ReporteSaldosPendientes() {
  const { saldosPendientes, irAExpediente, recalcularSaldosPendientes, puedeVerFinanzas } = usePatientData();
  const [recalculando, setRecalculando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{
    pacientes: number;
    conSaldo: number;
    sinLigar: PagosSinLigar[];
    porPaciente: Record<string, SaldoPendienteEntry>;
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
