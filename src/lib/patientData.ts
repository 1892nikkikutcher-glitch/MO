export type Patient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate: string;
};

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
  fecha: string;
  medico: string;
  peso: string;
  estatura: string;
  temperatura: string;
  alergias: string;
  diagnostico: string;
  medicamentos: MedicamentoRecetado[];
  notas: string;
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
  comentarios: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: CitaEstatus;
  recurrenciaId: string | null;
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
