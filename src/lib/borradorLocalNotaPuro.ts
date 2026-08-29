/** Lógica pura del autoguardado de 3 niveles (React → IndexedDB → Firestore)
 * de "Registrar atención de hoy" — regla de oro: todo cambio llega primero
 * a un respaldo local (IndexedDB) antes o durante su sincronización remota,
 * así que perder internet nunca implica perder los últimos cambios. Estas
 * funciones no tocan IndexedDB ni Firestore (ver borradorLocalNota.ts para
 * la parte impura) — son fáciles de probar sin navegador. */

import type { ModoCaptura, NotaEvolucionV2, SeccionNota } from "./notasEvolucion";

export function claveLocalBorrador(clinicUid: string, patientId: string, notaId: string): string {
  return `${clinicUid}:${patientId}:${notaId}`;
}

/** Contador de revisión — `revisionLocal` es la revisión actual del
 * borrador en este dispositivo (en la práctica, siempre igual a
 * `nota.revision`; se guarda explícita para no tener que rescatarla del
 * objeto nota a mano); `ultimaRevisionSincronizada` es la última revisión
 * que ESTE dispositivo confirmó como escrita con éxito en Firestore — no
 * "la que Firestore tiene ahora", sino "la que ESTE dispositivo puso ahí
 * la última vez". Es la única fuente de verdad para detectar conflictos
 * (ver `detectarConflictoBorrador`); los timestamps de `MetadataLocalBorrador`
 * son solo para UX ("última edición HH:MM"), nunca para esa decisión. */
export type MetadataSincronizacionNota = {
  revisionLocal: number;
  ultimaRevisionSincronizada: number;
};

export type MetadataLocalBorrador = {
  ultimaSeccionActiva: SeccionNota;
  ultimaSeccionEditada?: SeccionNota;
  modoCaptura: ModoCaptura;
  /** Reloj de cliente, ISO — cuándo se escribió por última vez a IndexedDB.
   * Solo para UX/auditoría, nunca para decidir si hay conflicto. */
  ultimoCambioLocalEn: string;
  ultimaSincronizacionExitosaEn?: string;
  pendienteSincronizar: boolean;
  sincronizacion: MetadataSincronizacionNota;
};

export type RegistroBorradorLocal = {
  claveLocal: string;
  clinicUid: string;
  patientId: string;
  notaId: string;
  citaId?: string | null;
  /** El borrador estructurado COMPLETO — las 6 secciones, no solo la
   * narrativa. */
  nota: NotaEvolucionV2;
  /** Nunca viaja a Firestore ni al documento firmado — es solo para
   * restaurar la experiencia de la interfaz al reabrir. */
  metadataLocal: MetadataLocalBorrador;
};

export type EstadoGuardado = "guardando" | "guardado" | "sin_conexion_local" | "pendiente_sincronizar" | "error_sincronizacion";

/** Nunca reporta "guardado" si Firestore no recibió los cambios Y tampoco
 * existe una copia local recuperable — esa combinación no debería poder
 * ocurrir dado el orden de escritura (IndexedDB siempre antes que
 * Firestore), pero esta función lo verifica explícitamente en vez de
 * asumirlo. */
export function calcularEstadoGuardado(params: {
  escribiendoAhora: boolean;
  pendienteSincronizar: boolean;
  hayRespaldoLocal: boolean;
  online: boolean;
  ultimoIntentoSincronizacionFallo: boolean;
}): EstadoGuardado {
  if (params.escribiendoAhora) return "guardando";
  if (!params.hayRespaldoLocal && params.pendienteSincronizar) return "guardando";
  if (!params.online && params.pendienteSincronizar) return "sin_conexion_local";
  if (params.ultimoIntentoSincronizacionFallo && params.pendienteSincronizar) return "error_sincronizacion";
  if (params.pendienteSincronizar) return "pendiente_sincronizar";
  return "guardado";
}

export type ResultadoConflicto = { hayConflicto: boolean; motivo?: string };

/** Determinístico y basado en revisión, NO en timestamp de reloj de
 * cliente (relojes desincronizados y escrituras casi simultáneas hacían
 * poco confiable comparar por `actualizadoEn`). Regla: si Firestore tiene
 * una `revision` mayor a la última que ESTE dispositivo sincronizó con
 * éxito, alguien escribió desde otra sesión/dispositivo sin que lo
 * supiéramos — conflicto real, sin importar qué tan alta sea la
 * `revisionLocal` de este dispositivo (ej. local en revisión 7 con última
 * sincronizada en 5, remoto en 6 → SÍ es conflicto, aunque 7 > 6: existe
 * una escritura remota que esta sesión no conoce). Si Firestore no avanzó
 * más allá de `ultimaRevisionSincronizada`, es seguro sincronizar. */
export function detectarConflictoBorrador(
  local: { ultimaRevisionSincronizada: number },
  remoto: { revision: number }
): ResultadoConflicto {
  if (remoto.revision > local.ultimaRevisionSincronizada) {
    return {
      hayConflicto: true,
      motivo: "Encontramos cambios realizados desde otra sesión que este dispositivo no sincronizó.",
    };
  }
  return { hayConflicto: false };
}
