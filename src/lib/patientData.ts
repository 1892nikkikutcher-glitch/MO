import { capitalizarNombre } from "./textoNombre";
import type { PrioridadTratamiento } from "./planTratamiento";
import { montoMayorQue, redondearDinero } from "./dinero";

export type Patient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate: string;
  /** Texto libre para datos importados de un sistema anterior que no tienen
   * todavía un campo estructurado propio (domicilio, ocupación, etc.). */
  notas?: string;
  /** Fecha ISO ("YYYY-MM-DD") en que se dio de alta — ausente en pacientes
   * creados antes de este campo o importados en bloque; se usa para el KPI
   * "Nuevos Pacientes (Mes)". */
  createdAt?: string;

  // Ficha de identificación / estudio socioeconómico / contacto — todos
  // opcionales porque los pacientes existentes no los tienen capturados.
  sexo?: string;
  estadoCivil?: string;
  ocupacion?: string;
  escolaridad?: string;
  lugarNacimiento?: string;
  nivelSocioeconomico?: string;
  ingresoFamiliar?: string;
  dependientes?: string;
  tipoVivienda?: string;
  servicios?: string[];
  responsablePago?: string;
  telefonoFijo?: string;
  direccion?: string;
  codigoPostal?: string;
  contactoNombre?: string;
  contactoParentesco?: string;
  contactoTelefono?: string;

  /** Nombre del padre, madre o tutor — se captura cuando el paciente es
   * menor de edad (el campo se muestra/oculta en Datos del Paciente según
   * la fecha de nacimiento). */
  nombreTutor?: string;

  /** Si está activo, el expediente sugiere una cita de prevención cada 6
   * meses a partir de la última cita del paciente (mientras no tenga ya una
   * cita futura agendada). Desactivable por paciente — por ejemplo, para no
   * agobiar a un paciente al que se prefiere atender solo cuando lo pida. */
  recordatorioPrevencion?: boolean;

  /** Escala de Frankl (comportamiento en el sillón dental) para pacientes
   * menores de edad: 1 Definitivamente negativo, 2 Negativo, 3 Positivo,
   * 4 Definitivamente positivo. 0 o ausente = sin calificar. Cuál de los
   * dos campos se captura depende de si el paciente es menor de edad al
   * momento de guardar — ver `esMenorDeEdad` en Datos del Paciente. */
  comportamientoFrankl?: 0 | 1 | 2 | 3 | 4;
  /** Calificación de comportamiento/cooperación (1-5 estrellas) para
   * pacientes adultos. 0 o ausente = sin calificar. */
  comportamientoEstrellas?: 0 | 1 | 2 | 3 | 4 | 5;

  /** Presente solo si este expediente se fusionó dentro de otro (ver
   * "Fusionar Expedientes" en Pacientes) — id del expediente sobreviviente.
   * El documento NUNCA se borra (misma filosofía que el resto de la app:
   * la información clínica no se elimina), solo se oculta de las listas y
   * buscadores mientras este campo esté presente. */
  fusionadoEnId?: string;
  /** ISO datetime — cuándo se fusionó. */
  fusionadoEn?: string;
};

/** Convierte la fecha ISO ("YYYY-MM-DD") de una cita a formato día/mes/año
 * ("DD/MM/YYYY"), como el resto de la plataforma — nunca se muestra la
 * fecha de una cita en formato ISO crudo a un usuario o paciente. */
export function formatFechaCita(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function calcularEdadDetallada(birthDate: string): { years: number; months: number } | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
}

/** Ej. "38 años, 4 meses" · "8 meses" · "1 año" */
export function formatEdad(birthDate: string): string {
  const edad = calcularEdadDetallada(birthDate);
  if (!edad) return "Sin registrar";
  const { years, months } = edad;
  const partes: string[] = [];
  if (years > 0) partes.push(`${years} ${years === 1 ? "año" : "años"}`);
  if (months > 0 || years === 0) partes.push(`${months} ${months === 1 ? "mes" : "meses"}`);
  return partes.join(", ");
}

/** Ej. "Delia Martínez Severiano (57)" — formato estándar para mostrar un
 * paciente por nombre junto con su edad, usado en selectores y listados.
 * Capitaliza el nombre al vuelo (sin tocar lo guardado en Firestore) para
 * que expedientes importados con el nombre en minúsculas se vean como
 * nombres propios en toda la plataforma. */
