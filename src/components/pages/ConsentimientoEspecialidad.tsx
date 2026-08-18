"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada, type Patient } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import {
  consentimientosEspecialidad,
  type TipoConsentimientoEspecialidad,
} from "@/lib/consentimientosEspecialidad";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function todayFormatted() {
  const d = new Date();
  const dia = d.toLocaleDateString("es-MX", { day: "2-digit" });
  const mes = d.toLocaleDateString("es-MX", { month: "long" });
  const anio = d.toLocaleDateString("es-MX", { year: "numeric" });
  return { dia, mes, anio };
}

function nowFormatted() {
  return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function ConsentimientoEspecialidad({
  patient,
  tipo,
  onVolver,
}: {
  patient: Patient;
  tipo: TipoConsentimientoEspecialidad;
  onVolver?: () => void;
}) {
  const { perfilDoctor } = usePatientData();
  const contenido = consentimientosEspecialidad[tipo];
  const esMenorDeEdad = (calcularEdadDetallada(patient.birthDate)?.years ?? 18) < 18;
  const fechaInicial = todayFormatted();
  const [dia, setDia] = useState(fechaInicial.dia);
  const [mes, setMes] = useState(fechaInicial.mes);
  const [anio, setAnio] = useState(fechaInicial.anio);
  const [hora, setHora] = useState(nowFormatted());
  const [procedimiento, setProcedimiento] = useState("");
  const [nombreFirmante, setNombreFirmante] = useState(
    esMenorDeEdad ? patient.nombreTutor || "" : patient.name
  );
  const [parentesco, setParentesco] = useState(esMenorDeEdad ? "Madre/Padre/Tutor" : "Titular");
  const [testigo1, setTestigo1] = useState("");
  const [testigo2, setTestigo2] = useState("");

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-2 print:hidden">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Datos del consentimiento
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Los datos fijos ya están cargados. Completa el procedimiento y, si aplica, testigos o
            representante legal.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Día</label>
          <input type="text" value={dia} onChange={(e) => setDia(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Mes</label>
          <input type="text" value={mes} onChange={(e) => setMes(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Año</label>
          <input type="text" value={anio} onChange={(e) => setAnio(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Hora</label>
          <input type="text" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink/60">{contenido.procedimientoLabel}</label>
          <textarea
            value={procedimiento}
            onChange={(e) => setProcedimiento(e.target.value)}
            placeholder={contenido.procedimientoPlaceholder}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Nombre del paciente o representante legal
          </label>
          <input
            type="text"
            value={nombreFirmante}
            onChange={(e) => manejarCambioNombre(e, setNombreFirmante)}
            className={inputClass}
          />
          {esMenorDeEdad && (
            <p className="mt-1 text-xs text-accent/70">
              Paciente menor de edad — se llenó con el tutor de Datos del Paciente. Verifica o
              corrígelo antes de imprimir.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Parentesco</label>
          <input
            type="text"
            value={parentesco}
            onChange={(e) => setParentesco(e.target.value)}
            placeholder="Titular, madre, padre, tutor..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Testigo 1 (opcional)</label>
          <input
            type="text"
            value={testigo1}
            onChange={(e) => manejarCambioNombre(e, setTestigo1)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Testigo 2 (opcional)</label>
          <input
            type="text"
            value={testigo2}
            onChange={(e) => manejarCambioNombre(e, setTestigo2)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          {onVolver && (
            <button onClick={onVolver} className="text-sm font-medium text-accent hover:text-accent">
              ← Volver a Documentos
            </button>
          )}
          <button
            onClick={handleImprimir}
            className="ml-auto rounded-lg border border-accent/60 bg-accent/15 py-2.5 px-6 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
          >
            Imprimir para firmar con pluma
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:rounded-none print:p-0 print:shadow-none">
        <h2 className="text-center text-base font-bold uppercase tracking-wide print:text-sm">
          {contenido.titulo}
        </h2>
        <div className="mt-3 text-center text-sm leading-snug print:mt-1.5 print:text-xs">
          <p className="font-semibold">{perfilDoctor.nombre || "Consultorio dental"}</p>
          {perfilDoctor.cedulaProfesional && <p>Cédula profesional {perfilDoctor.cedulaProfesional}</p>}
          {perfilDoctor.direccionClinica && <p>{perfilDoctor.direccionClinica}</p>}
        </div>

        <p className="mt-4 text-sm print:mt-2 print:text-xs">
          Fecha: <span className="font-medium">{dia}</span> de{" "}
          <span className="font-medium">{mes}</span> del <span className="font-medium">{anio}</span>{" "}
          &nbsp;&nbsp; Hora: <span className="font-medium">{hora}</span>
        </p>
        <p className="text-sm print:text-xs">
          Paciente: <span className="font-medium">{patient.name}</span>
        </p>

        <h3 className="mt-5 text-sm font-bold uppercase print:mt-2.5 print:text-xs">
          Declaración del paciente
        </h3>
        <p className="mt-1 whitespace-pre-line text-justify text-[13px] leading-relaxed print:text-[10.5px] print:leading-snug">
          {contenido.declaracion}
        </p>
        <div className="mt-2 min-h-[3rem] border-b border-dashed border-black/40 text-[13px] print:min-h-[2rem] print:text-[10.5px]">
          {procedimiento}
        </div>

        <h3 className="mt-5 text-sm font-bold uppercase print:mt-2.5 print:text-xs">
          Aceptación del paciente
        </h3>
        <p className="mt-1 whitespace-pre-line text-justify text-[13px] leading-relaxed print:text-[10.5px] print:leading-snug">
          {contenido.aceptacion(perfilDoctor.nombre)}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-10 text-center text-[11px] print:mt-5 print:gap-x-8 print:gap-y-5 print:text-[9.5px]">
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Firma {perfilDoctor.nombre || "del profesional"}</p>
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Nombre y firma del paciente o representante legal y parentesco</p>
            <p className="mt-1 font-medium">
              {nombreFirmante} — {parentesco}
            </p>
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Nombre y firma del testigo</p>
            {testigo1 && <p className="mt-1 font-medium">{testigo1}</p>}
          </div>
          <div>
            <div className="mb-1 h-12 border-b border-black print:h-8" />
            <p>Nombre y firma del testigo</p>
            {testigo2 && <p className="mt-1 font-medium">{testigo2}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
