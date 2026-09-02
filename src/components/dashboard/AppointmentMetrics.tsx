"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { citasProximas, valorPerdidoEstimado, type RangoPeriodo } from "@/lib/dashboardMetrics";
import type { CitaAgenda } from "@/lib/patientData";
import DashboardMetricCard from "./DashboardMetricCard";
import DashboardDetallePanel, { type DashboardDetalleItem } from "./DashboardDetallePanel";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Detalle = { title: string; items: DashboardDetalleItem[] } | null;

/** Fila 4 del Dashboard Principal — Agenda: qué tanto de lo programado en el
 * periodo seleccionado realmente se atendió, qué tanto se perdió por
 * cancelación o inasistencia. Próximas Citas se queda fija a "próximos 7
 * días" — es información hacia adelante, no depende del periodo elegido
 * (que puede incluso ser en el pasado). */
export default function AppointmentMetrics({ rango }: { rango: RangoPeriodo }) {
  const { puedeVerFinanzas, citas, irAExpediente } = usePatientData();
  const [detalle, setDetalle] = useState<Detalle>(null);

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const citasDelPeriodo = citas.filter((c) => c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO);

  const citasAtendidasArr = citasDelPeriodo.filter((c) => c.estatus === "Atendida");
  const citasCanceladasArr = citasDelPeriodo.filter((c) => c.estatus === "Cancelada");
  const citasNoAsistieronArr = citasDelPeriodo.filter((c) => c.estatus === "No Asistió");
  const proximas7DiasArr = citasProximas(citas, hoyISO, 7);

  const programadas = citasDelPeriodo.length;
  const atendidas = citasAtendidasArr.length;
  const canceladas = citasCanceladasArr.length;
  const noAsistieron = citasNoAsistieronArr.length;
  const proximos7Dias = proximas7DiasArr.length;

  const pctCancelaciones = programadas > 0 ? Math.round((canceladas / programadas) * 1000) / 10 : 0;
  const pctNoAsistieron = programadas > 0 ? Math.round((noAsistieron / programadas) * 1000) / 10 : 0;

  const valorPerdido = valorPerdidoEstimado(citas, rango.desdeISO, rango.hastaISO);

  const citasAItems = (arr: CitaAgenda[]): DashboardDetalleItem[] =>
    arr.map((c) => ({
      id: c.id,
      primary: c.paciente || "Paciente",
      secondary: `${c.fecha} · ${c.horaInicio}-${c.horaFin} · ${c.estatus}`,
      onSelect: c.patientId
        ? () => {
            setDetalle(null);
            irAExpediente(c.patientId as string, "Agenda");
          }
        : undefined,
    }));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <DashboardMetricCard
        label={`Citas Programadas (${rango.label})`}
        value={String(programadas)}
        color="#3aa8ff"
        onClick={() =>
          setDetalle({ title: `Citas Programadas (${rango.label})`, items: citasAItems(citasDelPeriodo) })
        }
      />

      <DashboardMetricCard
        label={`Citas Atendidas (${rango.label})`}
        value={String(atendidas)}
        color="#2ee67a"
        onClick={() =>
          setDetalle({ title: `Citas Atendidas (${rango.label})`, items: citasAItems(citasAtendidasArr) })
        }
      />

      <DashboardMetricCard
        label={`Cancelaciones (${rango.label})`}
        value={String(canceladas)}
        color="#ffb020"
        onClick={() =>
          setDetalle({ title: `Cancelaciones (${rango.label})`, items: citasAItems(citasCanceladasArr) })
        }
      >
        <div className="mt-1 text-[11px] text-ink/40">{pctCancelaciones}% de lo programado</div>
      </DashboardMetricCard>

      <DashboardMetricCard
        label={`No Asistieron (${rango.label})`}
        value={String(noAsistieron)}
        color="#ff3b3b"
        onClick={() =>
          setDetalle({ title: `No Asistieron (${rango.label})`, items: citasAItems(citasNoAsistieronArr) })
        }
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
        onClick={() => setDetalle({ title: "Próximas Citas", items: citasAItems(proximas7DiasArr) })}
        tooltip="Citas Agendadas, Confirmadas o En espera en los próximos 7 días. Ver detalle."
      />

      {detalle && (
        <DashboardDetallePanel
          title={detalle.title}
          items={detalle.items}
          emptyMessage="No hay citas para mostrar."
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