export function formatNombreConEdad(name: string, birthDate: string): string {
  const edad = calcularEdadDetallada(birthDate);
  const nombreCapitalizado = capitalizarNombre(name);
  return edad ? `${nombreCapitalizado} (${edad.years})` : nombreCapitalizado;
}

function normalizarBusqueda(s: string): string {
  return Array.from(s.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < 0x300 || codigo > 0x36f; // fuera del rango de marcas diacríticas combinantes
    })
    .join("")
    .toLowerCase()
    .trim();
}

/** Compara sin acentos/mayúsculas, por coincidencia parcial del nombre
 * ("mar" encuentra "María") o por iniciales ("dms" encuentra "Delia
 * Martínez Severiano") — para buscar pacientes más rápido en listas largas. */
export function coincidePaciente(busqueda: string, nombre: string): boolean {
  const q = normalizarBusqueda(busqueda);
  if (!q) return true;
  const nombreNorm = normalizarBusqueda(nombre);
  if (nombreNorm.includes(q)) return true;
  const iniciales = nombreNorm
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra[0])
    .join("");
  return iniciales.includes(q.replace(/\s+/g, ""));
}

export const patients: Patient[] = [
  { id: "1", name: "María Fernanda López", phone: "55 1234 5678", birthDate: "1990-04-12" },
  { id: "2", name: "Carlos Alberto Ramírez", phone: "55 8765 4321", birthDate: "1985-11-02" },
  { id: "3", name: "Ana Sofía Torres", phone: "55 2468 1357", birthDate: "2001-07-25" },
  { id: "4", name: "Jorge Iván Mendoza", phone: "55 9081 7263", birthDate: "1978-01-30" },
  { id: "5", name: "Paola Guadalupe Ríos", phone: "55 3344 5566", birthDate: "1995-09-14" },
];

export type LineItem = {
  id: string;
  procedure: string;
  /** Total final de la línea (precioUnitario × cantidad, con descuento ya aplicado). */
  price: number;
  teeth: number[];
  note: string;
  /** Desglose para el PDF/impresión — opcional por compatibilidad con
   * presupuestos guardados antes de que existiera el desglose; si falta,
   * se asume precioUnitario = price, cantidad = 1, descuentoPct = 0. */
  precioUnitario?: number;
  cantidad?: number;
  descuentoPct?: number;
  /** Presente solo si este renglón nació de un PlanTratamientoItem
   * confirmado (ver planTratamiento.ts) — cierra la trazabilidad de vuelta
   * al diagnóstico/plan que lo originó. `prioridad` es un snapshot: un
   * presupuesto histórico conserva la prioridad tal como era cuando se
   * generó, aunque el plan cambie después. Ausente en renglones capturados
   * a mano o directo del catálogo. */
  origenClinico?: { diagnosticoId: string; planTratamientoItemId: string; prioridad: PrioridadTratamiento };
};

export type BudgetData = {
  folio: string;
  fecha: string;
  medico: string;
  tipoDePrecio: string;
  especialidad: string;
  diagnostico: string;
  items: LineItem[];
  total: number;
  /** Días de vigencia desde `fecha` — editable por presupuesto, nace en 30.
   * Ausente en presupuestos guardados antes de este campo. */
  vigenciaDias?: number;
  /** ISO (YYYY-MM-DD) — fecha límite de validez, calculada desde `fecha` +
   * `vigenciaDias` (ver src/lib/presupuestoVigencia.ts). Ausente en
   * presupuestos guardados antes de este campo — nunca se les inventa una
   * fecha retroactiva. */
  fechaVigenciaHasta?: string;
};

export const presupuestoEstadoOptions = ["pendiente", "aceptado", "rechazado", "expirado"] as const;
export type EstadoPresupuesto = (typeof presupuestoEstadoOptions)[number];

export type SavedBudget = BudgetData & {
  id: string;
  /** Ausente en presupuestos guardados antes de que existiera este campo —
   * tratar como "pendiente" en todo cálculo/UI (`p.estado ?? "pendiente"`). */
  estado?: EstadoPresupuesto;
  /** true si alguien lo editó a mano desde Presupuestos. Un presupuesto
   * ligado a una cita (id "pres-cita-<id>") se regenera automáticamente
   * cada vez que esa cita se vuelve a guardar — sin esta bandera, esa
   * regeneración pisaba en silencio cualquier ajuste manual de precio. */
  editadoManualmente?: boolean;
};

