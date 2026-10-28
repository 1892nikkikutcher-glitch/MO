/** Sedes (consultorios físicos) y bloques de atención de cada médico: "el Dr. Enrique atiende lunes,
 * miércoles y viernes de 9 a 14 en Juan Corrales". Todo aquí es lógica pura, sin Firestore ni pantalla. */

export type Sede = { id: string; nombre: string; direccion?: string };

/** Documento `config/sedes`. */
export type SedesConfig = { lista: Sede[] };
export const sedesInicial: SedesConfig = { lista: [] };

/** Un bloque abierto de un médico: ciertos días de la semana, de `inicio` a `fin`, en una sede. */
export type BloqueAtencion = {
  id: string;
  sedeId: string;
  /** Días de la semana como `Date.getDay()`: 0 = domingo … 6 = sábado. */
  dias: number[];
  inicio: string; // "HH:MM"
  fin: string; // "HH:MM"
};

const NOMBRE_DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const NOMBRE_DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** De lunes a domingo, para mostrar y elegir (el valor sigue siendo `getDay`). */
export const DIAS_EN_ORDEN = [1, 2, 3, 4, 5, 6, 0];

export function nombreDiaCorto(dia: number): string {
  return NOMBRE_DIA_CORTO[dia] ?? "";
}

export function nombreDiaLargo(dia: number): string {
  return NOMBRE_DIA_LARGO[dia] ?? "";
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function deMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Día de la semana (`getDay`) de una fecha "YYYY-MM-DD", sin correrse por zona horaria. */
export function diaDeLaSemana(fechaISO: string): number {
  const [a, m, d] = fechaISO.split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1).getDay();
}

/** "Lun, Mié y Vie" — en orden de lunes a domingo. */
export function etiquetaDias(dias: number[]): string {
  const ordenados = DIAS_EN_ORDEN.filter((d) => dias.includes(d)).map(nombreDiaCorto);
  if (ordenados.length === 0) return "";
  if (ordenados.length === 1) return ordenados[0];
  return `${ordenados.slice(0, -1).join(", ")} y ${ordenados[ordenados.length - 1]}`;
}

function horaCorta(hora: string): string {
  const [h, m] = hora.split(":");
  return m === "00" ? `${Number(h)}:00` : `${Number(h)}:${m}`;
}

export function nombreDeSede(sedeId: string | undefined | null, sedes: Sede[]): string {
  if (!sedeId) return "";
  return sedes.find((s) => s.id === sedeId)?.nombre ?? "";
}

/** "Lun, Mié y Vie · 9:00–14:00 · Juan Corrales" */
export function describirBloque(bloque: BloqueAtencion, sedes: Sede[]): string {
  const sede = nombreDeSede(bloque.sedeId, sedes);
  return [etiquetaDias(bloque.dias), `${horaCorta(bloque.inicio)}–${horaCorta(bloque.fin)}`, sede].filter(Boolean).join(" · ");
}

/** Limpia lo que venga guardado: solo bloques completos y coherentes (nunca revienta con datos viejos). */
export function normalizarBloques(crudo: unknown): BloqueAtencion[] {
  if (!Array.isArray(crudo)) return [];
  const resultado: BloqueAtencion[] = [];
  for (const b of crudo) {
    if (!b || typeof b !== "object") continue;
    const { id, sedeId, dias, inicio, fin } = b as Record<string, unknown>;
    if (typeof id !== "string" || typeof sedeId !== "string" || typeof inicio !== "string" || typeof fin !== "string") continue;
    const diasLimpios = Array.isArray(dias)
      ? [...new Set((dias as unknown[]).filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))]
      : [];
    if (diasLimpios.length === 0) continue;
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fin)) continue;
    if (aMinutos(fin) <= aMinutos(inicio)) continue;
    resultado.push({ id, sedeId, dias: diasLimpios.sort((a, b2) => a - b2), inicio, fin });
  }
  return resultado;
}

/** Por qué un bloque no se puede guardar, o `null` si está bien. */
export function errorDeBloque(bloque: Pick<BloqueAtencion, "sedeId" | "dias" | "inicio" | "fin">): string | null {
  if (!bloque.sedeId) return "Elige la sede.";
  if (bloque.dias.length === 0) return "Elige al menos un día.";
  if (!/^\d{2}:\d{2}$/.test(bloque.inicio) || !/^\d{2}:\d{2}$/.test(bloque.fin)) return "Pon la hora de inicio y de fin.";
  if (aMinutos(bloque.fin) <= aMinutos(bloque.inicio)) return "La hora de fin debe ser después de la de inicio.";
  return null;
}

