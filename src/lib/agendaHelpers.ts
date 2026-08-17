import type { CitaAgenda, CitaEstatus, Recurso } from "@/lib/patientData";

export const PX_PER_MIN = 1.2;
export const DIAS_SEMANA = ["lun.", "mar.", "mié.", "jue.", "vie.", "sáb.", "dom."];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const MESES_ABR = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

export const estatusColor: Record<CitaEstatus, { bg: string; text: string; dot: string }> = {
  Agendada: { bg: "bg-surface2", text: "text-ink/70", dot: "bg-ink/50" },
  Confirmada: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  "En espera": { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent" },
  Atendida: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  Reagendada: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  Cancelada: { bg: "bg-danger/10", text: "text-danger", dot: "bg-danger" },
  "No Asistió": { bg: "bg-danger/20", text: "text-danger", dot: "bg-danger" },
};

/** Color fijo por estatus de cita, usado como color de PERÍMETRO (borde +
 * resplandor) de la tarjeta — no como color de letra. El interior de la
 * tarjeta es el pastel del recurso y la letra siempre es negra (ambos
 * garantizan contraste alto sin depender del estatus), así que el borde
 * puede usar el tono vivo original sin problema de legibilidad de texto.
 * Agendada se queda sin color propio (borde neutro) porque es el estatus
 * por default y no necesita resaltar. */
export const CITA_ESTATUS_HEX: Partial<Record<CitaEstatus, string>> = {
  Confirmada: "#0D3B66", // Ocean Abyss
  "En espera": "#FFC857", // Sunlit Amber
  Atendida: "#1FA7A6", // Lagoon Depths
  Reagendada: "#6C2E7B", // Orchid Dream
  Cancelada: "#E75480", // Coral Kiss
  "No Asistió": "#FF8A5B", // Tangerine Tide
};
export const CITA_BORDE_NEUTRO = "#94a3b8";

/** WhatsApp no soporta texto de color, así que se usa el círculo de color
 * emoji más parecido (por distancia RGB) al color asignado al recurso, para
 * poder distinguir de un vistazo a qué médico corresponde cada cita. */
const EMOJI_COLOR_REFS: { emoji: string; hex: string }[] = [
  { emoji: "🔴", hex: "#ef4444" },
  { emoji: "🟠", hex: "#f97316" },
  { emoji: "🟡", hex: "#eab308" },
  { emoji: "🟢", hex: "#22c55e" },
  { emoji: "🔵", hex: "#3b82f6" },
  { emoji: "🟣", hex: "#a855f7" },
  { emoji: "🟤", hex: "#92400e" },
  { emoji: "⚫", hex: "#000000" },
  { emoji: "⚪", hex: "#ffffff" },
];

export function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function emojiParaColor(hex: string): string {
  const c = hexToRgb(hex);
  let mejor = EMOJI_COLOR_REFS[0];
  let mejorDist = Infinity;
  for (const ref of EMOJI_COLOR_REFS) {
    const r = hexToRgb(ref.hex);
    const dist = (c.r - r.r) ** 2 + (c.g - r.g) ** 2 + (c.b - r.b) ** 2;
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = ref;
    }
  }
  return mejor.emoji;
}

export const duracionOptions = [15, 20, 25, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];

