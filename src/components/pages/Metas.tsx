"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { metaDiariaDe, metaSemanalDe, metaQuincenalDe, diasDeAtencionDe } from "@/lib/metas";

// De lunes a domingo (el valor es el de Date.getDay(): 0 = domingo).
const DIAS_SEMANA = [
  { valor: 1, corto: "Lun", largo: "lunes" },
  { valor: 2, corto: "Mar", largo: "martes" },
  { valor: 3, corto: "Mié", largo: "miércoles" },
  { valor: 4, corto: "Jue", largo: "jueves" },
  { valor: 5, corto: "Vie", largo: "viernes" },
  { valor: 6, corto: "Sáb", largo: "sábado" },
  { valor: 0, corto: "Dom", largo: "domingo" },
];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

export default function Metas() {
  const { miRol, metas, setMetas } = usePatientData();
  const [valor, setValor] = useState(String(metas.metaMensual || ""));
  const [dias, setDias] = useState<number[]>(() => diasDeAtencionDe(metas.diasAtencion));
  const [guardado, setGuardado] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar las metas.
      </div>
    );
  }

  const metaMensual = Number(valor) || 0;
  const diaria = metaDiariaDe(metaMensual, dias);
  const semanal = metaSemanalDe(metaMensual);
  const quincenal = metaQuincenalDe(metaMensual);

  const guardar = () => {
    setMetas({ metaMensual, diasAtencion: diasDeAtencionDe(dias) });
    setGuardado(true);
  };

  // Siempre queda al menos un día: sin días de atención no habría entre cuántos repartir la meta.
  const alternarDia = (d: number) => {
    setDias((prev) => (prev.includes(d) ? (prev.length > 1 ? prev.filter((x) => x !== d) : prev) : [...prev, d]));
    setGuardado(false);
  };

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Metas de Ingresos</h3>
      <p className="text-xs text-ink/40">
        Define tu meta mensual y calculamos automáticamente la semanal, la quincenal y la diaria
        (la semanal entre los días que atiendes) para que siempre coincidan entre sí. En el Dashboard verás qué porcentaje llevas cumplido de cada una
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

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Días que atiendes</label>
        <div className="flex flex-wrap gap-1.5">
          {DIAS_SEMANA.map((d) => {
            const activo = dias.includes(d.valor);
            return (
              <button
                key={d.valor}
                type="button"
                onClick={() => alternarDia(d.valor)}
                aria-pressed={activo}
                title={activo ? `Se atiende el ${d.largo}` : `No se atiende el ${d.largo}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activo ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/50 hover:bg-field"
                }`}
              >
                {d.corto}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-ink/40">
          La meta diaria es la semanal entre {dias.length} {dias.length === 1 ? "día" : "días"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-edge/10 bg-inset px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Meta diaria (calculada)</div>
          <div className="mt-1 text-lg font-semibold text-ink">{formatCurrency(Math.round(diaria))}</div>
        </div>
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
          className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
        >
          Guardar Meta
        </button>
        {guardado && <span className="text-sm text-success">Meta guardada</span>}
      </div>
    </div>
  );
}
