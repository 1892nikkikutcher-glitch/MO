"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { Patient } from "@/lib/patientData";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function ConstanciaPermanencia({
  patient,
  onVolver,
}: {
  patient: Patient;
  onVolver: () => void;
}) {
  const { perfilDoctor } = usePatientData();
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [motivo, setMotivo] = useState("tratamiento dental");
  const [dirigidoA, setDirigidoA] = useState("A quien corresponda");

  const handleImprimir = () => window.print();

  const handleEnviarWhatsApp = () => {
    const lineas = [
      "Constancia de Permanencia",
      dirigidoA,
      "",
      `Se hace constar que ${patient.name} estuvo presente en este consultorio el día ${fechaLargaHoy()}${
        horaEntrada ? `, de las ${horaEntrada}` : ""
      }${horaSalida ? ` a las ${horaSalida} hrs` : ""}, por motivo de ${motivo}.`,
      "",
      perfilDoctor.nombre ? `${perfilDoctor.nombre}${perfilDoctor.cedulaProfesional ? ` · Ced. Prof. ${perfilDoctor.cedulaProfesional}` : ""}` : "",
    ].filter(Boolean);
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

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-edge/10 bg-surface p-6 sm:grid-cols-2 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Dirigido a</label>
          <input type="text" value={dirigidoA} onChange={(e) => setDirigidoA(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Motivo</label>
          <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Hora de entrada</label>
          <input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Hora de salida</label>
          <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} className={inputClass} />
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

        <h2 className="mt-6 text-center text-base font-bold uppercase tracking-wide">
          Constancia de Permanencia
        </h2>
        <p className="mt-4 text-sm">{dirigidoA}</p>
        <p className="mt-4 text-justify text-sm leading-relaxed">
          Se hace constar que <span className="font-medium">{patient.name}</span> estuvo presente en este
          consultorio el día <span className="font-medium">{fechaLargaHoy()}</span>
          {horaEntrada && (
            <>
              , de las <span className="font-medium">{horaEntrada} hrs</span>
            </>
          )}
          {horaSalida && (
            <>
              {" "}
              a las <span className="font-medium">{horaSalida} hrs</span>
            </>
          )}
          , por motivo de <span className="font-medium">{motivo}</span>.
        </p>
        <p className="mt-2 text-sm">Se extiende la presente para los fines que al interesado convengan.</p>

        <div className="mt-16 flex justify-center">
          <div className="text-center text-xs">
            <div className="mb-1 w-56 border-b border-black" />
            <p className="font-medium">{perfilDoctor.nombre}</p>
            {perfilDoctor.cedulaProfesional && <p>Ced. Prof. {perfilDoctor.cedulaProfesional}</p>}
          </div>
        </div>

        {perfilDoctor.direccionClinica && (
          <p className="mt-8 text-center text-xs">{perfilDoctor.direccionClinica}</p>
        )}
      </div>
    </div>
  );
}
