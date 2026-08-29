"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import { chipsEstadoFinal, type ChipEstadoFinal, type EstadoFinalNota, type NotaEvolucionV2 } from "@/lib/notasEvolucion";

const etiquetas: Record<ChipEstadoFinal, string> = {
  asintomatico: "Asintomático",
  molestia_leve_esperada: "Molestia leve esperada",
  dolor_controlado: "Dolor controlado",
  hemostasia_adecuada: "Hemostasia adecuada",
  bien_tolerado: "Procedimiento bien tolerado",
  estable: "Paciente estable",
  sin_incidentes: "Sin incidentes",
  incidente: "Se presentó un incidente",
  otro: "Otro",
};

/** Ningún chip viene preseleccionado — "sin_incidentes" en particular exige
 * confirmación explícita del profesional, nunca se asume. */
export default function SeccionEstadoFinal({
  valor,
  onChange,
  onBlurTexto,
}: {
  valor: EstadoFinalNota | undefined;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  const actual: EstadoFinalNota = valor ?? { chips: [] };

  function setEstado(updater: (prev: EstadoFinalNota) => EstadoFinalNota, opts?: { inmediato?: boolean }) {
    onChange((prev) => ({ ...prev, estadoFinal: updater(actual) }), opts);
  }

  function toggleChip(chip: ChipEstadoFinal) {
    setEstado((prev) => {
      const chips = prev.chips.includes(chip) ? prev.chips.filter((c) => c !== chip) : [...prev.chips, chip];
      return { ...prev, chips };
    }, { inmediato: true });
  }

  // El detalle de un incidente es uno de los campos críticos explícitos del
  // plan (§7.2.1) — dado su peso clínico/legal, se persiste de inmediato en
  // vez de esperar el debounce de texto libre.
  function setIncidente<K extends keyof NonNullable<EstadoFinalNota["incidente"]>>(campo: K, valor2: string) {
    setEstado((prev) => ({
      ...prev,
      incidente: { queOcurrio: "", comoSeAtendio: "", estadoFinalPaciente: "", seguimientoRequerido: "", ...prev.incidente, [campo]: valor2 },
    }), { inmediato: true });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chipsEstadoFinal.map((c) => (
          <Chip key={c} seleccionado={actual.chips.includes(c)} onClick={() => toggleChip(c)}>
            {etiquetas[c]}
          </Chip>
        ))}
      </div>

      {actual.chips.includes("incidente") && (
        <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="text-xs font-semibold text-danger">Detalle del incidente — obligatorio</p>
          <div>
            <label className={labelClass}>Qué ocurrió</label>
            <textarea className={inputClass} rows={2} value={actual.incidente?.queOcurrio ?? ""} onChange={(e) => setIncidente("queOcurrio", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Cómo se atendió</label>
            <textarea className={inputClass} rows={2} value={actual.incidente?.comoSeAtendio ?? ""} onChange={(e) => setIncidente("comoSeAtendio", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Estado final del paciente</label>
            <input className={inputClass} value={actual.incidente?.estadoFinalPaciente ?? ""} onChange={(e) => setIncidente("estadoFinalPaciente", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Seguimiento requerido</label>
            <input className={inputClass} value={actual.incidente?.seguimientoRequerido ?? ""} onChange={(e) => setIncidente("seguimientoRequerido", e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Texto libre (opcional)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={actual.textoLibre ?? ""}
          onChange={(e) => setEstado((prev) => ({ ...prev, textoLibre: e.target.value }))}
          onBlur={onBlurTexto}
        />
      </div>
    </div>
  );
}
