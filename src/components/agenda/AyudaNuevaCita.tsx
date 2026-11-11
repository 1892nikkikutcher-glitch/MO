"use client";

import { avanceAyudaNuevaCita, pasosAyudaNuevaCita, type CamposNuevaCita } from "@/lib/ayudaNuevaCita";

/** Ayuda dentro del diálogo de nueva cita: lista los campos en el orden en que se llenan y va marcando los que ya
 * quedaron. Va en el propio diálogo (no flotando) para no tapar ningún campo. */
export default function AyudaNuevaCita({
  campos,
  onCerrar,
}: {
  campos: CamposNuevaCita;
  onCerrar: () => void;
}) {
  const pasos = pasosAyudaNuevaCita(campos);
  const { hechos, total } = avanceAyudaNuevaCita(pasos);

  return (
    <div role="note" aria-label="Ayuda para agendar la cita" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Te ayudo a agendar la cita</p>
          <p className="mt-0.5 text-xs text-ink/60">
            {hechos} de {total} campos listos
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Ocultar la ayuda"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
        >
          ✕
        </button>
      </div>
      <ol className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {pasos.map((p, i) => (
          <li key={p.id} className="flex gap-2 text-xs">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                p.hecho ? "bg-success/20 text-success" : "bg-accent/15 text-accent"
              }`}
            >
              {p.hecho ? "✓" : i + 1}
            </span>
            <span className="text-ink/70">
              <span className={`font-semibold ${p.hecho ? "text-success" : "text-ink"}`}>{p.titulo}.</span> {p.detalle}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
