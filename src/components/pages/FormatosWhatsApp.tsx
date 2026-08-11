"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { renderPlantilla } from "@/lib/formatosWhatsapp";

const textareaClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60 font-mono";

const VISTA_PREVIA_VARS = {
  clinica: "Sonríe X Todos Dental",
  paciente: "María Fernanda López",
  fecha: "12 de agosto de 2026",
  hora: "05:30 PM",
};

export default function FormatosWhatsApp() {
  const { miRol, formatosWhatsapp, setFormatosWhatsapp } = usePatientData();
  const [texto, setTexto] = useState(formatosWhatsapp.confirmacionCita);
  const [guardado, setGuardado] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede editar los formatos de WhatsApp.
      </div>
    );
  }

  const guardar = () => {
    setFormatosWhatsapp({ confirmacionCita: texto });
    setGuardado(true);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Confirmación de Cita
        </h3>
        <p className="text-xs text-ink/40">
          Este es el mensaje que se envía al paciente desde el ícono de WhatsApp en Nueva Cita y
          Editar Cita. Usa <code className="text-accent">{"{{clinica}}"}</code>,{" "}
          <code className="text-accent">{"{{paciente}}"}</code>,{" "}
          <code className="text-accent">{"{{fecha}}"}</code> y{" "}
          <code className="text-accent">{"{{hora}}"}</code> — se rellenan solos con los datos
          reales de la cita. Un asterisco antes y después de una palabra la pone en{" "}
          <strong>negritas</strong> en WhatsApp.
        </p>
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setGuardado(false);
          }}
          rows={16}
          className={textareaClass}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={guardar}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Guardar Formato
          </button>
          {guardado && <span className="text-sm text-success">Formato guardado</span>}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Vista Previa
        </h3>
        <p className="text-xs text-ink/40">Con datos de ejemplo, tal como llegaría al paciente.</p>
        <div className="whitespace-pre-wrap rounded-lg border border-edge/10 bg-inset p-4 text-sm text-ink/80">
          {renderPlantilla(texto, VISTA_PREVIA_VARS)}
        </div>
      </div>
    </div>
  );
}
