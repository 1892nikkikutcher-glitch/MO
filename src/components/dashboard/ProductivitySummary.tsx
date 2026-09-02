"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  horasClinicasEnRango,
  horasDisponiblesEnRango,
  pacientesActivos,
  pacientesAtendidosEnRango,
  pacientesEnRangoDetalle,
  variacionPct,
  type RangoPeriodo,
} from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";
import DashboardDetallePanel, { type DashboardDetalleItem } from "./DashboardDetallePanel";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Detalle = { title: string; items: DashboardDetalleItem[] } | null;

/** Fila 2 del Dashboard Principal — Operación: qué tan ocupado y productivo
 * estuvo el consultorio en el periodo seleccionado, en pacientes y en horas
 * clínicas. Pacientes Activos usa una ventana fija de 12 meses (definición
 * de "actividad clínica", no del periodo del selector). */
export default function ProductivitySummary({ rango }: { rango: RangoPeriodo }) {
  const { patients, citas, horario, irAExpediente } = usePatientData();
  const [detalle, setDetalle] = useState<Detalle>(null);

  const hoy = new Date();
  const hoyISO = toIso(hoy);

  const pacientesAtendidosPeriodo = pacientesAtendidosEnRango(citas, rango.desdeISO, rango.hastaISO);
  const pacientesAtendidosAnterior = pacientesAtendidosEnRango(
    citas,
    rango.desdeAnteriorISO,
    rango.hastaAnteriorISO
  );
  const comparacionAtendidos = variacionPct(pacientesAtendidosPeriodo, pacientesAtendidosAnterior);

  const nuevosPacientesPeriodoArr = patients.filter(
    (p) => p.createdAt && p.createdAt >= rango.desdeISO && p.createdAt <= rango.hastaISO
  );
  const activos = pacientesActivos(citas, hoyISO);

  const horasClinicas = horasClinicasEnRango(citas, rango.desdeISO, rango.hastaISO);
  const horasDisponibles = horasDisponiblesEnRango(horario, rango.desdeISO, rango.hastaISO);
  const ocupacionPct = horasDisponibles > 0 ? Math.min(100, Math.round((horasClinicas / horasDisponibles) * 100)) : 0;
  const citasClinicasPeriodo = citas.filter(
    (c) => c.estatus === "Atendida" && c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO
  );

  const irAPacienteDetalle = (patientId: string) => {
    setDetalle(null);
    irAExpediente(patientId, "Agenda");
  };

  const itemsPacientes = (entries: { patientId: string; patientName: string }[]): DashboardDetalleItem[] =>
    entries.map((e) => ({
      id: e.patientId,
      primary: e.patientName || "Paciente",
      onSelect: () => irAPacienteDetalle(e.patientId),
    }));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard
        label={`Pacientes Atendidos (${rango.label})`}
        value={String(pacientesAtendidosPeriodo)}
        color="#2ee67a"
        onClick={() =>
          setDetalle({
            title: `Pacientes Atendidos (${rango.label})`,
            items: itemsPacientes(pacientesEnRangoDetalle(citas, rango.desdeISO, rango.hastaISO)),
          })
        }
        comparison={
          comparacionAtendidos === null
            ? null
            : { pct: comparacionAtendidos, favorable: comparacionAtendidos >= 0 }
        }
      />

      <DashboardMetricCard
        label={`Pacientes Nuevos (${rango.label})`}
        value={String(nuevosPacientesPeriodoArr.length)}
        color="#ff3d9a"
        onClick={() =>
          setDetalle({
            title: `Pacientes Nuevos (${rango.label})`,
            items: nuevosPacientesPeriodoArr.map((p) => ({
              id: p.id,
              primary: p.name || "Paciente",
              secondary: p.createdAt,
              onSelect: () => irAPacienteDetalle(p.id),
            })),
          })
        }
      />

      <DashboardMetricCard
        label="Pacientes Activos"
        value={String(activos)}
        color="#3aa8ff"
        onClick={() => {
          const hace12Meses = new Date(hoyISO);
          hace12Meses.setFullYear(hace12Meses.getFullYear() - 1);
          setDetalle({
            title: "Pacientes Activos",
            items: itemsPacientes(pacientesEnRangoDetalle(citas, toIso(hace12Meses), hoyISO)),
          });
        }}
        tooltip="Pacientes con al menos una cita Atendida en los últimos 12 meses. Ver detalle."
      >
        <div className="mt-1 text-[11px] text-ink/40">de {patients.length} registrados</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label={`Horas Clínicas (${rango.label})`}
        value={`${horasClinicas} h`}
        color="#b84dff"
        onClick={() =>
          setDetalle({
            title: `Horas Clínicas (${rango.label})`,
            items: citasClinicasPeriodo.map((c) => ({
              id: c.id,
              primary: c.paciente || "Paciente",
              secondary: `${c.fecha} · ${c.horaInicio}-${c.horaFin}`,
              onSelect: c.patientId ? () => irAPacienteDetalle(c.patientId as string) : undefined,
            })),
          })
        }
        tooltip="Suma de la duración de las citas marcadas como Atendidas en el periodo. Ver detalle."
      />

      <DashboardMetricCard
        label="Ocupación"
        value={`${ocupacionPct}%`}
        color="#ffb020"
        tooltip={`${horasClinicas} h ocupadas de ${horasDisponibles} h disponibles según el horario del consultorio en el periodo. Aproximado: el horario no distingue días de la semana.`}
      >
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
            style={{ width: `${ocupacionPct}%` }}
          />
        </div>
      </DashboardMetricCard>

      {detalle && (
        <DashboardDetallePanel
          title={detalle.title}
          items={detalle.items}
          emptyMessage="No hay elementos para mostrar."
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
