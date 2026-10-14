/** Qué tan abierto está el expediente de un caso de MO Conecta (puro, sin Firestore). Sirve para
 * mostrarlo de un vistazo en las listas y avisar, en el expediente del paciente, quién lo está
 * viendo ahora. */

import type { Interconsulta } from "./moConecta";

/** - vivo: se comparte y se mantiene al día.
 * - foto_fija: caso anterior al interruptor; el colega ve una foto de cuando se envió.
 * - apagado: se dejó de compartir; el colega ya no ve nada.
 * - ninguno: nunca se compartió más que lo básico. */
export type EstadoCompartirExpediente = "vivo" | "foto_fija" | "apagado" | "ninguno";

export function estadoCompartirDelCaso(c: Pick<Interconsulta, "compartirExpediente" | "expedienteCompartido">): EstadoCompartirExpediente {
  if (c.compartirExpediente) return c.compartirExpediente.activo ? "vivo" : "apagado";
  return c.expedienteCompartido ? "foto_fija" : "ninguno";
}

export const etiquetaEstadoCompartir: Record<EstadoCompartirExpediente, string> = {
  vivo: "Expediente al día",
  foto_fija: "Foto fija del expediente",
  apagado: "Dejó de compartirse",
  ninguno: "",
};

/** Casos enviados por `uid` de este paciente en los que el colega ve el expediente ahora mismo
 * (al día o foto fija). Los que se apagaron o nunca lo compartieron no entran. */
export function casosQueComparten(
  casos: Pick<Interconsulta, "id" | "odontologoRemitenteUid" | "pacienteId" | "compartirExpediente" | "expedienteCompartido" | "estado">[],
  uid: string,
  pacienteId: string
) {
  return casos.filter((c) => {
    if (c.odontologoRemitenteUid !== uid || c.pacienteId !== pacienteId) return false;
    const e = estadoCompartirDelCaso(c);
    return e === "vivo" || e === "foto_fija";
  });
}

/** Casos enviados por `uid` que ya concluyeron (cerrados, cancelados o rechazados) y todavía
 * muestran el expediente al colega: lo compartido ya no hace falta y conviene apagarlo. */
export function casosConcluidosCompartiendo(
  casos: Pick<Interconsulta, "id" | "odontologoRemitenteUid" | "compartirExpediente" | "expedienteCompartido" | "estado">[],
  uid: string
) {
  return casos.filter((c) => {
    if (c.odontologoRemitenteUid !== uid) return false;
    if (c.estado !== "closed" && c.estado !== "cancelled" && c.estado !== "rejected") return false;
    const e = estadoCompartirDelCaso(c);
    return e === "vivo" || e === "foto_fija";
  });
}
