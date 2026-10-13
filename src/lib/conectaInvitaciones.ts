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
  /** Opcional — sin él, la invitación solo puede enviarse por WhatsApp
   * (nunca se guarda ese número aquí, solo se usa del lado del cliente
   * para armar el mensaje) y todo reclamo exige aprobación manual. */
  destinatarioCorreo?: string;
  grupoId?: string;
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
    destinatarioCorreoNormalizado: input.destinatarioCorreo ? normalizarCorreo(input.destinatarioCorreo) : undefined,
    interconsultaId: input.interconsultaId,
    grupoId: input.grupoId,
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

export type ResumenInvitacionDeCaso = {
  destinatarioNombre: string | null;
  destinatarioCorreo: string | null;
  canal: string;
  estado: "activa" | "reclamada" | "vencida" | "cancelada";
  creadoEl: string;
  venceEl: string;
};

/** A quién se invitó, por caso — SOLO las invitaciones que creó este mismo
 * usuario (nunca las de otro remitente) para que su pestaña de MO Conecta del
 * paciente diga con qué colega se compartió el expediente aunque ese colega
 * todavía no haya aceptado (no tiene destinatarioUid). Devuelve la invitación
 * más reciente de cada caso. */
export async function resumenInvitacionesDeCasos(
  remitenteUid: string,
  interconsultaIds: string[]
): Promise<Record<string, ResumenInvitacionDeCaso>> {
  const ids = new Set(interconsultaIds.slice(0, 50));
  if (ids.size === 0) return {};
  const snap = await dbAdmin.collection("invitacionesConecta").where("remitenteUid", "==", remitenteUid).get();
  const resultado: Record<string, ResumenInvitacionDeCaso> = {};
  snap.docs
    .map((d) => d.data() as InvitacionConecta)
    .filter((i) => ids.has(i.interconsultaId))
    .sort((a, b) => a.creadoEl.localeCompare(b.creadoEl))
    .forEach((i) => {
      resultado[i.interconsultaId] = {
        destinatarioNombre: i.destinatarioNombre ?? null,
        destinatarioCorreo: i.destinatarioCorreoNormalizado ?? null,
        canal: i.canal,
        estado: i.estado === "activa" && invitacionVencida(i) ? "vencida" : i.estado,
        creadoEl: i.creadoEl,
        venceEl: i.venceEl,
      };
    });
  return resultado;
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

export type ReclamarInvitacionResultado = (
  | { tipo: "acceso_otorgado"; interconsultaId: string }
  | { tipo: "solicitud_creada"; interconsultaId: string; solicitudId: string }
) & {
  /** Otros casos enviados juntos que se procesaron con este mismo enlace. */
  adicionales?: number;
};

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
  const primera = invitacionQuery.docs[0].data() as InvitacionConecta;

  // Hermanas: las invitaciones que el MISMO remitente creó junto con esta (mismo
  // grupo) — aceptar un enlace abre todos esos casos.
  let hermanasRefs: FirebaseFirestore.DocumentReference[] = [];
  if (primera.grupoId) {
    const grupo = await dbAdmin.collection("invitacionesConecta").where("grupoId", "==", primera.grupoId).get();
    hermanasRefs = grupo.docs
      .filter((d) => d.id !== invitacionRef.id && (d.data() as InvitacionConecta).remitenteUid === primera.remitenteUid)
      .map((d) => d.ref);
  }

  const resultado = await dbAdmin.runTransaction(async (tx) => {
    // Todas las lecturas primero (Firestore no permite leer después de escribir).
    const lecturas = await Promise.all(
      [invitacionRef, ...hermanasRefs].map(async (invRef) => {
        const invitacion = (await tx.get(invRef)).data() as InvitacionConecta;
        const interconsultaRef = dbAdmin.collection("interconsultas").doc(invitacion.interconsultaId);
        const interconsultaSnap = await tx.get(interconsultaRef);
        // Un solo campo en el where (sin índice compuesto): en la práctica son 0 o 1 documentos por uid.
        const solicitudes = await tx.get(interconsultaRef.collection("solicitudesAcceso").where("solicitanteUid", "==", uid));
        return {
          invRef,
          invitacion,
          interconsultaRef,
          interconsulta: interconsultaSnap.exists ? (interconsultaSnap.data() as Interconsulta) : null,
          solicitudPendiente: solicitudes.docs.map((d) => d.data() as SolicitudAcceso).find((s) => s.estado === "pendiente"),
        };
      })
    );

    const [principal, ...hermanas] = lecturas;
    if (principal.invitacion.estado !== "activa") throw new ConectaError(410, "Esta invitación ya no está disponible.");
    if (invitacionVencida(principal.invitacion)) throw new ConectaError(410, "Esta invitación venció.");
    if (principal.invitacion.usosActuales >= principal.invitacion.maxUsos) throw new ConectaError(410, "Esta invitación ya fue utilizada.");
    if (!principal.interconsulta) throw new ConectaError(404, "El caso de esta invitación ya no existe.");

    const ahora = nowISO();
    const procesar = (l: (typeof lecturas)[number]) => {
      const interconsulta = l.interconsulta as Interconsulta;
      const identidadCoincide = coincideIdentidad(l.invitacion.destinatarioCorreoNormalizado, correoVerificado, emailVerificado);

      if (identidadCoincide) {
        const participantes = interconsulta.participantesAutorizados.includes(uid)
          ? interconsulta.participantesAutorizados
          : [...interconsulta.participantesAutorizados, uid];
        tx.set(
          l.interconsultaRef,
          sinIndefinidos({
            participantesAutorizados: participantes,
            destinatarioUid: interconsulta.destinatarioUid ?? uid,
            fuenteInvitacion: "invitacion_enlace",
            invitacionId: l.invitacion.id,
            colegaSeUnioEl: ahora,
            actualizadoEl: ahora,
          }),
          { merge: true }
        );
        tx.set(l.invRef, { estado: "reclamada", usosActuales: FieldValue.increment(1) }, { merge: true });
        return { tipo: "acceso_otorgado" as const, interconsultaId: l.invitacion.interconsultaId };
      }

      // A diferencia del acceso otorgado, un correo que NO coincide nunca marca la
      // invitación como "reclamada" ni cuenta como uso — no se otorgó ningún acceso
      // real, así que quemar el único uso dejaría sin forma de reintentar a quien se
      // equivocó de cuenta. La invitación sigue "activa" hasta que alguien la reclame
      // de verdad o venza por fecha.
      if (l.solicitudPendiente) {
        return { tipo: "solicitud_creada" as const, interconsultaId: l.invitacion.interconsultaId, solicitudId: l.solicitudPendiente.id };
      }
      const solicitudRef = l.interconsultaRef.collection("solicitudesAcceso").doc();
      const solicitud: SolicitudAcceso = {
        id: solicitudRef.id,
        solicitanteUid: uid,
        identidadVerificadaUsada: correoVerificado ? normalizarCorreo(correoVerificado) : "",
        estado: "pendiente",
        creadoEl: ahora,
        venceEl: fechaVencimientoSolicitudAcceso(),
      };
      tx.set(solicitudRef, solicitud);
      return { tipo: "solicitud_creada" as const, interconsultaId: l.invitacion.interconsultaId, solicitudId: solicitudRef.id };
    };

    const resultadoPrincipal = procesar(principal);
    // Las hermanas que ya no estén disponibles simplemente se omiten.
    const utiles = hermanas.filter(
      (h) =>
        h.interconsulta &&
        h.invitacion.estado === "activa" &&
        !invitacionVencida(h.invitacion) &&
        h.invitacion.usosActuales < h.invitacion.maxUsos
    );
    utiles.forEach(procesar);
    return { ...resultadoPrincipal, adicionales: utiles.length } as ReclamarInvitacionResultado;
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
