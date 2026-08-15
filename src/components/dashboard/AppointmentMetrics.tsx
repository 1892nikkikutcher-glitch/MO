"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { proximasCitas, valorPerdidoEstimado } from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 4 del Dashboard Principal — Agenda: qué tanto de lo programado este
 * mes realmente se atendió, qué tanto se perdió por cancelación o
 * inasistencia, y qué viene en los próximos días. */
export default function AppointmentMetrics() {
  const { puedeVerFinanzas, citas } = usePatientData();

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const mesActualKey = hoyISO.slice(0, 7);
  const citasDelMes = citas.filter((c) => c.fecha.slice(0, 7) === mesActualKey);

  const programadas = citasDelMes.length;
  const atendidas = citasDelMes.filter((c) => c.estatus === "Atendida").length;
  const canceladas = citasDelMes.filter((c) => c.estatus === "Cancelada").length;
  const noAsistieron = citasDelMes.filter((c) => c.estatus === "No Asistió").length;
  const proximos7Dias = proximasCitas(citas, hoyISO, 7);

  const pctCancelaciones = programadas > 0 ? Math.round((canceladas / programadas) * 1000) / 10 : 0;
  const pctNoAsistieron = programadas > 0 ? Math.round((noAsistieron / programadas) * 1000) / 10 : 0;

  const inicioMesISO = toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const valorPerdido = valorPerdidoEstimado(citas, inicioMesISO, hoyISO);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard label="Citas Programadas (Mes)" value={String(programadas)} color="#3aa8ff" />

      <DashboardMetricCard label="Citas Atendidas (Mes)" value={String(atendidas)} color="#2ee67a" />

      <DashboardMetricCard label="Cancelaciones (Mes)" value={String(canceladas)} color="#ffb020">
        <div className="mt-1 text-[11px] text-ink/40">{pctCancelaciones}% de lo programado</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label="No Asistieron (Mes)"
        value={String(noAsistieron)}
        color="#ff3b3b"
        tooltip={
          puedeVerFinanzas && noAsistieron > 0
            ? `${formatCurrency(valorPerdido)} potencialmente perdidos — aproximado, solo cuenta citas con costo capturado.`
            : undefined
        }
      >
        <div className="mt-1 text-[11px] text-ink/40">
          {pctNoAsistieron}% de lo programado
          {puedeVerFinanzas && noAsistieron > 0 && (
            <span className="ml-1 text-danger/70">· ~{formatCurrency(valorPerdido)}</span>
          )}
        </div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label="Próximas Citas"
        value={String(proximos7Dias)}
        color="#b84dff"
        tooltip="Citas Agendadas, Confirmadas o En espera en los próximos 7 días."
      />
    </div>
  );
}
