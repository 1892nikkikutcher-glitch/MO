"use client";

import { useState } from "react";

/** Las cuatro pestañas del inventario del consultorio. Por ahora cada una solo
 * dice qué va a contener: el módulo está en construcción. */
const PESTANAS = [
  {
    id: "instrumental",
    etiqueta: "Instrumental",
    contendra: "lo que se esteriliza y se reutiliza: pinzas, espejos, exploradores, curetas, fórceps, fresas y cajas de instrumental.",
  },
  {
    id: "material",
    etiqueta: "Material",
    contendra: "los consumibles del consultorio: resinas, anestesia, guantes, cubrebocas, suturas y todo lo que se gasta con los pacientes.",
  },
  {
    id: "equipo",
    etiqueta: "Equipo",
    contendra: "los aparatos: autoclave, compresor, lámpara de fotocurado, equipo de rayos X, motores y piezas de mano.",
  },
  {
    id: "muebles",
    etiqueta: "Muebles",
    contendra: "el mobiliario: sillones dentales, unidades, escritorios, gabinetes, sillas de sala de espera y archiveros.",
  },
] as const;

type IdPestana = (typeof PESTANAS)[number]["id"];

export default function Inventario() {
  const [activa, setActiva] = useState<IdPestana>("instrumental");
  const pestana = PESTANAS.find((p) => p.id === activa) ?? PESTANAS[0];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Inventario" className="flex gap-1 overflow-x-auto border-b border-edge/10">
        {PESTANAS.map((p) => {
          const seleccionada = p.id === activa;
          return (
            <button
              key={p.id}
              role="tab"
              id={`inventario-tab-${p.id}`}
              aria-selected={seleccionada}
              aria-controls={`inventario-panel-${p.id}`}
              onClick={() => setActiva(p.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                seleccionada
                  ? "border-accent text-accent"
                  : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {p.etiqueta}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`inventario-panel-${pestana.id}`}
        aria-labelledby={`inventario-tab-${pestana.id}`}
        className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-edge/15 bg-surface px-6 py-16 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{pestana.etiqueta} — próximamente</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink/50">Va a contener {pestana.contendra}</p>
        </div>
      </div>
    </div>
  );
}
