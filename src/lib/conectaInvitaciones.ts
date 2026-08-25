/** Lógica de negocio de invitaciones de MO Conecta — crear, resolver
 * públicamente (sin datos clínicos) y reclamar. Nunca escrita/leída directo
 * por el cliente (§3/§4 del plan: `invitacionesConecta` es `if false` total). */

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, aplicarRateLimit, nowISO, sinIndefinidos } from "./conectaServer";
import { hashToken } from "./tokenHashServer";
import {
  coincideIdentidad,
  existeInvitacionActivaDuplicada,
  fechaVencimientoInvitacion,
  fechaVencimientoSolicitudAcceso,
  generarTokenInvitacion,
  invitacionVencida,
  normalizarCorreo,
  type CanalInvitacion,
  type InvitacionConecta,
  type SolicitudAcceso,
} from "./invitacionesConecta";
import type { Interconsulta } from "./moConecta";

export type CrearInvitacionInput = {
  interconsultaId: string;
  destinatarioNombre?: string;
  destinatarioCorreo: string;
  canal: CanalInvitacion;
};

async function obtenerInterconsultaComoParticipante(uid: string, interconsultaId: string): Promise<Interconsulta> {
  const snap = await dbAdmin.collection("interconsultas").doc(interconsultaId).get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
  const interconsulta = snap.data() as Interconsulta;
  if (!interconsulta.participantesAutorizados.includes(uid)) {
    throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
  }
  return interconsulta;
}

export async function crearInvitacion(
  remitenteUid: string,
  input: CrearInvitacionInput
): Promise<{ id: string; tokenCrudo: string; venceEl: string }> {
  const permitido = await aplicarRateLimit(`invitacion_crear_${remitenteUid}`, 20, 60);
  if (!permitido) throw new ConectaError(429, "Demasiadas invitaciones creadas — intenta de nuevo más tarde.");

  const interconsulta = await obtenerInterconsultaComoParticipante(remitenteUid, input.interconsultaId);

  const existentesSnap = await dbAdmin
    .collection("invitacionesConecta")
    .where("interconsultaId", "==", input.interconsultaId)
    .get();
  const existentes = existentesSnap.docs.map((d) => d.data() as InvitacionConecta);
  if (existeInvitacionActivaDuplicada(existentes, input.interconsultaId, input.destinatarioCorreo)) {
    throw new ConectaError(409, "Ya existe una invitación activa para este destinatario en este caso.");
  }

  const perfilSnap = await dbAdmin.collection("perfilesProfesionalesPublicos").doc(remitenteUid).get();
  const remitenteNombre = (perfilSnap.exists ? (perfilSnap.data()?.nombreCompleto as string) : "") || "Un colega";

  const tokenCrudo = generarTokenInvitacion();
  const ahora = new Date();
  const ref = dbAdmin.collection("invitacionesConecta").doc();
  const invitacion: InvitacionConecta = sinIndefinidos({
    id: ref.id,
    tokenHash: hashToken(tokenCrudo),
    remitenteUid,
    remitenteClinicaId: interconsulta.clinicaRemitenteId,
    remitenteNombre,
    destinatarioNombre: input.destinatarioNombre,
    destinatarioCorreoNormalizado: normalizarCorreo(input.destinatarioCorreo),
    interconsultaId: input.interconsultaId,
    canal: input.canal,
    creadoEl: ahora.toISOString(),
    venceEl: fechaVencimientoInvitacion(ahora),
    maxUsos: 1,
    usosActuales: 0,
    estado: "activa",
  });
  await ref.set(invitacion);

  return { id: ref.id, tokenCrudo, venceEl: invitacion.venceEl };
}

/** Vista pública (sin sesión) por token — SOLO datos genéricos, nunca
 * clínicos (§4/§5 del plan). */
export async function obtenerInvitacionPublica(tokenCrudo: string) {
  const tokenHash = hashToken(tokenCrudo);
  const snap = await dbAdmin.collection("invitacionesConecta").where("tokenHash", "==", tokenHash).limit(1).get();
  if (snap.empty) throw new ConectaError(404, "Invitación no encontrada.");
  const invitacion = snap.docs[0].data() as InvitacionConecta;

  const vencida = invitacion.estado === "activa" && invitacionVencida(invitacion);
  const estadoEfectivo = vencida ? "vencida" : invitacion.estado;

  return {
    remitenteNombre: invitacion.remitenteNombre,
    destinatarioNombre: invitacion.destinatarioNombre ?? null,
    canal: invitacion.canal,
    estado: estadoEfectivo,
  };
}

export type ReclamarInvitacionResultado =
  | { tipo: "acceso_otorgado"; interconsultaId: string }
  | { tipo: "solicitud_creada"; interconsultaId: string; solicitudId: string };