export type Tratamiento = {
  id: string;
  folio: string;
  label: string;
  price: number;
};

export type TratamientoPendiente = Tratamiento & { pendiente: number };

export type LineaPago = {
  id: string;
  tratamientoId: string | null;
  folio: string | null;
  label: string;
  monto: number;
  /** true solo en líneas "extra" de un pago (sin tratamiento de un
   * presupuesto existente) que sí representan un tratamiento/consulta —
   * generan automáticamente su propio presupuesto para no quedar
   * desincronizadas. Pagos que no son tratamientos (ej. membresías) no
   * deben marcar esto. */
  generarPresupuesto?: boolean;
};

export type Pago = {
  id: string;
  fecha: string;
  medico: string;
  formaPago: string;
  lineas: LineaPago[];
  total: number;
  facturar: boolean;
  firma: string | null;
};

export type MedicamentoRecetado = {
  id: string;
  nombre: string;
  instrucciones: string;
};

export type Receta = {
  id: string;
  folio: string;
  fecha: string;
  hora: string;
  medico: string;
  /** Foto de estos datos al momento de expedir la receta — no cambian aunque el paciente se edite después. */
  edadTexto: string;
  sexo: string;
  peso: string;
  estatura: string;
  temperatura: string;
  alergias: string;
  diagnostico: string;
  medicamentos: MedicamentoRecetado[];
  notas: string;
};

/** Nota de evolución clínica en formato PSOAP, una por visita/seguimiento. */
export type NotaEvolucion = {
  id: string;
  fecha: string;
  medico: string;
  presentacion: string;
  subjetivo: string;
  objetivo: string;
  analisis: string;
  pronostico: string;
};

export type FotoPaciente = {
  id: string;
  url: string;
  /** Ruta del objeto en Firebase Storage (ej.
   * "users/{uid}/pacientes/{id}/fotos/extraorales/xyz.jpg") — se guarda
   * aparte de `url` para poder borrar el archivo del Storage sin tener que
   * derivarla de la URL de descarga. */
  path: string;
  name: string;
  /** ISO datetime — cuándo se subió. */
  fecha: string;
};

/** Documento `users/{clinicUid}/pacientes/{patientId}/fotos/datos` — solo
 * guarda URLs (apuntan a Firebase Storage); las imágenes en sí nunca viven
 * en Firestore. `ineFrente`/`ineReverso` son opcionales — no toda clínica
 * captura la identificación oficial del paciente. */
export type FotosPaciente = {
  perfil?: FotoPaciente | null;
  extraorales: FotoPaciente[];
  intraorales: FotoPaciente[];
  ineFrente?: FotoPaciente | null;
  ineReverso?: FotoPaciente | null;
  /** Fotos anexadas desde una Nota de Evolución (ver SeccionQueEncontraste
   * y QueEncontraste.fotosVinculadasIds en notasEvolucion.ts) — a criterio
   * del médico, para dejar evidencia visual del hallazgo del día. Ausente
   * en documentos guardados antes de este campo. */
  notasEvolucion?: FotoPaciente[];
};

export const fotosVacias: FotosPaciente = { extraorales: [], intraorales: [] };

export type HorarioAtencion = {
  apertura: string;
  comidaInicio: string;
  comidaFin: string;
  cierre: string;
  /** Confirmación explícita del médico de que este horario es correcto —
   * NUNCA se marca automáticamente al editar un campo (eso la invalida, ver
   * `editarCampoHorario` en horarioAtencion.ts). Documentos ya existentes sin
   * este campo se interpretan como pendientes de confirmar. */
  confirmado?: boolean;
  confirmadoEn?: string;
  confirmadoPorUid?: string;
};

export const horarioInicial: HorarioAtencion = {
  apertura: "09:00",
  comidaInicio: "14:00",
  comidaFin: "15:00",
  cierre: "19:00",
};

export type PerfilDoctor = {
  nombre: string;
  cedulaProfesional: string;
  especialidad: string;
  correo: string;
  telefono: string;
  /** Escuela de egreso, para el logotipo institucional en recetas. */
  escuelaEgreso: string;
  /** Link a una imagen del escudo/logo de la escuela (el usuario debe tener derecho de uso). */
  logoEscuelaUrl: string;
  /** Logo propio de la clínica o consultorio, opcional — se usa junto al de la escuela en recetas. */
  logoClinicaUrl: string;
  /** Imagen de la firma del doctor, para recetas enviadas por medios digitales (PDF/WhatsApp). */
  firmaDigitalUrl: string;
  direccionClinica: string;
  /** Ej. "Esta receta es válida durante 48h" — se imprime en cada receta. */
  textoValidezReceta: string;
};

