"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";

type Patient = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  nombreTutor?: string;
};

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

const parrafoDeclaracion = `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del procedimiento clínico bucal que se me realizará. Se me han explicado verbalmente los riesgos y posibles complicaciones inherentes al procedimiento, así como la existencia de otras alternativas de tratamiento disponibles.
Comprendo los posibles riesgos y complicaciones involucradas en los tratamientos médico, estéticos y quirúrgicos, y que en mi caso la duración de estos fenómenos no está determinada, pudiendo ser irreversible. Comprendo que la odontología no es una ciencia exacta.
Así mismo, que existen riesgos imprevistos que pueden alterar el buen resultado del tratamiento.
Sabiendo que siempre se buscará el bienestar, seguridad y calidad de los procedimientos clínicos realizados. Me han explicado de otros problemas y complicaciones poco frecuentes, derivadas del tratamiento bucal que consiste en:`;

function parrafoAceptacion(nombreDoctor: string) {
  return `Acepto que después de explicar procedimientos, elijo el procedimiento clínico que se detalla a realizar. Acepto y me comprometo a seguir responsablemente las recomendaciones e indicaciones recibidas, antes, durante y después del tratamiento, así como, acudir a las citas para las revisiones durante el tiempo pertinente. Acepto y reconozco que no se me pueden dar garantías o seguridad absoluta respecto a que el resultado del procedimiento clínico sea el más satisfactorio, por lo que acepto la posibilidad de necesitar cualquier posterior intervención para mejorar el resultado final. Comprendo que la medicina no es una ciencia exacta. Si surgiese cualquier situación inesperada o sobrevenida durante la intervención o tratamiento, autorizo al profesional a realizar cualquier procedimiento o maniobra distinta de las proyectadas o usuales que a su juicio estimase oportuna para la resolución, en su caso, de la complicación surgida. Acepto no obligar al cirujano dentista a realizar un procedimiento cuando ello implique mayor riesgo que beneficio. Acepto firmar este consentimiento informado y manifiesto que ${nombreDoctor || "el profesional que me atiende"} y/o su equipo de ayudantes me han informado del procedimiento clínico al que deseo ser sometida/o.
Si tiene alguna duda sobre el procedimiento, no dude en preguntar. Estamos aquí para ayudarle a obtener la asistencia que quiere y necesita.`;
}

export default function ConsentimientoInformado({
  patient,
  onVolver,
}: {
  patient: Patient;
  onVolver?: () => void;
}) {
  const { perfilDoctor } = usePatientData();
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
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Procedimiento clínico a realizar
          </label>
          <textarea
            value={procedimiento}
            onChange={(e) => setProcedimiento(e.target.value)}
            placeholder="Ej. Extracción de OD 18, colocación de resina en OD 16..."
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
          Carta de Consentimiento Informado General
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
          {parrafoDeclaracion}
        </p>
        <div className="mt-2 min-h-[3rem] border-b border-dashed border-black/40 text-[13px] print:min-h-[2rem] print:text-[10.5px]">
          {procedimiento}
        </div>

        <h3 className="mt-5 text-sm font-bold uppercase print:mt-2.5 print:text-xs">
          Aceptación del paciente
        </h3>
        <p className="mt-1 whitespace-pre-line text-justify text-[13px] leading-relaxed print:text-[10.5px] print:leading-snug">
          {parrafoAceptacion(perfilDoctor.nombre)}
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
