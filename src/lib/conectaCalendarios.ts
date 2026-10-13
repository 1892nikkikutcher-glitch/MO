/** Calendarios compartidos entre colegas de MO Conecta — el dueño comparte un
 * médico o unidad de su Agenda y el colega ve SOLO horarios ocupados y libres,
 * en vivo (se calcula en cada consulta con las citas reales; nada se copia).
 * Todo pasa por el servidor: el colega nunca lee las citas de la clínica. */

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { hashToken } from "./tokenHashServer";
import { fechaVencimientoInvitacion, generarTokenInvitacion, invitacionVencida, normalizarCorreo } from "./invitacionesConecta";
import { ConectaError, aplicarRateLimit, esAdminDeClinica, esMiembroActivoDeClinica, nowISO, sinIndefinidos } from "./conectaServer";
import {
  bloquesOcupados,
  rangoValido,
  type CalendarioCompartidoDoc,
  type OcupacionDeCalendario,
} from "./calendarioOcupacion";

const COL = "calendariosCompartidos";

async function perteneceALaClinica(uid: string, clinicaId: string): Promise<boolean> {
  return uid === clinicaId || (await esMiembroActivoDeClinica(uid, clinicaId));
}

export async function compartirCalendario(
  uid: string,
  input: { clinicaId: string; recursoId: string; destinatarioUid: string }
): Promise<CalendarioCompartidoDoc> {
  if (!(await aplicarRateLimit(`calendario_compartir_${uid}`, 30, 60))) {
    throw new ConectaError(429, "Demasiados intentos — intenta de nuevo más tarde.");
  }
  if (!(await perteneceALaClinica(uid, input.clinicaId))) {
    throw new ConectaError(403, "No perteneces a esa clínica.");
  }
  if (input.destinatarioUid === uid) throw new ConectaError(400, "No puedes compartir un calendario contigo mismo.");

  const recursoSnap = await dbAdmin.doc(`users/${input.clinicaId}/recursos/${input.recursoId}`).get();
  if (!recursoSnap.exists) throw new ConectaError(404, "No existe ese médico o unidad en tu Agenda.");
  const recursoNombre = (recursoSnap.data() as { nombre?: string }).nombre ?? "";

  const [perfilDestino, perfilRemitente] = await Promise.all([
    dbAdmin.collection("perfilesProfesionalesPublicos").doc(input.destinatarioUid).get(),
    dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid).get(),
  ]);
  if (!perfilDestino.exists) throw new ConectaError(404, "Ese colega todavía no tiene perfil en MO Conecta.");

  // Idempotente: si ya está compartido con ese colega, se devuelve el mismo.
  const existentes = await dbAdmin
    .collection(COL)
    .where("clinicaId", "==", input.clinicaId)
    .where("destinatarioUid", "==", input.destinatarioUid)
    .get();
  const activo = existentes.docs.map((d) => d.data() as CalendarioCompartidoDoc).find((c) => c.recursoId === input.recursoId && c.estado === "activo");
  if (activo) return activo;

  const ref = dbAdmin.collection(COL).doc();
  const doc: CalendarioCompartidoDoc = sinIndefinidos({
    id: ref.id,
    clinicaId: input.clinicaId,
    recursoId: input.recursoId,
    recursoNombre,
    remitenteUid: uid,
    remitenteNombre: ((perfilRemitente.data() as { nombreCompleto?: string } | undefined)?.nombreCompleto) || "Un colega",
    destinatarioUid: input.destinatarioUid,
    destinatarioNombre: (perfilDestino.data() as { nombreCompleto?: string }).nombreCompleto ?? "",
    estado: "activo" as const,
    creadoEl: nowISO(),
  });
  await ref.set(doc);
  return doc;
}

const sinSecretos = (c: CalendarioCompartidoDoc): CalendarioCompartidoDoc => {
  const { tokenHash: _t, destinatarioCorreoNormalizado: _c, ...resto } = c;
  return resto;
};

/** Comparte un calendario con alguien que todavía no está en MO: crea una
 * invitación pendiente de UN solo uso (vence en 7 días) y devuelve el token
 * crudo UNA vez — solo se guarda su hash. Invitar otra vez al mismo colega
 * cancela la invitación pendiente anterior. */
