/** Identidad global de paciente, cross-clínica (arquitectura MO Conecta v3,
 * §3/§5). `pacientesGlobales/{id}` es 1:1 con `expedientesClinicos/{id}`
 * (mismo id) — este documento es solo identidad, nunca contenido clínico.
 * Fase 2: tipo + normalización, el módulo que lo crea/lee de verdad vive en
 * migracionesExpediente.ts (nace siempre como parte de una migración). */

import type { Timestamp } from "firebase-admin/firestore";

export type PacienteGlobal = {
  id: string;
  nombre: string;
  /** ISO "YYYY-MM-DD" — se queda como string (no Timestamp, a diferencia
   * del resto de las fechas de esta arquitectura) porque es una fecha
   * calendario sin componente de hora, igual que `Patient.birthDate` en
   * patientData.ts; convertirla a Timestamp introduciría una ambigüedad de
   * huso horario que no existe hoy en el dato de origen. */
  fechaNacimiento?: string;
  sexo?: string;
  telefonoNormalizado?: string;
  /** Nunca capturado hoy en `Patient` (patientData.ts) — queda preparado
   * para cuando exista una fuente real. */
  curp?: string;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
};

/** Dígitos únicamente, quedándose con los últimos 10 (longitud de un móvil
 * mexicano) — así "+52 55 1234 5678", "5512345678" y "55-1234-5678" se
 * comparan igual sin importar cómo se haya capturado. Nunca decide si dos
 * teléfonos son "la misma persona" por sí solo (ver vinculacionPosiblePaciente.ts). */
export function normalizarTelefono(crudo: string): string {
  return crudo.replace(/\D/g, "").slice(-10);
}
