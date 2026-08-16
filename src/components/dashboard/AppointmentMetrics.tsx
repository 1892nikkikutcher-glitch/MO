"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { proximasCitas, valorPerdidoEstimado, type RangoPeriodo } from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 4 del Dashboard Principal — Agenda: qué tanto de lo programado en el
 * periodo seleccionado realmente se atendió, qué tanto se perdió por
 * cancelación o inasistencia. Próximas Citas se queda fija a "próximos 7
 * días" — es información hacia adelante, no depende del periodo elegido
 * (que puede incluso ser en el pasado). */
export default function AppointmentMetrics({ rango }: { rango: RangoPeriodo }) {
  const { puedeVerFinanzas, citas } = usePatientData();

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const citasDelPeriodo = citas.filter((c) => c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO);

  const programadas = citasDelPeriodo.length;
  const atendidas = citasDelPeriodo.filter((c) => c.estatus === "Atendida").length;
  const canceladas = citasDelPeriodo.filter((c) => c.estatus === "Cancelada").length;
  const noAsistieron = citasDelPeriodo.filter((c) => c.estatus === "No Asistió").length;
  const proximos7Dias = proximasCitas(citas, hoyISO, 7);

  const pctCancelaciones = programadas > 0 ? Math.round((canceladas / programadas) * 1000) / 10 : 0;
  const pctNoAsistieron = programadas > 0 ? Math.round((noAsistieron / programadas) * 1000) / 10 : 0;

  const valorPerdido = valorPerdidoEstimado(citas, rango.desdeISO, rango.hastaISO);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard
        label={`Citas Programadas (${rango.label})`}
        value={String(programadas)}
        color="#3aa8ff"
      />

      <DashboardMetricCard
        label={`Citas Atendidas (${rango.label})`}
        value={String(atendidas)}
        color="#2ee67a"
      />

      <DashboardMetricCard label={`Cancelaciones (${rango.label})`} value={String(canceladas)} color="#ffb020">
        <div className="mt-1 text-[11px] text-ink/40">{pctCancelaciones}% de lo programado</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label={`No Asistieron (${rango.label})`}
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
