"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import {
  chipsLlegada,
  type ChipLlegada,
  type ComoLlegaHoy,
  type MotivoNotaAdministrativa,
  type NotaEvolucionV2,
} from "@/lib/notasEvolucion";

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

/** Etiquetas cortas para la fila "¿El paciente no se presentó?" — mismas
 * opciones que ya tiene la nota rápida (motivosNotaAdministrativa), en el
 * orden en que se piden en la clínica. */
const opcionesNoSePresento: { motivo: MotivoNotaAdministrativa; etiqueta: string }[] = [
  { motivo: "no_asistio", etiqueta: "No llega" },
  { motivo: "reagenda_paciente", etiqueta: "Reagenda" },
  { motivo: "cancela_paciente", etiqueta: "Cancela" },
  { motivo: "otro", etiqueta: "Otro motivo" },
];

/** Datos para ofrecer "No llega / Reagenda / Cancela" dentro de "¿Cómo llega
 * hoy?" — `citas` son las citas pendientes del paciente a las que puede
 * aplicar (vacío = no hay a cuál). Elegir una opción NO cambia nada en la
 * cita todavía: solo abre la nota rápida, y el estatus se aplica al
 * guardarla (ver NotaAdministrativaRapida). */
export type OpcionesNoSePresento = {
  citas: { id: string; etiqueta: string }[];
  citaId: string | null;
  onCambiarCita: (id: string) => void;
  onElegir: (motivo: MotivoNotaAdministrativa) => void;
};

export default function SeccionComoLlega({
  valor,
  onChange,
  onBlurTexto,
  noSePresento,
}: {
  valor: ComoLlegaHoy;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  /** Fuerza la escritura local de inmediato al salir de un campo de texto
   * libre — ver §7.2.1 del plan (persistencia continua + flush best-effort
   * al perder el foco, nunca dependiente de eventos de cierre de página). */
  onBlurTexto?: () => void;
  noSePresento?: OpcionesNoSePresento;
}) {
  function toggleChip(chip: ChipLlegada) {
    // Selección estructurada (clic, no tecleo) — persistencia inmediata.
    onChange((prev) => {
      const chips = valor.chips.includes(chip) ? valor.chips.filter((c) => c !== chip) : [...valor.chips, chip];
      return { ...prev, comoLlegaHoy: { ...valor, chips } };
    }, { inmediato: true });
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
          onBlur={onBlurTexto}
        />
      </div>

      {noSePresento && (
        <div className="space-y-2 border-t border-edge/10 pt-3">
          <p className="text-xs font-medium text-ink/60">¿El paciente no se presentó?</p>
          {noSePresento.citas.length === 0 ? (
            <p className="text-xs text-ink/40">
              Este paciente no tiene una cita pendiente en Agenda, así que no hay una cita que marcar como «No
              llega», «Reagenda» o «Cancela».
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {opcionesNoSePresento.map((o) => (
                  <Chip key={o.motivo} seleccionado={false} onClick={() => noSePresento.onElegir(o.motivo)}>
                    {o.etiqueta}
                  </Chip>
                ))}
              </div>
              {noSePresento.citas.length === 1 ? (
                <p className="text-xs text-ink/40">Aplica a la cita: {noSePresento.citas[0].etiqueta}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink/40">
                  <label htmlFor="cita-no-se-presento">Aplica a la cita:</label>
                  <select
                    id="cita-no-se-presento"
                    value={noSePresento.citaId ?? ""}
                    onChange={(e) => noSePresento.onCambiarCita(e.target.value)}
                    className="rounded-lg border border-edge/10 bg-field px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
                  >
                    {noSePresento.citas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-[11px] text-ink/30">
                Se abrirá una nota corta; la cita no cambia de estatus hasta que guardes esa nota.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
