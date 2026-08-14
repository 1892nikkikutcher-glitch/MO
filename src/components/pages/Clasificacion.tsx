"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatNombreConEdad } from "@/lib/patientData";
import { clasificarPaciente, type ClasificacionPaciente } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

const colorClasificacion: Record<ClasificacionPaciente, string> = {
  "Sin citas": "bg-ink/10 text-ink/50",
  Nuevo: "bg-accent/10 text-accent",
  Recurrente: "bg-success/10 text-success",
};

export default function Clasificacion() {
  const { patients, citas } = usePatientData();
  const [filtro, setFiltro] = useState<ClasificacionPaciente | "">("");

  const citasPorPaciente = new Map<string, number>();
  citas.forEach((c) => {
    if (!c.patientId) return;
    citasPorPaciente.set(c.patientId, (citasPorPaciente.get(c.patientId) ?? 0) + 1);
  });

  const filas = patients
    .map((p) => ({ patient: p, numCitas: citasPorPaciente.get(p.id) ?? 0 }))
    .map((f) => ({ ...f, clasificacion: clasificarPaciente(f.numCitas) }))
    .filter((f) => !filtro || f.clasificacion === filtro)
    .sort((a, b) => b.numCitas - a.numCitas);

  const conteos = {
    "Sin citas": patients.length - citasPorPaciente.size,
    Nuevo: Array.from(citasPorPaciente.values()).filter((n) => n === 1).length,
    Recurrente: Array.from(citasPorPaciente.values()).filter((n) => n > 1).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(conteos) as ClasificacionPaciente[]).map((k) => (
          <button
            key={k}
            onClick={() => setFiltro(filtro === k ? "" : k)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              filtro === k ? "border-accent bg-accent/10" : "border-edge/10 bg-surface hover:border-accent/30"
            }`}
          >
            <p className="text-2xl font-bold text-ink">{conteos[k]}</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colorClasificacion[k]}`}>
              {k}
            </p>
          </button>
        ))}
      </div>

      <div className="max-w-xs">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as ClasificacionPaciente | "")}
          className={inputClass}
        >
          <option value="">Todos los pacientes</option>
          <option value="Sin citas">Sin citas</option>
          <option value="Nuevo">Nuevo (1 cita)</option>
          <option value="Recurrente">Recurrente (2+ citas)</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Citas registradas</th>
              <th className="px-4 py-3 font-medium">Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, 200).map(({ patient, numCitas, clasificacion }) => (
              <tr key={patient.id} className="border-b border-edge/5 last:border-0">
                <td className="px-4 py-3 text-ink/80">
                  {formatNombreConEdad(patient.name, patient.birthDate)}
                </td>
                <td className="px-4 py-3 text-ink/60">{numCitas}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colorClasificacion[clasificacion]}`}
                  >
                    {clasificacion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length > 200 && (
          <p className="border-t border-edge/10 px-4 py-3 text-xs text-ink/40">
            Mostrando los primeros 200 de {filas.length}.
          </p>
        )}
      </div>
    </div>
  );
}
