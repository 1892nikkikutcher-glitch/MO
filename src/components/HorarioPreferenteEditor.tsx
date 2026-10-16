"use client";

import { DIAS_EN_ORDEN, DIA_CORTO, describirHorarioPreferente, type HorarioPreferente } from "@/lib/horarioPreferente";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

/** Captura el horario preferente de un paciente: qué días le acomodan y desde/hasta qué hora (de inicio
 * de la cita), más una nota libre. Controlado: quien lo usa guarda el valor. */
export default function HorarioPreferenteEditor({
  valor,
  onChange,
}: {
  valor: HorarioPreferente;
  onChange: (siguiente: HorarioPreferente) => void;
}) {
  const alternarDia = (d: number) =>
    onChange({ ...valor, dias: valor.dias.includes(d) ? valor.dias.filter((x) => x !== d) : [...valor.dias, d] });
  const descripcion = describirHorarioPreferente(valor);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink/60">Días que le acomodan (sin marcar = cualquier día)</p>
        <div className="flex flex-wrap gap-1.5">
          {DIAS_EN_ORDEN.map((d) => {
            const activo = valor.dias.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarDia(d)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activo ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60 hover:bg-surface"
                }`}
              >
                {DIA_CORTO[d]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Después de las (hora de inicio)</label>
          <input
            type="time"
            value={valor.desde ?? ""}
            onChange={(e) => onChange({ ...valor, desde: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Antes de las (opcional)</label>
          <input
            type="time"
            value={valor.hasta ?? ""}
            onChange={(e) => onChange({ ...valor, hasta: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
      </div>

      <input
        type="text"
        value={valor.nota ?? ""}
        onChange={(e) => onChange({ ...valor, nota: e.target.value || undefined })}
        placeholder="Nota (opcional) — ej. sale del trabajo a las 17:30"
        className={inputClass}
      />

      {descripcion && <p className="text-xs text-ink/50">Se guardará como: <span className="font-semibold text-ink/70">{descripcion}</span></p>}
    </div>
  );
}
