/** Indicadores empresariales del consultorio, por mes: finanzas (ingresos, utilidad, margen, punto de equilibrio,
 * cuentas por cobrar…) y administración/operación (citas, utilización de bloques, pacientes, presupuestos).
 * Todo puro, sin Firestore ni pantalla. */

import { resumenDeDias, sumarDias } from "./evaluacionSemanal";
import type { BloqueAtencion, Sede } from "./sedesBloques";
import type { Gasto, GastoCategoria } from "./gastos";
import type { FinanzasConfig, PresupuestosPorEstado } from "./metas";
import { redondearDinero } from "./dinero";

type ClasificacionGasto = "fijo" | "variable";

type CitaIndicador = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: string;
  patientId?: string | null;
  medicoId?: string | null;
  recursoId?: string;
  horaLlegada?: string | null;
  canceladaTarde?: boolean;
  fueraDeBloque?: boolean;
};

type RecursoIndicador = { id: string; tipo: string; nombre: string; bloques?: BloqueAtencion[] };

export type EntradaIndicadores = {
  /** Cualquier día del mes a evaluar ("YYYY-MM-DD"). */
  mes: string;
  /** "Hoy" ("YYYY-MM-DD"): decide si el mes está en curso (para proyectarlo) y qué es "activo". */
  hoyISO: string;
  finanzas: Pick<FinanzasConfig, "porFecha" | "devolucionesPorFecha" | "pagosCountPorFecha" | "porFechaYMedico">;
  gastos: Gasto[];
  /** Cómo se clasificó cada categoría en Presupuesto de gastos; sin dato, se toma como variable. */
  clasificacionPorCategoria: Partial<Record<GastoCategoria, ClasificacionGasto>>;
  citas: CitaIndicador[];
  recursos: RecursoIndicador[];
  sedes: Sede[];
  pacientes: { id: string; createdAt?: string }[];
  saldos: { totalPresupuestado: number; totalPagado: number }[];
  presupuestosPorEstado?: PresupuestosPorEstado;
  metaMensual: number;
};