/** Dos bloques del mismo médico se pisan si comparten algún día y sus horas se cruzan. */
export function bloquesQueSePisan(a: BloqueAtencion, b: BloqueAtencion): boolean {
  if (!a.dias.some((d) => b.dias.includes(d))) return false;
  return aMinutos(a.inicio) < aMinutos(b.fin) && aMinutos(b.inicio) < aMinutos(a.fin);
}

export function bloquesDelDia(bloques: BloqueAtencion[] | undefined, fechaISO: string): BloqueAtencion[] {
  const dia = diaDeLaSemana(fechaISO);
  return (bloques ?? []).filter((b) => b.dias.includes(dia));
}

/** Horas que abren los bloques de todos los médicos entre dos fechas ("YYYY-MM-DD", ambas incluidas). Con `sedeId`
 * solo cuentan los bloques de esa sede. Es la disponibilidad real de una clínica con varios médicos: cada uno abre sus
 * propias horas, no hay un solo horario del consultorio. */
export function horasDisponiblesPorBloques(
  medicos: { bloques?: unknown }[],
  desdeISO: string,
  hastaISO: string,
  sedeId?: string
): number {
  const [a1, m1, d1] = desdeISO.split("-").map(Number);
  const [a2, m2, d2] = hastaISO.split("-").map(Number);
  const hasta = new Date(a2, m2 - 1, d2);
  let minutos = 0;
  for (let d = new Date(a1, m1 - 1, d1); d <= hasta; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay();
    for (const medico of medicos) {
      for (const b of normalizarBloques(medico.bloques)) {
        if (sedeId && b.sedeId !== sedeId) continue;
        if (b.dias.includes(dia)) minutos += aMinutos(b.fin) - aMinutos(b.inicio);
      }
    }
  }
  return Math.round(minutos / 6) / 10;
}

/** ¿Algún médico ya tiene bloques capturados? Si sí, la ocupación se mide contra ellos; si no, contra el horario del consultorio. */
export function hayBloquesCapturados(medicos: { bloques?: unknown }[]): boolean {
  return medicos.some((m) => normalizarBloques(m.bloques).length > 0);
}

export type EvaluacionDeCita =
  /** El médico no tiene bloques capturados: no hay nada contra qué comparar. */
  | { estado: "sin_bloques" }
  | { estado: "dentro"; bloque: BloqueAtencion }
  | { estado: "fuera"; motivo: "dia_sin_bloque" | "fuera_de_horas"; bloquesDelDia: BloqueAtencion[] };

/** ¿La cita cabe completa dentro de algún bloque abierto de su médico ese día? */
export function evaluarCitaContraBloques(
  bloques: BloqueAtencion[] | undefined,
  fechaISO: string,
  horaInicio: string,
  horaFin: string
): EvaluacionDeCita {
  if (!bloques || bloques.length === 0) return { estado: "sin_bloques" };
  const delDia = bloquesDelDia(bloques, fechaISO);
  if (delDia.length === 0) return { estado: "fuera", motivo: "dia_sin_bloque", bloquesDelDia: [] };
  const ini = aMinutos(horaInicio);
  const fin = aMinutos(horaFin);
  const dentro = delDia.find((b) => ini >= aMinutos(b.inicio) && fin <= aMinutos(b.fin));
  if (dentro) return { estado: "dentro", bloque: dentro };
  return { estado: "fuera", motivo: "fuera_de_horas", bloquesDelDia: delDia };
}

/** Texto para el aviso de "fuera de bloque" en el diálogo de la cita. */
export function mensajeFueraDeBloque(
  evaluacion: Extract<EvaluacionDeCita, { estado: "fuera" }>,
  fechaISO: string,
  nombreMedico: string,
  sedes: Sede[]
): string {
  const quien = nombreMedico || "Este médico";
  if (evaluacion.motivo === "dia_sin_bloque") {
    const dia = nombreDiaLargo(diaDeLaSemana(fechaISO));
    // lunes…viernes no cambian en plural; sábado y domingo sí.
    return `${quien} no atiende los ${dia.endsWith("s") ? dia : `${dia}s`} según sus bloques.`;
  }
  const abiertos = evaluacion.bloquesDelDia.map((b) => `${horaCorta(b.inicio)}–${horaCorta(b.fin)} en ${nombreDeSede(b.sedeId, sedes) || "su sede"}`);
  return `Ese horario queda fuera del bloque de ${quien} (${abiertos.join(" y ")}).`;
}

