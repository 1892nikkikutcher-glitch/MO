"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  CLAVES_CONSENTIMIENTO,
  ETIQUETAS_CONSENTIMIENTO,
  contenidoConsentimiento,
  contenidoOriginal,
  estaEditado,
  renderConsentimiento,
  type ClaveConsentimiento,
} from "@/lib/consentimientosConfig";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";
const textareaClass = `${inputClass} font-mono`;

const VISTA_PREVIA = {
  medico: "Dra. Ana Torres Rivas",
  paciente: "María Fernanda López",
  clinica: "Sonríe X Todos Dental",
};

function EditorConsentimiento({ clave }: { clave: ClaveConsentimiento }) {
  const { consentimientosConfig, setConsentimientosConfig } = usePatientData();
  const vigente = contenidoConsentimiento(clave, consentimientosConfig);
  const original = contenidoOriginal(clave);
  const [titulo, setTitulo] = useState(vigente.titulo);
  const [declaracion, setDeclaracion] = useState(vigente.declaracion);
  const [aceptacion, setAceptacion] = useState(vigente.aceptacion);
  const [guardado, setGuardado] = useState(false);

  const marcarCambio = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setGuardado(false);
  };

  const guardar = () => {
    // Solo se guarda lo que difiere del original; un campo vacío o igual al original vuelve a usar el texto original.
    const soloSiCambia = (valor: string, base: string) => (valor.trim() && valor !== base ? valor : "");
    setConsentimientosConfig((prev) => ({
      ...prev,
      textos: {
        ...prev.textos,
        [clave]: {
          titulo: soloSiCambia(titulo, original.titulo),
          declaracion: soloSiCambia(declaracion, original.declaracion),
          aceptacion: soloSiCambia(aceptacion, original.aceptacion),
        },
      },
    }));
    setGuardado(true);
  };

  const restaurar = () => {
    if (!window.confirm("¿Volver al texto original de esta carta? Se perderán tus cambios.")) return;
    setConsentimientosConfig((prev) => ({
      ...prev,
      textos: { ...prev.textos, [clave]: { titulo: "", declaracion: "", aceptacion: "" } },
    }));
    setTitulo(original.titulo);
    setDeclaracion(original.declaracion);
    setAceptacion(original.aceptacion);
    setGuardado(false);
  };

  const hayCambiosSinGuardar =
    titulo !== vigente.titulo || declaracion !== vigente.declaracion || aceptacion !== vigente.aceptacion;
  const difiereDelOriginal =
    titulo !== original.titulo || declaracion !== original.declaracion || aceptacion !== original.aceptacion;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => marcarCambio(setTitulo)(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Declaración del paciente</label>
          <textarea
            value={declaracion}
            onChange={(e) => marcarCambio(setDeclaracion)(e.target.value)}
            rows={12}
            className={textareaClass}
          />
          <p className="mt-1 text-xs text-ink/40">
            Después de este texto se imprime una línea para anotar el procedimiento de cada paciente.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Aceptación del paciente</label>
          <textarea
            value={aceptacion}
            onChange={(e) => marcarCambio(setAceptacion)(e.target.value)}
            rows={10}
            className={textareaClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={guardar}
            disabled={!hayCambiosSinGuardar}
            className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar Cambios
          </button>
          {difiereDelOriginal && (
            <button
              onClick={restaurar}
              className="rounded-lg border border-edge/10 px-4 py-2 text-sm font-medium text-ink/60 hover:text-ink"
            >
              Restaurar texto original
            </button>
          )}
          {guardado && <span className="text-sm text-success">Guardado</span>}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Vista Previa</h3>
        <p className="text-xs text-ink/40">Con datos de ejemplo, tal como se imprimiría.</p>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-lg border border-edge/10 bg-inset p-4 text-sm text-ink/80">
          <p className="text-center font-bold uppercase">{titulo}</p>
          <p className="font-bold uppercase">Declaración del paciente</p>
          <p className="whitespace-pre-line text-justify">
            {renderConsentimiento(declaracion, clave, VISTA_PREVIA)}
          </p>
          <p className="font-bold uppercase">Aceptación del paciente</p>
          <p className="whitespace-pre-line text-justify">
            {renderConsentimiento(aceptacion, clave, VISTA_PREVIA)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdministracionConsentimientos() {
  const { miRol, consentimientosConfig } = usePatientData();
  const [clave, setClave] = useState<ClaveConsentimiento>(CLAVES_CONSENTIMIENTO[0]);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede editar los consentimientos informados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Consentimientos Informados</h3>
        <p className="text-xs text-ink/40">
          Elige la carta y ajusta su redacción; se usa al generarla desde Expediente → Consentimientos Informados.
          Puedes usar <code className="text-accent">{"{{medico}}"}</code>,{" "}
          <code className="text-accent">{"{{paciente}}"}</code> y{" "}
          <code className="text-accent">{"{{clinica}}"}</code> — se rellenan solas con los datos de cada paciente. Al
          editar una carta, solo cambian los documentos que generes de ahora en adelante.
        </p>
        <select
          value={clave}
          onChange={(e) => setClave(e.target.value as ClaveConsentimiento)}
          className={inputClass}
        >
          {CLAVES_CONSENTIMIENTO.map((k) => (
            <option key={k} value={k}>
              {ETIQUETAS_CONSENTIMIENTO[k]}
              {estaEditado(k, consentimientosConfig) ? " (editado)" : ""}
            </option>
          ))}
        </select>
      </div>

      <EditorConsentimiento key={clave} clave={clave} />
    </div>
  );
}
