/** Cálculos compartidos por los componentes del Dashboard Principal
 * (`src/components/dashboard/`). Mantiene la lógica de agregación separada
 * de la parte visual — ver también `src/lib/metas.ts` (`sumarRango`,
 * `calcularAvanceMetas`), que sigue siendo la fuente de los totales de
 * ingresos por rango de fechas. */

import type { CitaAgenda } from "@/lib/patientData";
import type { HorarioAtencion } from "@/lib/patientData";

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