type CitaMinima = {
  id?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus?: string;
};

const ESTATUS_QUE_NO_OCUPAN = new Set(["Cancelada", "Reagendada", "No Asistió"]);

/** Huecos libres de un bloque: los tramos que las citas (las que ocupan lugar) no cubren, en minutos desde la
 * medianoche. `excluirCitaId` deja fuera la cita que se está editando. */
export function huecosLibresDelBloque(
  bloque: BloqueAtencion,
  citasDelMedicoEseDia: CitaMinima[],
  excluirCitaId?: string
): { ini: number; fin: number }[] {
  const inicioB = aMinutos(bloque.inicio);
  const finB = aMinutos(bloque.fin);
  const ocupadas = citasDelMedicoEseDia
    .filter((c) => !(excluirCitaId && c.id === excluirCitaId) && !ESTATUS_QUE_NO_OCUPAN.has(c.estatus ?? ""))
    .map((c) => ({ ini: aMinutos(c.horaInicio), fin: aMinutos(c.horaFin) }))
    .filter((c) => c.fin > inicioB && c.ini < finB)
    .sort((x, y) => x.ini - y.ini);
  const huecos: { ini: number; fin: number }[] = [];
  let cursor = inicioB;
  for (const o of ocupadas) {
    if (o.ini > cursor) huecos.push({ ini: cursor, fin: o.ini });
    cursor = Math.max(cursor, o.fin);
  }
  if (cursor < finB) huecos.push({ ini: cursor, fin: finB });
  return huecos;
}

/** Horarios para esta cita que no dejan huecos: empezando justo cuando termina otra cita del bloque, o
 * justo antes de la siguiente; si el bloque está vacío, a su inicio. Los pegados a una cita van primero. */
export function horariosSeguidos(
  bloque: BloqueAtencion,
  citasDelMedicoEseDia: CitaMinima[],
  duracionMin: number,
  excluirCitaId?: string,
  maximo = 4
): string[] {
  const inicioB = aMinutos(bloque.inicio);
  const finB = aMinutos(bloque.fin);
  const huecos = huecosLibresDelBloque(bloque, citasDelMedicoEseDia, excluirCitaId);
  const hayCitas = huecos.length !== 1 || huecos[0].ini !== inicioB || huecos[0].fin !== finB;

  // Prioridad 0: pegado a una cita ya agendada (o al inicio del bloque si todavía está vacío); 1: lo demás.
  const candidatos: { inicio: number; prioridad: number }[] = [];
  for (const h of huecos) {
    if (h.fin - h.ini < duracionMin) continue;
    const pegadoAUnaCitaAntes = h.ini !== inicioB;
    candidatos.push({ inicio: h.ini, prioridad: pegadoAUnaCitaAntes || !hayCitas ? 0 : 1 });
    const pegadoAUnaCitaDespues = h.fin !== finB;
    if (pegadoAUnaCitaDespues && h.fin - duracionMin !== h.ini) candidatos.push({ inicio: h.fin - duracionMin, prioridad: 0 });
  }
  const unicos = [...new Map(candidatos.map((c) => [c.inicio, c])).values()];
  // Los que dejarían un hueco (prioridad 1) solo se ofrecen si no hay ninguno pegado a una cita.
  const pegados = unicos.filter((c) => c.prioridad === 0);
  return (pegados.length > 0 ? pegados : unicos)
    .sort((x, y) => x.prioridad - y.prioridad || x.inicio - y.inicio)
    .slice(0, maximo)
    .sort((x, y) => x.inicio - y.inicio)
    .map((c) => deMinutos(c.inicio));
}

type RecursoConBloques = { id: string; tipo: string; bloques?: BloqueAtencion[] };
type CitaConSede = CitaMinima & { sedeId?: string | null; medicoId?: string | null; recursoId?: string };

/** Sede de una cita: la que se le estampó al agendarla o, si es anterior a las sedes, la del bloque del
 * médico que la cubre. */
export function sedeDeCita(cita: CitaConSede, recursos: RecursoConBloques[], sedes: Sede[]): Sede | undefined {
  if (cita.sedeId) return sedes.find((s) => s.id === cita.sedeId);
  const medico = recursos.find((r) => r.tipo === "medico" && r.id === (cita.medicoId || cita.recursoId));
  const evaluacion = evaluarCitaContraBloques(medico?.bloques, cita.fecha, cita.horaInicio, cita.horaFin);
  if (evaluacion.estado !== "dentro") return undefined;
  return sedes.find((s) => s.id === evaluacion.bloque.sedeId);
}
