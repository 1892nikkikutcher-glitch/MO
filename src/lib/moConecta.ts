/** MO Conecta — red profesional de interconsultas entre odontólogos.
 * Tipos y lógica pura (sin Firebase) del módulo. Las colecciones de
 * Firestore que usan estos tipos son top-level y nuevas (no anidadas bajo
 * `users/{clinicUid}`, a propósito: una interconsulta involucra a DOS
 * clínicas distintas, algo que el modelo `isActiveMember(ownerId)` de todo
 * el resto de la app no puede expresar). Ver MoConectaContext.tsx para el
 * cableado con Firestore. */

// ---------------------------------------------------------------------------
// Perfil profesional
// ---------------------------------------------------------------------------

export type EstadoVerificacion = "pendiente" | "verificado" | "rechazado";

export const modalidadesAtencion = ["Consultorio", "Clínica dental", "Hospital", "Consulta externa"] as const;
export type ModalidadAtencion = (typeof modalidadesAtencion)[number];

/** Perfil dividido en TRES documentos por persona (uid = id en los tres):
 * público (directorio), privado (solo el dueño) y admin (solo el
 * superadministrador, ni el propio dueño lo lee) — ver §2 del plan. Los
 * tres se crean/editan EXCLUSIVAMENTE vía /api/conecta/perfiles y
 * /api/admin/conecta/perfiles/[uid]; el cliente nunca los escribe directo
 * (§1: "el cliente nunca escribe ninguna colección de MO Conecta
 * directamente — ni siquiera el perfil propio"). */
export type PerfilProfesionalPublico = {
  /** = id del documento, mismo uid de Firebase Auth que usa clinicMembers —
   * el perfil es por PERSONA, no por clínica (una clínica puede tener más
   * de un odontólogo, y un odontólogo puede afiliarse a más de una — ver
   * `AfiliacionClinica`). */
  uid: string;
  nombreCompleto: string;
  fotoUrl?: string;
  universidad?: string;
  /** "Área de práctica declarada" — el propio odontólogo la elige. NUNCA se
   * presenta como especialidad verificada solo por estar aquí. */
  areasPractica: string[];
  /** Solo /api/admin/conecta/perfiles/[uid] la puebla, tras revisar
   * evidencia — eje separado de `areasPractica` a propósito (punto 4 del
   * pedido original: nunca autoverificable). */
  especialidadesVerificadas: string[];
  estadoVerificacion: EstadoVerificacion;
  descripcion?: string;
  /** Denormalizado desde la afiliación ACTIVA — nunca escrito directo, solo
   * el servidor lo recalcula al aceptar/revocar una afiliación. */
  clinicaNombre?: string;
  municipio?: string;
  estado?: string;
  modalidadAtencion?: ModalidadAtencion[];
  horariosGenerales?: string;
  aceptaInterconsultas: boolean;
  tiposCasosRecibe?: string[];
  aceptaUrgencias: boolean;
  tiempoRespuestaHabitual?: string;
  activoEnDirectorio: boolean;
  creadoEl: string;
  actualizadoEl: string;
};

export type PerfilProfesionalPrivado = {
  uid: string;
  /** Sensible — nunca se expone en el directorio público, solo al dueño del
   * perfil y al superadministrador. */
  cedulaProfesional?: string;
  telefonoProfesional?: string;
  correo?: string;
  /** Ruta de Storage, nunca una URL — ver §6/estrategia de archivos. */
  evidenciaVerificacionStoragePath?: string;
};

/** Solo el superadministrador la lee/escribe (vía dbAdmin) — ni el propio
 * dueño del perfil tiene acceso a este documento. */
export type PerfilProfesionalAdmin = {
  uid: string;
  notasAdministrativas?: string;
};

const CAMPOS_PUBLICOS_EDITABLES_POR_DUENO = [
  "nombreCompleto",
  "fotoUrl",
  "universidad",
  "areasPractica",
  "descripcion",
  "municipio",
  "estado",
  "modalidadAtencion",
  "horariosGenerales",
  "aceptaInterconsultas",
  "tiposCasosRecibe",
  "aceptaUrgencias",
  "tiempoRespuestaHabitual",
  "activoEnDirectorio",
] as const;

