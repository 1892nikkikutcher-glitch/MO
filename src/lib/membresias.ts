/** Membresías de pacientes: planes configurables por la clínica (beneficios
 * de uso limitado, descuentos) y las membresías activas/históricas de cada
 * paciente, con su propio conteo de usos por beneficio. */

export type DuracionTipo = "mensual" | "trimestral" | "semestral" | "anual" | "personalizada";

export const duracionOptions: { value: DuracionTipo; label: string }[] = [
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "personalizada", label: "Personalizada" },
];

export type BeneficioTipo = "uso" | "descuento";

export type BeneficioPlan = {
  id: string;
  nombre: string;
  tipo: BeneficioTipo;
  /** Veces que se puede usar durante la vigencia. null = ilimitado. Solo aplica a tipo "uso". */
  limite: number | null;
  /** Solo tipo "descuento": porcentaje aplicado a los tratamientos indicados. */
  descuentoPorcentaje?: number;
  /** Texto libre: a qué tratamientos aplica (ej. "Resinas, Extracciones"). */
  tratamientosAplicables?: string;
};

export type MembershipPlan = {
  id: string;
  nombre: string;
  precio: number;
  duracionTipo: DuracionTipo;
  duracionDiasPersonalizada?: number;
  renovacionAutomatica: boolean;
  beneficios: BeneficioPlan[];
  exclusiones: string;
};

export type UsoBeneficio = {
  fecha: string;
  profesional: string;
};

export type EstatusMembresia = "activa" | "vencida" | "cancelada";

export type PatientMembership = {
  id: string;
  planId: string;
  planNombre: string;
  precio: number;
  fechaInicio: string;
  fechaFin: string;
  estatus: EstatusMembresia;
  beneficios: BeneficioPlan[];
  usos: Record<string, UsoBeneficio[]>;
  pagoId: string | null;
};

export function calcularFechaFin(fechaInicioISO: string, tipo: DuracionTipo, diasPersonalizados?: number): string {
  const d = new Date(`${fechaInicioISO}T00:00:00`);
  if (tipo === "mensual") d.setMonth(d.getMonth() + 1);
  else if (tipo === "trimestral") d.setMonth(d.getMonth() + 3);
  else if (tipo === "semestral") d.setMonth(d.getMonth() + 6);
  else if (tipo === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + (diasPersonalizados ?? 30));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function estatusReal(membresia: PatientMembership): EstatusMembresia {
  if (membresia.estatus === "cancelada") return "cancelada";
  const hoyISO = new Date().toISOString().slice(0, 10);
  return membresia.fechaFin < hoyISO ? "vencida" : "activa";
}

export function diasParaVencer(fechaFinISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFinISO}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function usosDe(membresia: PatientMembership, beneficioId: string): number {
  return membresia.usos[beneficioId]?.length ?? 0;
}
