/** Episodios reales bajo la ubicación canónica única
 * (`expedientesClinicos/{expedienteId}/episodios/{episodioId}`,
 * arquitectura MO Conecta v3, §9/§18 Fase 4) — server-only.
 *
 * DECISIÓN DE DISEÑO IMPORTANTE: un episodio es un registro informativo
 * (qué tratamiento puntual, quién lo atiende nominalmente) — NUNCA una vía
 * de acceso nueva. Aceptar una interconsulta se respalda hoy con
 * `ConsentimientoInterconsulta` (moConecta.ts), que por su propio diseño
 * "solo respalda el resumen curado de una interconsulta" (ver
 * consentimientoExpediente.ts) — nunca el expediente completo. Si crear un
 * episodio también creara una `Participacion` de acceso completo, se
 * estaría otorgando más acceso del que ese consentimiento realmente
 * autorizó. Por eso `crearEpisodioReal` NUNCA toca `participaciones`, y
 * `asignarResponsableEpisodio` exige que el colaborador YA tenga una
 * participación general vigente (otorgada por la cadena real de
 * folio→solicitud→consentimiento, conectaConsentimientoExpediente.ts) —
 * nunca la crea.
 *
 * FASE 4 ("solo código y pruebas"): escrita, sin invocarse todavía desde
 * conectaEstado.ts/conectaContrarreferencia.ts (que SÍ están desplegados y
 * en uso real) — conectarlas cambiaría comportamiento en producción sin
 * autorización explícita para esa activación. Ningún episodio real se
 * crea en producción todavía. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, sinIndefinidos } from "./conectaServer";
import type { Episodio } from "./episodios";
import { idParticipacion, participacionVigente, type Participacion } from "./participaciones";
import { registrarEventoExpediente } from "./conectaEventosExpediente";

export type CrearEpisodioInput = {
  expedienteId: string;
  interconsultaId: string;
  especialidad: string;
  motivo: string;
  responsableUid: string;
  clinicaOrigenId: string;
};

function refEpisodios(expedienteId: string) {
  return dbAdmin.collection("expedientesClinicos").doc(expedienteId).collection("episodios");
}

export async function crearEpisodioReal(input: CrearEpisodioInput): Promise<Episodio> {
  const ref = refEpisodios(input.expedienteId).doc();
  const episodio: Episodio = {
    id: ref.id,
    expedienteId: input.expedienteId,
    interconsultaId: input.interconsultaId,
    titulo: input.especialidad,
    especialidad: input.especialidad,
    motivoOrigen: input.motivo,
    responsableUid: input.responsableUid,
    clinicaOrigenId: input.clinicaOrigenId,
    estado: "activo",
    creadoEl: Timestamp.now(),
  };
  await ref.set(episodio);
  return episodio;
}

/** Cierra el episodio y, si sigue activa, concluye también la
 * participación "responsable_episodio" ligada a él — un episodio cerrado
 * no debería dejar esa participación colgada activa indefinidamente.
 * Nunca toca la participación GENERAL del colaborador, que puede seguir
 * vigente por otros episodios o por sí misma. */
export async function concluirEpisodio(expedienteId: string, episodioId: string, notaConclusionId?: string): Promise<void> {
  const episodioRef = refEpisodios(expedienteId).doc(episodioId);
  const episodioSnap = await episodioRef.get();
  if (!episodioSnap.exists) throw new ConectaError(404, "No existe ese episodio.");
  const episodio = episodioSnap.data() as Episodio;

  const ahora = Timestamp.now();
  await episodioRef.set(sinIndefinidos({ estado: "concluido", concluidoEl: ahora, notaConclusionId }), { merge: true });

  const participacionRef = dbAdmin
    .collection("participaciones")
    .doc(idParticipacion(expedienteId, episodio.responsableUid, episodioId));
  const participacionSnap = await participacionRef.get();
  if (participacionSnap.exists && (participacionSnap.data() as Participacion).estado === "activa") {
    await participacionRef.set({ estado: "concluida", hasta: ahora }, { merge: true });
  }
}

/** Un colaborador abandona su participación (general o de un episodio en
 * particular) sin transferirla a nadie — ej. ya no puede continuar el
 * caso. Reusa el evento `participacion_revocada` (v3 §16 no define un
 * tipo aparte para "abandono voluntario"); `detalle` distingue el caso. */
export async function abandonarParticipacion(
  expedienteId: string,
  profesionalUid: string,
  episodioId: string | undefined,
  motivo?: string
): Promise<void> {
  const ref = dbAdmin.collection("participaciones").doc(idParticipacion(expedienteId, profesionalUid, episodioId));
  const snap = await ref.get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa participación.");
  if ((snap.data() as Participacion).estado !== "activa") return;

  await ref.set({ estado: "concluida", hasta: Timestamp.now() }, { merge: true });
  await registrarEventoExpediente(expedienteId, {
    tipo: "participacion_revocada",
    uid: profesionalUid,
    participacionId: ref.id,
    detalle: motivo ?? "abandono voluntario",
  });
}

/** Anota que `colaboradorUid` es responsable de ESTE episodio en
 * particular — nunca le otorga acceso nuevo. Exige que ya tenga una
 * participación general vigente sobre el expediente; si no la tiene, esta
 * función se niega en vez de crearla (esa creación solo puede venir de la
 * cadena real de acceso, Fase 3). */
export async function asignarResponsableEpisodio(
  expedienteId: string,
  episodioId: string,
  colaboradorUid: string,
  colaboradorClinicaId: string,
  otorgadoPorUid: string
): Promise<Participacion> {
  const participacionGeneralSnap = await dbAdmin.collection("participaciones").doc(idParticipacion(expedienteId, colaboradorUid)).get();
  if (!participacionGeneralSnap.exists) {
    throw new ConectaError(403, "Ese profesional no tiene ninguna participación sobre este expediente todavía.");
  }
  if (!participacionVigente(participacionGeneralSnap.data() as Participacion, Timestamp.now())) {
    throw new ConectaError(403, "La participación de ese profesional sobre este expediente no está vigente.");
  }

  const participacionEpisodioId = idParticipacion(expedienteId, colaboradorUid, episodioId);
  const participacionEpisodio: Participacion = {
    id: participacionEpisodioId,
    expedienteId,
    profesionalUid: colaboradorUid,
    clinicaId: colaboradorClinicaId,
    rol: "responsable_episodio",
    nivelAcceso: "lectura_escritura",
    alcance: "completo",
    episodioId,
    desde: Timestamp.now(),
    estado: "activa",
    createdBy: otorgadoPorUid,
  };
  await dbAdmin.collection("participaciones").doc(participacionEpisodioId).set(participacionEpisodio);

  await registrarEventoExpediente(expedienteId, {
    tipo: "participacion_creada",
    uid: otorgadoPorUid,
    participacionId: participacionEpisodioId,
    seccion: episodioId,
  });

  return participacionEpisodio;
}