export async function reclamarInvitacion(
  uid: string,
  correoVerificado: string | undefined,
  emailVerificado: boolean,
  tokenCrudo: string
): Promise<ReclamarInvitacionResultado> {
  const permitido = await aplicarRateLimit(`invitacion_reclamar_${uid}`, 30, 60);
  if (!permitido) throw new ConectaError(429, "Demasiados intentos — intenta de nuevo más tarde.");

  if (!emailVerificado) {
    throw new ConectaError(403, "Verifica tu correo electrónico antes de reclamar esta invitación.");
  }

  const tokenHash = hashToken(tokenCrudo);
  const invitacionQuery = await dbAdmin.collection("invitacionesConecta").where("tokenHash", "==", tokenHash).limit(1).get();
  if (invitacionQuery.empty) throw new ConectaError(404, "Invitación no encontrada.");
  const invitacionRef = invitacionQuery.docs[0].ref;

  const resultado = await dbAdmin.runTransaction(async (tx) => {
    const invitacionSnap = await tx.get(invitacionRef);
    const invitacion = invitacionSnap.data() as InvitacionConecta;

    if (invitacion.estado !== "activa") throw new ConectaError(410, "Esta invitación ya no está disponible.");
    if (invitacionVencida(invitacion)) throw new ConectaError(410, "Esta invitación venció.");
    if (invitacion.usosActuales >= invitacion.maxUsos) throw new ConectaError(410, "Esta invitación ya fue utilizada.");

    const interconsultaRef = dbAdmin.collection("interconsultas").doc(invitacion.interconsultaId);
    const interconsultaSnap = await tx.get(interconsultaRef);
    if (!interconsultaSnap.exists) throw new ConectaError(404, "El caso de esta invitación ya no existe.");
    const interconsulta = interconsultaSnap.data() as Interconsulta;

    const ahora = nowISO();
    const identidadCoincide = coincideIdentidad(invitacion.destinatarioCorreoNormalizado, correoVerificado, emailVerificado);

    if (identidadCoincide) {
      const participantes = interconsulta.participantesAutorizados.includes(uid)
        ? interconsulta.participantesAutorizados
        : [...interconsulta.participantesAutorizados, uid];
      tx.set(
        interconsultaRef,
        sinIndefinidos({
          participantesAutorizados: participantes,
          destinatarioUid: interconsulta.destinatarioUid ?? uid,
          fuenteInvitacion: "invitacion_enlace",
          invitacionId: invitacion.id,
          actualizadoEl: ahora,
        }),
        { merge: true }
      );
      tx.set(invitacionRef, { estado: "reclamada", usosActuales: FieldValue.increment(1) }, { merge: true });
      return { tipo: "acceso_otorgado" as const, interconsultaId: invitacion.interconsultaId };
    }

    const solicitudRef = interconsultaRef.collection("solicitudesAcceso").doc();
    const solicitud: SolicitudAcceso = {
      id: solicitudRef.id,
      solicitanteUid: uid,
      identidadVerificadaUsada: correoVerificado ? normalizarCorreo(correoVerificado) : "",
      estado: "pendiente",
      creadoEl: ahora,
      venceEl: fechaVencimientoSolicitudAcceso(),
    };
    tx.set(solicitudRef, solicitud);
    tx.set(invitacionRef, { estado: "reclamada", usosActuales: FieldValue.increment(1) }, { merge: true });
    return { tipo: "solicitud_creada" as const, interconsultaId: invitacion.interconsultaId, solicitudId: solicitudRef.id };
  });

  return resultado;
}

export async function resolverSolicitudAcceso(
  resolutorUid: string,
  interconsultaId: string,
  solicitudId: string,
  accion: "aprobar" | "rechazar"
): Promise<void> {
  const interconsultaRef = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const interconsultaSnap = await interconsultaRef.get();
  if (!interconsultaSnap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
  const interconsulta = interconsultaSnap.data() as Interconsulta;
  if (!interconsulta.participantesAutorizados.includes(resolutorUid)) {
    throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
  }

  const solicitudRef = interconsultaRef.collection("solicitudesAcceso").doc(solicitudId);
  const solicitudSnap = await solicitudRef.get();
  if (!solicitudSnap.exists) throw new ConectaError(404, "No existe esa solicitud de acceso.");
  const solicitud = solicitudSnap.data() as SolicitudAcceso;
  if (solicitud.estado !== "pendiente") throw new ConectaError(409, "Esta solicitud ya fue resuelta.");

  const ahora = nowISO();
  const batch = dbAdmin.batch();
  batch.set(
    solicitudRef,
    { estado: accion === "aprobar" ? "aprobada" : "rechazada", resueltoEl: ahora, resueltoPorUid: resolutorUid },
    { merge: true }
  );
  if (accion === "aprobar" && !interconsulta.participantesAutorizados.includes(solicitud.solicitanteUid)) {
    batch.set(
      interconsultaRef,
      {
        participantesAutorizados: [...interconsulta.participantesAutorizados, solicitud.solicitanteUid],
        actualizadoEl: ahora,
      },
      { merge: true }
    );
  }
  await batch.commit();
}
