/** Lógica de negocio de creación de interconsultas de MO Conecta — arma el
 * snapshot del paciente (nunca una referencia viva), el registro de
 * consentimiento inmutable, y la interconsulta en una sola transacción.
 * Nunca escrita directo por el cliente. */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, esMiembroActivoDeClinica, nowISO, sinIndefinidos } from "./conectaServer";
import { construirResumenPacienteAutorizado } from "./resumenPacienteAutorizado";
import {
  VERSION_AVISO_PRIVACIDAD_CONECTA,
  type ConsentimientoInterconsulta,
  type Interconsulta,
} from "./moConecta";
import { plantillaInicial, respuestasVacias, type HistoriaClinicaTemplate, type RespuestasHistoriaClinica } from "./historiaClinica";
import type { Patient } from "./patientData";

export type CrearInterconsultaInput = {
  clinicaRemitenteId: string;
  pacienteId: string;
  especialidadSolicitada: string;
  motivo: string;
  preguntaClinica: string;
  prioridad: "ordinaria" | "preferente" | "urgente";
  antecedentesAlertas?: string;
  destinatarioUid?: string;
  destinatarioClinicaId?: string;
  informacionMinima?: string;
  consentimiento: {
    destinatarioTipo: "odontologo_registrado" | "clinica" | "invitacion";
    destinatarioId?: string;
    finalidad: string;
    informacionCompartida: string[];
  };
};

export async function crearInterconsulta(remitenteUid: string, input: CrearInterconsultaInput): Promise<Interconsulta> {
  const esMiembro = await esMiembroActivoDeClinica(remitenteUid, input.clinicaRemitenteId);
  if (!esMiembro) throw new ConectaError(403, "No perteneces a esa clínica.");

  const pacienteSnap = await dbAdmin
    .collection("users")
    .doc(input.clinicaRemitenteId)
    .collection("pacientes")
    .doc(input.pacienteId)
    .get();
  if (!pacienteSnap.exists) throw new ConectaError(404, "No existe ese paciente en tu clínica.");
  const paciente = pacienteSnap.data() as Patient;

  const [templateSnap, respuestasSnap] = await Promise.all([
    dbAdmin.collection("users").doc(input.clinicaRemitenteId).collection("config").doc("historiaClinicaTemplate").get(),
    dbAdmin
      .collection("users")
      .doc(input.clinicaRemitenteId)
      .collection("pacientes")
      .doc(input.pacienteId)
      .collection("historiaClinica")
      .doc("respuestas")
      .get(),
  ]);
  const template = (templateSnap.exists ? templateSnap.data() : plantillaInicial) as HistoriaClinicaTemplate;
  const respuestas = (respuestasSnap.exists ? respuestasSnap.data() : respuestasVacias) as RespuestasHistoriaClinica;

  const resumenPaciente = construirResumenPacienteAutorizado(paciente, template, respuestas, input.informacionMinima);

  const ahora = nowISO();
  const consentimientoRef = dbAdmin.collection("consentimientosInterconsulta").doc();
  const consentimiento: ConsentimientoInterconsulta = sinIndefinidos({
    id: consentimientoRef.id,
    pacienteId: input.pacienteId,
    clinicaId: input.clinicaRemitenteId,
    odontologoUid: remitenteUid,
    destinatarioTipo: input.consentimiento.destinatarioTipo,
    destinatarioId: input.consentimiento.destinatarioId,
    finalidad: input.consentimiento.finalidad,
    informacionCompartida: input.consentimiento.informacionCompartida,
    fecha: ahora,
    metodoAceptacion: "checkbox_activo",
    registradoPor: remitenteUid,
    versionAvisoPrivacidad: VERSION_AVISO_PRIVACIDAD_CONECTA,
    estado: "vigente",
  });

  const participantesAutorizados = [remitenteUid];
  if (input.destinatarioUid) participantesAutorizados.push(input.destinatarioUid);

  const interconsultaRef = dbAdmin.collection("interconsultas").doc();
  const interconsulta: Interconsulta = sinIndefinidos({
    id: interconsultaRef.id,
    clinicaRemitenteId: input.clinicaRemitenteId,
    odontologoRemitenteUid: remitenteUid,
    pacienteId: input.pacienteId,
    resumenPaciente,
    destinatarioUid: input.destinatarioUid,
    destinatarioClinicaId: input.destinatarioClinicaId,
    especialidadSolicitada: input.especialidadSolicitada,
    motivo: input.motivo,
    preguntaClinica: input.preguntaClinica,
    prioridad: input.prioridad,
    antecedentesAlertas: input.antecedentesAlertas,
    archivos: [],
    consentimientoId: consentimientoRef.id,
    estado: "sent",
    historialEstados: [{ estado: "sent", fecha: ahora, uid: remitenteUid }],
    participantesAutorizados,
    creadoEl: ahora,
    actualizadoEl: ahora,
  });

  const batch = dbAdmin.batch();
  batch.set(consentimientoRef, consentimiento);
  batch.set(interconsultaRef, interconsulta);
  await batch.commit();

  return interconsulta;
}
