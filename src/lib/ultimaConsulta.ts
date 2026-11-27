import type { CitaAgenda } from "./patientData";

/** Qué tan lejos quedó la última consulta: menos de 6 meses (el mismo corte de la sugerencia de prevención del
 * expediente) = "reciente"; de 6 a 11 meses = "revisar"; un año o más = "urgente" (dejó de venir). */
export type NivelAusencia = "reciente" | "revisar" | "urgente";

export type UltimaConsulta = {
  /** Fecha ISO (YYYY-MM-DD) de la consulta. */
  fecha: string;
  /** true si la cita se marcó "Atendida"; false si solo se usó la última cita que no se canceló (la clínica no la marcó). */
  atendida: boolean;
  /** Meses calendario completos desde esa fecha. */
  meses: number;
  /** Días desde esa fecha. */
  dias: number;
  nivel: NivelAusencia;
};

/** Meses calendario completos entre dos fechas ISO (15 de enero sigue en "mes 0" hasta el 15 de febrero). */
export function mesesEntre(desdeISO: string, hastaISO: string): number {
  const desde = new Date(`${desdeISO}T00:00:00`);
  const hasta = new Date(`${hastaISO}T00:00:00`);
  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  if (hasta.getDate() < desde.getDate()) meses -= 1;
  return Math.max(0, meses);
}

function diasEntre(desdeISO: string, hastaISO: string): number {
  const ms = new Date(`${hastaISO}T00:00:00`).getTime() - new Date(`${desdeISO}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * Última consulta de UN paciente (pasa solo sus citas): la cita "Atendida" más reciente hasta hoy.
 * Si la clínica nunca marca las citas como atendidas, se usa la más reciente que ya pasó y no se canceló,
 * no se reagendó ni fue inasistencia, y se indica con `atendida: false` para no afirmar de más.
 * Sin ninguna, devuelve null.
 */
export function ultimaConsultaDe(citas: Pick<CitaAgenda, "fecha" | "estatus">[], hoyISO: string): UltimaConsulta | null {
  const pasadas = citas.filter((c) => c.fecha <= hoyISO);
  const masReciente = (lista: typeof pasadas) => lista.reduce<string | null>((m, c) => (m === null || c.fecha > m ? c.fecha : m), null);
  const atendida = masReciente(pasadas.filter((c) => c.estatus === "Atendida"));
  const respaldo = atendida ? null : masReciente(pasadas.filter((c) => c.estatus !== "Cancelada" && c.estatus !== "Reagendada" && c.estatus !== "No Asistió"));
  const fecha = atendida ?? respaldo;
  if (!fecha) return null;
  const meses = mesesEntre(fecha, hoyISO);
  return { fecha, atendida: atendida !== null, meses, dias: diasEntre(fecha, hoyISO), nivel: meses < 6 ? "reciente" : meses < 12 ? "revisar" : "urgente" };
}

/** "hoy", "hace 12 días", "hace 5 meses", "hace 1 año y 3 meses". */
export function textoHace(c: Pick<UltimaConsulta, "meses" | "dias">): string {
  if (c.dias === 0) return "hoy";
  if (c.meses < 1) return `hace ${c.dias} ${c.dias === 1 ? "día" : "días"}`;
  if (c.meses < 12) return `hace ${c.meses} ${c.meses === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(c.meses / 12);
  const resto = c.meses % 12;
  const a = `${anios} ${anios === 1 ? "año" : "años"}`;
  return resto === 0 ? `hace ${a}` : `hace ${a} y ${resto} ${resto === 1 ? "mes" : "meses"}`;
}

/** Filtro de la lista de Pacientes: "al menos N meses sin venir", o "nunca" (sin ninguna consulta registrada). */
export type FiltroAusencia = "todos" | "nunca" | 6 | 8 | 10 | 12;

export const FILTROS_AUSENCIA_MESES = [6, 8, 10, 12] as const;

/** ¿Este paciente entra en el filtro? "6" incluye a quien lleva 6 meses o más (también a quien lleva 12). */
export function coincideAusencia(consulta: Pick<UltimaConsulta, "meses"> | null, filtro: FiltroAusencia): boolean {
  if (filtro === "todos") return true;
  if (filtro === "nunca") return consulta === null;
  return consulta !== null && consulta.meses >= filtro;
}
