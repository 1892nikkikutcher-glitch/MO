"use client";

import { usePatientData } from "@/context/PatientDataContext";
import {
  horasClinicasEnRango,
  horasDisponiblesEnRango,
  pacientesActivos,
  pacientesAtendidosEnRango,
} from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 2 del Dashboard Principal — Operación: qué tan ocupado y productivo
 * estuvo el consultorio este mes, en pacientes y en horas clínicas. */
export default function ProductivitySummary() {
  const { patients, citas, horario } = usePatientData();

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const inicioMesISO = toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const mesActualKey = hoyISO.slice(0, 7);

  const pacientesAtendidosMes = pacientesAtendidosEnRango(citas, inicioMesISO, hoyISO);
  const nuevosPacientesMes = patients.filter((p) => p.createdAt?.slice(0, 7) === mesActualKey).length;
  const activos = pacientesActivos(citas, hoyISO);

  const horasClinicas = horasClinicasEnRango(citas, inicioMesISO, hoyISO);
  const horasDisponibles = horasDisponiblesEnRango(horario, inicioMesISO, hoyISO);
  const ocupacionPct = horasDisponibles > 0 ? Math.min(100, Math.round((horasClinicas / horasDisponibles) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard label="Pacientes Atendidos (Mes)" value={String(pacientesAtendidosMes)} color="#2ee67a" />

      <DashboardMetricCard label="Pacientes Nuevos (Mes)" value={String(nuevosPacientesMes)} color="#ff3d9a" />

      <DashboardMetricCard
        label="Pacientes Activos"
        value={String(activos)}
        color="#3aa8ff"
        tooltip="Pacientes con al menos una cita Atendida en los últimos 12 meses."
      >
        <div className="mt-1 text-[11px] text-ink/40">de {patients.length} registrados</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label="Horas Clínicas (Mes)"
        value={`${horasClinicas} h`}
        color="#b84dff"
        tooltip="Suma de la duración de las citas marcadas como Atendidas este mes."
      />

      <DashboardMetricCard
        label="Ocupación"
        value={`${ocupacionPct}%`}
        color="#ffb020"
        tooltip={`${horasClinicas} h ocupadas de ${horasDisponibles} h disponibles según el horario del consultorio. Aproximado: el horario no distingue días de la semana.`}
      >
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-orange-500 transition-all"
            style={{ width: `${ocupacionPct}%` }}
          />
        </div>
      </DashboardMetricCard>
    </div>
  );
}