// ---------- Fechas ----------
const aISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Primer y último día (ISO) del mes de una fecha, y todos sus días. */
export function diasDelMes(fechaISO: string): { primero: string; ultimo: string; dias: string[] } {
  const [a, m] = fechaISO.split("-").map(Number);
  const ultimoDia = new Date(a, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  const dias = Array.from({ length: ultimoDia }, (_, i) => `${a}-${mm}-${String(i + 1).padStart(2, "0")}`);
  return { primero: dias[0], ultimo: dias[ultimoDia - 1], dias };
}

/** El mismo día del mes de `meses` meses antes/después (el día 1 del mes resultante). */
export function mesDesplazado(fechaISO: string, meses: number): string {
  const [a, m] = fechaISO.split("-").map(Number);
  return aISO(new Date(a, m - 1 + meses, 1));
}

const sumaPorFecha = (porFecha: Record<string, number> | undefined, dias: string[]) =>
  redondearDinero(dias.reduce((acc, d) => acc + (porFecha?.[d] ?? 0), 0));

// ---------- Resultado ----------
export type GastoDeCategoria = { categoria: string; monto: number; porcentajeDeIngresos: number | null; clasificacion: ClasificacionGasto };

export type IndicadoresFinanzas = {
  ingresosBrutos: number;
  devoluciones: number;
  ingresosNetos: number;
  ingresosNetosMesAnterior: number;
  /** Cambio contra el mes anterior (0.12 = +12%); `null` si el mes anterior no tuvo ingresos. */
  variacionIngresos: number | null;
  /** Ingresos netos proyectados al cierre del mes (solo si el mes está en curso y ya hay al menos un día). */
  proyeccionCierre: number | null;
  gastos: number;
  gastosFijos: number;
  gastosVariables: number;
  gastosPorCategoria: GastoDeCategoria[];
  utilidad: number;
  /** Utilidad entre ingresos netos; `null` si no hubo ingresos. */
  margen: number | null;
  /** Ingreso mensual necesario para cubrir los gastos fijos con el mismo peso de gasto variable de este mes. */
  puntoEquilibrio: { ingresoNecesario: number; faltan: number; superado: boolean } | null;
  pagos: number;
  ticketPromedio: number | null;
  cuentasPorCobrar: { total: number; pacientes: number };
  /** Ingresos netos entre la meta mensual; `null` si no hay meta. */
  cumplimientoMeta: number | null;
  /** El médico que más cobró y qué parte del total fue; `null` si no hay desglose. */
  concentracionMedico: { nombre: string; porcentaje: number } | null;
};

export type IndicadoresOperacion = {
  citasAgendadas: number;
  atendidas: number;
  canceladas: number;
  noAsistio: number;
  /** Canceladas + no asistió, entre las citas del mes (sin contar reagendadas). */
  tasaPerdida: number | null;
  horasDisponibles: number;
  horasAtendidas: number;
  /** Horas atendidas entre las disponibles de los bloques; `null` si no hay bloques. */
  utilizacionBloques: number | null;
  ingresoPorHoraAtendida: number | null;
  pacientesNuevos: number;
  /** Pacientes con al menos una cita atendida en los 12 meses anteriores a hoy. */
  pacientesActivos: number;
  presupuestos: { tasaCierre: number | null; pendientes: number; valorPendiente: number } | null;
};

export type Indicadores = {
  mes: string;
  esMesEnCurso: boolean;
  finanzas: IndicadoresFinanzas;
  operacion: IndicadoresOperacion;
};

export function calcularIndicadores(e: EntradaIndicadores): Indicadores {
  const { primero, ultimo, dias } = diasDelMes(e.mes);
  const anterior = diasDelMes(mesDesplazado(e.mes, -1));
  const esMesEnCurso = e.hoyISO >= primero && e.hoyISO <= ultimo;

  // ----- Finanzas -----
  const ingresosBrutos = sumaPorFecha(e.finanzas.porFecha, dias);
  const devoluciones = sumaPorFecha(e.finanzas.devolucionesPorFecha, dias);
  const ingresosNetos = redondearDinero(ingresosBrutos - devoluciones);
  const ingresosNetosMesAnterior = redondearDinero(
    sumaPorFecha(e.finanzas.porFecha, anterior.dias) - sumaPorFecha(e.finanzas.devolucionesPorFecha, anterior.dias)
  );
  const variacionIngresos = ingresosNetosMesAnterior > 0 ? (ingresosNetos - ingresosNetosMesAnterior) / ingresosNetosMesAnterior : null;

  const diaDelMes = esMesEnCurso ? Number(e.hoyISO.slice(8, 10)) : 0;
  const proyeccionCierre = esMesEnCurso && diaDelMes > 0 ? redondearDinero((ingresosNetos / diaDelMes) * dias.length) : null;

  const delMes = e.gastos.filter((g) => g.fecha >= primero && g.fecha <= ultimo);
  const porCategoria = new Map<string, number>();
  for (const g of delMes) porCategoria.set(g.categoria, redondearDinero((porCategoria.get(g.categoria) ?? 0) + (Number(g.monto) || 0)));
  const clasificacionDe = (c: string): ClasificacionGasto => e.clasificacionPorCategoria[c as GastoCategoria] ?? "variable";
  const gastosPorCategoria: GastoDeCategoria[] = [...porCategoria.entries()]
    .map(([categoria, monto]) => ({
      categoria,
      monto,
      porcentajeDeIngresos: ingresosNetos > 0 ? monto / ingresosNetos : null,
      clasificacion: clasificacionDe(categoria),
    }))
    .sort((a, b) => b.monto - a.monto);
  const gastos = redondearDinero(gastosPorCategoria.reduce((a, g) => a + g.monto, 0));
  const gastosFijos = redondearDinero(gastosPorCategoria.filter((g) => g.clasificacion === "fijo").reduce((a, g) => a + g.monto, 0));
  const gastosVariables = redondearDinero(gastos - gastosFijos);
  const utilidad = redondearDinero(ingresosNetos - gastos);
  const margen = ingresosNetos > 0 ? utilidad / ingresosNetos : null;

  // Punto de equilibrio: gastos fijos / (1 − peso del gasto variable sobre el ingreso).
  let puntoEquilibrio: IndicadoresFinanzas["puntoEquilibrio"] = null;
  if (ingresosNetos > 0 && gastosFijos > 0) {
    const pesoVariable = gastosVariables / ingresosNetos;
    if (pesoVariable < 1) {
      const necesario = redondearDinero(gastosFijos / (1 - pesoVariable));
      puntoEquilibrio = { ingresoNecesario: necesario, faltan: Math.max(0, redondearDinero(necesario - ingresosNetos)), superado: ingresosNetos >= necesario };
    }
  }

  const pagos = dias.reduce((acc, d) => acc + (e.finanzas.pagosCountPorFecha?.[d] ?? 0), 0);
  const ticketPromedio = pagos > 0 ? redondearDinero(ingresosBrutos / pagos) : null;

  const deudas = e.saldos.map((s) => redondearDinero(s.totalPresupuestado - s.totalPagado)).filter((d) => d > 0);
  const cuentasPorCobrar = { total: redondearDinero(deudas.reduce((a, d) => a + d, 0)), pacientes: deudas.length };

  const porMedico = new Map<string, number>();
  for (const d of dias) for (const [nombre, monto] of Object.entries(e.finanzas.porFechaYMedico?.[d] ?? {})) porMedico.set(nombre, (porMedico.get(nombre) ?? 0) + monto);
  const totalMedicos = [...porMedico.values()].reduce((a, v) => a + v, 0);
  const top = [...porMedico.entries()].sort((a, b) => b[1] - a[1])[0];
  const concentracionMedico = top && totalMedicos > 0 ? { nombre: top[0], porcentaje: top[1] / totalMedicos } : null;

  // ----- Administración y operación -----
  const citasDelMes = e.citas.filter((c) => c.fecha >= primero && c.fecha <= ultimo);
  const atendidas = citasDelMes.filter((c) => c.estatus === "Atendida").length;
  const canceladas = citasDelMes.filter((c) => c.estatus === "Cancelada").length;
  const noAsistio = citasDelMes.filter((c) => c.estatus === "No Asistió").length;
  const citasAgendadas = citasDelMes.filter((c) => c.estatus !== "Reagendada").length;
  const tasaPerdida = citasAgendadas > 0 ? (canceladas + noAsistio) / citasAgendadas : null;

  const horas = resumenDeDias({ dias, recursos: e.recursos, sedes: e.sedes, citas: e.citas });
  const horasDisponibles = horas.totales.horasDisponibles;
  const horasAtendidas = horas.totales.horasAtendidas;
  const utilizacionBloques = horasDisponibles > 0 ? horasAtendidas / horasDisponibles : null;
  const ingresoPorHoraAtendida = horasAtendidas > 0 ? redondearDinero(ingresosNetos / horasAtendidas) : null;

  const pacientesNuevos = e.pacientes.filter((p) => p.createdAt && p.createdAt.slice(0, 10) >= primero && p.createdAt.slice(0, 10) <= ultimo).length;
  const desdeActivos = sumarDias(e.hoyISO, -365);
  const activos = new Set(e.citas.filter((c) => c.estatus === "Atendida" && c.patientId && c.fecha >= desdeActivos && c.fecha <= e.hoyISO).map((c) => c.patientId));

  let presupuestos: IndicadoresOperacion["presupuestos"] = null;
  if (e.presupuestosPorEstado) {
    const p = e.presupuestosPorEstado;
    const resueltos = p.aceptado.cantidad + p.rechazado.cantidad + p.expirado.cantidad;
    presupuestos = {
      tasaCierre: resueltos > 0 ? p.aceptado.cantidad / resueltos : null,
      pendientes: p.pendiente.cantidad,
      valorPendiente: redondearDinero(p.pendiente.valor),
    };
  }

  return {
    mes: primero,
    esMesEnCurso,
    finanzas: {
      ingresosBrutos,
      devoluciones,
      ingresosNetos,
      ingresosNetosMesAnterior,
      variacionIngresos,
      proyeccionCierre,
      gastos,
      gastosFijos,
      gastosVariables,
      gastosPorCategoria,
      utilidad,
      margen,
      puntoEquilibrio,
      pagos,
      ticketPromedio,
      cuentasPorCobrar,
      cumplimientoMeta: e.metaMensual > 0 ? ingresosNetos / e.metaMensual : null,
      concentracionMedico,
    },
    operacion: {
      citasAgendadas,
      atendidas,
      canceladas,
      noAsistio,
      tasaPerdida,
      horasDisponibles,
      horasAtendidas,
      utilizacionBloques,
      ingresoPorHoraAtendida,
      pacientesNuevos,
      pacientesActivos: activos.size,
      presupuestos,
    },
  };
}
