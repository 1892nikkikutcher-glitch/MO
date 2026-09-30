"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { renderPlantilla } from "@/lib/formatosWhatsapp";

const textareaClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60 font-mono";

const VISTA_PREVIA_VARS = {
  clinica: "Sonríe X Todos Dental",
  dia: "12",
  mes: "Agosto",
  anio: "2026",
  medico: "Nicolás Medina González",
  paciente: "Fernanda Firo Hernández",
  duracionMeses: "18",
  pagoInicial: "$3,000",
  numCuotas: "16",
  cuotaMensual: "$700",
  costoProntoPago: "$550",
  costoBracketDespegado: "$150",
  costoConsultaExtra: "$300",
  descuentoLimpieza: "20",
  mesesDescuento: "Mayo y Noviembre",
};

export default function AdministracionContratoOrtodoncia() {
  const { miRol, contratoOrtodoncia, setContratoOrtodoncia } = usePatientData();
  const [texto, setTexto] = useState(contratoOrtodoncia.clausulas);
  const [guardado, setGuardado] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede editar el Contrato de Ortodoncia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Contrato de Prestación de Servicios — Ortodoncia
          </h3>
          <p className="text-xs text-ink/40">
            Este texto se usa al generar el contrato de un paciente, desde su Expediente →
            Consentimientos Informados. Ajusta la redacción y los montos fijos que quieras dejar
            como política de tu consultorio. Los montos que cambian por paciente van como
            variables: usa{" "}
            <code className="text-accent">{"{{clinica}}"}</code>,{" "}
            <code className="text-accent">{"{{dia}}"}</code>,{" "}
            <code className="text-accent">{"{{mes}}"}</code>,{" "}
            <code className="text-accent">{"{{anio}}"}</code>,{" "}
            <code className="text-accent">{"{{medico}}"}</code>,{" "}
            <code className="text-accent">{"{{paciente}}"}</code>,{" "}
            <code className="text-accent">{"{{duracionMeses}}"}</code>,{" "}
            <code className="text-accent">{"{{pagoInicial}}"}</code>,{" "}
            <code className="text-accent">{"{{numCuotas}}"}</code>,{" "}
            <code className="text-accent">{"{{cuotaMensual}}"}</code>,{" "}
            <code className="text-accent">{"{{costoProntoPago}}"}</code>,{" "}
            <code className="text-accent">{"{{costoBracketDespegado}}"}</code>,{" "}
            <code className="text-accent">{"{{costoConsultaExtra}}"}</code>,{" "}
            <code className="text-accent">{"{{descuentoLimpieza}}"}</code> y{" "}
            <code className="text-accent">{"{{mesesDescuento}}"}</code> — se rellenan solas con los
            datos que captures para cada paciente al generar su contrato.
          </p>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setGuardado(false);
            }}
            rows={24}
            className={textareaClass}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setContratoOrtodoncia((prev) => ({ ...prev, clausulas: texto }));
                setGuardado(true);
              }}
              className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
            >
              Guardar Contrato
            </button>
            {guardado && <span className="text-sm text-success">Guardado</span>}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Vista Previa</h3>
          <p className="text-xs text-ink/40">Con datos de ejemplo, tal como se vería al generarlo para un paciente.</p>
          <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-edge/10 bg-inset p-4 text-sm text-ink/80">
            {renderPlantilla(texto, VISTA_PREVIA_VARS)}
          </div>
        </div>
      </div>
    </div>
  );
}
