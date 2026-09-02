/** Cálculos compartidos por los componentes del Dashboard Principal
 * (`src/components/dashboard/`). Mantiene la lógica de agregación separada
 * de la parte visual — ver también `src/lib/metas.ts` (`sumarRango`,
 * `calcularAvanceMetas`), que sigue siendo la fuente de los totales de
 * ingresos por rango de fechas. */

import type { CitaAgenda, HorarioAtencion, Patient } from "@/lib/patientData";
import type { LaboratorioPendienteEntry } from "@/lib/laboratoriosPendientes";
import { inicioSemana } from "@/lib/metas";
import { DIAS_SEMANA, MESES, formatRangeLabel } from "@/lib/agendaHelpers";

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type PeriodoId = "hoy" | "semana" | "mes" | "trimestre" | "año" | "personalizado";

export type RangoPeriodo = {
  id: PeriodoId;
  /** Nombre amigable ("Este mes") cuando el periodo mostrado es el que
   * contiene hoy; si se navegó a otro (con las flechas del selector), se
   * vuelve la fecha concreta — igual que `detalleFecha` — para no decir
   * "Este mes" estando en agosto. */
  label: string;
  /** Fecha/rango concreto SIEMPRE, sin importar si es el periodo actual o
   * uno navegado — ej. "Septiembre 2026", "1 – 7 de sep. de 2026". Para
   * mostrar junto al selector qué fecha se está analizando. */
  detalleFecha: string;
  desdeISO: string;
  hastaISO: string;
  /** Mismo número de días, justo antes de `desdeISO` — la base de
   * comparación "vs periodo anterior" para cualquier periodo, incluido uno
   * personalizado. */
  desdeAnteriorISO: string;
  hastaAnteriorISO: string;
};

function inicioTrimestre(ancla: Date): Date {
  const q = Math.floor(ancla.getMonth() / 3);
  return new Date(ancla.getFullYear(), q * 3, 1);
}

function inicioAnio(ancla: Date): Date {
  return new Date(ancla.getFullYear(), 0, 1);
}

