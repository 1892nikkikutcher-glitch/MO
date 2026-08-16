/** Cálculos compartidos por los componentes del Dashboard Principal
 * (`src/components/dashboard/`). Mantiene la lógica de agregación separada
 * de la parte visual — ver también `src/lib/metas.ts` (`sumarRango`,
 * `calcularAvanceMetas`), que sigue siendo la fuente de los totales de
 * ingresos por rango de fechas. */

import type { CitaAgenda, HorarioAtencion, Patient } from "@/lib/patientData";
import type { LaboratorioPendienteEntry } from "@/lib/laboratoriosPendientes";
import { inicioSemana } from "@/lib/metas";

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type PeriodoId = "hoy" | "semana" | "mes" | "trimestre" | "año" | "personalizado";

export type RangoPeriodo = {
  id: PeriodoId;
  label: string;
  desdeISO: string;
  hastaISO: string;
  /** Mismo número de días, justo antes de `desdeISO` — la base de
   * comparación "vs periodo anterior" para cualquier periodo, incluido uno
   * personalizado. */
  desdeAnteriorISO: string;
  hastaAnteriorISO: string;
};

function inicioTrimestre(hoy: Date): Date {
  const q = Math.floor(hoy.getMonth() / 3);
  return new Date(hoy.getFullYear(), q * 3, 1);
}

function inicioAnio(hoy: Date): Date {
  return new Date(hoy.getFullYear(), 0, 1);
}

/** Calcula el rango de fechas [desde, hasta] de un periodo del selector del
 * Dashboard, más el rango "anterior" equivalente (mismo número de días,
 * inmediatamente antes) para la comparación porcentual. `hasta` siempre es
 * hoy, salvo en "personalizado". */
export function calcularRangoPeriodo(
  id: PeriodoId,
  hoy: Date,
  personalizado?: { desdeISO: string; hastaISO: string }
): RangoPeriodo {
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let desde: Date;
  let hasta: Date = hoySinHora;
  let label: string;

  if (id === "personalizado" && personalizado) {
    const a = new Date(`${personalizado.desdeISO}T00:00:00`);
    const b = new Date(`${personalizado.hastaISO}T00:00:00`);
    desde = a <= b ? a : b;
    hasta = a <= b ? b : a;
    label = "Personalizado";
  } else {
    switch (id) {
      case "hoy":
        desde = hoySinHora;
        label = "Hoy";
        break;
      case "semana":
        desde = inicioSemana(hoy);
        label = "Esta semana";
        break;
      case "trimestre":
        desde = inicioTrimestre(hoy);
        label = "Este trimestre";
        break;
      case "año":
        desde = inicioAnio(hoy);
        label = "Este año";
        break;
      case "mes":
      default:
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        label = "Este mes";
        break;
    }
  }

  const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1);
  const hastaAnterior = new Date(desde);
  hastaAnterior.setDate(hastaAnterior.getDate() - 1);
  const desdeAnterior = new Date(hastaAnterior);
  desdeAnterior.setDate(desdeAnterior.getDate() - (dias - 1));

  return {
    id,
    label,
    desdeISO: toIsoDate(desde),
    hastaISO: toIsoDate(hasta),
    desdeAnteriorISO: toIsoDate(desdeAnterior),
    hastaAnteriorISO: toIsoDate(hastaAnterior),
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Horas clínicas trabajadas: suma la duración (horaFin - horaInicio) de las
 * citas Atendidas cuya fecha cae en [desdeISO, hastaISO] (inclusive). Ignora
 * citas con horas mal formadas en vez de romper el cálculo. */
export function horasClinicasEnRango(citas: CitaAgenda[], desdeISO: string, hastaISO: string): number {
  const minutos = citas
    .filter((c) => c.estatus === "Atendida" && c.fecha >= desdeISO && c.fecha <= hastaISO)
    .reduce((total, c) => {
      const inicio = timeToMinutes(c.horaInicio);
      const fin = timeToMinutes(c.horaFin);
      const duracion = fin - inicio;
      return total + (Number.isFinite(duracion) && duracion > 0 ? duracion : 0);
    }, 0);
  return Math.round((minutos / 60) * 10) / 10;
}

/** Horas de atención de un solo día según el horario configurado del
 * consultorio (apertura→cierre, menos la comida). Aproximación: el horario
 * es único para toda la clínica y no distingue días de la semana, así que
 * esto asume que el consultorio abre todos los días del rango. */
export function horasDisponiblesPorDia(horario: HorarioAtencion): number {
  const apertura = timeToMinutes(horario.apertura);
  const cierre = timeToMinutes(horario.cierre);
  const comidaInicio = timeToMinutes(horario.comidaInicio);
  const comidaFin = timeToMinutes(horario.comidaFin);
  const comida = Math.max(0, comidaFin - comidaInicio);
  const jornada = Math.max(0, cierre - apertura - comida);
  return Math.round((jornada / 60) * 10) / 10;
}

/** Horas disponibles en un rango de fechas — horasDisponiblesPorDia ×
 * número de días del rango. Ver caveat en horasDisponiblesPorDia: no
 * excluye domingos ni días específicos, porque el horario actual no
 * distingue días de la semana. */
export function horasDisponiblesEnRango(horario: HorarioAtencion, desdeISO: string, hastaISO: string): number {
  const desde = new Date(`${desdeISO}T00:00:00`);
  const hasta = new Date(`${hastaISO}T00:00:00`);
  const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1);
  return Math.round(horasDisponiblesPorDia(horario) * dias * 10) / 10;
}

