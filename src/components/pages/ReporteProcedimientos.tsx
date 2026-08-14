"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { enRangoFecha, rankingProcedimientos } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function ReporteProcedimientos() {
  const { citas } = usePatientData();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtradas = citas.filter((c) => enRangoFecha(c.fecha, desde, hasta));
  const ranking = rankingProcedimientos(filtradas);
  const total = ranking.reduce((sum, r) => sum + r.veces, 0);

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

      <p className="text-xs text-ink/40">
        Basado en el texto de procedimiento capturado en cada cita ({total} en total).
      </p>

      {ranking.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay procedimientos registrados en el rango seleccionado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
          <div className="grid grid-cols-[1fr_100px_120px] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span>Procedimiento</span>
            <span className="text-right">Veces</span>
            <span className="text-right">% del total</span>
          </div>
          <div className="divide-y divide-edge/5">
            {ranking.map((r) => (
              <div key={r.nombre} className="grid grid-cols-[1fr_100px_120px] items-center gap-3 px-4 py-3">
                <span className="text-sm text-ink">{r.nombre}</span>
                <span className="text-right text-sm font-semibold text-accent">{r.veces}</span>
                <span className="text-right text-sm text-ink/50">
                  {total > 0 ? `${Math.round((r.veces / total) * 100)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
