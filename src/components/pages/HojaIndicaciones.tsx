"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { hojasIndicaciones, type TipoHojaIndicaciones } from "@/lib/hojasIndicaciones";
import type { Patient } from "@/lib/patientData";

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function HojaIndicaciones({
  patient,
  tipo,
  onVolver,
}: {
  patient: Patient;
  tipo: TipoHojaIndicaciones;
  onVolver: () => void;
}) {
  const { perfilDoctor } = usePatientData();
  const hoja = hojasIndicaciones[tipo];

  const handleImprimir = () => window.print();

  const handleEnviarWhatsApp = () => {
    const lineas = [
      hoja.titulo,
      `Paciente: ${patient.name}`,
      "",
      ...hoja.instrucciones.map((texto, i) => `${i + 1}. ${texto}`),
      "",
      "Ante cualquier duda o urgencia, contáctanos.",
    ];
    const telefono = patient.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={onVolver} className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent">
          ← Volver a Documentos
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleImprimir}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Imprimir
          </button>
          <button
            onClick={handleEnviarWhatsApp}
            className="rounded-lg border border-success/40 px-4 py-2 text-sm font-semibold text-success transition-colors hover:bg-success/10"
          >
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 text-black shadow-lg print:rounded-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div className="w-16 shrink-0">
            {perfilDoctor.logoEscuelaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfilDoctor.logoEscuelaUrl} alt="" className="h-16 w-16 object-contain" />
            )}
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold">{perfilDoctor.nombre || "Consultorio dental"}</p>
            {perfilDoctor.cedulaProfesional && <p className="text-sm">Ced. Prof. {perfilDoctor.cedulaProfesional}</p>}
          </div>
          <div className="w-16 shrink-0 text-right">
            {perfilDoctor.logoClinicaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfilDoctor.logoClinicaUrl} alt="" className="ml-auto h-16 w-16 object-contain" />
            )}
          </div>
        </div>

        <h2 className="mt-6 text-center text-base font-bold uppercase tracking-wide">{hoja.titulo}</h2>
        <p className="mt-3 text-sm">
          Paciente: <span className="font-medium">{patient.name}</span> &nbsp;&nbsp; Fecha:{" "}
          <span className="font-medium">{fechaLargaHoy()}</span>
        </p>

        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed">
          {hoja.instrucciones.map((texto, i) => (
            <li key={i}>{texto}</li>
          ))}
        </ol>

        <p className="mt-6 text-sm font-medium">
          Ante cualquier duda, molestia fuera de lo esperado o urgencia, contáctanos de inmediato.
        </p>

        {perfilDoctor.direccionClinica && (
          <p className="mt-8 text-center text-xs">{perfilDoctor.direccionClinica}</p>
        )}
      </div>
    </div>
  );
}