export const perfilDoctorInicial: PerfilDoctor = {
  nombre: "",
  cedulaProfesional: "",
  especialidad: "",
  correo: "",
  telefono: "",
  escuelaEgreso: "",
  logoEscuelaUrl: "",
  logoClinicaUrl: "",
  firmaDigitalUrl: "",
  direccionClinica: "",
  textoValidezReceta: "Esta receta es válida durante 48h",
};

export type PlanId = "prueba" | "consultorio" | "clinicas";

export const DURACION_PRUEBA_DIAS = 14;

export const planesDisponibles: {
  id: PlanId;
  nombre: string;
  precio: string;
  /** Monto mensual aproximado en MXN, usado para calcular MRR/ARPU en el
   * Panel de administrador (misma cifra que ya está en `precio`, pero como
   * número — evita parsear el string). */
  precioMensualAprox: number;
  unidades: string;
  caracteristicas: string[];
}[] = [
  {
    id: "prueba",
    nombre: "Prueba (14 días)",
    precio: "Gratis",
    precioMensualAprox: 0,
    unidades: "1 unidad",
    caracteristicas: [
      "Acceso completo durante 14 días",
      "Te ayudamos a subir tu consulta",
      "Suficiente para ver el cambio antes de decidir",
    ],
  },
  {
    id: "consultorio",
    nombre: "Consultorio",
    precio: "$280 cada 4 semanas",
    precioMensualAprox: 280,
    unidades: "Hasta 2 unidades",
    caracteristicas: [
      "Hasta 2 unidades / consultorios",
      "Colaboradores — se agregan desde Administración → Colaboradores",
    ],
  },
  {
    id: "clinicas",
    nombre: "Clínicas",
    precio: "$840 cada 4 semanas",
    precioMensualAprox: 840,
    unidades: "3 unidades o más",
    caracteristicas: [
      "3 unidades o más",
      "Colaboradores — se agregan desde Administración → Colaboradores",
      "Ej. exige un odontólogo con horario específico por unidad",
    ],
  },
];

export type SuscripcionPlan = {
  planActivo: PlanId;
  /** Fecha ISO (YYYY-MM-DD) en que arrancó el periodo de prueba de esta clínica. */
  pruebaIniciadaEl: string;
  /** Los siguientes campos los escribe únicamente el webhook de Stripe. */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Passthrough crudo del status de Stripe (ej. "active", "past_due",
   * "canceled") — informativo, no se usa para decidir MRR/pagando. */
  stripeStatus?: string;
  /** Estado normalizado — este es el que de verdad decide si una clínica
   * "paga" (genera MRR) para el Panel de administrador. Ausente = tratar
   * como "prueba" (retrocompatible). */
  estadoSuscripcion?: "prueba" | "activa" | "atrasada" | "cancelada";
  /** Quién mandó el último cambio a este documento. El webhook de Stripe
   * siempre escribe "stripe" — así, en cuanto existe una suscripción real,
   * cualquier evento futuro de Stripe retoma el control aunque el Panel de
   * administrador la haya editado manualmente antes. Ausente = "manual"
   * (clínicas que nunca han pasado por Stripe). */
  origenSuscripcion?: "stripe" | "manual";
};

export type RolClinica = "admin" | "colaborador";

