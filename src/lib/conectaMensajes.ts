/** Mensajes dentro de una interconsulta — autor y fecha siempre los pone el
 * servidor, nunca el cliente (§8.B del plan: "autor/fecha falsificados en un
 * mensaje → el servidor los sobrescribe con los reales"). */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import type { Interconsulta, PerfilProfesionalPublico } from "./moConecta";

export type MensajeInterconsulta = {
  id: string;
  autor: string;
  /** Snapshot del nombre público del autor al momento de enviar — no una
   * referencia viva al perfil (mismo criterio que `resumenPaciente` en
   * moConecta.ts). Ausente en mensajes creados antes de este campo, o si
   * el autor no tiene perfil profesional público. */
  autorNombre?: string;
  /** Especialidad verificada si existe; si no, la primera área de práctica
   * autodeclarada. NUNCA la cédula profesional — ese campo vive en
   * `perfilesProfesionalesPrivados`, cuya regla de Firestore solo deja
   * leerlo al dueño del perfil; copiarlo aquí lo expondría a cualquier
   * participante de la interconsulta (incluido un especialista externo
   * invitado), rompiendo esa protección. */
  autorEspecialidad?: string;
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

  const perfilSnap = await dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid).get();
  const perfil = perfilSnap.exists ? (perfilSnap.data() as PerfilProfesionalPublico) : null;

  const ref = interconsultaRef.collection("mensajes").doc();
  const mensaje: MensajeInterconsulta = sinIndefinidos({
    id: ref.id,
    autor: uid,
    autorNombre: perfil?.nombreCompleto,
    autorEspecialidad: perfil?.especialidadesVerificadas[0] ?? perfil?.areasPractica[0],
    contenido,
    fecha: nowISO(),
  });
  await ref.set(mensaje);
  return mensaje;
}
