/** Esquemas Zod `.strict()` de MO Conecta — cada ruta valida su body contra
 * uno de estos antes de tocar Firestore; cualquier campo no reconocido
 * rechaza la petición entera (nunca se ignora en silencio). Solo campos que
 * el CLIENTE puede mandar — nunca `estadoVerificacion`, `especialidadesVerificadas`,
 * `participantesAutorizados`, fechas de servidor, uids, etc. */

import { z } from "zod";
import { modalidadesAtencion } from "./moConecta";

const camposPerfil = {
  nombreCompleto: z.string().trim().min(1).max(200),
  fotoUrl: z.string().trim().url().max(2000),
  universidad: z.string().trim().max(200),
  areasPractica: z.array(z.string().trim().min(1).max(100)).max(20),
  descripcion: z.string().trim().max(2000),
  municipio: z.string().trim().max(150),
  estado: z.string().trim().max(150),
  modalidadAtencion: z.array(z.enum(modalidadesAtencion)).max(modalidadesAtencion.length),
  horariosGenerales: z.string().trim().max(300),
  aceptaInterconsultas: z.boolean(),
  tiposCasosRecibe: z.array(z.string().trim().min(1).max(100)).max(20),
  aceptaUrgencias: z.boolean(),
  tiempoRespuestaHabitual: z.string().trim().max(200),
  activoEnDirectorio: z.boolean(),
  // Van a perfilesProfesionalesPrivados, no al documento público — la ruta
  // los separa antes de llamar filtrarCamposPerfilPublico.
  cedulaProfesional: z.string().trim().max(50),
  cedulaEspecialidad: z.string().trim().max(50),
  especialidadCedula: z.string().trim().max(150),
  telefonoProfesional: z.string().trim().max(30),
};

export const perfilSchema = z.object(camposPerfil).partial().strict();
export const crearPerfilSchema = perfilSchema.required({ nombreCompleto: true });

export const evidenciaVerificacionIniciarSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  })
  .strict();

export const evidenciaVerificacionSubirSchema = z
  .object({
    storagePath: z.string().trim().min(1).max(500),
    mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
    contenidoBase64: z.string().min(1),
  })
  .strict();

export const afiliacionSolicitarSchema = z
  .object({
    clinicaId: z.string().trim().min(1).max(200),
  })
  .strict();

export const afiliacionResolverSchema = z
  .object({
    accion: z.enum(["aceptar", "rechazar", "revocar"]),
  })
  .strict();

export const interconsultaCrearSchema = z
  .object({
    clinicaRemitenteId: z.string().trim().min(1).max(200),
    pacienteId: z.string().trim().min(1).max(200),
    especialidadSolicitada: z.string().trim().min(1).max(200),
    motivo: z.string().trim().min(1).max(4000),
    preguntaClinica: z.string().trim().min(1).max(4000),
    prioridad: z.enum(["ordinaria", "preferente", "urgente"]),
    antecedentesAlertas: z.string().trim().max(2000).optional(),
    destinatarioUid: z.string().trim().min(1).max(200).optional(),
    destinatarioClinicaId: z.string().trim().min(1).max(200).optional(),
    informacionMinima: z.string().trim().max(2000).optional(),
    consentimiento: z.object({
      destinatarioTipo: z.enum(["odontologo_registrado", "clinica", "invitacion"]),
      destinatarioId: z.string().trim().max(200).optional(),
      finalidad: z.string().trim().min(1).max(1000),
      informacionCompartida: z.array(z.string().trim().min(1).max(200)).max(30),
    }),
  })
  .strict();

export const estadoTransicionSchema = z
  .object({
    siguiente: z.enum([
      "sent",
      "received",
      "accepted",
      "rejected",
      "patient_contacted",
      "scheduled",
      "in_treatment",
      "completed",
      "counter_referral_sent",
      "closed",
      "cancelled",
    ]),
    nota: z.string().trim().max(2000).optional(),
  })
  .strict();

export const mensajeCrearSchema = z
  .object({
    contenido: z.string().trim().min(1).max(4000),
  })
  .strict();

export const contrarreferenciaSchema = z
  .object({
    resumenAtencion: z.string().trim().min(1).max(4000),
    hallazgosRelevantes: z.string().trim().max(4000).optional(),
    procedimientoRealizado: z.string().trim().max(4000).optional(),
    estadoActual: z.string().trim().min(1).max(2000),
    recomendaciones: z.string().trim().max(2000).optional(),
    proximaRevision: z.string().trim().max(500).optional(),
    devolverAlRemitente: z.boolean(),
    esBorrador: z.boolean(),
  })
  .strict();

export const archivoIniciarSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  })
  .strict();

export const archivoSubirSchema = z
  .object({
    archivoId: z.string().trim().min(1).max(100),
    storagePath: z.string().trim().min(1).max(500),
    mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
    contenidoBase64: z.string().min(1),
    nombreOriginal: z.string().trim().min(1).max(300),
    categoriaClinica: z.enum(["radiografia", "fotografia", "documento", "otro"]),
  })
  .strict();

export const invitacionCrearSchema = z
  .object({
    interconsultaId: z.string().trim().min(1).max(200),
    destinatarioNombre: z.string().trim().max(200).optional(),
    destinatarioCorreo: z.string().trim().email().max(300),
    canal: z.enum(["whatsapp", "correo", "copiar_enlace"]),
  })
  .strict();

export const revocarAccesoSchema = z
  .object({
    uidARevocar: z.string().trim().min(1).max(200),
    motivo: z.string().trim().max(1000).optional(),
  })
  .strict();

export const solicitudAccesoResolverSchema = z
  .object({
    accion: z.enum(["aprobar", "rechazar"]),
  })
  .strict();

export const consentimientoRevocarSchema = z
  .object({
    motivo: z.string().trim().max(1000).optional(),
  })
  .strict();

export const eventoCrecimientoSchema = z
  .object({
    tipo: z.enum([
      "professional_profile_created",
      "professional_verification_requested",
      "invite_shared",
      "invite_page_viewed",
    ]),
    interconsultaId: z.string().trim().max(200).optional(),
    invitacionId: z.string().trim().max(200).optional(),
    fuenteAdquisicion: z.string().trim().max(200).optional(),
  })
  .strict();

export const politicaConservacionSchema = z
  .object({
    diasConservacionTrasCierre: z.number().int().positive().max(3650).optional(),
    permiteExportarCopia: z.boolean(),
    permiteRevocarColaboradorPostCierre: z.boolean(),
    politicaAnonimizacion: z.string().trim().max(2000).optional(),
  })
  .strict();

export const adminPerfilSchema = z
  .object({
    accion: z.enum(["verificar", "rechazar", "notas"]),
    especialidadesVerificadas: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    notasAdministrativas: z.string().trim().max(4000).optional(),
  })
  .strict();
