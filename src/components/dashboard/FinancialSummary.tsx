"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { contarPagosEnRango, inicioMes, inicioSemana, sumarRango } from "@/lib/metas";
import { horasClinicasEnRango, variacionPct, type RangoPeriodo } from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 1 del Dashboard Principal — Finanzas. Reemplaza las antiguas
 * tarjetas de Corte Diario/Semanal/Mensual con una tarjeta de Ingresos más
 * completa, y agrega Ingreso por Hora Clínica. Solo visible para quien
 * puede ver finanzas (mismo gate que el resto de esta fila desde antes).
 * `rango` viene del selector de periodo en Inicio.tsx — Ingresos, Ingreso
 * por Hora Clínica y Ticket Promedio se calculan sobre ese rango. Saldo
 * Pendiente sigue siendo histórico (es un balance actual, no algo que
 * "ocurrió durante" un periodo — no tiene sentido filtrarlo). */
export default function FinancialSummary({ rango }: { rango: RangoPeriodo }) {
  const { puedeVerFinanzas, citas, finanzas, estadisticas } = usePatientData();

  if (!puedeVerFinanzas) return null;

  const hoy = new Date();
  const hoyISO = toIso(hoy);

  const ingresosHoy = finanzas.porFecha[hoyISO] ?? 0;
  const ingresosSemana = sumarRango(finanzas.porFecha, inicioSemana(hoy), hoy);
  const ingresosMes = sumarRango(finanzas.porFecha, inicioMes(hoy), hoy);

  const desdePeriodo = new Date(`${rango.desdeISO}T00:00:00`);
  const hastaPeriodo = new Date(`${rango.hastaISO}T00:00:00`);
  const desdeAnterior = new Date(`${rango.desdeAnteriorISO}T00:00:00`);
  const hastaAnterior = new Date(`${rango.hastaAnteriorISO}T00:00:00`);
  const ingresosPeriodo = sumarRango(finanzas.porFecha, desdePeriodo, hastaPeriodo);
  const ingresosPeriodoAnterior = sumarRango(finanzas.porFecha, desdeAnterior, hastaAnterior);
  const comparacionIngresos = variacionPct(ingresosPeriodo, ingresosPeriodoAnterior);

  const totalPagadoHistorico = Object.values(finanzas.porFecha).reduce((sum, v) => sum + v, 0);
  const saldoPendiente = Math.max(0, estadisticas.totalPresupuestado - totalPagadoHistorico);

  const cantidadPagosPeriodo = contarPagosEnRango(finanzas.pagosCountPorFecha, desdePeriodo, hastaPeriodo);
  const ticketPromedio = cantidadPagosPeriodo > 0 ? Math.round(ingresosPeriodo / cantidadPagosPeriodo) : 0;

  const horasClinicasPeriodo = horasClinicasEnRango(citas, rango.desdeISO, rango.hastaISO);
  const ingresoPorHora =
    horasClinicasPeriodo > 0 ? Math.round(ingresosPeriodo / horasClinicasPeriodo) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <DashboardMetricCard
        label={`Ingresos (${rango.label})`}
        value={formatCurrency(ingresosPeriodo)}
        color="#ffb020"
        wide
        sensible
        comparison={
          comparacionIngresos === null
            ? null
            : { pct: comparacionIngresos, favorable: comparacionIngresos >= 0 }
        }
      >
        <div className="mt-3 flex gap-4 border-t border-edge/10 pt-3 text-xs text-ink/50">
          <span>
            Hoy <span className="font-semibold text-ink/80">{formatCurrency(ingresosHoy)}</span>
          </span>
          <span>
            Semana <span className="font-semibold text-ink/80">{formatCurrency(ingresosSemana)}</span>
          </span>
          <span>
            Mes <span className="font-semibold text-ink/80">{formatCurrency(ingresosMes)}</span>
          </span>
        </div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label={`Ticket Promedio (${rango.label})`}
        value={cantidadPagosPeriodo > 0 ? formatCurrency(ticketPromedio) : "—"}
        color="#2ee67a"
        sensible
        tooltip={
          cantidadPagosPeriodo > 0
            ? `Ingresos del periodo entre ${cantidadPagosPeriodo} pago(s) registrados en ese mismo periodo.`
            : "Aún no hay pagos en este periodo para calcularlo."
        }
      />

      <DashboardMetricCard
        label="Saldo Pendiente"
        value={formatCurrency(saldoPendiente)}
        color="#ff3b3b"
        sensible
        tooltip="Presupuestado histórico menos lo efectivamente cobrado."
      />

      <DashboardMetricCard
        label={`Ingreso / Hora Clínica (${rango.label})`}
        value={horasClinicasPeriodo > 0 ? formatCurrency(ingresoPorHora) : "—"}
        color="#b84dff"
        sensible
        tooltip={
          horasClinicasPeriodo > 0
            ? `Ingresos del periodo entre ${horasClinicasPeriodo} h clínicas trabajadas (duración de citas Atendidas).`
            : "Aún no hay citas Atendidas en este periodo para calcularlo."
        }
      />
    </div>
  );
}
