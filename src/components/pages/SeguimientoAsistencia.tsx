"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { estadoEntrada, estadoLabel, estadoColor, type EstadoAsistencia } from "@/lib/asistencia";
import { enRangoFecha } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function SeguimientoAsistencia() {
  const { personalAsistencia, registrosAsistencia } = usePatientData();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const registrosFiltrados = registrosAsistencia.filter((r) => enRangoFecha(r.fecha, desde, hasta));

  const resumen = personalAsistencia.map((persona) => {
    const propios = registrosFiltrados.filter((r) => r.personalId === persona.id);
    const conteo: Record<EstadoAsistencia, number> = {
      "a-tiempo": 0,
      retraso: 0,
      falta: 0,
      "sin-horario": 0,
      descanso: 0,
    };
    propios.forEach((r) => {
      const estado = estadoEntrada(persona.horario, r.fecha, r.entrada);
      conteo[estado]++;
    });
    return { persona, conteo, total: propios.length };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-edge/10 bg-surface p-6 sm:w-96">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
        </div>
      </div>

      {resumen.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no tienes personal registrado en Asistencia.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-medium">Personal</th>
                <th className="px-4 py-3 font-medium">Puesto</th>
                <th className="px-4 py-3 font-medium">Registros</th>
                <th className="px-4 py-3 font-medium">A tiempo</th>
                <th className="px-4 py-3 font-medium">Retrasos</th>
                <th className="px-4 py-3 font-medium">Faltas</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map(({ persona, conteo, total }) => (
                <tr key={persona.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-4 py-3 text-ink/80">{persona.nombre}</td>
                  <td className="px-4 py-3 text-ink/60">{persona.puesto}</td>
                  <td className="px-4 py-3 text-ink/60">{total}</td>
                  <td className={`px-4 py-3 font-semibold ${estadoColor["a-tiempo"]}`}>{conteo["a-tiempo"]}</td>
                  <td className={`px-4 py-3 font-semibold ${estadoColor.retraso}`}>{conteo.retraso}</td>
                  <td className={`px-4 py-3 font-semibold ${estadoColor.falta}`}>{conteo.falta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink/30">
        Estados: {(Object.keys(estadoLabel) as EstadoAsistencia[]).map((k) => estadoLabel[k]).join(" · ")}
      </p>
    </div>
  );
}
