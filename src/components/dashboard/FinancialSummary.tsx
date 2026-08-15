"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { inicioMes, inicioSemana, sumarRango } from "@/lib/metas";
import { horasClinicasEnRango, variacionPct } from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 1 del Dashboard Principal — Finanzas. Reemplaza las antiguas
 * tarjetas de Corte Diario/Semanal/Mensual con una tarjeta de Ingresos más
 * completa, y agrega Ingreso por Hora Clínica. Solo visible para quien
 * puede ver finanzas (mismo gate que el resto de esta fila desde antes). */
export default function FinancialSummary() {
  const { puedeVerFinanzas, citas, finanzas, estadisticas } = usePatientData();

  if (!puedeVerFinanzas) return null;

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const inicioMesActual = inicioMes(hoy);
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  finMesAnterior.setHours(23, 59, 59, 999);

  const ingresosHoy = finanzas.porFecha[hoyISO] ?? 0;
  const ingresosSemana = sumarRango(finanzas.porFecha, inicioSemana(hoy), hoy);
  const ingresosMes = sumarRango(finanzas.porFecha, inicioMesActual, hoy);
  const ingresosMesAnterior = sumarRango(finanzas.porFecha, inicioMesAnterior, finMesAnterior);
  const comparacionIngresos = variacionPct(ingresosMes, ingresosMesAnterior);

  const totalPagadoHistorico = Object.values(finanzas.porFecha).reduce((sum, v) => sum + v, 0);
  const ticketPromedio =
    estadisticas.pagosCount > 0 ? Math.round(totalPagadoHistorico / estadisticas.pagosCount) : 0;
  const saldoPendiente = Math.max(0, estadisticas.totalPresupuestado - totalPagadoHistorico);

  const horasClinicasMes = horasClinicasEnRango(citas, toIso(inicioMesActual), hoyISO);
  const ingresoPorHora = horasClinicasMes > 0 ? Math.round(ingresosMes / horasClinicasMes) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <DashboardMetricCard
        label="Ingresos del Mes"
        value={formatCurrency(ingresosMes)}
        color="#ffb020"
        wide
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
        label="Ticket Promedio"
        value={formatCurrency(ticketPromedio)}
        color="#2ee67a"
        tooltip="Ingresos cobrados entre número de pagos registrados históricamente."
      />

      <DashboardMetricCard
        label="Saldo Pendiente"
        value={formatCurrency(saldoPendiente)}
        color="#ff3b3b"
        tooltip="Presupuestado histórico menos lo efectivamente cobrado."
      />

      <DashboardMetricCard
        label="Ingreso / Hora Clínica"
        value={horasClinicasMes > 0 ? formatCurrency(ingresoPorHora) : "—"}
        color="#b84dff"
        tooltip={
          horasClinicasMes > 0
            ? `Ingresos del mes entre ${horasClinicasMes} h clínicas trabajadas (duración de citas Atendidas).`
            : "Aún no hay citas Atendidas este mes para calcularlo."
        }
      />
    </div>
  );
}