/** Documento `clinics/{clinicId}` — clinicId es el uid del dueño. */
export type ClinicInfo = {
  ownerId: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  correoContacto?: string;
  rfc?: string;
  /** Persona designada como responsable sanitario ante COFEPRIS/COPRISEM —
   * no siempre es el mismo doctor que atiende, así que se captura aparte. */
  responsableSanitario?: string;
  cedulaResponsableSanitario?: string;
  /** Fecha ISO (YYYY-MM-DD) en que se creó el registro de la clínica en la
   * plataforma — se usa en el Panel de administrador. Ausente en clínicas
   * creadas antes de este campo. */
  creadoEl?: string;
  /** Controla el acceso real a la app (ver Dashboard.tsx). Ausente = tratar
   * como "activa" (retrocompatible). Se cambia únicamente desde el Panel
   * de administrador — es el mecanismo principal para revocar acceso, en
   * vez de borrar el documento (que PatientDataContext podría recrear). */
  estadoCuenta?: "activa" | "suspendida" | "cancelada";
  /** PIN de 4 dígitos para el candado de privacidad del Dashboard Principal
   * (ocultar cifras financieras cuando la sesión se comparte con
   * colaboradores). No es un mecanismo de seguridad real — la protección
   * real es Firebase Auth/reglas de Firestore — solo evita que alguien vea
   * de reojo la pantalla. */
  pinPrivacidad?: string;
  /** Plan de MO Conecta de esta clínica y, si es "clinica_fundadora", hasta
   * cuándo dura esa ventana de 90 días — ver moConecta.ts (fundadoraActiva).
   * Solo el Panel de administrador otorga "clinica_fundadora". */
  planConectaId?: "mo_red" | "mo_pro_individual" | "clinica_fundadora";
  fundadoraHasta?: string;
};

/** Documento `clinicMembers/{clinicId}_{uid}`. Campo `role` en inglés para
 * compatibilidad con la colección compartida de sonrie-x-todos-dental. */
export type ClinicMember = {
  clinicId: string;
  uid: string;
  nombre: string;
  correo: string;
  whatsapp?: string;
  role: RolClinica;
  status: "active";
  /** Ausente o vacío = sin restricción, ve todos los recursos/calendarios
   * de la Agenda. Con al menos un id de recurso (médico o unidad), limita
   * qué citas puede ver/editar este colaborador — ver firestore.rules. */
  recursosVisibles?: string[];
};

/** Documento `clinicInvites/{clinicId}_{correo}` cuando hay correo — pendiente
 * hasta que se reclama. Sin correo (solo WhatsApp) usa un id distinto, ver
 * invitarColaborador; en ese caso la invitación no puede auto-detectarse al
 * iniciar sesión (eso requiere el correo exacto) hasta que se le agregue uno. */
export type ClinicInvite = {
  id?: string;
  clinicId: string;
  nombreClinica: string;
  email: string;
  nombre: string;
  whatsapp?: string;
  role: RolClinica;
  status: "pending" | "claimed";
};

export const categoriaSugerenciaOptions = [
  "sugerencia",
  "problema",
  "nueva_funcion",
  "facturacion",
  "otro",
] as const;
export type CategoriaSugerencia = (typeof categoriaSugerenciaOptions)[number];

export const estadoSugerenciaOptions = ["nueva", "leida", "en_revision", "resuelta"] as const;
export type EstadoSugerencia = (typeof estadoSugerenciaOptions)[number];

/** Documento `sugerenciasPlataforma/{autoId}` — cerrado por completo a
 * lectura/escritura de cliente en firestore.rules; solo lo toca el backend
 * (POST /api/sugerencias para crear, GET /api/admin/resumen para leer). El
 * cliente que manda una sugerencia nunca decide clinicId/clinicNombre/autor
 * ni la fecha — el servidor los resuelve del token verificado. */
export type SugerenciaPlataforma = {
  id: string;
  clinicId: string;
  clinicNombre: string;
  autor: string;
  categoria: CategoriaSugerencia;
  mensaje: string;
  estado: EstadoSugerencia;
  /** ISO datetime, generado en servidor. */
  fecha: string;
};

export type TipoRecurso = "medico" | "unidad";

export type Recurso = {
  id: string;
  nombre: string;
  color: string;
  tipo: TipoRecurso;
};

/** Paleta neón — se usa como franja lateral, resplandor y punto de color
 * del recurso (médico/unidad) en Agenda, nunca como texto ni relleno
 * completo de la tarjeta (esa es una superficie neutra, ver --cita-card-bg
 * en globals.css), así que puede ser tan vivo como se quiera sin afectar
 * la legibilidad. El estatus de la cita se distingue aparte, con su
 * propio badge (ver CITA_ESTATUS_HEX en agendaHelpers.ts). */
export const RECURSO_COLOR_PALETTE = [
  "#5D00FF", // Azul violeta
  "#CEFF05", // Amarillo neón
  "#3FD3F3", // Azul neón
  "#8723C4", // Púrpura
  "#FE0500", // Rojo
  "#FF2E9B", // Rosa eléctrico
  "#FF6602", // Naranja
  "#7E3AEC", // Púrpura azulado
];

