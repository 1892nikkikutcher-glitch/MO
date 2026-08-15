"use client";

import type { CitaAgenda, CitaEstatus, Recurso } from "@/lib/patientData";
import { formatFechaCita } from "@/lib/patientData";

const estadoColor: Record<CitaEstatus, string> = {
  Agendada: "bg-ink/10 text-ink/60",
  Confirmada: "bg-info/10 text-info",
  "En espera": "bg-accent/10 text-accent",
  Atendida: "bg-success/10 text-success",
  Reagendada: "bg-warning/10 text-warning",
  Cancelada: "bg-danger/10 text-danger",
  "No Asistió": "bg-danger/20 text-danger",
};

export default function ListadoCitas({ citas, recursos }: { citas: CitaAgenda[]; recursos: Recurso[] }) {
  if (citas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
        Este paciente aún no tiene citas registradas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
            <th className="px-6 py-3 font-medium">Fecha y hora</th>
            <th className="px-6 py-3 font-medium">Procedimiento</th>
            <th className="px-6 py-3 font-medium">Estatus</th>
            <th className="px-6 py-3 font-medium">Médico de atención</th>
            <th className="px-6 py-3 font-medium">Notas</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((cita) => (
            <tr key={cita.id} className="border-b border-edge/5 last:border-0 hover:bg-surface">
              <td className="px-6 py-4 whitespace-nowrap text-ink/80">
                {formatFechaCita(cita.fecha)} · {cita.horaInicio}
              </td>
              <td className="px-6 py-4 text-ink/80">{cita.tratamientos.join(", ") || "—"}</td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoColor[cita.estatus]}`}
                >
                  {cita.estatus}
                </span>
              </td>
              <td className="px-6 py-4 text-ink/70">
                {recursos.find((r) => r.id === cita.recursoId)?.nombre ?? "—"}
              </td>
              <td className="px-6 py-4 text-ink/50">{cita.comentarios || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