/** Lista blanca de campos que `POST/PATCH /api/conecta/perfiles` acepta del
 * cliente — todo lo demás (`estadoVerificacion`, `especialidadesVerificadas`,
 * `clinicaNombre`, fechas, uid) lo pone el servidor. Se expone como función
 * pura para poder probarla con Vitest sin necesitar el emulador. */
export function filtrarCamposPerfilPublico(
  body: Record<string, unknown>
): Partial<Pick<PerfilProfesionalPublico, (typeof CAMPOS_PUBLICOS_EDITABLES_POR_DUENO)[number]>> {
  const resultado: Record<string, unknown> = {};
  for (const campo of CAMPOS_PUBLICOS_EDITABLES_POR_DUENO) {
    if (campo in body) resultado[campo] = body[campo];
  }
  return resultado;
}

export function perfilPublicoVacio(uid: string, ahora: string): PerfilProfesionalPublico {
  return {
    uid,
    nombreCompleto: "",
    estadoVerificacion: "pendiente",
    areasPractica: [],
    especialidadesVerificadas: [],
    aceptaInterconsultas: true,
    aceptaUrgencias: false,
    activoEnDirectorio: false,
    creadoEl: ahora,
    actualizadoEl: ahora,
  };
}

// ---------------------------------------------------------------------------
// Afiliación profesional↔clínica — nunca auto-escrita, siempre vía flujo de
// solicitud/aprobación server-side (§4 del plan).
// ---------------------------------------------------------------------------

export type EstadoAfiliacion = "pendiente" | "activa" | "rechazada" | "revocada";

export type AfiliacionClinica = {
  id: string;
  uid: string;
  clinicaId: string;
  clinicaNombre: string;
  rol: "titular" | "colaborador";
  estado: EstadoAfiliacion;
  solicitadaEl: string;
  resueltaEl?: string;
  resueltaPorUid?: string;
};

// ---------------------------------------------------------------------------
// Interconsulta — estados y transiciones
// ---------------------------------------------------------------------------

export const interconsultaEstados = [
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
] as const;

export type InterconsultaEstado = (typeof interconsultaEstados)[number];

