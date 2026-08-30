import type { HorarioAtencion } from "./patientData";

/** Cualquier edición a un campo del horario invalida una confirmación
 * previa — "confirmado" no es pegajoso, si el horario cambia hay que
 * volver a confirmarlo. Se omiten `confirmadoEn`/`confirmadoPorUid` por
 * completo (no se dejan en `undefined`) para que el objeto que llega a
 * `setDoc` nunca tenga un valor `undefined` literal, sin depender de que el
 * cliente de Firestore tenga `ignoreUndefinedProperties` activo. */
export function editarCampoHorario(
  prev: HorarioAtencion,
  cambios: Partial<Pick<HorarioAtencion, "apertura" | "comidaInicio" | "comidaFin" | "cierre">>
): HorarioAtencion {
  return {
    apertura: cambios.apertura ?? prev.apertura,
    comidaInicio: cambios.comidaInicio ?? prev.comidaInicio,
    comidaFin: cambios.comidaFin ?? prev.comidaFin,
    cierre: cambios.cierre ?? prev.cierre,
    confirmado: false,
  };
}

export function confirmarHorarioPuro(prev: HorarioAtencion, uid: string | undefined, ahora: string): HorarioAtencion {
  // Se reconstruye explícitamente en vez de `{ ...prev, ... }` — si `prev` ya
  // traía un `confirmadoPorUid` de una confirmación anterior, un spread lo
  // dejaría colgado cuando esta confirmación no tiene `uid` disponible,
  // atribuyéndola por error a quien confirmó la vez pasada.
  const base: HorarioAtencion = {
    apertura: prev.apertura,
    comidaInicio: prev.comidaInicio,
    comidaFin: prev.comidaFin,
    cierre: prev.cierre,
    confirmado: true,
    confirmadoEn: ahora,
  };
  if (!uid) return base; // sin uid disponible, se omite la clave — nunca `confirmadoPorUid: undefined`
  return { ...base, confirmadoPorUid: uid };
}
