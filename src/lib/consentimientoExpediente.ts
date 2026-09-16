/** Consentimiento específico para acceder al expediente compartido
 * (arquitectura MO Conecta v3, §6) — distinto de `ConsentimientoInterconsulta`
 * (moConecta.ts), que solo respalda el resumen curado de una interconsulta.
 * Contenido inmutable con estado de ciclo de vida controlado: los campos
 * de otorgamiento original nunca se sobrescriben; solo `estado`/
 * `revocadoEl`/`revocadoPorUid` cambian, exactamente una vez, de ausentes
 * a presentes. Fase 3, todavía sin escribir el módulo que lo crea/revoca
 * de verdad — solo el tipo y sus invariantes puras. */

import type { Timestamp } from "firebase-admin/firestore";

export type OtorganteTipo = "paciente" | "representante_legal";
export type MetodoVerificacionConsentimiento =
  | "cuenta_paciente"
  | "enlace_verificado"
  | "codigo_un_uso"
  | "firma_electronica"
  | "asistido_con_evidencia";

export type ConsentimientoExpediente = {
  id: string;
  pacienteGlobalId: string;
  expedienteId: string;
  odontologoAutorizadoUid: string;
  clinicaSolicitanteId: string;
  finalidad: string;
  seccionesAutorizadas: string[];
  nivelAcceso: "lectura" | "lectura_escritura";
  fechaInicio: Timestamp;
  vigencia?: Timestamp;
  esRevocable: true;
  versionAvisoPrivacidad: string;

  otorganteTipo: OtorganteTipo;
  otorgantePacienteUid?: string;
  representanteLegalId?: string;
  representanteLegalRelacion?: string;

  metodoVerificacion: MetodoVerificacionConsentimiento;
  evidenciaRef: string;
  evidenciaHash: string;
  otorgadoEl: Timestamp;

  /** SOLO presente si `metodoVerificacion === "asistido_con_evidencia"` —
   * ver `requiereCapturadoPor`. Nunca igual a `otorgantePacienteUid`: el
   * profesional que captura evidencia nunca puede ser, a la vez, quien
   * otorga el consentimiento (v3 §6 — "el odontólogo no puede fingir ser
   * el paciente"). */
  capturadoPorUid?: string;
  solicitudAccesoId: string;
  estado: "vigente" | "revocado";
  revocadoEl?: Timestamp;
  revocadoPorUid?: string;
};

/** Solo el método asistido exige `capturadoPorUid` — los métodos directos
 * (cuenta del paciente, enlace/OTP verificado, firma electrónica) nunca
 * lo llevan porque el propio paciente actuó sin intermediario. */
export function requiereCapturadoPor(metodoVerificacion: MetodoVerificacionConsentimiento): boolean {
  return metodoVerificacion === "asistido_con_evidencia";
}

/** true si el consentimiento respeta la invariante de v3 §6: método
 * asistido siempre con `capturadoPorUid` presente y distinto del
 * otorgante; método directo nunca con `capturadoPorUid`, y siempre con
 * `otorgantePacienteUid` o `representanteLegalId` presente. No decide
 * nada sobre autenticación real — solo la forma del documento. */
export function formaConsentimientoValida(
  c: Pick<
    ConsentimientoExpediente,
    "metodoVerificacion" | "capturadoPorUid" | "otorgantePacienteUid" | "representanteLegalId"
  >
): boolean {
  const exigeCapturador = requiereCapturadoPor(c.metodoVerificacion);
  if (exigeCapturador && !c.capturadoPorUid) return false;
  if (!exigeCapturador && c.capturadoPorUid) return false;
  if (exigeCapturador && c.capturadoPorUid && c.capturadoPorUid === c.otorgantePacienteUid) return false;
  if (!c.otorgantePacienteUid && !c.representanteLegalId) return false;
  return true;
}

/** true solo si ESTE consentimiento respalda ESTA participación en
 * concreto: mismo profesional, mismo expediente, y vigente — nunca un
 * consentimiento de otro profesional o de otro expediente, aunque
 * ambos existan y estén vigentes por separado (v3, "el consentimiento
 * debe ser específico para el profesionista y el expediente
 * correspondiente"). No sustituye la verificación de vigencia por fecha
 * (`vigencia`) — esa se hace aparte con el mismo criterio que
 * `participacionVigente`. */
export function consentimientoRespaldaParticipacion(
  consentimiento: Pick<ConsentimientoExpediente, "odontologoAutorizadoUid" | "expedienteId" | "estado">,
  participacion: { profesionalUid: string; expedienteId: string }
): boolean {
  return (
    consentimiento.estado === "vigente" &&
    consentimiento.odontologoAutorizadoUid === participacion.profesionalUid &&
    consentimiento.expedienteId === participacion.expedienteId
  );
}