/** Da un color que ningún recurso existente esté usando todavía, para que
 * cada médico/unidad se distinga a simple vista (y en los emojis de color
 * de la agenda por WhatsApp). Si ya se usaron todos, se reparten de forma
 * predecible en vez de repetir siempre el primero. */
export function elegirColorDisponible(coloresEnUso: string[]): string {
  const disponible = RECURSO_COLOR_PALETTE.find((c) => !coloresEnUso.includes(c));
  if (disponible) return disponible;
  return RECURSO_COLOR_PALETTE[coloresEnUso.length % RECURSO_COLOR_PALETTE.length];
}

export const citaEstatusOptions = [
  "Agendada",
  "Confirmada",
  "En espera",
  "Atendida",
  "Reagendada",
  "Cancelada",
  "No Asistió",
] as const;
export type CitaEstatus = (typeof citaEstatusOptions)[number];

export type FrecuenciaRecurrencia = "mensual" | "trimestral" | "semestral";

export type UnidadSeguimiento = "dias" | "semanas" | "meses";
export type IntervaloSeguimiento = { cantidad: number; unidad: UnidadSeguimiento };

export type CitaAgenda = {
  id: string;
  folio: string;
  /** @deprecated Se conserva solo por retrocompatibilidad con citas creadas
   * antes de separar médico y unidad — para citas nuevas o editadas, usar
   * medicoId/unidadId. Se mantiene sincronizado como medicoId || unidadId
   * mientras exista código legado que aún lo lea. */
  recursoId: string;
  /** Recurso tipo "medico" asignado a la cita, independiente de la unidad. */
  medicoId?: string | null;
  /** Recurso tipo "unidad" asignado a la cita, independiente del médico. */
  unidadId?: string | null;
  patientId: string | null;
  paciente: string;
  tratamientos: string[];
  /** Costo estimado del procedimiento, texto libre (ej. "$1,200") — se usa en el recordatorio de WhatsApp. */
  costo?: string;
  comentarios: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: CitaEstatus;
  recurrenciaId: string | null;
  /** Hora real (HH:MM) en que el paciente se presentó — asistencia de
   * pacientes. Se estampa automáticamente al marcar la cita "En espera". */
  horaLlegada?: string | null;

  /** Si está activo, al marcar esta cita "Atendida" se genera automáticamente
   * la siguiente cita de seguimiento (ver src/lib/seguimientoAutomatico.ts).
   * Mecanismo independiente de recurrenciaId (recurrencia por lote) —
   * mutuamente excluyentes en la UI, nunca conviven en la misma cita. */
  seguimientoAutomatico?: boolean;
  /** Comparten esta id todas las citas de una misma cadena de seguimiento,
   * sin importar cuántas veces cambie el intervalo entre una y otra —
   * determinística: "seg-<id de la cita que inició la cadena>". */
  seguimientoCadenaId?: string;
  /** Id de la cita "Atendida" que generó ESTA cita — clave de idempotencia:
   * si ya existe una cita con este seguimientoOrigenCitaId, no se genera
   * otra aunque se vuelva a guardar la cita de origen. */
  seguimientoOrigenCitaId?: string;
  /** Cuánto falta desde ESTA cita hasta la siguiente de su cadena —
   * decisión clínica del doctor en cada atención, nunca un valor fijo. */
  seguimientoIntervalo?: IntervaloSeguimiento;
  /** 0 implícito en la cita que inició la cadena; 1, 2, 3... en cada cita
   * generada a partir de la anterior. */
  seguimientoSecuencia?: number;
  /** Motivo de la cita de seguimiento futura, confirmado por el doctor —
   * nunca se copian los tratamientos de la cita de hoy ni se inventa un
   * motivo por default. */
  seguimientoMotivo?: string;
  /** Ausente = cita creada a mano (compatibilidad con citas existentes). */
  origenCita?: "manual" | "seguimiento_automatico";
};

export const laboratorioTipoOptions = ["Dental", "Químico", "Radiografía"] as const;
export type TipoLaboratorio = (typeof laboratorioTipoOptions)[number];

export const laboratorioEstatusOptions = ["Enviado", "En proceso", "Recibido"] as const;
export type LaboratorioEstatus = (typeof laboratorioEstatusOptions)[number];

