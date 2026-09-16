/** Lógica pura de conciliación al copiar subcolecciones clínicas durante
 * una migración (arquitectura MO Conecta v3, §11.2) — separada de
 * migracionesExpediente.ts (que sí toca Firestore) para poder probarla con
 * Vitest sin emulador.
 *
 * Nota de lectura del plan: v3 §11.2 lista "notas, recetas, diagnósticos"
 * como registros repetibles pero después habla de "historia clínica,
 * odontograma" como documentos únicos — y en este código base `diagnosticos`
 * ES el odontograma (ver moConecta.ts histórico / patientData.ts). Se
 * resolvió la ambigüedad así: `historiaClinica` (id fijo "respuestas") es
 * el único documento único/mutable de las siete subcolecciones clínicas;
 * `diagnosticos`, junto con `notasEvolucion`, `planTratamiento`, `recetas`
 * y `comparativas`, se tratan como repetibles (cada una ya es una colección
 * de muchos documentos con su propio id, nunca un documento fijo). `fotos`
 * queda fuera de este módulo — su copia es de Storage, no de Firestore. */

/** Dos clínicas nunca chocan en el mismo id: el id canónico de un registro
 * repetible ya incluye la migración que lo trajo. */
export function idDocumentoRepetibleMigrado(migracionId: string, origenDocumentoId: string): string {
  return `${migracionId}_${origenDocumentoId}`;
}

export type ResultadoConciliacion =
  | { tipo: "escribir_limpio" }
  | { tipo: "ya_migrado_por_esta_clinica" }
  | { tipo: "conflicto"; motivo: string };

/** Un documento MUTABLE/ÚNICO (hoy: solo `historiaClinica/respuestas`)
 * nunca se sobrescribe en silencio si el destino ya tiene contenido de
 * OTRA clínica distinta a la de este origen (v3 §11.2: "preservar el id
 * local del documento no basta"). Si el destino ya tiene contenido de la
 * MISMA clínica/migración, reescribir es seguro (es una actualización o un
 * reintento de un lote ya aplicado, no una colisión entre clínicas). */
export function conciliarDocumentoUnico(
  destinoExistente: { origenClinicaId: string; migracionId: string } | undefined,
  origenClinicaId: string,
  migracionId: string
): ResultadoConciliacion {
  if (!destinoExistente) return { tipo: "escribir_limpio" };
  if (destinoExistente.origenClinicaId === origenClinicaId && destinoExistente.migracionId === migracionId) {
    return { tipo: "ya_migrado_por_esta_clinica" };
  }
  if (destinoExistente.origenClinicaId === origenClinicaId) return { tipo: "escribir_limpio" };
  return {
    tipo: "conflicto",
    motivo: `Ya existe contenido de otra clínica (${destinoExistente.origenClinicaId}) — exige resolución humana, nunca se sobrescribe en silencio.`,
  };
}
