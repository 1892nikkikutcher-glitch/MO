"use client";

import { usePatientData } from "@/context/PatientDataContext";
import {
  horasClinicasEnRango,
  horasDisponiblesEnRango,
  pacientesActivos,
  pacientesAtendidosEnRango,
  variacionPct,
  type RangoPeriodo,
} from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Fila 2 del Dashboard Principal — Operación: qué tan ocupado y productivo
 * estuvo el consultorio en el periodo seleccionado, en pacientes y en horas
 * clínicas. Pacientes Activos usa una ventana fija de 12 meses (definición
 * de "actividad clínica", no del periodo del selector). */
export default function ProductivitySummary({ rango }: { rango: RangoPeriodo }) {
  const { patients, citas, horario } = usePatientData();

  const hoy = new Date();
  const hoyISO = toIso(hoy);

  const pacientesAtendidosPeriodo = pacientesAtendidosEnRango(citas, rango.desdeISO, rango.hastaISO);
  const pacientesAtendidosAnterior = pacientesAtendidosEnRango(
    citas,
    rango.desdeAnteriorISO,
    rango.hastaAnteriorISO
  );
  const comparacionAtendidos = variacionPct(pacientesAtendidosPeriodo, pacientesAtendidosAnterior);

  const nuevosPacientesPeriodo = patients.filter(
    (p) => p.createdAt && p.createdAt >= rango.desdeISO && p.createdAt <= rango.hastaISO
  ).length;
  const activos = pacientesActivos(citas, hoyISO);

  const horasClinicas = horasClinicasEnRango(citas, rango.desdeISO, rango.hastaISO);
  const horasDisponibles = horasDisponiblesEnRango(horario, rango.desdeISO, rango.hastaISO);
  const ocupacionPct = horasDisponibles > 0 ? Math.min(100, Math.round((horasClinicas / horasDisponibles) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard
        label={`Pacientes Atendidos (${rango.label})`}
        value={String(pacientesAtendidosPeriodo)}
        color="#2ee67a"
        comparison={
          comparacionAtendidos === null
            ? null
            : { pct: comparacionAtendidos, favorable: comparacionAtendidos >= 0 }
        }
      />

      <DashboardMetricCard
        label={`Pacientes Nuevos (${rango.label})`}
        value={String(nuevosPacientesPeriodo)}
        color="#ff3d9a"
      />

      <DashboardMetricCard
        label="Pacientes Activos"
        value={String(activos)}
        color="#3aa8ff"
        tooltip="Pacientes con al menos una cita Atendida en los últimos 12 meses."
      >
        <div className="mt-1 text-[11px] text-ink/40">de {patients.length} registrados</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label={`Horas Clínicas (${rango.label})`}
        value={`${horasClinicas} h`}
        color="#b84dff"
        tooltip="Suma de la duración de las citas marcadas como Atendidas en el periodo."
      />

      <DashboardMetricCard
        label="Ocupación"
        value={`${ocupacionPct}%`}
        color="#ffb020"
        tooltip={`${horasClinicas} h ocupadas de ${horasDisponibles} h disponibles según el horario del consultorio en el periodo. Aproximado: el horario no distingue días de la semana.`}
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