export type SolicitudLaboratorio = {
  id: string;
  tipo: TipoLaboratorio;
  laboratorio: string;
  medico: string;
  trabajo: string;
  dientes: number[];
  fechaEnvio: string;
  fechaEntrega: string;
  costo: number;
  estatus: LaboratorioEstatus;
};

export function formatCurrency(value: number) {
  return `$${value.toLocaleString("es-MX")}`;
}

export function buildReciboTexto(patientName: string, pago: Pago) {
  const lineas = [
    "Recibo de Pago",
    `Paciente: ${patientName}`,
    `Fecha: ${pago.fecha}`,
    `Médico: ${pago.medico}`,
    `Forma de pago: ${pago.formaPago}`,
    "",
    ...pago.lineas.map((l) => `- ${l.label}: ${formatCurrency(l.monto)}`),
    "",
    `Total: ${formatCurrency(pago.total)}`,
    pago.facturar ? "Requiere factura: Sí" : "",
  ].filter(Boolean);
  return lineas.join("\n");
}

export function tratamientosDeDisponibles(presupuestos: SavedBudget[]): Tratamiento[] {
  return presupuestos.flatMap((p) =>
    p.items.map((item) => ({
      id: item.id,
      folio: p.folio,
      label: item.note || item.procedure,
      price: item.price,
    }))
  );
}

export function computeTratamientosPendientes(
  presupuestos: SavedBudget[],
  pagos: Pago[],
  devoluciones: DevolucionPago[] = []
): TratamientoPendiente[] {
  const pagadoPorTratamiento: Record<string, number> = {};
  pagos.forEach((pago) => {
    pago.lineas.forEach((linea) => {
      if (linea.tratamientoId) {
        pagadoPorTratamiento[linea.tratamientoId] =
          (pagadoPorTratamiento[linea.tratamientoId] ?? 0) + linea.monto;
      }
    });
  });
  // La fuente de verdad es efectoTratamiento POR RENGLÓN de la devolución —
  // solo "continua" reabre saldo; el resto (cancelado/referido/pendiente/
  // solo_financiero) nunca genera una cuenta por cobrar automática solo
  // porque hubo dinero devuelto.
  devoluciones
    .filter((d) => d.estado === "completada")
    .forEach((d) => {
      (d.itemsAfectados ?? [])
        .filter((item) => item.efectoTratamiento === "continua")
        .forEach((item) => {
          if (item.tratamientoId) {
            pagadoPorTratamiento[item.tratamientoId] = (pagadoPorTratamiento[item.tratamientoId] ?? 0) - item.montoDevuelto;
          }
        });
    });

  return tratamientosDeDisponibles(presupuestos)
    .map((t) => ({
      ...t,
      pendiente: redondearDinero(t.price - (pagadoPorTratamiento[t.id] ?? 0)),
    }))
    .filter((t) => montoMayorQue(t.pendiente, 0));
}

export const motivoDevolucionOptions = [
  "procedimiento_no_realizado", "suspension_clinica", "referencia_especialista",
  "cambio_plan_tratamiento", "paciente_decide_no_continuar", "pago_duplicado",
  "error_cobro", "cortesia_bonificacion", "otro",
] as const;
export type MotivoDevolucion = (typeof motivoDevolucionOptions)[number];

export const efectoTratamientoOptions = ["continua", "cancelado", "referido", "pendiente", "solo_financiero"] as const;
export type EfectoTratamiento = (typeof efectoTratamientoOptions)[number];

export const metodoDevolucionOptions = ["efectivo", "transferencia", "reverso_tarjeta", "otro"] as const;
export type MetodoDevolucion = (typeof metodoDevolucionOptions)[number];

/** "anulada" NO existe a propósito — un movimiento de efectivo que ya
 * ocurrió (una devolución "completada") nunca puede "no haber pasado".
 * "cancelada" solo es válida ANTES de completar (un borrador nunca movió
 * dinero real); un error posterior a "completada" se documenta con el
 * campo `correccion`, sin cambiar este estado. */
export const estadoDevolucionOptions = ["borrador", "pendiente_autorizacion", "completada", "cancelada"] as const;
export type EstadoDevolucion = (typeof estadoDevolucionOptions)[number];

/** Mismo vocabulario que TipoFirmante (notasEvolucion.ts) — se repite aquí
 * en vez de importarlo, para no crear un ciclo de imports. */
