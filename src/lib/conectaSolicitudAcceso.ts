/** Solicitud de acceso al expediente compartido — creación y resolución
 * reales (arquitectura MO Conecta v3, §8/§15). Server-only.
 *
 * FASE 3 ("solo código y pruebas"): escrita, sin ninguna ruta de API que
 * la invoque — ninguna solicitud real se crea en producción todavía. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, esMiembroActivoDeClinica, sinIndefinidos } from "./conectaServer";
import type { ExpedienteClinico } from "./expedienteClinico";
import type { ClinicMember } from "./patientData";
import { registrarEventoExpediente } from "./conectaEventosExpediente";
import {
  type EstadoSolicitudAccesoExpediente,
  type FinalidadSolicitudAcceso,
  type SolicitudAccesoExpediente,
} from "./solicitudAccesoExpediente";

export type CrearSolicitudAccesoInput = {
  expedienteId: string;
  motivo: string;
  finalidad: FinalidadSolicitudAcceso;
  especialidad: string;
  tratamientoSolicitado: string;
  tiempoEstimadoAcceso: string;
  mensaje: string;
  declaracionFolioProporcionadoPorPaciente?: boolean;
};

function refSolicitud(id: string) {
  return dbAdmin.collection("solicitudesAccesoExpediente").doc(id);
}

/** Resuelve a quién se dirige la solicitud — siempre el responsable
 * principal vigente del puntero del expediente (v3 §4), nunca elegido a
 * mano por el solicitante. Si ese responsable ya no es miembro activo de
 * su clínica, cae a la bandeja de continuidad: el primer admin activo de
 * esa misma clínica (v3 §15) — nadie obtiene acceso automáticamente por
 * esto, sigue exigiendo que un admin actúe explícitamente. */
async function resolverDestinatario(
  expediente: ExpedienteClinico
): Promise<{ uidDestino: string; motivoContingencia?: "responsable_no_disponible" }> {
  const responsableActivo = await esMiembroActivoDeClinica(
    expediente.responsablePrincipalUid,
    expediente.responsablePrincipalClinicaId
  );
  if (responsableActivo) return { uidDestino: expediente.responsablePrincipalUid };

  const adminsSnap = await dbAdmin
    .collection("clinicMembers")
    .where("clinicId", "==", expediente.responsablePrincipalClinicaId)
    .where("role", "==", "admin")
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (adminsSnap.empty) {
    throw new ConectaError(
      409,
      "El responsable principal de este expediente no está disponible y no hay ningún administrador activo en su clínica."
    );
  }
  const admin = adminsSnap.docs[0].data() as ClinicMember;
  return { uidDestino: admin.uid, motivoContingencia: "responsable_no_disponible" };
}

export async function crearSolicitudAccesoExpediente(
  solicitanteUid: string,
  clinicaSolicitanteId: string,
  input: CrearSolicitudAccesoInput
): Promise<SolicitudAccesoExpediente> {
  const esMiembro = await esMiembroActivoDeClinica(solicitanteUid, clinicaSolicitanteId);
  if (!esMiembro) throw new ConectaError(403, "No perteneces a esa clínica.");

  const expedienteSnap = await dbAdmin.collection("expedientesClinicos").doc(input.expedienteId).get();
  if (!expedienteSnap.exists) throw new ConectaError(404, "No existe ese expediente.");
  const expediente = expedienteSnap.data() as ExpedienteClinico;

  const { uidDestino, motivoContingencia } = await resolverDestinatario(expediente);

  const ref = dbAdmin.collection("solicitudesAccesoExpediente").doc();
  const solicitud: SolicitudAccesoExpediente = sinIndefinidos({
    id: ref.id,
    expedienteId: input.expedienteId,
    solicitanteUid,
    clinicaSolicitanteId,
    motivo: input.motivo,
    finalidad: input.finalidad,
    especialidad: input.especialidad,
    tratamientoSolicitado: input.tratamientoSolicitado,
    alcanceRequerido: "completo",
    tiempoEstimadoAcceso: input.tiempoEstimadoAcceso,
    mensaje: input.mensaje,
    declaracionFolioProporcionadoPorPaciente: input.declaracionFolioProporcionadoPorPaciente,
    responsablePrincipalUidDestino: uidDestino,
    motivoContingencia,
    estado: "pendiente",
    creadoEl: Timestamp.now(),
  });
  await ref.set(solicitud);

  await registrarEventoExpediente(input.expedienteId, {
    tipo: "solicitud_acceso_creada",
    uid: solicitanteUid,
    clinicaId: clinicaSolicitanteId,
    solicitudAccesoId: ref.id,
    finalidad: input.finalidad,
  });

  return solicitud;
}

