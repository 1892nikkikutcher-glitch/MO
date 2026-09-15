/** Sesión de acceso auditada (arquitectura MO Conecta v3, §9-10) — la
 * única forma de leer el expediente compartido. `sesionAccesoActivaValida`
 * es un espejo en TypeScript de la función `tieneSesionAccesoActiva` de
 * firestore.rules (mismo criterio que ya usa `esParticipanteInterconsulta`
 * en este proyecto para las reglas que también hacen falta del lado
 * servidor) — no reemplaza la regla, la duplica a propósito para poder
 * probarla con Vitest sin emulador, y para que la ruta de servidor
 * (`/api/expedientes/{id}/abrir`, Fase 3, todavía no escrita) pueda
 * re-validar antes de confiar en una sesión. */

import type { Timestamp } from "firebase-admin/firestore";

export type SesionAccesoExpedienteEstado = "activa" | "cerrada" | "expirada";

export type SesionAccesoExpediente = {
  expedienteId: string;
  profesionalUid: string;
  clinicaId: string;
  participacionId: string;
  consentimientoId: string;
  solicitudAccesoId: string;
  motivo: string;
  iniciadaEl: Timestamp;
  ultimaActividadEl: Timestamp;
  expiresAt: Timestamp;
  estado: SesionAccesoExpedienteEstado;
  ipHash?: string;
  userAgentResumido?: string;
  /** Auto-reportado por el cliente — nunca una verificación independiente
   * del servidor (v3 §16). */
  seccionesConsultadas: string[];
  cerradaEl?: Timestamp;
};

/** Id determinístico — una sola sesión viva a la vez por profesional por
 * expediente. Las reglas de Firestore solo pueden hacer `get()` sobre una
 * ruta conocida, nunca una consulta con `where()` — un id autogenerado
 * sería imposible de verificar desde una regla (v3 §10). */
export function idSesionAccesoExpediente(expedienteId: string, profesionalUid: string): string {
  return `${expedienteId}_${profesionalUid}`;
}

/** true solo si la sesión pertenece exactamente a este profesional y
 * expediente, sigue activa, no ha vencido, y su participación vinculada
 * corresponde al mismo par (profesional, expediente) — no basta con que
 * exista un documento en el id esperado (v3, tercera precisión de la
 * ronda de aprobación final). */
export function sesionAccesoActivaValida(
  sesion: Pick<
    SesionAccesoExpediente,
    "expedienteId" | "profesionalUid" | "estado" | "expiresAt" | "participacionId"
  >,
  contexto: { expedienteId: string; profesionalUid: string; ahora: Timestamp }
): boolean {
  if (sesion.expedienteId !== contexto.expedienteId) return false;
  if (sesion.profesionalUid !== contexto.profesionalUid) return false;
  if (sesion.estado !== "activa") return false;
  if (sesion.expiresAt.toMillis() <= contexto.ahora.toMillis()) return false;
  const participacionEsperada = `${contexto.expedienteId}_${contexto.profesionalUid}_general`;
  if (sesion.participacionId !== participacionEsperada) return false;
  return true;
}
