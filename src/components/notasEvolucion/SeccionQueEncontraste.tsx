"use client";

import { useState } from "react";
import Odontograma from "@/components/pages/Odontograma";
import { Chip, botonSecundario, inputClass, labelClass } from "./NotaUI";
import {
  chipsHallazgos,
  recomendacionSignosVitales,
  type ChipHallazgo,
  type DecisionSignosVitales,
  type NotaEvolucionV2,
  type QueEncontraste,
  type SignosVitales,
} from "@/lib/notasEvolucion";

const etiquetas: Record<ChipHallazgo, string> = {
  caries: "Caries",
  fractura: "Fractura",
  movilidad: "Movilidad",
  inflamacion_gingival: "Inflamación gingival",
  absceso: "Absceso",
  fistula: "Fístula",
  sensibilidad_percusion: "Sensibilidad a la percusión",
  calculo: "Cálculo",
  placa: "Placa",
  restauracion_defectuosa: "Restauración defectuosa",
  sin_hallazgos_relevantes: "Sin hallazgos clínicos relevantes",
  otro: "Otro",
};

export default function SeccionQueEncontraste({
  valor,
  tipoProcedimientoSeleccionado,
  onChange,
}: {
  valor: QueEncontraste;
  tipoProcedimientoSeleccionado?: string;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2) => void;
}) {
  const [mostrarSignosVitales, setMostrarSignosVitales] = useState(!!valor.signosVitales);

  function set<K extends keyof QueEncontraste>(key: K, value: QueEncontraste[K]) {
    onChange((prev) => ({ ...prev, queEncontraste: { ...valor, [key]: value } }));
  }

  function toggleChip(chip: ChipHallazgo) {
    const chips = valor.chips.includes(chip) ? valor.chips.filter((c) => c !== chip) : [...valor.chips, chip];
    set("chips", chips);
  }

  function setDecisionSignosVitales(decision: DecisionSignosVitales) {
    set("signosVitales", decision);
  }

  function setValorSignoVital(campo: keyof SignosVitales, v: string) {
    const actual = valor.signosVitales?.valores ?? {};
    setDecisionSignosVitales({
      accion: "registrados_ahora",
      recomendacionMostrada: valor.signosVitales?.recomendacionMostrada,
      valores: { ...actual, [campo]: v },
    });
  }

  const recomendado = recomendacionSignosVitales(tipoProcedimientoSeleccionado);

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Órgano dental / zona</label>
        <Odontograma selectedTeeth={valor.organosDentales} onToggleTooth={(t) => {
          const organos = valor.organosDentales.includes(t)
            ? valor.organosDentales.filter((o) => o !== t)
            : [...valor.organosDentales, t];
          set("organosDentales", organos);
        }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {chipsHallazgos.map((c) => (
          <Chip key={c} seleccionado={valor.chips.includes(c)} onClick={() => toggleChip(c)}>
            {etiquetas[c]}
          </Chip>
        ))}
      </div>

      <div>
        <label className={labelClass}>Exploración clínica (opcional)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={valor.exploracionClinica ?? ""}
          onChange={(e) => set("exploracionClinica", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Estudios revisados (opcional)</label>
        <input
          className={inputClass}
          value={valor.estudiosRevisados ?? ""}
          onChange={(e) => set("estudiosRevisados", e.target.value)}
        />
      </div>

      {recomendado && !valor.signosVitales && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          Por el procedimiento seleccionado recomendamos registrar TA y FC antes de continuar — no es obligatorio.
        </p>
      )}

      {!mostrarSignosVitales && !valor.signosVitales && (
        <button type="button" onClick={() => setMostrarSignosVitales(true)} className={botonSecundario}>
          Agregar signos vitales
        </button>
      )}

      {(mostrarSignosVitales || valor.signosVitales) && (
        <div className="rounded-lg border border-edge/10 bg-field p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "registrados_ahora", valores: valor.signosVitales?.valores ?? {} })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "registrados_ahora" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              Registrar ahora
            </button>
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "reutilizados_recientes" })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "reutilizados_recientes" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              Usar signos vitales recientes
            </button>
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "no_necesario" })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "no_necesario" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              No fue necesario repetirlos
            </button>
          </div>

          {valor.signosVitales?.accion === "registrados_ahora" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["presionArterial", "TA"],
                  ["frecuenciaCardiaca", "FC"],
                  ["frecuenciaRespiratoria", "FR"],
                  ["temperatura", "Temp."],
                  ["saturacion", "SpO₂"],
                  ["peso", "Peso"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <div key={campo}>
                  <label className={labelClass}>{etiqueta}</label>
                  <input
                    className={inputClass}
                    value={valor.signosVitales?.valores?.[campo] ?? ""}
                    onChange={(e) => setValorSignoVital(campo, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
