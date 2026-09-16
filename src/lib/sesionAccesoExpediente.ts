/** Sesión de acceso auditada (arquitectura MO Conecta v3, §9-10) — la
 * única forma de leer el expediente compartido. `sesionAccesoActivaValida`
 * es un espejo en TypeScript de la función `tieneSesionAccesoActiva` de
 * firestore.rules (mismo criterio que ya usa `esParticipanteInterconsulta`
 * en este proyecto para las reglas que también hacen falta del lado
 * servidor) — no reemplaza la regla, la duplica a propósito para poder
 * probarla con Vitest sin emulador, y para que la ruta de servidor
 * (`/api/expedientes/{id}/abrir`, Fase 3, todavía no escrita) pueda
 * re-validar antes de confiar en una sesión. */

import { Timestamp } from "firebase-admin/firestore";

export type SesionAccesoExpedienteEstado = "activa" | "cerrada" | "expirada";

export type SesionAccesoExpediente = {
  expedienteId: string;
  profesionalUid: string;
  clinicaId: string;
  participacionId: string;
  /** Ausentes exactamente en el mismo caso que en Participacion (ver
   * participaciones.ts): una sesión abierta sobre la participación
   * responsable_principal que crea una migración, que nunca pasó por la
   * cadena folio→solicitud→consentimiento. */
  consentimientoId?: string;
  solicitudAccesoId?: string;
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

export const VENTANA_INACTIVIDAD_MINUTOS = 15;
export const DURACION_ABSOLUTA_MAXIMA_MINUTOS = 60;

/** `expiresAt` codifica AMBOS límites del plan con un solo campo, a
 * propósito — es lo único que `tieneSesionAccesoActiva` (firestore.rules)
 * puede comparar (`expiresAt > request.time`), así que "inactividad" no
 * puede vivir en un campo aparte que la regla nunca miraría (v3 §10):
 * `min(ahora + 15 min de inactividad, iniciadaEl + 60 min de duración
 * absoluta)`. Si el cliente dejara de renovar, `expiresAt` se queda fijo
 * en el último valor calculado — la regla empieza a rechazar en cuanto
 * pasa, sin necesitar ningún job de limpieza para el efecto de seguridad. */
export function calcularExpiresAt(iniciadaEl: Timestamp, ahora: Timestamp): Timestamp {
  const topeInactividad = ahora.toMillis() + VENTANA_INACTIVIDAD_MINUTOS * 60_000;
  const topeAbsoluto = iniciadaEl.toMillis() + DURACION_ABSOLUTA_MAXIMA_MINUTOS * 60_000;
  return Timestamp.fromMillis(Math.min(topeInactividad, topeAbsoluto));
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
