/** Lógica de negocio de creación de interconsultas de MO Conecta — arma el
 * snapshot del paciente (nunca una referencia viva), el registro de
 * consentimiento inmutable, y la interconsulta en una sola transacción.
 * Nunca escrita directo por el cliente. */

import { randomUUID } from "node:crypto";
import { dbAdmin, bucketAdmin } from "./firebaseAdmin";
import { ConectaError, esMiembroActivoDeClinica, nowISO, sinIndefinidos } from "./conectaServer";
import { construirResumenPacienteAutorizado } from "./resumenPacienteAutorizado";
import {
  VERSION_AVISO_PRIVACIDAD_CONECTA,
  type ConsentimientoInterconsulta,
  type Interconsulta,
  type TipoInterconsulta,
} from "./moConecta";
import { plantillaInicial, respuestasVacias, type HistoriaClinicaTemplate, type RespuestasHistoriaClinica } from "./historiaClinica";
import type { Patient } from "./patientData";
import {
  citasCompartibles,
  diagnosticosCompartibles,
  fotosCompartibles,
  historiaClinicaCompartible,
  notasCompartibles,
  odontogramaCompartible,
  planCompartible,
  textoConsentimientoSecciones,
  type ExpedienteCompartido,
  type SeccionCompartible,
} from "./expedienteCompartido";
import { sanearNombreArchivo, TAMANIO_MAXIMO_ARCHIVO_BYTES } from "./archivosConecta";
import type { DiagnosticoPaciente, NotaEvolucionAny } from "./notasEvolucion";
import type { PlanTratamientoItem } from "./planTratamiento";
import type { ArchivoInterconsulta } from "./moConecta";

export type CrearInterconsultaInput = {
  clinicaRemitenteId: string;
  pacienteId: string;
  especialidadSolicitada?: string;
  motivo?: string;
  preguntaClinica?: string;
  prioridad: "ordinaria" | "preferente" | "urgente";
  tipoInterconsulta: TipoInterconsulta;
  antecedentesAlertas?: string;
  destinatarioUid?: string;
  destinatarioClinicaId?: string;
  informacionMinima?: string;
  /** Partes del expediente a compartir — el servidor las lee de Firestore. */
  seccionesCompartidas?: SeccionCompartible[];
  consentimiento: {
    destinatarioTipo: "odontologo_registrado" | "clinica" | "invitacion";
    destinatarioId?: string;
    finalidad: string;
    informacionCompartida: string[];
  };
};

/** Foto fija de las partes del expediente elegidas, leídas directo de
 * Firestore con el Admin SDK (nunca lo que mande el cliente). Las fotos
 * clínicas se COPIAN a los archivos de la interconsulta. */
