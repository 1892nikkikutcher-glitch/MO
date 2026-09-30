"use client";

import { CUADRANTES, ordenarDientes } from "@/lib/odontograma";

export default function Odontograma({
  selectedTeeth,
  onToggleTooth,
  title = "Odontograma",
  hideSummary = false,
}: {
  selectedTeeth: number[];
  onToggleTooth: (tooth: number) => void;
  title?: string;
  /** Oculta el "Dientes seleccionados: ..." de abajo — para cuando esa
   * misma información ya se muestra fusionada en otro campo (ej. "Órganos
   * dentales a trabajar" en Nuevo Presupuesto), y repetirla es redundante. */
  hideSummary?: boolean;
}) {
  const renderFila = (teeth: number[], alinearDerecha: boolean) => (
    <div className={`flex flex-wrap gap-1 ${alinearDerecha ? "justify-end" : ""}`}>
      {teeth.map((tooth) => {
        const isSelected = selectedTeeth.includes(tooth);
        return (
          <button
            key={tooth}
            type="button"
            onClick={() => onToggleTooth(tooth)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold transition-colors ${
              isSelected
                ? "border-accent bg-accent/20 text-accent"
                : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
            }`}
            style={isSelected ? { boxShadow: "0 0 8px rgba(251,146,60,0.4)" } : undefined}
          >
            {tooth}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</h3>
      {/* 2×2 — arriba Cuadrante 1 | Cuadrante 2, abajo Cuadrante 4 | Cuadrante 3,
         mismo orden que CUADRANTES — cada cuadrante queda alineado
         verticalmente con su opuesto de la otra arcada, igual que antes. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {CUADRANTES.map((c) => {
          // Cuadrante 1 y 4 quedan en la columna izquierda — se recargan
          // hacia la derecha (mismo criterio que Cuadrante 2/3, que ya
          // nacen alineados a la izquierda) para que los dos lados se
          // encuentren en la línea media y el cuadro se vea continuo.
          const alinearDerecha = c.numero === 1 || c.numero === 4;
          return (
            <div key={c.numero} className="space-y-2 rounded-xl border border-edge/10 bg-inset p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/30">
                Cuadrante {c.numero}
              </span>
              <div className="overflow-x-auto">
                {/* ml-auto solo desde lg: para no dejar un hueco a la
                   izquierda cuando la cuadrícula se apila a una columna en
                   móvil (ahí no hay un cuadrante opuesto con el que
                   "encontrarse" a la mitad). */}
                <div className={`w-fit space-y-2 ${alinearDerecha ? "lg:ml-auto" : ""}`}>
                  {renderFila(c.permanentes, alinearDerecha)}
                  {c.temporales.length > 0 && renderFila(c.temporales, alinearDerecha)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!hideSummary && selectedTeeth.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink/50">
          Dientes seleccionados: {ordenarDientes(selectedTeeth).join(", ")}
        </p>
      )}
    </div>
  );
}