export type RelacionReceptorDevolucion = "paciente" | "madre" | "padre" | "tutor" | "representante";

/** Snapshot de qué renglón del PAGO originó la devolución — ancla en
 * LineaPago.id (no en LineItem.id directo) porque lo que se devuelve es
 * dinero de una línea de un pago concreto. folio/label se copian al
 * momento de la devolución para poder mostrar "qué se devolvió" aunque el
 * presupuesto cambie o el renglón se borre después. efectoTratamiento vive
 * AQUÍ (no a nivel de toda la devolución) porque una sola devolución puede
 * tocar varios tratamientos con destinos clínicos distintos (uno referido,
 * otro que continúa) — este campo es la única fuente de verdad para los
 * cálculos de saldo pendiente. */
export type ItemDevolucion = {
  lineaPagoId: string;
  tratamientoId: string | null;
  folio: string | null;
  label: string;
  montoDevuelto: number;
  efectoTratamiento: EfectoTratamiento;
};

export type DevolucionPago = {
  id: string;
  patientId: string;
  pagoOrigenId: string;
  presupuestoId?: string;
  tipo: "total" | "parcial";
  monto: number;
  moneda: "MXN";
  metodo: MetodoDevolucion;
  motivo: MotivoDevolucion;
  detalleMotivo?: string;
  /** OPCIONAL — representa el efecto SOLO de montoNoAsignadoTratamientos,
   * nunca un "efecto general" de toda la devolución. Ausente cuando no hay
   * monto sin asignar (nunca se rellena con un valor inventado). Cuando
   * itemsAfectados existe, el efecto real para saldo es SIEMPRE
   * item.efectoTratamiento — este campo nunca se usa en ese caso. */
  efectoTratamiento?: EfectoTratamiento;
  itemsAfectados?: ItemDevolucion[];
  /** Monto de la devolución no asignado a ningún tratamiento específico.
   * suma(itemsAfectados.montoDevuelto) + montoNoAsignadoTratamientos debe
   * igualar `monto`, dentro de una tolerancia de centavos — nunca una
   * diferencia silenciosa (ver devolucionesPago.ts). */
  montoNoAsignadoTratamientos?: number;
  notaEvolucionId?: string;
  /** Opcional — id de una interconsulta de MO Conecta, si existe. No se
   * valida contra ese dominio (aislado a propósito) — es solo referencia. */
  interconsultaId?: string;
  recibidoPor?: { nombre: string; relacion?: RelacionReceptorDevolucion };
  referenciaTransferencia?: string;
  firmaRecepcionStoragePath?: string;
  firmaRecepcionUrl?: string;
  registradoPorUid: string;
  autorizadoPorUid?: string;
  entregadoPorUid?: string;
  estado: EstadoDevolucion;
  /** ISO datetime — a diferencia de Pago.fecha ("DD/MM/YYYY"), para poder
   * derivar la llave del corte de caja con un simple .slice(0,10). */
  creadoEn: string;
  completadoEn?: string;
  canceladoEn?: string;
  canceladoPorUid?: string;
  /** Anotación de que existió un ajuste posterior a una devolución YA
   * completada (ej. el dinero regresó a la clínica por otra vía). NUNCA
   * cambia `estado`, NUNCA resta de devolucionesResumen.totalDevuelto ni de
   * finanzas.devolucionesPorFecha — la salida de efectivo original sigue
   * siendo un hecho histórico. Un movimiento compensatorio real queda fuera
   * de alcance de Fase 1; aquí solo se deja trazabilidad de que se revisó. */
  correccion?: { motivo: string; montoRegresado?: number; registradaEn: string; registradaPorUid: string };
  fiscal?: {
    cfdiOrigenId?: string;
    requiereRevisionFiscal: boolean;
    cfdiEgresoId?: string;
    estado: "no_aplica" | "pendiente" | "procesado";
  };
};

/** Rollup por pago — en Fase 2 vivirá en
 * users/{clinicUid}/pacientes/{patientId}/devolucionesResumen/{pagoId}
 * (id = pagoId, para leerlo/escribirlo por referencia directa dentro de
 * una transacción, sin queries). devueltoPorLinea protege el límite POR
 * RENGLÓN, no solo el límite global del pago. */
export type DevolucionResumen = {
  pagoId: string;
  totalDevuelto: number;
  devueltoPorLinea: Record<string, number>;
  actualizadoEn: string;
};
