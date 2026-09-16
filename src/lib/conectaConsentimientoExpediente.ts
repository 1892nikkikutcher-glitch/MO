/** Consentimiento + participación reales del expediente compartido
 * (arquitectura MO Conecta v3, §15.4/§15.5) — server-only.
 *
 * Solo la ruta ASISTIDA está implementada aquí: `otorgarAccesoExpediente`
 * exige `capturadoPorUid` (el profesional destinatario de la solicitud) y
 * evidencia real. Las rutas DIRECTAS (`cuenta_paciente`, `enlace_verificado`,
 * `codigo_un_uso`, `firma_electronica`) exigen que el propio paciente actúe
 * sin intermediario — este proyecto no tiene todavía ningún sistema de
 * cuentas de paciente (`patientData.ts` no expone login de paciente en
 * ningún lugar), así que esas rutas no tienen, hoy, ningún flujo real que
 * las dispare. El tipo (`consentimientoExpediente.ts`) ya las admite —
 * quedan preparadas, no implementadas, para cuando exista esa cuenta.
 *
 * Otorgar consentimiento y crear la participación son UNA sola transacción
 * (v3 §15.5: "revalida consentimiento vigente... crea/activa la
 * participación") — nunca dos pasos que un llamador pueda encadenar mal.
 *
 * FASE 3 ("solo código y pruebas"): escrita, sin ninguna ruta de API que
 * la invoque — ningún consentimiento ni participación real se crea en
 * producción todavía. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, sinIndefinidos } from "./conectaServer";
import { VERSION_AVISO_PRIVACIDAD_CONECTA } from "./moConecta";
import {
  formaConsentimientoValida,
  type ConsentimientoExpediente,
  type OtorganteTipo,
} from "./consentimientoExpediente";
import { idParticipacion, type NivelAcceso, type Participacion } from "./participaciones";
import { idSesionAccesoExpediente, type SesionAccesoExpediente } from "./sesionAccesoExpediente";
import { ESTADOS_ABIERTOS } from "./conectaSolicitudAcceso";
import type { EstadoSolicitudAccesoExpediente, SolicitudAccesoExpediente } from "./solicitudAccesoExpediente";
import { registrarEventoExpediente } from "./conectaEventosExpediente";

export type OtorgarAccesoAsistidoInput = {
  solicitudAccesoId: string;
  otorganteTipo: OtorganteTipo;
  otorgantePacienteUid?: string;
  representanteLegalId?: string;
  representanteLegalRelacion?: string;
  evidenciaRef: string;
  evidenciaHash: string;
  finalidad: string;
  seccionesAutorizadas: string[];
  nivelAcceso: NivelAcceso;
  vigencia?: Timestamp;
};

/** `capturadoPorUid` es quien registra la evidencia — SIEMPRE el
 * destinatario de la solicitud (el responsable principal, o quien resolvió
 * la bandeja de continuidad), nunca el propio solicitante: `crearSolicitud
 * AccesoExpediente` ya resolvió quién es esa persona, y aquí se revalida. */
