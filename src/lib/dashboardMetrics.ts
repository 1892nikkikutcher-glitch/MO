/** Cálculos compartidos por los componentes del Dashboard Principal
 * (`src/components/dashboard/`). Mantiene la lógica de agregación separada
 * de la parte visual — ver también `src/lib/metas.ts` (`sumarRango`,
 * `calcularAvanceMetas`), que sigue siendo la fuente de los totales de
 * ingresos por rango de fechas. */

import type { CitaAgenda, HorarioAtencion } from "@/lib/patientData";
import type { LaboratorioPendienteEntry } from "@/lib/laboratoriosPendientes";

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
