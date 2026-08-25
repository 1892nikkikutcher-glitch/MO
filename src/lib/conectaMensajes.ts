/** Mensajes dentro de una interconsulta — autor y fecha siempre los pone el
 * servidor, nunca el cliente (§8.B del plan: "autor/fecha falsificados en un
 * mensaje → el servidor los sobrescribe con los reales"). */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO } from "./conectaServer";
import type { Interconsulta } from "./moConecta";

export type MensajeInterconsulta = {
  id: string;
  autor: string;
  contenido: string;
  fecha: string;
};

export async function crearMensaje(uid: string, interconsultaId: string, contenido: string): Promise<MensajeInterconsulta> {
  const interconsultaRef = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const snap = await interconsultaRef.get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
  const interconsulta = snap.data() as Interconsulta;
  if (!interconsulta.participantesAutorizados.includes(uid)) {
    throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
  }

  const ref = interconsultaRef.collection("mensajes").doc();
  const mensaje: MensajeInterconsulta = { id: ref.id, autor: uid, contenido, fecha: nowISO() };
  await ref.set(mensaje);
  return mensaje;
}
