/** "Plan de Tratamiento" — la decisión clínica que se intercala entre un
 * diagnóstico del odontograma (historiaClinica.ts) y un renglón de
 * presupuesto. MO nunca decide sola: transporta y organiza la información,
 * pero cada paso (destino, tratamiento, precio del catálogo) requiere
 * confirmación explícita del profesional. */

import { normalizarTexto } from "./reportes";
import type { Procedimiento } from "./procedimientos";
import type { EstadoDiagnosticoOdontograma } from "./historiaClinica";

export const destinoPlanTratamientoOptions = ["tratamiento_clinica", "referencia", "vigilancia", "sin_tratamiento"] as const;
export type DestinoPlanTratamiento = (typeof destinoPlanTratamientoOptions)[number];

export const destinoPlanTratamientoLabel: Record<DestinoPlanTratamiento, string> = {
  tratamiento_clinica: "Tratar en clínica",
  referencia: "Referir",
  vigilancia: "Vigilar",
  sin_tratamiento: "Sin tratamiento",
};

export const prioridadTratamientoOptions = ["urgente", "alta", "media", "electiva"] as const;
export type PrioridadTratamiento = (typeof prioridadTratamientoOptions)[number];

export const prioridadTratamientoLabel: Record<PrioridadTratamiento, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  electiva: "Electiva",
};

export const estadoClinicoPlanTratamientoOptions = ["activo", "completado", "cancelado"] as const;
export type EstadoClinicoPlanTratamiento = (typeof estadoClinicoPlanTratamientoOptions)[number];

/** Una cotización más de un mismo plan — SIEMPRE se agrega, nunca se
 * sobrescribe (ver vincularPresupuestoAPlan en PatientDataContext.tsx). */
export type PresupuestoVinculado = {
  presupuestoId: string;
  budgetItemId: string;
  fecha: string;
  prioridad: PrioridadTratamiento;
};

export type PlanTratamientoItem = {
  id: string;
  patientId: string;
  /** Diagnóstico de origen — nunca se borra ni se muta al crear esto. */
  diagnosticoId: string;
  preguntaId: string;
  /** Snapshot al momento de crear el plan — si el diagnóstico se reedita
   * después, este plan conserva lo que era vigente cuando se decidió. */
  diagnosticoTexto: string;
  /** El estado del diagnóstico al momento de crear el plan, congelado para
   * siempre — nunca se recalcula después, aunque el diagnóstico cambie o
   * se derive uno nuevo. */
  estadoDiagnosticoSnapshot: EstadoDiagnosticoOdontograma;
  dientes: number[];
  /** Nace de tratamientoSugerido pero es editable — nunca se asume sin
   * confirmación del profesional. */
  tratamiento: string;
  /** Solo se llena tras confirmación explícita (ver buscarProcedimientoPorNombre). */
  procedimientoId?: string;
  prioridad: PrioridadTratamiento;
  destino: DestinoPlanTratamiento;
  estadoClinico: EstadoClinicoPlanTratamiento;
  /** SIEMPRE se agrega, nunca se sobrescribe — un mismo plan puede
   * cotizarse cualquier número de veces. */
  presupuestosVinculados?: PresupuestoVinculado[];
  creadoEn: string;
  creadoPorUid: string;
};

export type ResultadoValidacionPlan = { permitido: true } | { permitido: false; motivo: string };

/** Un diagnóstico sin estado nunca autoriza nada — hay que confirmarlo
 * primero. "sospecha" nunca genera un tratamiento definitivo; "provisional"
 * sí puede, pero exige confirmar el diagnóstico antes; "confirmado" permite
 * todo el flujo; "descartado" bloquea cualquier plan NUEVO activo (la
 * historia/planes previos nunca se borran, ver historiaClinica.ts). */