export async function invitarACalendario(
  uid: string,
  input: { clinicaId: string; recursoId: string; destinatarioNombre?: string; destinatarioCorreo?: string }
): Promise<{ calendario: CalendarioCompartidoDoc; tokenCrudo: string }> {
  if (!(await aplicarRateLimit(`calendario_invitar_${uid}`, 20, 60))) {
    throw new ConectaError(429, "Demasiadas invitaciones — intenta de nuevo más tarde.");
  }
  if (!(await perteneceALaClinica(uid, input.clinicaId))) throw new ConectaError(403, "No perteneces a esa clínica.");

  const recursoSnap = await dbAdmin.doc(`users/${input.clinicaId}/recursos/${input.recursoId}`).get();
  if (!recursoSnap.exists) throw new ConectaError(404, "No existe ese médico o unidad en tu Agenda.");
  const perfilRemitente = await dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid).get();

  const correo = input.destinatarioCorreo?.trim() ? normalizarCorreo(input.destinatarioCorreo) : undefined;
  const nombre = (input.destinatarioNombre ?? "").trim();

  // Invitar de nuevo al mismo colega reemplaza la invitación pendiente anterior.
  const previas = await dbAdmin.collection(COL).where("clinicaId", "==", input.clinicaId).where("estado", "==", "pendiente").get();
  const mismo = (c: CalendarioCompartidoDoc) =>
    c.recursoId === input.recursoId &&
    ((correo && c.destinatarioCorreoNormalizado === correo) ||
      (!correo && !c.destinatarioCorreoNormalizado && nombre && c.destinatarioNombre.toLowerCase() === nombre.toLowerCase()));
  await Promise.all(
    previas.docs.filter((d) => mismo(d.data() as CalendarioCompartidoDoc)).map((d) => d.ref.set({ estado: "revocado", revocadoEl: nowISO() }, { merge: true }))
  );

  const tokenCrudo = generarTokenInvitacion();
  const ref = dbAdmin.collection(COL).doc();
  const doc: CalendarioCompartidoDoc = sinIndefinidos({
    id: ref.id,
    clinicaId: input.clinicaId,
    recursoId: input.recursoId,
    recursoNombre: (recursoSnap.data() as { nombre?: string }).nombre ?? "",
    remitenteUid: uid,
    remitenteNombre: ((perfilRemitente.data() as { nombreCompleto?: string } | undefined)?.nombreCompleto) || "Un colega",
    destinatarioUid: "",
    destinatarioNombre: nombre,
    estado: "pendiente" as const,
    creadoEl: nowISO(),
    tokenHash: hashToken(tokenCrudo),
    venceEl: fechaVencimientoInvitacion(),
    destinatarioCorreoNormalizado: correo,
  });
  await ref.set(doc);
  return { calendario: sinSecretos(doc), tokenCrudo };
}

/** Vista pública (sin sesión) de la invitación: solo datos genéricos. */
export async function obtenerInvitacionCalendarioPublica(tokenCrudo: string) {
  const snap = await dbAdmin.collection(COL).where("tokenHash", "==", hashToken(tokenCrudo)).limit(1).get();
  if (snap.empty) throw new ConectaError(404, "Invitación no encontrada.");
  const c = snap.docs[0].data() as CalendarioCompartidoDoc;
  const estado =
    c.estado === "pendiente" ? (c.venceEl && invitacionVencida({ venceEl: c.venceEl }) ? "vencida" : "disponible") : c.estado === "activo" ? "usada" : "cancelada";
  return { remitenteNombre: c.remitenteNombre, recursoNombre: c.recursoNombre, destinatarioNombre: c.destinatarioNombre || null, estado };
}

/** El colega acepta con su sesión. Si la invitación llevaba correo, el correo
 * VERIFICADO de su cuenta debe coincidir; sin correo, vale quien tenga el enlace
 * (un solo uso, vence en 7 días) — es solo ocupado/libre y el dueño puede
 * quitarlo cuando quiera. */
export async function reclamarInvitacionCalendario(
  uid: string,
  correoVerificado: string | undefined,
  emailVerificado: boolean,
  tokenCrudo: string
): Promise<{ calendarioId: string }> {
  if (!(await aplicarRateLimit(`calendario_reclamar_${uid}`, 30, 60))) {
    throw new ConectaError(429, "Demasiados intentos — intenta de nuevo más tarde.");
  }
  if (!emailVerificado) throw new ConectaError(403, "Verifica tu correo electrónico antes de aceptar esta invitación.");

  const q = await dbAdmin.collection(COL).where("tokenHash", "==", hashToken(tokenCrudo)).limit(1).get();
  if (q.empty) throw new ConectaError(404, "Invitación no encontrada.");
  const ref = q.docs[0].ref;
  const perfil = await dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid).get();

  await dbAdmin.runTransaction(async (tx) => {
    const c = (await tx.get(ref)).data() as CalendarioCompartidoDoc;
    if (c.estado !== "pendiente") throw new ConectaError(410, "Esta invitación ya no está disponible.");
    if (c.venceEl && invitacionVencida({ venceEl: c.venceEl })) throw new ConectaError(410, "Esta invitación venció.");
    if (uid === c.remitenteUid || uid === c.clinicaId) throw new ConectaError(400, "No puedes aceptar tu propio calendario.");
    if (c.destinatarioCorreoNormalizado && (!correoVerificado || normalizarCorreo(correoVerificado) !== c.destinatarioCorreoNormalizado)) {
      throw new ConectaError(403, "Esta invitación es para otro correo. Inicia sesión con el correo al que se envió.");
    }
    const nombre = ((perfil.data() as { nombreCompleto?: string } | undefined)?.nombreCompleto) || c.destinatarioNombre || correoVerificado || "Colega";
    tx.set(
      ref,
      {
        estado: "activo",
        destinatarioUid: uid,
        destinatarioNombre: nombre,
        aceptadoEl: nowISO(),
        tokenHash: FieldValue.delete(),
        venceEl: FieldValue.delete(),
        destinatarioCorreoNormalizado: FieldValue.delete(),
      },
      { merge: true }
    );
  });
  return { calendarioId: ref.id };
}

