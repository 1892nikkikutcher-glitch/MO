/** Metas de ingresos: una sola cifra fuente de verdad (mensual) para que
 * semanal/quincenal/mensual siempre coincidan entre sí, y el cálculo real
 * de ingresos por periodo a partir del acumulado diario de pagos. */

export type MetaConfig = {
  metaMensual: number;
};

export const metaConfigInicial: MetaConfig = { metaMensual: 0 };

/** Acumulado real de pagos por fecha (YYYY-MM-DD → total del día), y el
 * mismo total desglosado por forma de pago para el Corte de Caja
 * (YYYY-MM-DD → forma de pago → monto). */
export type FinanzasConfig = {
  porFecha: Record<string, number>;
  porFechaYFormaPago: Record<string, Record<string, number>>;
};

export const finanzasInicial: FinanzasConfig = { porFecha: {}, porFechaYFormaPago: {} };

/** Cantidad y valor ($) histórico de presupuestos por estado — presupuestos
 * guardados antes de que existiera el campo `estado` cuentan como
 * "pendiente", igual que en cualquier otra parte de la app. */
export type PresupuestoPorEstado = { cantidad: number; valor: number };

export type PresupuestosPorEstado = {
  pendiente: PresupuestoPorEstado;
  aceptado: PresupuestoPorEstado;
  rechazado: PresupuestoPorEstado;
  expirado: PresupuestoPorEstado;
};

export const presupuestosPorEstadoInicial: PresupuestosPorEstado = {
  pendiente: { cantidad: 0, valor: 0 },
  aceptado: { cantidad: 0, valor: 0 },
  rechazado: { cantidad: 0, valor: 0 },
  expirado: { cantidad: 0, valor: 0 },
};

/** Estadísticas agregadas de todo el consultorio, mantenidas de forma
 * incremental (a diferencia de presupuestos/pagos/laboratorios, que solo se
 * cargan por paciente cuando se abre su expediente) para que los KPIs del
 * Dashboard reflejen datos reales desde el primer momento, sin depender de
 * qué expedientes se hayan visitado en la sesión. */
export type EstadisticasGlobales = {
  /** Suma histórica de presupuesto.total de todos los presupuestos creados. */
  totalPresupuestado: number;
  /** Conteo histórico de pagos registrados (para el ticket promedio). */
  pagosCount: number;
  /** "YYYY-MM" -> cantidad de presupuestos creados ese mes. */
  presupuestosPorMes: Record<string, number>;
  /** Solicitudes de laboratorio con estatus distinto de "Recibido". */
  laboratoriosPendientesCount: number;
  /** Ausente en cuentas creadas antes de este campo — tratar como
   * `presupuestosPorEstadoInicial` (`estadisticas.presupuestosPorEstado ??
   * presupuestosPorEstadoInicial`). */
  presupuestosPorEstado?: PresupuestosPorEstado;
};

export const estadisticasInicial: EstadisticasGlobales = {
  totalPresupuestado: 0,
  pagosCount: 0,
  presupuestosPorMes: {},
  laboratoriosPendientesCount: 0,
  presupuestosPorEstado: presupuestosPorEstadoInicial,
};

const SEMANAS_POR_MES = 4.345;

export function metaSemanalDe(metaMensual: number) {
  return metaMensual / SEMANAS_POR_MES;
}

export function metaQuincenalDe(metaMensual: number) {
  return metaMensual / 2;
}

export function inicioSemana(hoy: Date): Date {
  const d = new Date(hoy);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function inicioQuincena(hoy: Date): Date {
  const dia = hoy.getDate() <= 15 ? 1 : 16;
  return new Date(hoy.getFullYear(), hoy.getMonth(), dia);
}

export function inicioMes(hoy: Date): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/** Los pagos guardan `fecha` como texto "DD/MM/YYYY" (formato de despliegue
 * es-MX), no ISO — hay que convertirlo antes de usarlo como llave de fecha. */
export function fechaPagoAIso(fechaDisplay: string): string | null {
  const m = fechaDisplay.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function sumarRango(porFecha: Record<string, number>, desde: Date, hasta: Date): number {
  let total = 0;
  Object.entries(porFecha).forEach(([fecha, monto]) => {
    const d = new Date(`${fecha}T00:00:00`);
    if (d >= desde && d <= hasta) total += monto;
  });
  return total;
}

export type AvanceMeta = {
  label: string;
  actual: number;
  meta: number;
  porcentaje: number;
};

export function calcularAvanceMetas(porFecha: Record<string, number>, metaMensual: number): AvanceMeta[] {
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  const semanal = sumarRango(porFecha, inicioSemana(hoy), hoy);
  const quincenal = sumarRango(porFecha, inicioQuincena(hoy), hoy);
  const mensual = sumarRango(porFecha, inicioMes(hoy), hoy);

  const metaSemanal = metaSemanalDe(metaMensual);
  const metaQuincenal = metaQuincenalDe(metaMensual);

  const pct = (actual: number, meta: number) => (meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0);

  return [
    { label: "Semanal", actual: semanal, meta: metaSemanal, porcentaje: pct(semanal, metaSemanal) },
    { label: "Quincenal", actual: quincenal, meta: metaQuincenal, porcentaje: pct(quincenal, metaQuincenal) },
    { label: "Mensual", actual: mensual, meta: metaMensual, porcentaje: pct(mensual, metaMensual) },
  ];
}
