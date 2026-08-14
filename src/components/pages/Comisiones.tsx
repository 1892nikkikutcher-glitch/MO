"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { enRangoFecha, calcularComisiones } from "@/lib/reportes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function Comisiones() {
  const { citas, recursos, procedimientos, puedeVerFinanzas } = usePatientData();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  if (!puedeVerFinanzas) {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        No tienes permiso para ver información financiera.
      </div>
    );
  }

  const citasFiltradas = citas.filter((c) => enRangoFecha(c.fecha, desde, hasta));
  const comisiones = calcularComisiones(citasFiltradas, recursos, procedimientos);
  const totalGeneral = comisiones.reduce((sum, c) => sum + c.totalComision, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-4 text-xs text-ink/40">
        Se calcula con el "Costo al odontólogo" de cada procedimiento en Administración →
        Procedimientos, emparejado con el texto capturado en cada cita atendida. Los tratamientos
        que no coinciden con el catálogo se listan aparte, sin inventarles un monto.
      </div>

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

      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <p className="text-xs uppercase tracking-wide text-ink/40">Total comisiones del periodo</p>
        <p className="mt-1 text-2xl font-bold text-accent">{formatCurrency(totalGeneral)}</p>
      </div>

      {comisiones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay médicos registrados.
        </div>
      ) : (
        <div className="space-y-4">
          {comisiones.map(({ recurso, items, sinCatalogo, totalComision }) => (
            <div key={recurso.id} className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
              <div className="flex items-center justify-between border-b border-edge/10 px-5 py-3">
                <p className="text-sm font-semibold text-ink">{recurso.nombre}</p>
                <p className="text-sm font-bold text-accent">{formatCurrency(totalComision)}</p>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-4 text-xs text-ink/40">Sin procedimientos del catálogo en este periodo.</p>
              ) : (
                <div className="divide-y divide-edge/5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between px-5 py-2 text-sm">
                      <span className="text-ink/70">{it.procedimiento.nombre}</span>
                      <span className="text-ink/70">{formatCurrency(it.comision)}</span>
                    </div>
                  ))}
                </div>
              )}
              {sinCatalogo.length > 0 && (
                <p className="border-t border-edge/10 px-5 py-3 text-xs text-ink/40">
                  Sin coincidencia en catálogo: {sinCatalogo.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
