"use client";

import { inputClass } from "@/lib/agendaHelpers";
import {
  bloquesQueSePisan,
  DIAS_EN_ORDEN,
  errorDeBloque,
  nombreDiaCorto,
  type BloqueAtencion,
  type Sede,
} from "@/lib/sedesBloques";

/** Edita los bloques de atención de un médico: en qué sede, qué días y de qué hora a qué hora. */
export default function BloquesEditor({
  bloques,
  sedes,
  onChange,
}: {
  bloques: BloqueAtencion[];
  sedes: Sede[];
  onChange: (bloques: BloqueAtencion[]) => void;
}) {
  const cambiar = (id: string, parche: Partial<BloqueAtencion>) =>
    onChange(bloques.map((b) => (b.id === id ? { ...b, ...parche } : b)));

  const alternarDia = (b: BloqueAtencion, dia: number) =>
    cambiar(b.id, { dias: b.dias.includes(dia) ? b.dias.filter((d) => d !== dia) : [...b.dias, dia].sort((x, y) => x - y) });

  const agregar = () =>
    onChange([
      ...bloques,
      { id: `bl${Date.now()}`, sedeId: sedes.length === 1 ? sedes[0].id : "", dias: [], inicio: "09:00", fin: "14:00" },
    ]);

  if (sedes.length === 0) {
    return (
      <p className="rounded-lg border border-edge/10 p-3 text-[11px] text-ink/50">
        Primero agrega las sedes (botón &quot;Sedes&quot; en la Agenda) para poder definir en qué días y horas atiende este
        médico en cada una.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {bloques.map((b) => {
        const error = errorDeBloque(b);
        const pisa = bloques.some((otro) => otro.id !== b.id && !errorDeBloque(otro) && !error && bloquesQueSePisan(b, otro));
        return (
          <div key={b.id} className="space-y-2 rounded-lg border border-edge/10 p-2.5">
            <div className="flex items-center gap-2">
              <select value={b.sedeId} onChange={(e) => cambiar(b.id, { sedeId: e.target.value })} className={inputClass}>
                <option value="">Elige la sede…</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onChange(bloques.filter((x) => x.id !== b.id))}
                title="Quitar bloque"
                className="shrink-0 px-1 text-ink/40 transition-colors hover:text-danger"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {DIAS_EN_ORDEN.map((d) => {
                const activo = b.dias.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => alternarDia(b, d)}
                    aria-pressed={activo}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                      activo ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/50 hover:bg-field"
                    }`}
                  >
                    {nombreDiaCorto(d)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink/60">
              <span>De</span>
              <input type="time" value={b.inicio} onChange={(e) => cambiar(b.id, { inicio: e.target.value })} className={inputClass} />
              <span>a</span>
              <input type="time" value={b.fin} onChange={(e) => cambiar(b.id, { fin: e.target.value })} className={inputClass} />
            </div>
            {error && <p className="text-[11px] text-danger">{error}</p>}
            {pisa && <p className="text-[11px] text-warning">Se cruza con otro bloque de este médico.</p>}
          </div>
        );
      })}
      <button
        type="button"
        onClick={agregar}
        className="w-full rounded-lg border border-dashed border-accent/40 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
      >
        + Agregar bloque
      </button>
    </div>
  );
}
