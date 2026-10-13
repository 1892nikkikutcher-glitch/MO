/** Compartir el expediente de un caso de MO Conecta de forma "viva": mientras esté activado,
 * el colega ve el expediente al día sin que quien lo envió tenga que reenviar nada; al
 * desactivarlo (cuando termina el caso en conjunto) se borra lo compartido y las copias de
 * fotos, y el colega ya no ve nada del expediente.
 *
 * Todo lo hace el SERVIDOR leyendo Firestore con el Admin SDK (el cliente solo dice
 * activar/desactivar y qué secciones), igual que al crear el caso. Para mantenerlo al día no
 * hay procesos aparte: cuando alguien tiene abierto el caso, su pantalla pide la
 * actualización de vez en cuando y el servidor la limita (INTERVALO_MINIMO_MS). */

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin, bucketAdmin } from "./firebaseAdmin";
import { ConectaError, aplicarRateLimit, nowISO, sinIndefinidos } from "./conectaServer";
import {
  cargarPlantillaYRespuestas,
  construirExpedienteCompartido,
  separarArchivosDeExpediente,
} from "./conectaInterconsultas";
import { sonEquivalentes } from "./deepEqual";
import type { SeccionCompartible } from "./expedienteCompartido";
import type { ArchivoInterconsulta, ConsentimientoInterconsulta, Interconsulta } from "./moConecta";

/** Un caso en estos estados ya no se actualiza (queda como estaba). */
const ESTADOS_SIN_ACTUALIZAR = ["closed", "cancelled", "rejected"];
/** Cada cuánto, como mucho, el servidor vuelve a leer el expediente de un mismo caso. */
export const INTERVALO_MINIMO_MS = 20_000;

/** Borra del almacenamiento las copias de fotos que ya no se comparten (solo copias de este
 * caso — nunca una ruta de otro lado). La foto original del paciente no se toca. */
async function borrarCopias(interconsultaId: string, archivos: ArchivoInterconsulta[]) {
  await Promise.all(
    archivos
      .filter((a) => a.storagePath.startsWith(`interconsultas/${interconsultaId}/archivos/`))
      .map((a) =>
        bucketAdmin
          .file(a.storagePath)
          .delete({ ignoreNotFound: true })
          .catch((err: unknown) => console.error("No se pudo borrar una copia de foto compartida", err))
      )
  );
}

async function desactivar(interconsultaId: string, ic: Interconsulta, uid: string, motivo: "manual" | "consentimiento_revocado") {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const ahora = nowISO();
  const { otros, deExpediente } = separarArchivosDeExpediente(ic.archivos ?? [], ic.expedienteCompartido?.fotosArchivoIds ?? []);
  const secciones = ic.compartirExpediente?.secciones ?? ic.expedienteCompartido?.secciones ?? [];
  await ref.set(
    {
      expedienteCompartido: FieldValue.delete(),
      archivos: otros,
      compartirExpediente: { activo: false, secciones, actualizadoEl: ahora, desactivadoEl: ahora },
      actualizadoEl: ahora,
    },
    { merge: true }
  );
  await ref.collection("eventos").add(sinIndefinidos({ tipo: "expediente_compartir_desactivado", fecha: ahora, uid, motivo }));
  await borrarCopias(interconsultaId, deExpediente);
}

export type ConfigurarCompartirInput = {
  activo: boolean;
  secciones?: SeccionCompartible[];
  consentimientoPaciente?: boolean;
};

/** Solo quien envió el caso. Activar (o volver a activar, o cambiar qué se comparte) arma el
 * expediente en ese momento; desactivar borra lo compartido. */
export async function configurarCompartirExpediente(uid: string, interconsultaId: string, input: ConfigurarCompartirInput): Promise<void> {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const snap = await ref.get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
  const ic = snap.data() as Interconsulta;
  if (ic.odontologoRemitenteUid !== uid) {
    throw new ConectaError(403, "Solo quien envió el caso puede cambiar lo que se comparte del expediente.");
  }

  if (!input.activo) {
    await desactivar(interconsultaId, ic, uid, "manual");
    return;
  }

  if (ESTADOS_SIN_ACTUALIZAR.includes(ic.estado)) {
    throw new ConectaError(409, "Este caso ya concluyó: ya no se puede volver a compartir el expediente.");
  }
  if (!input.consentimientoPaciente) {
    throw new ConectaError(400, "Confirma que cuentas con el consentimiento del paciente para compartir esta información.");
  }
  const consentimiento = await dbAdmin.collection("consentimientosInterconsulta").doc(ic.consentimientoId).get();
  if (consentimiento.exists && (consentimiento.data() as ConsentimientoInterconsulta).estado !== "vigente") {
    throw new ConectaError(409, "El consentimiento de este caso ya no está vigente.");
  }
  const secciones = Array.from(new Set(input.secciones ?? ic.compartirExpediente?.secciones ?? ic.expedienteCompartido?.secciones ?? []));
  if (secciones.length === 0) throw new ConectaError(400, "Elige qué parte del expediente quieres compartir.");
  if (!(await aplicarRateLimit(`compartir_expediente_${uid}`, 40, 60))) {
    throw new ConectaError(429, "Demasiados cambios seguidos. Espera unos minutos.");
  }

  const ahora = nowISO();
  const { template, respuestas } = await cargarPlantillaYRespuestas(ic.clinicaRemitenteId, ic.pacienteId);
  const { expediente, archivos, archivosQuitados } = await construirExpedienteCompartido({
    clinicaId: ic.clinicaRemitenteId,
    pacienteId: ic.pacienteId,
    interconsultaId,
    remitenteUid: uid,
    secciones,
    template,
    respuestas,
    ahora,
    archivosActuales: ic.archivos ?? [],
    idsFotosPrevias: ic.expedienteCompartido?.fotosArchivoIds ?? [],
  });
  await ref.set(
    {
      expedienteCompartido: sinIndefinidos(expediente),
      archivos,
      compartirExpediente: { activo: true, secciones, actualizadoEl: ahora, desactivadoEl: FieldValue.delete() },
      actualizadoEl: ahora,
    },
    { merge: true }
  );
  // El consentimiento original es inmutable: lo que se autorizó al activar queda en el
  // registro de eventos del caso.
  await ref.collection("eventos").add({
    tipo: "expediente_compartir_activado",
    fecha: ahora,
    uid,
    secciones,
    consentimientoConfirmado: true,
  });
  await borrarCopias(interconsultaId, archivosQuitados);
}