export function validarCreacionPlanTratamiento(
  estadoDiagnostico: EstadoDiagnosticoOdontograma | undefined,
  destino: DestinoPlanTratamiento
): ResultadoValidacionPlan {
  if (!estadoDiagnostico) {
    return { permitido: false, motivo: "Confirma el estado de este diagnóstico antes de crear un plan de tratamiento." };
  }
  if (estadoDiagnostico === "descartado") {
    return { permitido: false, motivo: "Este diagnóstico fue descartado — no se puede crear un nuevo plan de tratamiento activo." };
  }
  if (destino === "tratamiento_clinica" && estadoDiagnostico === "sospecha") {
    return {
      permitido: false,
      motivo: "Un diagnóstico en sospecha no puede generar un tratamiento definitivo — avanza primero a provisional o confirmado.",
    };
  }
  if (destino === "tratamiento_clinica" && estadoDiagnostico === "provisional") {
    return { permitido: false, motivo: "Confirma el diagnóstico antes de crear un tratamiento definitivo." };
  }
  return { permitido: true };
}

export type ResultadoBusquedaProcedimiento =
  | { tipo: "match_unico"; procedimiento: Procedimiento }
  | { tipo: "sin_match" }
  | { tipo: "match_ambiguo"; candidatos: Procedimiento[] };

/** Match ESTRICTO por texto normalizado (sin acentos/mayúsculas) — nunca
 * similitud aproximada en esta fase. Nunca decide sola: solo clasifica
 * (único/ninguno/ambiguo) para que la UI exija confirmación explícita del
 * profesional en los tres casos, incluso cuando el match es único. */
export function buscarProcedimientoPorNombre(nombre: string, catalogo: Procedimiento[]): ResultadoBusquedaProcedimiento {
  const normalizado = normalizarTexto(nombre);
  if (!normalizado) return { tipo: "sin_match" };
  const candidatos = catalogo.filter((p) => normalizarTexto(p.nombre) === normalizado);
  if (candidatos.length === 0) return { tipo: "sin_match" };
  if (candidatos.length === 1) return { tipo: "match_unico", procedimiento: candidatos[0] };
  return { tipo: "match_ambiguo", candidatos };
}

/** Construye el PlanTratamientoItem final — siempre campo por campo, nunca
 * por spread de otro objeto, para no arrastrar datos que no correspondan a
 * este tipo. */
export function construirPlanTratamientoItem(input: {
  id: string;
  patientId: string;
  diagnosticoId: string;
  preguntaId: string;
  diagnosticoTexto: string;
  estadoDiagnosticoSnapshot: EstadoDiagnosticoOdontograma;
  dientes: number[];
  tratamiento: string;
  procedimientoId?: string;
  prioridad: PrioridadTratamiento;
  destino: DestinoPlanTratamiento;
  creadoEn: string;
  creadoPorUid: string;
}): PlanTratamientoItem {
  const plan: PlanTratamientoItem = {
    id: input.id,
    patientId: input.patientId,
    diagnosticoId: input.diagnosticoId,
    preguntaId: input.preguntaId,
    diagnosticoTexto: input.diagnosticoTexto,
    estadoDiagnosticoSnapshot: input.estadoDiagnosticoSnapshot,
    dientes: input.dientes,
    tratamiento: input.tratamiento,
    prioridad: input.prioridad,
    destino: input.destino,
    estadoClinico: "activo",
    creadoEn: input.creadoEn,
    creadoPorUid: input.creadoPorUid,
  };
  if (input.procedimientoId) plan.procedimientoId = input.procedimientoId;
  return plan;
}

/** Agrega una cotización más a la lista existente SIN pisar las anteriores
 * — misma semántica que produce arrayUnion() en Firestore (ver
 * vincularPresupuestoAPlan en PatientDataContext.tsx), expuesta aquí como
 * función pura para poder probarla sin Firestore. */
export function agregarPresupuestoVinculado(
  existentes: PresupuestoVinculado[] | undefined,
  nuevo: PresupuestoVinculado
): PresupuestoVinculado[] {
  return [...(existentes ?? []), nuevo];
}