async function construirExpedienteCompartido(args: {
  clinicaId: string;
  pacienteId: string;
  interconsultaId: string;
  remitenteUid: string;
  secciones: SeccionCompartible[];
  template: HistoriaClinicaTemplate;
  respuestas: RespuestasHistoriaClinica;
  ahora: string;
}): Promise<{ expediente: ExpedienteCompartido; archivos: ArchivoInterconsulta[] }> {
  const { clinicaId, pacienteId, secciones, ahora } = args;
  const base = dbAdmin.collection("users").doc(clinicaId).collection("pacientes").doc(pacienteId);
  const lista = async <T,>(coleccion: string) =>
    (await base.collection(coleccion).get()).docs.map((d) => ({ ...(d.data() as T), id: d.id }));

  const expediente: ExpedienteCompartido = { secciones, generadoEl: ahora };
  const archivos: ArchivoInterconsulta[] = [];

  const necesitaDiagnosticos = secciones.includes("diagnosticos_plan") || secciones.includes("notas_evolucion");
  const diagnosticos = necesitaDiagnosticos ? await lista<DiagnosticoPaciente>("diagnosticos") : [];

  if (secciones.includes("historia_clinica")) {
    expediente.historiaClinica = historiaClinicaCompartible(args.template, args.respuestas);
  }
  if (secciones.includes("diagnosticos_plan")) {
    expediente.diagnosticos = diagnosticosCompartibles(diagnosticos);
    expediente.planTratamiento = planCompartible(await lista<PlanTratamientoItem>("planTratamiento"));
  }
  if (secciones.includes("odontograma")) {
    expediente.odontograma = odontogramaCompartible(args.template, args.respuestas);
  }
  if (secciones.includes("notas_evolucion")) {
    expediente.notas = notasCompartibles(await lista<NotaEvolucionAny>("notasEvolucion"), diagnosticos);
  }
  if (secciones.includes("citas")) {
    const citasSnap = await dbAdmin
      .collection("users")
      .doc(clinicaId)
      .collection("citas")
      .where("patientId", "==", pacienteId)
      .get();
    expediente.citas = citasCompartibles(
      citasSnap.docs.map((d) => d.data() as { fecha: string; horaInicio: string; estatus: string; tratamientos?: string[] })
    );
  }
  if (secciones.includes("fotos_radiografias")) {
    const fotosSnap = await base.collection("fotos").doc("datos").get();
    const fotos = fotosCompartibles((fotosSnap.exists ? fotosSnap.data() : {}) as Parameters<typeof fotosCompartibles>[0]);
    for (const foto of fotos) {
      // Solo se copian objetos que de verdad cuelgan de ESTE paciente y son JPEG
      // dentro del límite — nunca una ruta arbitraria.
      if (!foto.path.startsWith(`users/${clinicaId}/pacientes/${pacienteId}/fotos/`)) continue;
      try {
        const origen = bucketAdmin.file(foto.path);
        const [meta] = await origen.getMetadata();
        const tamanio = Number(meta.size ?? 0);
        if (!String(meta.contentType ?? "").startsWith("image/jpeg") || tamanio <= 0 || tamanio > TAMANIO_MAXIMO_ARCHIVO_BYTES) continue;
        const archivoId = randomUUID();
        const destino = `interconsultas/${args.interconsultaId}/archivos/${archivoId}.jpg`;
        await origen.copy(bucketAdmin.file(destino));
        archivos.push(
          sinIndefinidos({
            id: archivoId,
            nombreOriginalSaneado: sanearNombreArchivo(foto.name || "fotografia.jpg"),
            storagePath: destino,
            mimeType: "image/jpeg",
            tamanioBytes: tamanio,
            categoriaClinica: "fotografia" as const,
            subidoPorUid: args.remitenteUid,
            fecha: ahora,
          })
        );
      } catch (err) {
        console.error("No se pudo copiar una fotografía a la interconsulta", err);
      }
    }
    expediente.fotosArchivoIds = archivos.map((a) => a.id);
  }
  return { expediente, archivos };
}

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
  const interconsultaRef = dbAdmin.collection("interconsultas").doc();
  const secciones = Array.from(new Set(input.seccionesCompartidas ?? []));
  const compartido = secciones.length
    ? await construirExpedienteCompartido({
        clinicaId: input.clinicaRemitenteId,
        pacienteId: input.pacienteId,
        interconsultaId: interconsultaRef.id,
        remitenteUid,
        secciones,
        template,
        respuestas,
        ahora,
      })
    : null;
  const consentimientoRef = dbAdmin.collection("consentimientosInterconsulta").doc();
  const consentimiento: ConsentimientoInterconsulta = sinIndefinidos({
    id: consentimientoRef.id,
    pacienteId: input.pacienteId,
    clinicaId: input.clinicaRemitenteId,
    odontologoUid: remitenteUid,
    destinatarioTipo: input.consentimiento.destinatarioTipo,
    destinatarioId: input.consentimiento.destinatarioId,
    finalidad: input.consentimiento.finalidad,
    // Lo que el paciente autoriza queda por escrito, incluidas las partes
    // del expediente elegidas.
    informacionCompartida: [
      ...input.consentimiento.informacionCompartida,
      ...textoConsentimientoSecciones(secciones),
    ].slice(0, 30),
    fecha: ahora,
    metodoAceptacion: "checkbox_activo",
    registradoPor: remitenteUid,
    versionAvisoPrivacidad: VERSION_AVISO_PRIVACIDAD_CONECTA,
    estado: "vigente",
  });

  const participantesAutorizados = [remitenteUid];
  if (input.destinatarioUid) participantesAutorizados.push(input.destinatarioUid);

  const interconsulta: Interconsulta = sinIndefinidos({
    id: interconsultaRef.id,
    clinicaRemitenteId: input.clinicaRemitenteId,
    odontologoRemitenteUid: remitenteUid,
    pacienteId: input.pacienteId,
    resumenPaciente,
    expedienteCompartido: compartido?.expediente,
    destinatarioUid: input.destinatarioUid,
    destinatarioClinicaId: input.destinatarioClinicaId,
    tipoInterconsulta: input.tipoInterconsulta,
    especialidadSolicitada: input.especialidadSolicitada,
    motivo: input.motivo,
    preguntaClinica: input.preguntaClinica,
    prioridad: input.prioridad,
    antecedentesAlertas: input.antecedentesAlertas,
    archivos: compartido?.archivos ?? [],
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
