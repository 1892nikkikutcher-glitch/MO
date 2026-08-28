"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import { chipsLlegada, type ChipLlegada, type ComoLlegaHoy, type NotaEvolucionV2 } from "@/lib/notasEvolucion";

const etiquetas: Record<ChipLlegada, string> = {
  sin_molestias: "Sin molestias",
  con_dolor: "Con dolor",
  inflamacion: "Inflamación",
  sensibilidad: "Sensibilidad",
  mejoro: "Mejoró",
  empeoro: "Empeoró",
  sin_cambios: "Sin cambios",
  sangrado: "Sangrado",
  dificultad_masticar: "Dificultad para masticar",
  otro: "Otro",
};

export default function SeccionComoLlega({
  valor,
  onChange,
}: {
  valor: ComoLlegaHoy;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2) => void;
}) {
  function toggleChip(chip: ChipLlegada) {
    onChange((prev) => {
      const chips = valor.chips.includes(chip) ? valor.chips.filter((c) => c !== chip) : [...valor.chips, chip];
      return { ...prev, comoLlegaHoy: { ...valor, chips } };
    });
  }

  function set<K extends keyof ComoLlegaHoy>(key: K, value: ComoLlegaHoy[K]) {
    onChange((prev) => ({ ...prev, comoLlegaHoy: { ...valor, [key]: value } }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chipsLlegada.map((c) => (
          <Chip key={c} seleccionado={valor.chips.includes(c)} onClick={() => toggleChip(c)}>
            {etiquetas[c]}
          </Chip>
        ))}
      </div>

      {valor.chips.includes("con_dolor") && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Intensidad del dolor (0–10)</label>
            <input
              type="number"
              min={0}
              max={10}
              className={inputClass}
              value={valor.intensidadDolor ?? ""}
              onChange={(e) => set("intensidadDolor", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Localización (opcional)</label>
            <input
              className={inputClass}
              value={valor.localizacion ?? ""}
              onChange={(e) => set("localizacion", e.target.value)}
            />
          </div>
        </div>
      )}

      {(valor.chips.includes("mejoro") || valor.chips.includes("empeoro") || valor.chips.includes("con_dolor")) && (
        <div>
          <label className={labelClass}>Tiempo de evolución (opcional)</label>
          <input
            className={inputClass}
            placeholder="Ej. desde hace 3 días"
            value={valor.tiempoEvolucion ?? ""}
            onChange={(e) => set("tiempoEvolucion", e.target.value)}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Texto libre (opcional)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={valor.textoLibre ?? ""}
          onChange={(e) => set("textoLibre", e.target.value)}
        />
      </div>
    </div>
  );
}
