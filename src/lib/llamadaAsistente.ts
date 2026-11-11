/** El botón de ayuda "?" se pinta llamativo (como algo que requiere atención) las primeras visitas a la plataforma,
 * para que la persona sepa a dónde recurrir en caso de dudas. Una visita = una sesión del navegador. */

export const VISITAS_CON_LLAMADA = 3;

export const claveVisitasAsistente = (uid: string) => `asistenteVisitas:${uid}`;
export const claveSesionAsistente = (uid: string) => `asistenteSesion:${uid}`;

export function leerVisitasAsistente(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** ¿Con este número de visita (la actual ya contada) toca llamar la atención? */
export function debeLlamarLaAtencion(visitas: number): boolean {
  return visitas >= 1 && visitas <= VISITAS_CON_LLAMADA;
}
