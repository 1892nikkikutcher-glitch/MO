"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { citaEstatusOptions, formatFechaCita, type CitaEstatus } from "@/lib/patientData";
import { enRangoFecha } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function BorrarCitas() {
  const { citas, recursos, setCitas } = usePatientData();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [estatus, setEstatus] = useState<CitaEstatus | "">("");
  const [confirmando, setConfirmando] = useState(false);
  const [borrado, setBorrado] = useState(0);

  const filtroActivo = Boolean(desde || hasta || recursoId || estatus);

  const seleccionadas = filtroActivo
    ? citas
        .filter((c) => enRangoFecha(c.fecha, desde, hasta))
        .filter((c) => !recursoId || c.recursoId === recursoId)
        .filter((c) => !estatus || c.estatus === estatus)
    : [];

  const idsSeleccionados = new Set(seleccionadas.map((c) => c.id));

  const borrarSeleccionadas = () => {
    setCitas((prev) => prev.filter((c) => !idsSeleccionados.has(c.id)));
    setBorrado(seleccionadas.length);
    setConfirmando(false);
    setDesde("");
    setHasta("");
    setRecursoId("");
    setEstatus("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-xs text-danger">
        Esta herramienta elimina citas de forma permanente. Define un filtro, revisa la lista de
        abajo antes de confirmar, y borra solo lo que necesites.
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-4">
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
      </div>

      {!filtroActivo ? (
        <p className="text-sm text-ink/40">Define al menos un filtro para ver qué citas se borrarían.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/70">
              <span className="font-semibold text-danger">{seleccionadas.length}</span> cita(s)
              coinciden con el filtro.
            </p>
            {seleccionadas.length > 0 && (
              <button
                onClick={() => setConfirmando(true)}
                className="rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Borrar {seleccionadas.length} cita(s)
              </button>
            )}
          </div>

          {seleccionadas.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-edge/10 bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Hora</th>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {seleccionadas.map((c) => (
                    <tr key={c.id} className="border-b border-edge/5 last:border-0">
                      <td className="px-4 py-3 text-ink/70">{formatFechaCita(c.fecha)}</td>
                      <td className="px-4 py-3 text-ink/70">{c.horaInicio}</td>
                      <td className="px-4 py-3 text-ink/80">{c.paciente}</td>
                      <td className="px-4 py-3 text-ink/60">{c.estatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {borrado > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          Se borraron {borrado} cita(s).
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6 text-center">
            <h3 className="text-base font-semibold text-ink">¿Borrar {seleccionadas.length} cita(s)?</h3>
            <p className="mt-2 text-sm text-ink/60">Esta acción no se puede deshacer.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={borrarSeleccionadas}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
