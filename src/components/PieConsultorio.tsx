"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { telefonoConsultorioDe, textoTelefono } from "@/lib/telefonoConsultorio";

/** Dirección y teléfono del consultorio al pie (o en el encabezado) de un documento impreso. Lee la dirección y el teléfono
 * del propio contexto: basta con indicar el médico del documento, si lo tiene, para que salga el teléfono de SU consultorio
 * (si no, el general). Es la única pieza que decide cómo se ve este bloque, así todos los documentos quedan iguales. */
export default function PieConsultorio({ medico, className = "" }: { medico?: string | null; className?: string }) {
  const { perfilDoctor, clinicInfo, recursos } = usePatientData();
  const direccion = perfilDoctor.direccionClinica?.trim();
  const telefono = textoTelefono(telefonoConsultorioDe(medico, recursos, clinicInfo?.telefono));
  if (!direccion && !telefono) return null;
  return (
    <div className={className}>
      {direccion && <p>{direccion}</p>}
      {telefono && <p>{telefono}</p>}
    </div>
  );
}
