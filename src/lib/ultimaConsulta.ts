import type { CitaAgenda } from "./patientData";

/** Qué tan lejos quedó la última consulta: menos de 6 meses (el mismo corte de la sugerencia de prevención del
 * expediente) = "reciente"; de 6 a 11 meses = "revisar"; un año o más = "urgente" (dejó de venir). */
export type NivelAusencia = "reciente" | "revisar" | "urgente";

/** De dónde sale la fecha: una cita marcada "Atendida", una receta expedida, o (sin ninguna de las dos) la última cita de
 * la agenda que no se canceló. */
export type OrigenConsulta = "atendida" | "receta" | "agenda";

export type UltimaConsulta = {
  /** Fecha ISO (YYYY-MM-DD) de la consulta. */
  fecha: string;
  /** true si hay constancia de que el paciente sí fue atendido (cita "Atendida" o receta); false si solo se usó la última
   * cita que no se canceló (la clínica no la marcó y no hay receta). */
  atendida: boolean;
  origen: OrigenConsulta;
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

/** Fecha ISO de una receta expedida. `Receta.fecha` se guarda como "26/11/2026" (la que se imprime); si viniera en otro
 * formato se usa el `creadoEn` (ISO) de la bitácora. Devuelve null si no hay forma de saberla. */
export function fechaISODeReceta(receta: { fecha?: string | null; creadoEn?: string | null }): string | null {
  const f = receta.fecha?.trim() ?? "";
  const dmy = f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 10);
  const c = receta.creadoEn?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}/.test(c) ? c.slice(0, 10) : null;
}

/**
 * Última consulta de UN paciente (pasa solo sus citas y, si las hay, las fechas ISO de sus recetas): la más reciente entre
 * la cita "Atendida" y la receta expedida, hasta hoy — una receta es constancia de que el paciente fue atendido aunque la
 * cita no se haya marcado. Si no hay ni cita atendida ni receta, se usa la cita más reciente que ya pasó y no se canceló,
 * no se reagendó ni fue inasistencia, y se indica con `atendida: false` para no afirmar de más. Sin nada, devuelve null.
 */
export function ultimaConsultaDe(
  citas: Pick<CitaAgenda, "fecha" | "estatus">[],
  hoyISO: string,
  fechasRecetas: string[] = []
): UltimaConsulta | null {
  const pasadas = citas.filter((c) => c.fecha <= hoyISO);
  const masReciente = (fechas: string[]) => fechas.reduce<string | null>((m, f) => (m === null || f > m ? f : m), null);
  const atendida = masReciente(pasadas.filter((c) => c.estatus === "Atendida").map((c) => c.fecha));
  const receta = masReciente(fechasRecetas.filter((f) => f <= hoyISO));
  const constancia = masReciente([atendida, receta].filter((f): f is string => f !== null));
  const respaldo = constancia
    ? null
    : masReciente(pasadas.filter((c) => c.estatus !== "Cancelada" && c.estatus !== "Reagendada" && c.estatus !== "No Asistió").map((c) => c.fecha));
  const fecha = constancia ?? respaldo;
  if (!fecha) return null;
  const origen: OrigenConsulta = constancia ? (constancia === atendida ? "atendida" : "receta") : "agenda";
  const meses = mesesEntre(fecha, hoyISO);
  return { fecha, atendida: constancia !== null, origen, meses, dias: diasEntre(fecha, hoyISO), nivel: meses < 6 ? "reciente" : meses < 12 ? "revisar" : "urgente" };
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