export const interconsultaEstadoLabel: Record<InterconsultaEstado, string> = {
  sent: "Enviada",
  received: "Recibida",
  accepted: "Aceptada",
  rejected: "Rechazada",
  patient_contacted: "Paciente contactado",
  scheduled: "Agendada",
  in_treatment: "En tratamiento",
  completed: "Tratamiento terminado",
  counter_referral_sent: "Contrarreferencia enviada",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

/** Orden de avance normal del caso — de aquí sale qué es "adelante" y qué es
 * "un salto" (que exige justificación). rejected/cancelled/closed son
 * ramas/terminales, no forman parte de este orden lineal. */
const ORDEN_AVANCE: InterconsultaEstado[] = [
  "sent",
  "received",
  "accepted",
  "patient_contacted",
  "scheduled",
  "in_treatment",
  "completed",
  "counter_referral_sent",
  "closed",
];

const ESTADOS_TERMINALES: InterconsultaEstado[] = ["closed", "cancelled", "rejected"];

/** true si `actual` → `siguiente` es una transición coherente con el flujo
 * de una interconsulta. Un salto hacia adelante de más de un paso (ej. de
 * "accepted" directo a "in_treatment", saltándose agendar) es válido pero
 * exige `tieneJustificacion` — así nunca queda un salto incoherente sin
 * quedar registrado el porqué.
 *
 * Reglas de cancelación por fase (no todo "cancelled" es igual de libre):
 * antes de aceptar (sent/received) el remitente cancela sin motivo; después
 * de aceptar, `tieneJustificacion` (la nota/motivo) es obligatoria; una vez
 * "completed" ya no se puede cancelar en absoluto — de ahí en adelante solo
 * procede contrarreferencia o cierre, nunca cancelación. */
export function puedeTransicionar(
  actual: InterconsultaEstado,
  siguiente: InterconsultaEstado,
  tieneJustificacion: boolean
): boolean {
  if (actual === siguiente) return false;
  if (ESTADOS_TERMINALES.includes(actual)) return false;

  if (siguiente === "cancelled") {
    const idxActual = ORDEN_AVANCE.indexOf(actual);
    const idxCompleted = ORDEN_AVANCE.indexOf("completed");
    if (idxActual === -1 || idxActual >= idxCompleted) return false;
    const idxAccepted = ORDEN_AVANCE.indexOf("accepted");
    return idxActual >= idxAccepted ? tieneJustificacion : true;
  }
  if (siguiente === "rejected") return actual === "sent" || actual === "received";
  if (siguiente === "closed") return actual === "counter_referral_sent";

  const idxActual = ORDEN_AVANCE.indexOf(actual);
  const idxSiguiente = ORDEN_AVANCE.indexOf(siguiente);
  if (idxActual === -1 || idxSiguiente === -1) return false;
  if (idxSiguiente <= idxActual) return false;
  if (idxSiguiente === idxActual + 1) return true;
  return tieneJustificacion;
}

/** Un caso no se considera correctamente concluido si no tiene
 * contrarreferencia — "closed" exige haber pasado por
 * "counter_referral_sent" (ver `puedeTransicionar`), pero además se expone
 * esta función para que la UI pueda explicarlo antes de intentarlo. */
export function puedeCerrarInterconsulta(estado: InterconsultaEstado): boolean {
  return estado === "counter_referral_sent";
}

export type EventoHistorialEstado = {
  estado: InterconsultaEstado;
  fecha: string;
  uid: string;
  nota?: string;
};

// ---------------------------------------------------------------------------
// Interconsulta — modelo completo
// ---------------------------------------------------------------------------

export type PrioridadInterconsulta = "ordinaria" | "preferente" | "urgente";

/** Nunca se guarda una URL (ni permanente ni firmada) — la descarga siempre
 * pasa por el proxy autenticado /api/conecta/interconsultas/[id]/archivos/
 * [archivoId], que revisa participante en el momento de cada lectura (§6:
 * "revocación efectiva"). */
export type CategoriaArchivoInterconsulta = "radiografia" | "fotografia" | "documento" | "otro";

export type ArchivoInterconsulta = {
  id: string;
  /** Nombre original saneado (solo para mostrarlo/como nombre de descarga) —
   * nunca el nombre interno real del objeto en Storage. */
  nombreOriginalSaneado: string;
  storagePath: string;
  mimeType: string;
  tamanioBytes: number;
  categoriaClinica: CategoriaArchivoInterconsulta;
  subidoPorUid: string;
  fecha: string;
};

export type Contrarreferencia = {
  resumenAtencion: string;
  hallazgosRelevantes?: string;
  procedimientoRealizado?: string;
  estadoActual: string;
  recomendaciones?: string;
  proximaRevision?: string;
  archivos: ArchivoInterconsulta[];
  devolverAlRemitente: boolean;
  fecha: string;
  profesionalResponsableUid: string;
  esBorrador: boolean;
};

export type FuenteInvitacion = "directorio" | "invitacion_enlace";

export type Interconsulta = {
  id: string;
  clinicaRemitenteId: string;
  odontologoRemitenteUid: string;
  pacienteId: string;
  /** Vista limitada del expediente, construida como snapshot al crear la
   * interconsulta (ver resumenPacienteAutorizado.ts) — nunca una referencia
   * viva al expediente completo del paciente. */
  resumenPaciente: ResumenPacienteAutorizado;
  destinatarioUid?: string;
  destinatarioClinicaId?: string;
  especialidadSolicitada: string;
  motivo: string;
  preguntaClinica: string;
  prioridad: PrioridadInterconsulta;
  antecedentesAlertas?: string;
  archivos: ArchivoInterconsulta[];
  consentimientoId: string;
  estado: InterconsultaEstado;
  historialEstados: EventoHistorialEstado[];
  contrarreferencia?: Contrarreferencia;
  /** [odontologoRemitenteUid, destinatarioUid?] — la clave de las reglas de
   * Firestore/Storage: solo estos uids pueden leer/escribir el caso. */
  participantesAutorizados: string[];
  fuenteInvitacion?: FuenteInvitacion;
  invitacionId?: string;
  atribucionUsuarioInvitadoUid?: string;
  creadoEl: string;
  actualizadoEl: string;
  aceptadoEl?: string;
  concluidoEl?: string;
};

export type ResumenPacienteAutorizado = {
  nombre: string;
  edadTexto: string;
  sexo?: string;
  alergias?: string;
  condicionesSistemicas: string[];
  informacionMinima?: string;
};

// ---------------------------------------------------------------------------
// Consentimiento
// ---------------------------------------------------------------------------

export type DestinatarioTipoConsentimiento = "odontologo_registrado" | "clinica" | "invitacion";
export type EstadoConsentimiento = "vigente" | "revocado" | "vencido";

export const VERSION_AVISO_PRIVACIDAD_CONECTA = "2026-08-v1";

/** Documento original — INMUTABLE de por vida una vez creado (§7: "no
 * sobrescribas la evidencia original"). Solo `POST /api/conecta/interconsultas`
 * lo crea; nada lo actualiza salvo el campo `estado`, y solo
 * `POST /api/conecta/consentimientos/[id]` (revocar), que además escribe un
 * registro nuevo en la subcolección `revocaciones` — nunca borra ni reescribe
 * los campos de contenido. */
export type ConsentimientoInterconsulta = {
  id: string;
  pacienteId: string;
  clinicaId: string;
  odontologoUid: string;
  destinatarioTipo: DestinatarioTipoConsentimiento;
  destinatarioId?: string;
  finalidad: string;
  informacionCompartida: string[];
  fecha: string;
  metodoAceptacion: "checkbox_activo";
  registradoPor: string;
  versionAvisoPrivacidad: string;
  estado: EstadoConsentimiento;
  evidencia?: string;
};

/** Subcolección consentimientosInterconsulta/{id}/revocaciones/{autoId} —
 * el evento de revocación, aparte del documento original. */
export type EventoRevocacionConsentimiento = {
  id: string;
  fecha: string;
  revocadoPorUid: string;
  motivo?: string;
};

export const TEXTO_DISCLAIMER_CONSENTIMIENTO =
  "Este registro interno documenta el consentimiento obtenido para esta interconsulta — no sustituye la revisión jurídica, regulatoria y de protección de datos que corresponda a tu consultorio conforme a la legislación mexicana aplicable (LFPDPPP y demás normativa vigente).";

/** Documento único de configuración (configuracionConecta/politicaConservacion)
 * — modelo de datos preparado esta fase, sin lógica de borrado/anonimización
 * automática todavía (§7: "no presentes esta configuración como garantía de
 * cumplimiento normativo"). Editable solo por superadmin. */
export type PoliticaConservacion = {
  diasConservacionTrasCierre?: number;
  permiteExportarCopia: boolean;
  permiteRevocarColaboradorPostCierre: boolean;
  politicaAnonimizacion?: string;
  actualizadoEl: string;
};

// ---------------------------------------------------------------------------
// Capacidades / plan (MO Red, MO Pro Individual, Clínica Fundadora)
// ---------------------------------------------------------------------------

export type PlanConectaId = "mo_red" | "mo_pro_individual" | "clinica_fundadora";

/** Detrás de bandera a propósito (punto 14 del pedido): el contador de
 * interconsultas enviadas siempre se lleva, pero el bloqueo real solo se
 * activa cuando esto se pone en true — así ningún usuario existente pierde
 * acceso a nada hasta que se apruebe explícitamente. */
export const FEATURE_FLAGS = {
  enforceInterconsultaLimits: false,
} as const;

const LIMITE_INTERCONSULTAS_MO_RED = 3;

export function mesActualClave(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/** true si la clínica puede enviar una interconsulta más este mes. Con la
 * bandera apagada, siempre regresa true (no bloquea nada) pero el llamador
 * debe seguir incrementando el contador para cuando se active. */
export function puedeEnviarInterconsulta(
  planConectaId: PlanConectaId | undefined,
  interconsultasEnviadasPorMes: Record<string, number> | undefined,
  fecha = new Date()
): boolean {
  if (!FEATURE_FLAGS.enforceInterconsultaLimits) return true;
  if (planConectaId === "mo_pro_individual" || planConectaId === "clinica_fundadora") return true;
  const enviadas = interconsultasEnviadasPorMes?.[mesActualClave(fecha)] ?? 0;
  return enviadas < LIMITE_INTERCONSULTAS_MO_RED;
}

/** true si una Clínica Fundadora sigue dentro de su ventana de 90 días. */
export function fundadoraActiva(fundadoraHasta: string | undefined, fecha = new Date()): boolean {
  if (!fundadoraHasta) return false;
  return new Date(fundadoraHasta) >= fecha;
}

// ---------------------------------------------------------------------------
// Eventos de crecimiento (analítica interna, cero datos clínicos)
// ---------------------------------------------------------------------------

/** Los 17 tipos originales del pedido, más 4 que distinguen con precisión el
 * momento de "reclamar" del de "aceptar el caso" (reclamar ≠ aceptar), y una
 * apertura real de la página de invitación de una simple vista previa de
 * enlace generada por WhatsApp/Slack/Facebook al reenviar el mensaje (§5):
 * - `invite_claimed`/`access_granted`: se registran al reclamar (identidad
 *   verificada, acceso otorgado) — nunca implican que el destinatario ya
 *   aceptó el caso.
 * - `link_preview_detected`: un bot conocido de vista previa hizo el GET del
 *   token — no cuenta como apertura real.
 * - `invite_page_viewed`: la página realmente se montó en un navegador con
 *   JS — esta es la métrica confiable de apertura, no `invite_opened`
 *   (que se conserva por compatibilidad con el pedido original, pero ya no
 *   se dispara directo desde el GET). */
export const eventoCrecimientoTipos = [
  "professional_profile_created",
  "professional_verification_requested",
  "referral_created",
  "referral_sent",
  "invite_created",
  "invite_shared",
  "invite_opened",
  "invited_user_registered",
  "referral_accepted",
  "referral_rejected",
  "patient_contacted",
  "appointment_scheduled",
  "treatment_started",
  "referral_completed",
  "counter_referral_sent",
  "referral_closed",
  "first_collaboration_completed",
  "invite_claimed",
  "access_granted",
  "link_preview_detected",
  "invite_page_viewed",
] as const;

export type EventoCrecimientoTipo = (typeof eventoCrecimientoTipos)[number];

export type EventoCrecimiento = {
  tipo: EventoCrecimientoTipo;
  fecha: string;
  /** Ausente en eventos anónimos previos a identificarse (ej.
   * `link_preview_detected`, un bot de vista previa golpeando el GET
   * público del token — nadie ha iniciado sesión todavía). */
  uid?: string;
  clinicaId?: string;
  interconsultaId?: string;
  fuenteAdquisicion?: string;
  invitacionId?: string;
  /** Solo en eventos anónimos ligados a una invitación (antes de reclamar) —
   * nunca el token crudo, para poder correlacionar sin poder reidentificarlo. */
  tokenHash?: string;
};

/** Campos que NUNCA deben aparecer en un evento de crecimiento — se usa
 * tanto en tiempo de ejecución (defensivo) como en la prueba de Vitest que
 * garantiza que ningún evento futuro se le olvide filtrar. */
const CAMPOS_PROHIBIDOS_EN_EVENTOS = [
  "nombre",
  "nombrePaciente",
  "diagnostico",
  "telefono",
  "correo",
  "motivo",
  "preguntaClinica",
  "resumenPaciente",
  "contenido",
];

export function eventoTieneCamposClinicos(evento: Record<string, unknown>): boolean {
  return CAMPOS_PROHIBIDOS_EN_EVENTOS.some((campo) => campo in evento);
}

// ---------------------------------------------------------------------------
// Permisos — funciones espejo de las reglas de Firestore, para poder
// probarlas con Vitest sin necesitar el emulador.
// ---------------------------------------------------------------------------

export function esParticipanteInterconsulta(uid: string | undefined, interconsulta: Interconsulta): boolean {
  if (!uid) return false;
  return interconsulta.participantesAutorizados.includes(uid);
}