/** Variación porcentual entre el periodo actual y el anterior. null si no
 * hay base de comparación (periodo anterior en cero). */
export function variacionPct(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

/** Pacientes distintos con al menos una cita Atendida en [desdeISO, hastaISO]. */
export function pacientesAtendidosEnRango(citas: CitaAgenda[], desdeISO: string, hastaISO: string): number {
  const ids = new Set<string>();
  citas.forEach((c) => {
    if (c.estatus === "Atendida" && c.patientId && c.fecha >= desdeISO && c.fecha <= hastaISO) {
      ids.add(c.patientId);
    }
  });
  return ids.size;
}

/** Pacientes "activos": con al menos una cita Atendida en los últimos 12
 * meses — la definición de "actividad clínica" que usamos es haber sido
 * atendido, no solo tener una cita agendada. */
export function pacientesActivos(citas: CitaAgenda[], hoyISO: string): number {
  const hace12Meses = new Date(`${hoyISO}T00:00:00`);
  hace12Meses.setFullYear(hace12Meses.getFullYear() - 1);
  const desdeISO = `${hace12Meses.getFullYear()}-${String(hace12Meses.getMonth() + 1).padStart(2, "0")}-${String(
    hace12Meses.getDate()
  ).padStart(2, "0")}`;
  return pacientesAtendidosEnRango(citas, desdeISO, hoyISO);
}

/** `fechaEntrega` de una solicitud de laboratorio es texto libre
 * "dd/mm/aaaa" capturado a mano — no siempre parseable. Devuelve null en
 * vez de romper el agrupamiento cuando el valor está vacío o mal formado. */
export function parseFechaEntrega(texto: string): Date | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type LaboratoriosAgrupados = {
  vencidos: LaboratorioPendienteEntry[];
  vencenHoy: LaboratorioPendienteEntry[];
  proximos: LaboratorioPendienteEntry[];
  sinFecha: LaboratorioPendienteEntry[];
};

/** Agrupa las solicitudes de laboratorio pendientes por cercanía a su
 * fecha de entrega, cada grupo ordenado de más a menos urgente. Las
 * órdenes sin fecha válida van aparte, no se mezclan con "próximos". */
export function agruparLaboratoriosPendientes(
  entries: LaboratorioPendienteEntry[],
  hoy: Date = new Date()
): LaboratoriosAgrupados {
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const grupos: LaboratoriosAgrupados = { vencidos: [], vencenHoy: [], proximos: [], sinFecha: [] };

  entries.forEach((entry) => {
    const fecha = parseFechaEntrega(entry.fechaEntrega);
    if (!fecha) {
      grupos.sinFecha.push(entry);
    } else if (fecha < hoySinHora) {
      grupos.vencidos.push(entry);
    } else if (fecha.getTime() === hoySinHora.getTime()) {
      grupos.vencenHoy.push(entry);
    } else {
      grupos.proximos.push(entry);
    }
  });

  const porFecha = (a: LaboratorioPendienteEntry, b: LaboratorioPendienteEntry) => {
    const fa = parseFechaEntrega(a.fechaEntrega);
    const fb = parseFechaEntrega(b.fechaEntrega);
    if (!fa || !fb) return 0;
    return fa.getTime() - fb.getTime();
  };
  grupos.vencidos.sort(porFecha);
  grupos.proximos.sort(porFecha);

  return grupos;
}

/** `CitaAgenda.costo` es texto libre capturado a mano (ej. "$1,200") — no
 * hay forma de sumarlo con precisión, así que cualquier total que lo use
 * debe presentarse como aproximado, nunca como una cifra exacta. */
function parseCostoAproximado(texto: string | undefined): number {
  if (!texto) return 0;
  const limpio = texto.replace(/[^\d.]/g, "");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Valor estimado (aproximado, ver parseCostoAproximado) de las citas
 * marcadas No Asistió en el rango — solo cuenta las que sí tienen un costo
 * capturado, así que es un piso, no el total real. */
export function valorPerdidoEstimado(citas: CitaAgenda[], desdeISO: string, hastaISO: string): number {
  return citas
    .filter((c) => c.estatus === "No Asistió" && c.fecha >= desdeISO && c.fecha <= hastaISO)
    .reduce((total, c) => total + parseCostoAproximado(c.costo), 0);
}

/** Citas de los próximos `dias` días (incluyendo hoy) que todavía no se
 * resolvieron (no atendidas, canceladas, reagendadas ni no-show). */
export function proximasCitas(citas: CitaAgenda[], hoyISO: string, dias: number): number {
  const hoy = new Date(`${hoyISO}T00:00:00`);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);
  const limiteISO = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(
    limite.getDate()
  ).padStart(2, "0")}`;
  return citas.filter(
    (c) =>
      c.fecha >= hoyISO &&
      c.fecha <= limiteISO &&
      (c.estatus === "Agendada" || c.estatus === "Confirmada" || c.estatus === "En espera")
  ).length;
}

const MESES_ABR = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

export type PuntoMensual = { mes: string; label: string; valor: number };

/** Los últimos `n` meses terminando en el mes de `hoy` (incluido), en orden
 * cronológico — la base común para las gráficas de evolución mensual. */
function ultimosNMeses(hoy: Date, n: number): { key: string; label: string }[] {
  const meses: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MESES_ABR[d.getMonth()],
    });
  }
  return meses;
}

/** Ingresos reales (pagos cobrados) por mes, últimos `n` meses — a partir
 * del mismo rollup `finanzas.porFecha` que ya usa Fila 1. */
export function ingresosPorMes(porFecha: Record<string, number>, hoy: Date, n = 12): PuntoMensual[] {
  const meses = ultimosNMeses(hoy, n);
  const totales = new Map<string, number>();
  Object.entries(porFecha).forEach(([fecha, monto]) => {
    const key = fecha.slice(0, 7);
    totales.set(key, (totales.get(key) ?? 0) + monto);
  });
  return meses.map((m) => ({ mes: m.key, label: m.label, valor: totales.get(m.key) ?? 0 }));
}

/** Pacientes nuevos por mes, últimos `n` meses, a partir de `createdAt`.
 * Los pacientes sin `createdAt` (altas antes de que existiera el campo, o
 * importados en bloque) no cuentan en ningún mes — meses más antiguos
 * pueden verse artificialmente bajos por eso. */
export function pacientesNuevosPorMes(patients: Patient[], hoy: Date, n = 12): PuntoMensual[] {
  const meses = ultimosNMeses(hoy, n);
  const conteo = new Map<string, number>();
  patients.forEach((p) => {
    if (!p.createdAt) return;
    const key = p.createdAt.slice(0, 7);
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  });
  return meses.map((m) => ({ mes: m.key, label: m.label, valor: conteo.get(m.key) ?? 0 }));
}

export type PuntoSemanal = { label: string; valor: number };

/** % de ocupación (horas clínicas / horas disponibles) por semana, últimas
 * `n` semanas terminando hoy — mismo cálculo que la tarjeta Ocupación de
 * Fila 2, solo repetido semana por semana. */
export function ocupacionPorSemana(
  citas: CitaAgenda[],
  horario: HorarioAtencion,
  hoy: Date,
  n = 8
): PuntoSemanal[] {
  const semanas: PuntoSemanal[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const finSemana = new Date(hoy);
    finSemana.setDate(finSemana.getDate() - 7 * i);
    const inicioSemana = new Date(finSemana);
    inicioSemana.setDate(inicioSemana.getDate() - 6);

    const desdeISO = toIsoDate(inicioSemana);
    const hastaISO = toIsoDate(finSemana);
    const horas = horasClinicasEnRango(citas, desdeISO, hastaISO);
    const disponibles = horasDisponiblesEnRango(horario, desdeISO, hastaISO);
    const pct = disponibles > 0 ? Math.min(100, Math.round((horas / disponibles) * 100)) : 0;

    semanas.push({ label: `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1}`, valor: pct });
  }
  return semanas;
}
