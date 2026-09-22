"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { fechaPagoAIso } from "@/lib/metas";
import { calcularRangoPeriodo, type PeriodoId } from "@/lib/dashboardMetrics";
import PeriodSelector from "@/components/dashboard/PeriodSelector";

/** Fecha límite a partir de la cual existe la bitácora de Pagos
 * Realizados — se desplegó junto con este reporte, así que no hay forma
 * de reconstruir retroactivamente los pagos de antes de esa fecha. */
const PAGOS_REALIZADOS_DESDE = "2026-09-22";

export default function ReportePagos() {
  const { pagosEliminados, pagosRealizados } = usePatientData();

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

      <div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pagos Realizados</h3>
          <p className="mt-1 text-xs text-ink/40">
            Todos los pagos registrados en este periodo, de cualquier paciente. Solo incluye pagos
            registrados a partir del {PAGOS_REALIZADOS_DESDE} — los anteriores a esa fecha no quedaron
            en esta bitácora y siguen consultándose desde el expediente de cada paciente.
          </p>
        </div>

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
    </div>
  );
}