export function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date) {
  return toISODate(a) === toISODate(b);
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type CitaResoluble = Pick<CitaAgenda, "medicoId" | "unidadId" | "recursoId">;

/** Resuelve el médico de una cita priorizando medicoId; cae a recursoId
 * (citas legadas nunca migradas) solo si ese recurso es tipo médico. */
export function resolverMedico(recursos: Recurso[], cita: CitaResoluble): Recurso | undefined {
  if (cita.medicoId) return recursos.find((r) => r.id === cita.medicoId);
  const legado = recursos.find((r) => r.id === cita.recursoId);
  return legado?.tipo === "medico" ? legado : undefined;
}

/** Igual que resolverMedico pero para unidad. */
export function resolverUnidad(recursos: Recurso[], cita: CitaResoluble): Recurso | undefined {
  if (cita.unidadId) return recursos.find((r) => r.id === cita.unidadId);
  const legado = recursos.find((r) => r.id === cita.recursoId);
  return legado?.tipo === "unidad" ? legado : undefined;
}

/** Detecta choques de horario para una cita candidata (nueva, editada, o
 * recién arrastrada) contra el resto de citas del mismo día — revisa
 * médico y unidad de forma independiente y devuelve un mensaje por cada
 * uno si aplica (pueden ser los dos a la vez). Las citas Canceladas o No
 * Asistió no cuentan como conflicto (el espacio quedó libre). */
export function detectarConflictos(
  recursos: Recurso[],
  citas: CitaAgenda[],
  candidata: CitaResoluble & { id?: string; fecha: string; horaInicio: string; horaFin: string }
): string[] {
  const medicoCand = resolverMedico(recursos, candidata);
  const unidadCand = resolverUnidad(recursos, candidata);
  if (!medicoCand && !unidadCand) return [];

  const inicioCand = timeToMinutes(candidata.horaInicio);
  const finCand = timeToMinutes(candidata.horaFin);
  const otras = citas.filter(
    (c) =>
      c.id !== candidata.id &&
      c.fecha === candidata.fecha &&
      c.estatus !== "Cancelada" &&
      c.estatus !== "No Asistió"
  );
  const traslapa = (c: CitaAgenda) => {
    const i = timeToMinutes(c.horaInicio);
    const f = timeToMinutes(c.horaFin);
    return inicioCand < f && i < finCand;
  };

  const avisos: string[] = [];
  if (medicoCand) {
    const choque = otras.find((c) => traslapa(c) && resolverMedico(recursos, c)?.id === medicoCand.id);
    if (choque) {
      avisos.push(
        `${medicoCand.nombre} ya tiene una cita de ${choque.horaInicio} a ${choque.horaFin} (${choque.paciente}).`
      );
    }
  }
  if (unidadCand) {
    const choque = otras.find((c) => traslapa(c) && resolverUnidad(recursos, c)?.id === unidadCand.id);
    if (choque) {
      avisos.push(
        `${unidadCand.nombre} ya está ocupada de ${choque.horaInicio} a ${choque.horaFin} (${choque.paciente}).`
      );
    }
  }
  return avisos;
}

export function formatRangeLabel(inicio: Date, fin: Date) {
  const sameMonth = inicio.getMonth() === fin.getMonth();
  const mesInicio = MESES_ABR[inicio.getMonth()];
  const mesFin = MESES_ABR[fin.getMonth()];
  return sameMonth
    ? `${inicio.getDate()} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`
    : `${inicio.getDate()} de ${mesInicio} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`;
}

export const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

/** Asigna cada cita a un carril (columna) para dibujarla en la agenda, pero
 * el ancho de carril se calcula por grupo de citas realmente encimadas
 * (mismo truco que Google Calendar), no para el día completo — si dos
 * citas se empalman a las 16:00 pero el resto del día no tiene nada más
 * encimado, solo esas dos se dividen la columna; las demás usan el ancho
 * completo aunque estén en el mismo día. */
export function assignLanes(citasDelDia: CitaAgenda[]) {
  const sorted = [...citasDelDia].sort(
    (a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio)
  );

  const withLane: { cita: CitaAgenda; lane: number; lanesInGroup: number }[] = [];
  let grupo: CitaAgenda[] = [];
  let finGrupo = -Infinity;

  const cerrarGrupo = () => {
    if (grupo.length === 0) return;
    const lanesEnd: number[] = [];
    const inicioIndice = withLane.length;
    grupo.forEach((c) => {
      const start = timeToMinutes(c.horaInicio);
      const end = timeToMinutes(c.horaFin);
      let lane = lanesEnd.findIndex((e) => e <= start);
      if (lane === -1) {
        lane = lanesEnd.length;
        lanesEnd.push(end);
      } else {
        lanesEnd[lane] = end;
      }
      withLane.push({ cita: c, lane, lanesInGroup: 1 });
    });
    const lanesInGroup = Math.max(lanesEnd.length, 1);
    for (let i = inicioIndice; i < withLane.length; i++) withLane[i].lanesInGroup = lanesInGroup;
    grupo = [];
  };

  sorted.forEach((c) => {
    const start = timeToMinutes(c.horaInicio);
    const end = timeToMinutes(c.horaFin);
    if (grupo.length > 0 && start >= finGrupo) {
      cerrarGrupo();
      finGrupo = -Infinity;
    }
    grupo.push(c);
    finGrupo = Math.max(finGrupo, end);
  });
  cerrarGrupo();

  return withLane;
}

export function addMonths(d: Date, n: number) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + n);
  return date;
}
