"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import ConsentimientoInformado from "./ConsentimientoInformado";
import ConstanciaPermanencia from "./ConstanciaPermanencia";
import HojaIndicaciones from "./HojaIndicaciones";
import { formatNombreConEdad } from "@/lib/patientData";
import type { TipoHojaIndicaciones } from "@/lib/hojasIndicaciones";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

type TipoDocumento = "consentimiento" | "constancia" | TipoHojaIndicaciones;

const documentosDisponibles: { tipo: TipoDocumento; titulo: string; descripcion: string }[] = [
  {
    tipo: "consentimiento",
    titulo: "Consentimiento Informado",
    descripcion: "Carta general para autorizar un procedimiento clínico, con espacio para firma y testigos.",
  },
  {
    tipo: "constancia",
    titulo: "Constancia de Permanencia",
    descripcion: "Certifica la presencia del paciente en el consultorio, para escuela o trabajo.",
  },
  {
    tipo: "protesis",
    titulo: "Indicaciones — Prótesis",
    descripcion: "Hoja de cuidados para pacientes con tratamiento de prótesis.",
  },
  {
    tipo: "ortodoncia",
    titulo: "Indicaciones — Ortodoncia",
    descripcion: "Hoja de cuidados para pacientes con brackets o aparatos de ortodoncia.",
  },
  {
    tipo: "cirugiaBucal",
    titulo: "Indicaciones — Cirugía Bucal",
    descripcion: "Cuidados posteriores a una extracción u otro procedimiento quirúrgico.",
  },
  {
    tipo: "odontopediatria",
    titulo: "Indicaciones — Odontopediatría",
    descripcion: "Hoja de cuidados para padres o tutores de pacientes pediátricos.",
  },
];

export default function Documentos() {
  const { patients } = usePatientData();
  const [patientId, setPatientId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [documentoActivo, setDocumentoActivo] = useState<TipoDocumento | null>(null);

  const patient = patients.find((p) => p.id === patientId) ?? null;

  const coincidencias =
    !patientId && searchText.trim().length > 0
      ? patients.filter((p) => p.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      : [];

  if (patient && documentoActivo) {
    const onVolver = () => setDocumentoActivo(null);
    if (documentoActivo === "consentimiento") {
      return <ConsentimientoInformado patient={patient} onVolver={onVolver} />;
    }
    if (documentoActivo === "constancia") {
      return <ConstanciaPermanencia patient={patient} onVolver={onVolver} />;
    }
    return <HojaIndicaciones patient={patient} tipo={documentoActivo} onVolver={onVolver} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
        {patient ? (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
            <span className="text-ink">{formatNombreConEdad(patient.name, patient.birthDate)}</span>
            <button
              onClick={() => {
                setPatientId("");
                setSearchText("");
              }}
              className="text-xs font-semibold text-success hover:text-success"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar paciente por nombre..."
              className={inputClass}
            />
            {coincidencias.length > 0 && (
              <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-edge/10 bg-field p-1.5">
                {coincidencias.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPatientId(p.id);
                      setSearchText("");
                    }}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/80 hover:bg-surface"
                  >
                    {formatNombreConEdad(p.name, p.birthDate)}
                    <span className="ml-2 text-xs text-ink/40">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {searchText.trim().length > 0 && coincidencias.length === 0 && (
              <p className="mt-2 text-xs text-ink/40">No se encontró ningún paciente con ese nombre.</p>
            )}
            <p className="mt-2 text-xs text-ink/40">Elige un paciente para poder generar sus documentos.</p>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Documentos disponibles
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documentosDisponibles.map((doc) => (
            <button
              key={doc.tipo}
              onClick={() => patient && setDocumentoActivo(doc.tipo)}
              disabled={!patient}
              className="rounded-2xl border border-edge/10 bg-surface p-5 text-left transition-colors hover:border-accent/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="text-sm font-semibold text-ink">{doc.titulo}</p>
              <p className="mt-1 text-xs text-ink/50">{doc.descripcion}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
