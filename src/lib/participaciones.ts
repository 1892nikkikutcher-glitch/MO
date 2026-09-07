/** Participación — quién tiene qué rol de un profesional sobre el
 * expediente de un paciente (o sobre un episodio específico dentro de
 * él). Es la entidad que de verdad otorga acceso (ver plan de
 * arquitectura MO Conecta, §7-8) — no existe una colección de permisos
 * aparte; el permiso se deriva de rol + nivelAcceso aquí.
 *
 * Id determinístico `{expedienteId}_{profesionalUid}_{episodioId|'general'}`
 * — así las reglas de Firestore pueden hacer `exists()`/`get()` directo
 * (O(1)) en vez de una query, mismo motivo que ya usa
 * `clinicMembers/{clinicaId}_{uid}` en firestore.rules. Otorgar un rol de
 * episodio SIEMPRE debe asegurar también el doc "_general" correspondiente
 * (create-if-absent, misma transacción) — las reglas a nivel de expediente
 * completo solo pueden comprobar el doc "_general", nunca enumerar
 * episodios de antemano. */

export type RolParticipacion = "responsable_principal" | "colaborador" | "responsable_episodio";
export type NivelAcceso = "lectura" | "lectura_escritura";
export type EstadoParticipacion = "activa" | "concluida";

export const PARTICIPACION_GENERAL = "general";

export type Participacion = {
  id: string;
  expedienteId: string;
  profesionalUid: string;
  clinicaId: string;
  rol: RolParticipacion;
  nivelAcceso: NivelAcceso;
  /** Ausente = participación general del expediente (responsable
   * principal o colaborador general). Presente = alcance de un episodio
   * puntual (siempre junto con rol "responsable_episodio", o un
   * "colaborador" cuya aportación se limita a ese episodio). */
  episodioId?: string;
  desde: string;
  hasta?: string;
  estado: EstadoParticipacion;
};

/** Construye el id determinístico — usar SIEMPRE esta función al leer o
 * escribir una participación, nunca concatenar el string a mano, para que
 * el convenio "_general" no se desalinee entre código y reglas. */
export function idParticipacion(expedienteId: string, profesionalUid: string, episodioId?: string): string {
  return `${expedienteId}_${profesionalUid}_${episodioId ?? PARTICIPACION_GENERAL}`;
}

export function esParticipacionGeneral(participacion: Pick<Participacion, "episodioId">): boolean {
  return !participacion.episodioId;
}

export function participacionActiva(participacion: Pick<Participacion, "estado">): boolean {
  return participacion.estado === "activa";
}

/** true si este rol implica coordinar el tratamiento general vigente del
 * paciente — a diferencia de "colaborador"/"responsable_episodio", que
 * nunca asumen automáticamente esa coordinación (ver plan, §7). Solo tiene
 * sentido para una participación general (`episodioId` ausente); nunca
 * debe haber dos participaciones "responsable_principal" activas a la vez
 * para el mismo expediente — esa unicidad se aplica en la transacción que
 * la otorga (ver conectaEstado.ts, Fase 4), no aquí. */
export function esResponsablePrincipal(participacion: Pick<Participacion, "rol" | "episodioId" | "estado">): boolean {
  return participacion.rol === "responsable_principal" && esParticipacionGeneral(participacion) && participacionActiva(participacion);
}
