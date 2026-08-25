/** Transición de estado de una interconsulta — la única forma de cambiar
 * `Interconsulta.estado`. Reutiliza `puedeTransicionar` (lógica pura, ya
 * probada con Vitest) dentro de una transacción de Firestore. */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import { puedeTransicionar, type EventoHistorialEstado, type Interconsulta, type InterconsultaEstado } from "./moConecta";

export async function transicionarEstadoInterconsulta(
  uid: string,
  interconsultaId: string,
  siguiente: InterconsultaEstado,
  nota: string | undefined
): Promise<{ estadoAnterior: InterconsultaEstado; estadoNuevo: InterconsultaEstado }> {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);

  return dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const interconsulta = snap.data() as Interconsulta;
    if (!interconsulta.participantesAutorizados.includes(uid)) {
      throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
    }

    if (siguiente === "counter_referral_sent") {
      throw new ConectaError(400, "Usa el endpoint de contrarreferencia para registrar esta transición.");
    }
    if ((siguiente === "accepted" || siguiente === "rejected") && interconsulta.destinatarioUid !== uid) {
      throw new ConectaError(403, "Solo el odontólogo destinatario puede aceptar o rechazar el caso.");
    }

    const tieneJustificacion = Boolean(nota && nota.trim().length > 0);
    if (!puedeTransicionar(interconsulta.estado, siguiente, tieneJustificacion)) {
      throw new ConectaError(409, "Esa transición de estado no es válida en este momento.");
    }

    const ahora = nowISO();
    const evento: EventoHistorialEstado = sinIndefinidos({ estado: siguiente, fecha: ahora, uid, nota });
    const actualizacion: Partial<Interconsulta> = {
      estado: siguiente,
      historialEstados: [...interconsulta.historialEstados, evento],
      actualizadoEl: ahora,
    };
    if (siguiente === "accepted") actualizacion.aceptadoEl = ahora;
    if (siguiente === "closed") actualizacion.concluidoEl = ahora;

    tx.set(ref, sinIndefinidos(actualizacion), { merge: true });

    return { estadoAnterior: interconsulta.estado, estadoNuevo: siguiente };
  });
}
