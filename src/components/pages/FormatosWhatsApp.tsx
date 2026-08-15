"use client";

import { useState, type ReactNode } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { renderPlantilla, formatosWhatsAppInicial } from "@/lib/formatosWhatsapp";

const textareaClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60 font-mono";

const VISTA_PREVIA_VARS = {
  clinica: "Sonríe X Todos Dental",
  paciente: "María Fernanda López",
  fecha: "12 de agosto de 2026",
  hora: "05:30 PM",
  procedimiento: "Limpieza dental",
  costo: "$1,200",
  medico: "Dr. Nicolás Medina",
  formaPago: "Tarjeta",
  conceptos: "- Limpieza dental: $1,200",
  total: "$1,200",
  proximaCita: "\n\nSu próxima cita es el 20 de agosto de 2026 a las 11:00 AM.",
};

function PlantillaEditor({
  titulo,
  descripcion,
  valorInicial,
  onGuardar,
}: {
  titulo: string;
  descripcion: ReactNode;
  valorInicial: string;
  onGuardar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState(valorInicial);
  const [guardado, setGuardado] = useState(false);

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{titulo}</h3>
        <p className="text-xs text-ink/40">{descripcion}</p>
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setGuardado(false);
          }}
          rows={12}
          className={textareaClass}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onGuardar(texto);
              setGuardado(true);
            }}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Guardar Formato
          </button>
          {guardado && <span className="text-sm text-success">Formato guardado</span>}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Vista Previa</h3>
        <p className="text-xs text-ink/40">Con datos de ejemplo, tal como llegaría al paciente.</p>
        <div className="whitespace-pre-wrap rounded-lg border border-edge/10 bg-inset p-4 text-sm text-ink/80">
          {renderPlantilla(texto, VISTA_PREVIA_VARS)}
        </div>
      </div>
    </>
  );
}

export default function FormatosWhatsApp() {
  const { miRol, formatosWhatsapp, setFormatosWhatsapp } = usePatientData();

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede editar los formatos de WhatsApp.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlantillaEditor
          titulo="Confirmación de Cita"
          valorInicial={formatosWhatsapp.confirmacionCita}
          onGuardar={(texto) => setFormatosWhatsapp((prev) => ({ ...prev, confirmacionCita: texto }))}
          descripcion={
            <>
              Este es el mensaje que se envía al paciente desde el ícono de WhatsApp en Nueva Cita y
              Editar Cita — se manda de forma individual, paciente por paciente, para poder
              especificar su hora, fecha, procedimiento y costo exactos. Usa{" "}
              <code className="text-accent">{"{{clinica}}"}</code>,{" "}
              <code className="text-accent">{"{{paciente}}"}</code>,{" "}
              <code className="text-accent">{"{{fecha}}"}</code>,{" "}
              <code className="text-accent">{"{{hora}}"}</code>,{" "}
              <code className="text-accent">{"{{procedimiento}}"}</code> y{" "}
              <code className="text-accent">{"{{costo}}"}</code> — se rellenan solos con los datos
              reales de la cita. Un asterisco antes y después de una palabra la pone en{" "}
              <strong>negritas</strong> en WhatsApp.
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlantillaEditor
          titulo="Encuesta de Satisfacción"
          valorInicial={formatosWhatsapp.encuestaSatisfaccion ?? formatosWhatsAppInicial.encuestaSatisfaccion}
          onGuardar={(texto) => setFormatosWhatsapp((prev) => ({ ...prev, encuestaSatisfaccion: texto }))}
          descripcion={
            <>
              Se envía desde Reportes → Encuestas después de que una cita queda marcada como
              Atendida. La respuesta del paciente llega directo al chat de WhatsApp — regístrala ahí
              mismo en Encuestas. Usa <code className="text-accent">{"{{clinica}}"}</code>,{" "}
              <code className="text-accent">{"{{paciente}}"}</code> y{" "}
              <code className="text-accent">{"{{procedimiento}}"}</code>.
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlantillaEditor
          titulo="Recibo de Pago"
          valorInicial={formatosWhatsapp.reciboPago ?? formatosWhatsAppInicial.reciboPago}
          onGuardar={(texto) => setFormatosWhatsapp((prev) => ({ ...prev, reciboPago: texto }))}
          descripcion={
            <>
              Se envía desde el ícono de WhatsApp al registrar un pago, o para reenviar un
              comprobante ya guardado. Usa <code className="text-accent">{"{{clinica}}"}</code>,{" "}
              <code className="text-accent">{"{{paciente}}"}</code>,{" "}
              <code className="text-accent">{"{{fecha}}"}</code>,{" "}
              <code className="text-accent">{"{{medico}}"}</code>,{" "}
              <code className="text-accent">{"{{formaPago}}"}</code>,{" "}
              <code className="text-accent">{"{{conceptos}}"}</code> y{" "}
              <code className="text-accent">{"{{total}}"}</code> — se rellenan solos con los datos
              reales del pago. <code className="text-accent">{"{{proximaCita}}"}</code> se rellena
              sola con la siguiente cita agendada del paciente (o queda vacía si no tiene ninguna).
            </>
          }
        />
      </div>
    </div>
  );
}