/** Lo que compartí (o comparte mi clínica) y lo que comparten conmigo. */
export async function listarCalendarios(uid: string): Promise<{ mios: CalendarioCompartidoDoc[]; conmigo: CalendarioCompartidoDoc[] }> {
  const [porRemitente, porClinica, paraMi] = await Promise.all([
    dbAdmin.collection(COL).where("remitenteUid", "==", uid).get(),
    dbAdmin.collection(COL).where("clinicaId", "==", uid).get(),
    dbAdmin.collection(COL).where("destinatarioUid", "==", uid).get(),
  ]);
  const vigentes = (docs: FirebaseFirestore.QueryDocumentSnapshot[], incluirPendientes: boolean) =>
    docs
      .map((d) => d.data() as CalendarioCompartidoDoc)
      .filter((c) => c.estado === "activo" || (incluirPendientes && c.estado === "pendiente" && !(c.venceEl && invitacionVencida({ venceEl: c.venceEl }))));
  const mios = new Map<string, CalendarioCompartidoDoc>();
  [...vigentes(porRemitente.docs, true), ...vigentes(porClinica.docs, true)].forEach((c) => mios.set(c.id, sinSecretos(c)));
  return {
    mios: [...mios.values()].sort((a, b) => b.creadoEl.localeCompare(a.creadoEl)),
    conmigo: vigentes(paraMi.docs, false).map(sinSecretos).sort((a, b) => b.creadoEl.localeCompare(a.creadoEl)),
  };
}

export async function dejarDeCompartirCalendario(uid: string, id: string): Promise<void> {
  const ref = dbAdmin.collection(COL).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ConectaError(404, "No existe ese calendario compartido.");
  const c = snap.data() as CalendarioCompartidoDoc;
  const puede =
    uid === c.remitenteUid || uid === c.destinatarioUid || uid === c.clinicaId || (await esAdminDeClinica(uid, c.clinicaId));
  if (!puede) throw new ConectaError(403, "No puedes cambiar ese calendario compartido.");
  await ref.set({ estado: "revocado", revocadoEl: nowISO() }, { merge: true });
}

/** Horarios ocupados del calendario compartido, calculados AHORA con las citas
 * reales. Solo el colega con quien se compartió (o quien lo compartió, para
 * ver lo que verá el otro) y solo mientras siga activo. */
export async function ocupacionDeCalendario(uid: string, id: string, desde: string, hasta: string): Promise<OcupacionDeCalendario> {
  if (!rangoValido(desde, hasta)) throw new ConectaError(400, "Rango de fechas inválido (máximo 35 días).");
  const snap = await dbAdmin.collection(COL).doc(id).get();
  if (!snap.exists) throw new ConectaError(404, "No existe ese calendario compartido.");
  const c = snap.data() as CalendarioCompartidoDoc;
  if (c.estado !== "activo") throw new ConectaError(410, "Este calendario ya no está compartido.");
  if (uid !== c.destinatarioUid && uid !== c.remitenteUid) throw new ConectaError(403, "No tienes acceso a este calendario.");

  const [citasSnap, horarioSnap] = await Promise.all([
    dbAdmin.collection(`users/${c.clinicaId}/citas`).where("fecha", ">=", desde).where("fecha", "<=", hasta).get(),
    dbAdmin.doc(`users/${c.clinicaId}/config/horario`).get(),
  ]);
  const citas = citasSnap.docs.map((d) => d.data() as Parameters<typeof bloquesOcupados>[0][number]);
  const h = horarioSnap.exists ? (horarioSnap.data() as { apertura?: string; cierre?: string; comidaInicio?: string; comidaFin?: string }) : null;
  return {
    recursoNombre: c.recursoNombre,
    remitenteNombre: c.remitenteNombre,
    horario:
      h?.apertura && h?.cierre
        ? { apertura: h.apertura, cierre: h.cierre, comidaInicio: h.comidaInicio ?? "", comidaFin: h.comidaFin ?? "" }
        : null,
    bloques: bloquesOcupados(citas, c.recursoId, desde, hasta),
    desde,
    hasta,
    generadoEl: nowISO(),
  };
}
