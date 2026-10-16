"use client";

import { useState } from "react";
import HorarioPreferenteEditor from "@/components/HorarioPreferenteEditor";
import {
  citaEnHorarioPreferente,
  describirHorarioPreferente,
  normalizarHorarioPreferente,
  proximasPropuestasDeCita,
  type HorarioPreferente,
} from "@/lib/horarioPreferente";

/** En el diálogo de la cita: lo que prefiere el paciente, si la fecha y hora elegidas le acomodan y
 * las próximas fechas que sí le acomodan para proponérselas. También se puede capturar o corregir ahí
 * mismo (se guarda en el paciente al instante). */
export default function HorarioPreferenteCita({
  horario,
  fecha,
  horaInicio,
  onGuardar,
  onElegirPropuesta,
}: {
  horario: HorarioPreferente | null | undefined;
  fecha: string;
  horaInicio: string;
  /** Guarda la preferencia en el paciente (`null` = quitarla). */
  onGuardar: (nuevo: HorarioPreferente | null) => void;
  onElegirPropuesta: (fecha: string, hora: string) => void;
}) {
  const guardado = normalizarHorarioPreferente(horario);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<HorarioPreferente>(guardado ?? { dias: [] });

  const texto = describirHorarioPreferente(guardado);
  const acomoda = citaEnHorarioPreferente(guardado, fecha, horaInicio);
  const propuestas = proximasPropuestasDeCita(guardado, new Date(), 3, horaInicio || "09:00");

  if (editando) {
    return (
      <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-sm font-medium text-ink">Horario preferente del paciente</p>
        <HorarioPreferenteEditor valor={borrador} onChange={setBorrador} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onGuardar(normalizarHorarioPreferente(borrador));
              setEditando(false);
            }}
            className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25"
          >
            Guardar horario
          </button>
          <button
            type="button"
            onClick={() => {
              setBorrador(guardado ?? { dias: [] });
              setEditando(false);
            }}
            className="rounded-lg border border-edge/15 px-4 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface"
          >
            Cancelar
          </button>
          {guardado && (
            <button
              type="button"
              onClick={() => {
                onGuardar(null);
                setBorrador({ dias: [] });
                setEditando(false);
              }}
              className="ml-auto text-xs text-danger hover:underline"
            >
              Quitar horario preferente
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!texto) {
    return (
      <button
        type="button"
        onClick={() => {
          setBorrador({ dias: [] });
          setEditando(true);
        }}
        className="text-xs font-medium text-accent hover:underline"
      >
        + Horario preferente del paciente (para saber cuándo proponerle cita)
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-edge/10 bg-field p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-ink/80">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Prefiere: </span>
          {texto}
        </p>
        <button
          type="button"
          onClick={() => {
            setBorrador(guardado ?? { dias: [] });
            setEditando(true);
          }}
          className="shrink-0 text-xs text-accent hover:underline"
        >
          Editar
        </button>
      </div>

      {acomoda !== null && (
        <p className={`text-xs font-semibold ${acomoda ? "text-success" : "text-warning"}`}>
          {acomoda ? "✓ La fecha y hora elegidas están dentro de su horario preferente" : "⚠ La fecha u hora elegidas quedan fuera de su horario preferente"}
        </p>
      )}

      {propuestas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink/50">Proponer:</span>
          {propuestas.map((p) => {
            const elegida = p.fecha === fecha && p.hora === horaInicio;
            return (
              <button
                key={p.fecha}
                type="button"
                onClick={() => onElegirPropuesta(p.fecha, p.hora)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  elegida ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/70 hover:bg-surface"
                }`}
              >
                {p.etiqueta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
