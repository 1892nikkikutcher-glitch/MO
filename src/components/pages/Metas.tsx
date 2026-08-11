"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { metaSemanalDe, metaQuincenalDe } from "@/lib/metas";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

export default function Metas() {
  const { miRol, metas, setMetas } = usePatientData();
  const [valor, setValor] = useState(String(metas.metaMensual || ""));
  const [guardado, setGuardado] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar las metas.
      </div>
    );
  }

  const metaMensual = Number(valor) || 0;
  const semanal = metaSemanalDe(metaMensual);
  const quincenal = metaQuincenalDe(metaMensual);

  const guardar = () => {
    setMetas({ metaMensual });
    setGuardado(true);
  };

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Metas de Ingresos</h3>
      <p className="text-xs text-ink/40">
        Define tu meta mensual y calculamos automáticamente la semanal y la quincenal para que
        siempre coincidan entre sí. En el Dashboard verás qué porcentaje llevas cumplido de cada una
        con tus ingresos reales.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Meta mensual ($)</label>
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setGuardado(false);
          }}
          placeholder="Ej. 50000"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-edge/10 bg-inset px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Meta semanal (calculada)</div>
          <div className="mt-1 text-lg font-semibold text-ink">{formatCurrency(Math.round(semanal))}</div>
        </div>
        <div className="rounded-lg border border-edge/10 bg-inset px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Meta quincenal (calculada)</div>
          <div className="mt-1 text-lg font-semibold text-ink">{formatCurrency(Math.round(quincenal))}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Meta
        </button>
        {guardado && <span className="text-sm text-success">Meta guardada</span>}
      </div>
    </div>
  );
}