async function leerSolicitud(solicitudId: string): Promise<SolicitudAccesoExpediente> {
  const snap = await refSolicitud(solicitudId).get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa solicitud de acceso.");
  return snap.data() as SolicitudAccesoExpediente;
}

/** Exportado — conectaConsentimientoExpediente.ts lo reusa para decidir si
 * `otorgarAccesoExpediente` todavía puede actuar sobre una solicitud, en
 * vez de mantener una segunda lista que se pueda desalinear. */
export const ESTADOS_ABIERTOS: EstadoSolicitudAccesoExpediente[] = ["pendiente", "esperando_consentimiento"];

/** El destinatario señala que ya empezó a gestionar el consentimiento del
 * paciente — puramente informativo (v3 §15.4 histórico describe este paso
 * como parte del flujo real, aunque nada impide que `otorgarAccesoExpediente`
 * se llame directo desde "pendiente" si el consentimiento ya se obtuvo en
 * la misma gestión). */
export async function marcarEsperandoConsentimiento(solicitudId: string, resueltoPorUid: string): Promise<void> {
  const solicitud = await leerSolicitud(solicitudId);
  if (solicitud.responsablePrincipalUidDestino !== resueltoPorUid) {
    throw new ConectaError(403, "Solo el destinatario de la solicitud puede gestionarla.");
  }
  if (solicitud.estado !== "pendiente") {
    throw new ConectaError(409, `La solicitud está en estado "${solicitud.estado}", no se puede marcar esperando consentimiento.`);
  }
  await refSolicitud(solicitudId).set({ estado: "esperando_consentimiento" as EstadoSolicitudAccesoExpediente }, { merge: true });
}

export async function rechazarSolicitudAcceso(solicitudId: string, resueltoPorUid: string, motivo?: string): Promise<void> {
  const solicitud = await leerSolicitud(solicitudId);
  if (solicitud.responsablePrincipalUidDestino !== resueltoPorUid) {
    throw new ConectaError(403, "Solo el destinatario de la solicitud puede resolverla.");
  }
  if (!ESTADOS_ABIERTOS.includes(solicitud.estado)) {
    throw new ConectaError(409, `La solicitud está en estado "${solicitud.estado}", ya no se puede rechazar.`);
  }
  await refSolicitud(solicitudId).set(
    sinIndefinidos({ estado: "rechazada" as EstadoSolicitudAccesoExpediente, resueltoEl: Timestamp.now(), resueltoPorUid }),
    { merge: true }
  );
  await registrarEventoExpediente(solicitud.expedienteId, {
    tipo: "acceso_denegado",
    uid: resueltoPorUid,
    solicitudAccesoId: solicitudId,
    detalle: motivo,
  });
}

/** El propio solicitante desiste — nunca lo puede hacer el destinatario
 * (esa es `rechazarSolicitudAcceso`, una decisión distinta). */
export async function cancelarSolicitudAcceso(solicitudId: string, solicitanteUid: string): Promise<void> {
  const solicitud = await leerSolicitud(solicitudId);
  if (solicitud.solicitanteUid !== solicitanteUid) {
    throw new ConectaError(403, "Solo quien creó la solicitud puede cancelarla.");
  }
  if (!ESTADOS_ABIERTOS.includes(solicitud.estado)) {
    throw new ConectaError(409, `La solicitud está en estado "${solicitud.estado}", ya no se puede cancelar.`);
  }
  await refSolicitud(solicitudId).set(
    sinIndefinidos({ estado: "cancelada" as EstadoSolicitudAccesoExpediente, resueltoEl: Timestamp.now(), resueltoPorUid: solicitanteUid }),
    { merge: true }
  );
}