export async function otorgarAccesoExpediente(
  capturadoPorUid: string,
  input: OtorgarAccesoAsistidoInput
): Promise<{ consentimiento: ConsentimientoExpediente; participacion: Participacion }> {
  const solicitudRef = dbAdmin.collection("solicitudesAccesoExpediente").doc(input.solicitudAccesoId);
  const consentimientoRef = dbAdmin.collection("consentimientosExpediente").doc();

  const resultado = await dbAdmin.runTransaction(async (tx) => {
    const solicitudSnap = await tx.get(solicitudRef);
    if (!solicitudSnap.exists) throw new ConectaError(404, "No existe esa solicitud de acceso.");
    const solicitud = solicitudSnap.data() as SolicitudAccesoExpediente;

    if (solicitud.responsablePrincipalUidDestino !== capturadoPorUid) {
      throw new ConectaError(403, "Solo el destinatario de la solicitud puede otorgar acceso.");
    }
    if (!ESTADOS_ABIERTOS.includes(solicitud.estado)) {
      throw new ConectaError(409, `La solicitud está en estado "${solicitud.estado}", no se puede otorgar acceso.`);
    }

    const ahora = Timestamp.now();
    const consentimiento: ConsentimientoExpediente = sinIndefinidos({
      id: consentimientoRef.id,
      pacienteGlobalId: solicitud.expedienteId,
      expedienteId: solicitud.expedienteId,
      odontologoAutorizadoUid: solicitud.solicitanteUid,
      clinicaSolicitanteId: solicitud.clinicaSolicitanteId,
      finalidad: input.finalidad,
      seccionesAutorizadas: input.seccionesAutorizadas,
      nivelAcceso: input.nivelAcceso,
      fechaInicio: ahora,
      vigencia: input.vigencia,
      esRevocable: true,
      versionAvisoPrivacidad: VERSION_AVISO_PRIVACIDAD_CONECTA,
      otorganteTipo: input.otorganteTipo,
      otorgantePacienteUid: input.otorgantePacienteUid,
      representanteLegalId: input.representanteLegalId,
      representanteLegalRelacion: input.representanteLegalRelacion,
      metodoVerificacion: "asistido_con_evidencia",
      evidenciaRef: input.evidenciaRef,
      evidenciaHash: input.evidenciaHash,
      otorgadoEl: ahora,
      capturadoPorUid,
      solicitudAccesoId: input.solicitudAccesoId,
      estado: "vigente",
    });

    if (!formaConsentimientoValida(consentimiento)) {
      throw new ConectaError(400, "La forma del consentimiento no es válida (otorgante/capturador).");
    }

    const participacionId = idParticipacion(solicitud.expedienteId, solicitud.solicitanteUid);
    const participacion: Participacion = sinIndefinidos({
      id: participacionId,
      expedienteId: solicitud.expedienteId,
      profesionalUid: solicitud.solicitanteUid,
      clinicaId: solicitud.clinicaSolicitanteId,
      rol: "colaborador",
      nivelAcceso: input.nivelAcceso,
      alcance: "completo",
      consentimientoId: consentimiento.id,
      solicitudAccesoId: input.solicitudAccesoId,
      desde: ahora,
      hasta: input.vigencia,
      estado: "activa",
      createdBy: capturadoPorUid,
    });

    tx.set(consentimientoRef, consentimiento);
    tx.set(dbAdmin.collection("participaciones").doc(participacionId), participacion);
    tx.set(
      solicitudRef,
      sinIndefinidos({ estado: "autorizada" as EstadoSolicitudAccesoExpediente, resueltoEl: ahora, resueltoPorUid: capturadoPorUid }),
      { merge: true }
    );

    return { consentimiento, participacion };
  });

  // Eventos DESPUÉS de que la transacción confirme — nunca dentro del
  // callback, que puede ejecutarse más de una vez por reintentos.
  await registrarEventoExpediente(resultado.consentimiento.expedienteId, {
    tipo: "consentimiento_otorgado",
    uid: capturadoPorUid,
    consentimientoId: resultado.consentimiento.id,
    solicitudAccesoId: input.solicitudAccesoId,
  });
  await registrarEventoExpediente(resultado.consentimiento.expedienteId, {
    tipo: "participacion_creada",
    uid: resultado.participacion.profesionalUid,
    participacionId: resultado.participacion.id,
    consentimientoId: resultado.consentimiento.id,
  });

  return resultado;
}

/** Revocar, en cascada, en una sola operación (v3 §6): el consentimiento
 * pasa a "revocado" (nunca se reescriben sus campos de otorgamiento
 * original), la participación que respaldaba pasa a "revocada", y
 * cualquier sesión activa de ese profesional sobre ese expediente se
 * cierra de inmediato — así la regla de lectura deja de encontrarla válida
 * sin depender de que la sesión expire sola. Idempotente: revocar un
 * consentimiento ya revocado es un no-op. */
export async function revocarConsentimientoExpediente(
  consentimientoId: string,
  revocadoPorUid: string,
  motivo?: string
): Promise<void> {
  const consentimientoRef = dbAdmin.collection("consentimientosExpediente").doc(consentimientoId);

  const yaEstabaRevocado = await dbAdmin.runTransaction(async (tx) => {
    const consentimientoSnap = await tx.get(consentimientoRef);
    if (!consentimientoSnap.exists) throw new ConectaError(404, "No existe ese consentimiento.");
    const consentimiento = consentimientoSnap.data() as ConsentimientoExpediente;
    if (consentimiento.estado === "revocado") return true;

    const participacionRef = dbAdmin
      .collection("participaciones")
      .doc(idParticipacion(consentimiento.expedienteId, consentimiento.odontologoAutorizadoUid));
    const sesionRef = dbAdmin
      .collection("sesionesAccesoExpediente")
      .doc(idSesionAccesoExpediente(consentimiento.expedienteId, consentimiento.odontologoAutorizadoUid));

    const [participacionSnap, sesionSnap] = await Promise.all([tx.get(participacionRef), tx.get(sesionRef)]);

    const ahora = Timestamp.now();
    tx.set(consentimientoRef, sinIndefinidos({ estado: "revocado", revocadoEl: ahora, revocadoPorUid }), { merge: true });

    if (participacionSnap.exists) {
      const participacion = participacionSnap.data() as Participacion;
      if (participacion.consentimientoId === consentimientoId && participacion.estado === "activa") {
        tx.set(participacionRef, { estado: "revocada", revokedAt: ahora, revokedBy: revocadoPorUid }, { merge: true });
      }
    }
    if (sesionSnap.exists && (sesionSnap.data() as SesionAccesoExpediente).estado === "activa") {
      tx.set(sesionRef, { estado: "cerrada", cerradaEl: ahora }, { merge: true });
    }

    return false;
  });

  if (yaEstabaRevocado) return;

  const consentimientoSnap = await consentimientoRef.get();
  const consentimiento = consentimientoSnap.data() as ConsentimientoExpediente;
  await registrarEventoExpediente(consentimiento.expedienteId, {
    tipo: "consentimiento_revocado",
    uid: revocadoPorUid,
    consentimientoId,
    detalle: motivo,
  });
  await registrarEventoExpediente(consentimiento.expedienteId, {
    tipo: "participacion_revocada",
    uid: revocadoPorUid,
    consentimientoId,
  });
}
