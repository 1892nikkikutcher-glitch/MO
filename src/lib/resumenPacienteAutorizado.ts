/** Arma la vista limitada de un paciente que se guarda dentro de una
 * interconsulta — espejo de `buildResumenExpediente` (Expediente.tsx): una
 * función pura que deriva un resumen a partir de datos ya cargados, nunca
 * un volcado del expediente completo. Se calcula una sola vez al crear la
 * interconsulta y queda como snapshot (no una referencia viva). */

import { calcularEdadDetallada, type Patient } from "./patientData";
import { condicionesSistemicasPositivas, type CondicionSistemica, type HistoriaClinicaTemplate, type RespuestasHistoriaClinica } from "./historiaClinica";
import type { ResumenPacienteAutorizado } from "./moConecta";

function formatEdadTexto(birthDate: string): string {
  const edad = calcularEdadDetallada(birthDate);
  if (!edad) return "Edad no registrada";
  return edad.months > 0 ? `${edad.years} años, ${edad.months} meses` : `${edad.years} años`;
}

function formatCondiciones(condiciones: CondicionSistemica[]): string[] {
  return condiciones.map((c) => (c.detalle === "Sí" ? c.etiqueta : `${c.etiqueta}: ${c.detalle}`));
}

export function construirResumenPacienteAutorizado(
  patient: Patient,
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica,
  informacionMinima?: string
): ResumenPacienteAutorizado {
  return {
    nombre: patient.name,
    edadTexto: formatEdadTexto(patient.birthDate),
    sexo: patient.sexo,
    alergias: respuestas.alergias?.trim() || undefined,
    condicionesSistemicas: formatCondiciones(condicionesSistemicasPositivas(template, respuestas)),
    informacionMinima: informacionMinima?.trim() || undefined,
  };
}
