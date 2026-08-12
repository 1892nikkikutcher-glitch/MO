export type Patient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate: string;
  /** Texto libre para datos importados de un sistema anterior que no tienen
   * todavía un campo estructurado propio (domicilio, ocupación, etc.). */
  notas?: string;
};

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
 * paciente por nombre junto con su edad, usado en selectores y listados. */
export function formatNombreConEdad(name: string, birthDate: string): string {
  const edad = calcularEdadDetallada(birthDate);
  return edad ? `${name} (${edad.years})` : name;
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
  price: number;
  teeth: number[];
  note: string;
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
};

export type SavedBudget = BudgetData & { id: string };

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

export type HorarioAtencion = {
  apertura: string;
  comidaInicio: string;
  comidaFin: string;
  cierre: string;
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
  unidades: string;
  caracteristicas: string[];
}[] = [
  {
    id: "prueba",
    nombre: "Prueba (14 días)",
    precio: "Gratis",
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
    unidades: "Hasta 2 unidades",
    caracteristicas: [
      "Hasta 2 unidades / consultorios",
      "Colaboradores (cupo y puestos por definir)",
    ],
  },
  {
    id: "clinicas",
    nombre: "Clínicas",
    precio: "$840 cada 4 semanas",
    unidades: "3 unidades o más",
    caracteristicas: [
      "3 unidades o más",
      "Colaboradores (cupo y puestos por definir)",
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
  stripeStatus?: string;
};

export type RolClinica = "admin" | "colaborador";

/** Documento `clinics/{clinicId}` — clinicId es el uid del dueño. */
export type ClinicInfo = {
  ownerId: string;
  nombre: string;
};

/** Documento `clinicMembers/{clinicId}_{uid}`. Campo `role` en inglés para
 * compatibilidad con la colección compartida de sonrie-x-todos-dental. */
export type ClinicMember = {
  clinicId: string;
  uid: string;
  nombre: string;
  correo: string;
  role: RolClinica;
  status: "active";
};

/** Documento `clinicInvites/{clinicId}_{correo}` — pendiente hasta que se reclama. */
export type ClinicInvite = {
  clinicId: string;
  nombreClinica: string;
  email: string;
  nombre: string;
  role: RolClinica;
  status: "pending" | "claimed";
};

export type TipoRecurso = "medico" | "unidad";

export type Recurso = {
  id: string;
  nombre: string;
  color: string;
  tipo: TipoRecurso;
};

export const recursosIniciales: Recurso[] = [
  { id: "r1", nombre: "Nicolás Medina González", color: "#22c55e", tipo: "medico" },
  { id: "r2", nombre: "Ana Paola Ríos Cervantes", color: "#3b82f6", tipo: "medico" },
  { id: "r3", nombre: "Unidad 1 · Consultorio A", color: "#f59e0b", tipo: "unidad" },
  { id: "r4", nombre: "Unidad 2 · Consultorio B", color: "#dc2626", tipo: "unidad" },
];

export const citaEstatusOptions = [
  "Agendada",
  "Confirmada",
  "En espera",
  "Atendida",
  "Cancelada",
] as const;
export type CitaEstatus = (typeof citaEstatusOptions)[number];

export type FrecuenciaRecurrencia = "mensual" | "trimestral" | "semestral";

export type CitaAgenda = {
  id: string;
  folio: string;
  recursoId: string;
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
  /** Hora real (HH:MM) en que el paciente se presentó — asistencia de pacientes. */
  horaLlegada?: string | null;
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
  pagos: Pago[]
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

  return tratamientosDeDisponibles(presupuestos)
    .map((t) => ({
      ...t,
      pendiente: t.price - (pagadoPorTratamiento[t.id] ?? 0),
    }))
    .filter((t) => t.pendiente > 0.009);
}