function capitalizarPrimera(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Texto concreto de qué fecha/rango representa el periodo — a diferencia
 * de `label` (que puede decir "Este mes"), esto siempre nombra la fecha
 * real, para mostrarse junto al selector sin importar si se navegó o no. */
function formatDetalleFecha(id: PeriodoId, desde: Date, hasta: Date): string {
  switch (id) {
    case "hoy":
      return `${capitalizarPrimera(DIAS_SEMANA[(desde.getDay() + 6) % 7].replace(".", ""))} ${desde.getDate()} de ${MESES[desde.getMonth()]} de ${desde.getFullYear()}`;
    case "mes":
      return `${capitalizarPrimera(MESES[desde.getMonth()])} ${desde.getFullYear()}`;
    case "trimestre":
      return `${capitalizarPrimera(MESES[desde.getMonth()])} – ${capitalizarPrimera(MESES[hasta.getMonth()])} ${hasta.getFullYear()}`;
    case "año":
      return String(desde.getFullYear());
    case "semana":
    case "personalizado":
    default:
      return formatRangeLabel(desde, hasta);
  }
}

/** Calcula el rango de fechas [desde, hasta] de un periodo del selector del
 * Dashboard, más el rango "anterior" equivalente (mismo número de días,
 * inmediatamente antes) para la comparación porcentual. `ancla` es la
 * fecha de referencia (qué mes/semana/etc. se está viendo — se puede
 * navegar con las flechas del selector, no siempre es hoy). `hoyReal`
 * (por default, la misma `ancla`) es la fecha real de hoy: si el periodo
 * mostrado la contiene, `hasta` se recorta a hoy (no se puede reportar el
 * futuro); si es un periodo ya cerrado (navegado hacia atrás) o todavía no
 * llega (navegado hacia adelante), `hasta` es el fin natural completo del
 * periodo. "personalizado" nunca se recorta — el usuario ya eligió las
 * fechas exactas. */
export function calcularRangoPeriodo(
  id: PeriodoId,
  ancla: Date,
  personalizado?: { desdeISO: string; hastaISO: string },
  hoyReal: Date = ancla
): RangoPeriodo {
  const hoyRealSinHora = new Date(hoyReal.getFullYear(), hoyReal.getMonth(), hoyReal.getDate());
  let desde: Date;
  let finNatural: Date;
  let label: string;

  if (id === "personalizado" && personalizado) {
    const a = new Date(`${personalizado.desdeISO}T00:00:00`);
    const b = new Date(`${personalizado.hastaISO}T00:00:00`);
    desde = a <= b ? a : b;
    finNatural = a <= b ? b : a;
    label = "Personalizado";
  } else {
    const anclaSinHora = new Date(ancla.getFullYear(), ancla.getMonth(), ancla.getDate());
    switch (id) {
      case "hoy":
        desde = anclaSinHora;
        finNatural = anclaSinHora;
        label = "Hoy";
        break;
      case "semana":
        desde = inicioSemana(ancla);
        finNatural = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 6);
        label = "Esta semana";
        break;
      case "trimestre":
        desde = inicioTrimestre(ancla);
        finNatural = new Date(desde.getFullYear(), desde.getMonth() + 3, 0);
        label = "Este trimestre";
        break;
      case "año":
        desde = inicioAnio(ancla);
        finNatural = new Date(desde.getFullYear(), 11, 31);
        label = "Este año";
        break;
      case "mes":
      default:
        desde = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
        finNatural = new Date(desde.getFullYear(), desde.getMonth() + 1, 0);
        label = "Este mes";
        break;
    }
  }

  const contieneHoyReal =
    hoyRealSinHora.getTime() >= desde.getTime() && hoyRealSinHora.getTime() <= finNatural.getTime();
  const hasta = id !== "personalizado" && contieneHoyReal ? hoyRealSinHora : finNatural;
  const detalleFecha = formatDetalleFecha(id, desde, finNatural);
  if (id !== "personalizado" && !contieneHoyReal) label = detalleFecha;

  const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1);
  const hastaAnterior = new Date(desde);
  hastaAnterior.setDate(hastaAnterior.getDate() - 1);
  const desdeAnterior = new Date(hastaAnterior);
  desdeAnterior.setDate(desdeAnterior.getDate() - (dias - 1));

  return {
    id,
    label,
    detalleFecha,
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

/** Suma cantidad + valor de `presupuestosPorFecha` (rollup por día de
 * creación, ver EstadisticasGlobales en metas.ts) dentro de [desdeISO,
 * hastaISO] — mismo espíritu que `sumarRango` de metas.ts, pero por
 * comparación de string ISO en vez de Date, consistente con el resto de
 * este archivo. Solo trackea CREACIÓN, nunca cambios posteriores de
 * `estado` (ver limitación documentada en BudgetMetrics.tsx). */
export function sumarPresupuestosEnRango(
  presupuestosPorFecha: Record<string, { cantidad: number; valor: number }> | undefined,
  desdeISO: string,
  hastaISO: string
): { cantidad: number; valor: number } {
  if (!presupuestosPorFecha) return { cantidad: 0, valor: 0 };
  let cantidad = 0;
  let valor = 0;
  Object.entries(presupuestosPorFecha).forEach(([fecha, entrada]) => {
    if (fecha >= desdeISO && fecha <= hastaISO) {
      cantidad += entrada.cantidad;
      valor += entrada.valor;
    }
  });
  return { cantidad, valor };
}

/** Variación porcentual entre el periodo actual y el anterior. null si no
 * hay base de comparación (periodo anterior en cero). */
export function variacionPct(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

/** Pacientes distintos con al menos una cita Atendida en [desdeISO, hastaISO]. */
export function pacientesAtendidosEnRango(citas: CitaAgenda[], desdeISO: string, hastaISO: string): number {
  return pacientesEnRangoDetalle(citas, desdeISO, hastaISO).length;
}

export type PacienteEnRangoEntry = { patientId: string; patientName: string };

/** Mismo criterio que `pacientesAtendidosEnRango`, pero devuelve la
 * identidad de cada paciente (para el detalle clicable) en vez de solo el
 * conteo — un paciente por cita Atendida más reciente que tenga en el
 * rango, sin necesidad de cruzar con `patients` porque `CitaAgenda.paciente`
 * ya trae el nombre denormalizado. */
export function pacientesEnRangoDetalle(
  citas: CitaAgenda[],
  desdeISO: string,
  hastaISO: string
): PacienteEnRangoEntry[] {
  const porPaciente = new Map<string, string>();
  citas.forEach((c) => {
    if (c.estatus === "Atendida" && c.patientId && c.fecha >= desdeISO && c.fecha <= hastaISO) {
      porPaciente.set(c.patientId, c.paciente);
    }
  });
  return [...porPaciente.entries()].map(([patientId, patientName]) => ({ patientId, patientName }));
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
  return citasProximas(citas, hoyISO, dias).length;
}

/** Mismo criterio que `proximasCitas`, pero devuelve las citas en vez de
 * solo el conteo — para el detalle clicable de "Próximas Citas". */
export function citasProximas(citas: CitaAgenda[], hoyISO: string, dias: number): CitaAgenda[] {
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
  );
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
