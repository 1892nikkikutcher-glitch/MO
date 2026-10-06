/** Calendarios compartidos entre colegas de MO Conecta — el dueño comparte un
 * médico o unidad de su Agenda y el colega ve SOLO horarios ocupados y libres,
 * en vivo (se calcula en cada consulta con las citas reales; nada se copia).
 * Todo pasa por el servidor: el colega nunca lee las citas de la clínica. */

import { dbAdmin } from "./firebaseAdmin";
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

/** Lo que compartí (o comparte mi clínica) y lo que comparten conmigo. */
export async function listarCalendarios(uid: string): Promise<{ mios: CalendarioCompartidoDoc[]; conmigo: CalendarioCompartidoDoc[] }> {
  const [porRemitente, porClinica, paraMi] = await Promise.all([
    dbAdmin.collection(COL).where("remitenteUid", "==", uid).get(),
    dbAdmin.collection(COL).where("clinicaId", "==", uid).get(),
    dbAdmin.collection(COL).where("destinatarioUid", "==", uid).get(),
  ]);
  const activos = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
    docs.map((d) => d.data() as CalendarioCompartidoDoc).filter((c) => c.estado === "activo");
  const mios = new Map<string, CalendarioCompartidoDoc>();
  [...activos(porRemitente.docs), ...activos(porClinica.docs)].forEach((c) => mios.set(c.id, c));
  return {
    mios: [...mios.values()].sort((a, b) => b.creadoEl.localeCompare(a.creadoEl)),
    conmigo: activos(paraMi.docs).sort((a, b) => b.creadoEl.localeCompare(a.creadoEl)),
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
