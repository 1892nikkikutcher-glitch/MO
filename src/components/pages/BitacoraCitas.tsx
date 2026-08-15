"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { citaEstatusOptions, formatFechaCita, type CitaEstatus } from "@/lib/patientData";
import { enRangoFecha } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

const estadoColor: Record<CitaEstatus, string> = {
  Agendada: "bg-ink/10 text-ink/60",
  Confirmada: "bg-info/10 text-info",
  "En espera": "bg-accent/10 text-accent",
  Atendida: "bg-success/10 text-success",
  Reagendada: "bg-warning/10 text-warning",
  Cancelada: "bg-danger/10 text-danger",
  "No Asistió": "bg-danger/20 text-danger",
};

export default function BitacoraCitas() {
  const { citas, recursos } = usePatientData();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [estatus, setEstatus] = useState<CitaEstatus | "">("");
  const [busqueda, setBusqueda] = useState("");

  const filtradas = citas
    .filter((c) => enRangoFecha(c.fecha, desde, hasta))
    .filter((c) => !recursoId || c.recursoId === recursoId)
    .filter((c) => !estatus || c.estatus === estatus)
    .filter((c) => !busqueda.trim() || c.paciente.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .sort((a, b) => (a.fecha + a.horaInicio < b.fecha + b.horaInicio ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Médico / Unidad</label>
          <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {recursos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Estatus</label>
          <select
            value={estatus}
            onChange={(e) => setEstatus(e.target.value as CitaEstatus | "")}
            className={inputClass}
          >
            <option value="">Todos</option>
            {citaEstatusOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-ink/40">{filtradas.length} cita(s) encontrada(s).</p>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay citas que coincidan con el filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Médico / Unidad</th>
                <th className="px-4 py-3 font-medium">Procedimiento(s)</th>
                <th className="px-4 py-3 font-medium">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatFechaCita(c.fecha)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{c.horaInicio}</td>
                  <td className="px-4 py-3 text-ink/80">{c.paciente}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {recursos.find((r) => r.id === c.recursoId)?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{c.tratamientos.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoColor[c.estatus]}`}
                    >
                      {c.estatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