/** Cualquier participante del caso (quien lo envió o el colega) puede pedir la actualización.
 * Solo hace algo si el compartir está activo, el caso sigue en curso y pasaron al menos
 * INTERVALO_MINIMO_MS desde la última revisión — así abrir el caso en varias pantallas no
 * multiplica las lecturas. Devuelve si realmente se revisó. */
export async function refrescarExpedienteCompartido(uid: string, interconsultaId: string): Promise<{ actualizado: boolean }> {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const ahora = nowISO();

  // "Reclamar" la revisión: quien la reclama es el único que arma el expediente (así dos
  // pantallas a la vez no copian las fotos dos veces).
  const reclamado = await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const ic = snap.data() as Interconsulta;
    if (!ic.participantesAutorizados.includes(uid)) throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
    const c = ic.compartirExpediente;
    if (!c?.activo || ESTADOS_SIN_ACTUALIZAR.includes(ic.estado)) return null;
    const hace = Date.now() - Date.parse(c.actualizadoEl);
    if (Number.isFinite(hace) && hace < INTERVALO_MINIMO_MS) return null;
    tx.set(ref, { compartirExpediente: { actualizadoEl: ahora } }, { merge: true });
    return ic;
  });
  if (!reclamado) return { actualizado: false };
  const ic = reclamado;

  // Si el consentimiento se revocó mientras tanto, se deja de compartir.
  const consentimiento = await dbAdmin.collection("consentimientosInterconsulta").doc(ic.consentimientoId).get();
  if (consentimiento.exists && (consentimiento.data() as ConsentimientoInterconsulta).estado !== "vigente") {
    await desactivar(interconsultaId, ic, ic.odontologoRemitenteUid, "consentimiento_revocado");
    return { actualizado: true };
  }

  const archivosAntes = ic.archivos ?? [];
  const { template, respuestas } = await cargarPlantillaYRespuestas(ic.clinicaRemitenteId, ic.pacienteId);
  const { expediente, archivos, archivosQuitados } = await construirExpedienteCompartido({
    clinicaId: ic.clinicaRemitenteId,
    pacienteId: ic.pacienteId,
    interconsultaId,
    remitenteUid: ic.odontologoRemitenteUid,
    secciones: ic.compartirExpediente!.secciones,
    template,
    respuestas,
    ahora,
    archivosActuales: archivosAntes,
    idsFotosPrevias: ic.expedienteCompartido?.fotosArchivoIds ?? [],
  });
  const nuevoLimpio = sinIndefinidos(expediente);
  const copiasNuevas = archivos.filter((a) => !archivosAntes.some((x) => x.id === a.id));
  const sinCambios =
    ic.expedienteCompartido !== undefined &&
    sonEquivalentes({ ...nuevoLimpio, generadoEl: "" }, { ...ic.expedienteCompartido, generadoEl: "" }) &&
    sonEquivalentes(archivos.map((a) => a.id), archivosAntes.map((a) => a.id));

  // Se escribe solo si nadie desactivó ni reconfiguró el compartir mientras se armaba: la
  // marca de revisión debe seguir siendo la que este proceso reclamó.
  const escrito = await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.data() as Interconsulta | undefined;
    if (!actual?.compartirExpediente?.activo || actual.compartirExpediente.actualizadoEl !== ahora) return false;
    if (!sinCambios) tx.set(ref, { expedienteCompartido: nuevoLimpio, archivos }, { merge: true });
    return true;
  });
  if (!escrito) {
    await borrarCopias(interconsultaId, copiasNuevas);
    return { actualizado: false };
  }
  await borrarCopias(interconsultaId, archivosQuitados);
  return { actualizado: true };
}
