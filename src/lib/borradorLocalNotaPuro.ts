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

export type MetadataLocalBorrador = {
  ultimaSeccionActiva: SeccionNota;
  ultimaSeccionEditada?: SeccionNota;
  modoCaptura: ModoCaptura;
  /** Reloj de cliente, ISO — cuándo se escribió por última vez a IndexedDB. */
  ultimoCambioLocalEn: string;
  ultimaSincronizacionExitosaEn?: string;
  pendienteSincronizar: boolean;
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

/** Compara la versión de Firestore contra la base sobre la que el borrador
 * local fue construido (no simplemente "el más nuevo gana"). Si Firestore
 * avanzó por una sincronización que ESTE dispositivo/pestaña ya hizo, no es
 * conflicto — es el flujo normal. Si Firestore avanzó por algo que este
 * dispositivo no sincronizó (otra pestaña, otro dispositivo, otra persona),
 * es un conflicto real y no se resuelve con last-write-wins silencioso. */
export function detectarConflictoBorrador(
  local: { actualizadoEnBaseLocal: string },
  remoto: { actualizadoEn: string }
): ResultadoConflicto {
  if (remoto.actualizadoEn > local.actualizadoEnBaseLocal) {
    return {
      hayConflicto: true,
      motivo: "Firestore tiene una versión más reciente que la que este dispositivo sincronizó por última vez.",
    };
  }
  return { hayConflicto: false };
}
