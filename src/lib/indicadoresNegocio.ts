/** Indicadores empresariales del consultorio, por mes: finanzas (ingresos, utilidad, margen, punto de equilibrio,
 * cuentas por cobrar…) y administración/operación (citas, utilización de bloques, pacientes, presupuestos).
 * Todo puro, sin Firestore ni pantalla. */

import { resumenDeDias, sumarDias } from "./evaluacionSemanal";
import type { BloqueAtencion, Sede } from "./sedesBloques";
import { naturalezaDeGasto, type Gasto, type GastoCategoria } from "./gastos";
import type { FinanzasConfig, PresupuestosPorEstado } from "./metas";
import { redondearDinero } from "./dinero";
import { calcularBalance, type BalanceConsultorio, type ResultadoBalance } from "./balanceConsultorio";

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
  finanzas: Pick<FinanzasConfig, "porFecha" | "devolucionesPorFecha" | "pagosCountPorFecha" | "porFechaYMedico"> & Partial<Pick<FinanzasConfig, "porFechaYFormaPago">>;
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
  /** Lo capturado en el balance (efectivo, deudas…); sin esto, capital de trabajo y endeudamiento quedan sin calcular. */
  balance?: BalanceConsultorio;
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
/** `mixto`: la categoría tiene gastos fijos y variables a la vez. */
export type GastoDeCategoria = {
  categoria: string;
  monto: number;
  porcentajeDeIngresos: number | null;
  clasificacion: ClasificacionGasto | "mixto";
};

export type IndicadoresFinanzas = {
  ingresosBrutos: number;
  devoluciones: number;
  ingresosNetos: number;
  ingresosNetosMesAnterior: number;
  /** Cambio contra el mes anterior (0.12 = +12%); `null` si el mes anterior no tuvo ingresos. */
  variacionIngresos: number | null;
  /** Ingresos netos proyectados al cierre del mes (solo si el mes está en curso y ya hay al menos un día). */
  proyeccionCierre: number | null;
  /** Costos más gastos de operación del mes (la inversión no entra). */
  gastos: number;
  /** Lo que cuesta dar el servicio: insumos, laboratorio… (gastos marcados como costo). */
  costos: number;
  /** Lo que cuesta operar: renta, nómina, servicios, marketing… (gastos marcados como gasto). */
  gastosOperativos: number;
  /** Equipo, mobiliario, remodelación… del mes: no resta de la utilidad, sí del efectivo. */
  inversion: number;
  /** Inversión de lo que va del año hasta el fin del mes elegido. */
  inversionDelAnio: number;
  gastosFijos: number;
  gastosVariables: number;
  gastosPorCategoria: GastoDeCategoria[];
  /** Ingresos netos menos costos. */
  utilidadBruta: number;
  /** Utilidad bruta entre ingresos netos; `null` si no hubo ingresos. */
  margenBruto: number | null;
  /** Ingresos netos menos costos y gastos de operación (utilidad operativa). */
  utilidad: number;
  /** Utilidad menos la inversión del mes. */
  flujoTrasInversion: number;
  /** Impuestos e intereses del mes (debajo de la utilidad operativa). */
  financieros: number;
  /** Utilidad operativa menos impuestos e intereses. */
  utilidadNeta: number;
  /** Utilidad neta entre ingresos netos; `null` si no hubo ingresos. */
  margenNeto: number | null;
  /** Lo que entró en el mes (cobros netos de devoluciones). */
  entradasEfectivo: number;
  /** Lo que salió en el mes: costos, gastos, inversión, impuestos e intereses. */
  salidasEfectivo: number;
  /** Entradas menos salidas de efectivo del mes. */
  flujoEfectivo: number;
  /** Todo lo registrado como inversión hasta el fin del mes elegido. */
  inversionAcumulada: number;
  /** Rendimiento de lo invertido: utilidad neta de los últimos 12 meses entre la inversión acumulada. `null` si no hay inversión. */
  rentabilidadInversion: {
    rendimiento: number;
    utilidadNeta12m: number;
    mesesConDatos: number;
    /** Meses que tardaría en recuperarse la inversión con la utilidad neta mensual promedio; `null` si esa utilidad no es positiva. */
    mesesParaRecuperar: number | null;
  } | null;
  /** Cuántos días de cobros equivale lo que te deben (con el promedio diario de los últimos 90 días); `null` si no hubo cobros. */
  diasDeCobranza: number | null;
  /** Capital de trabajo, endeudamiento… (con lo capturado en el balance). */
  balance: ResultadoBalance;
  /** Utilidad entre ingresos netos; `null` si no hubo ingresos. */
  margen: number | null;
  /** Gastos del mes entre las horas trabajadas; `null` si no hubo horas trabajadas. */
  costoPorHoraTrabajada: number | null;
  /** Gastos del mes entre las horas que abren los bloques (lo que cuesta cada hora abierta, se use o no). */
  costoPorHoraDisponible: number | null;
  /** Lo que cuesta tener abierto el consultorio por hora trabajada: todos los gastos menos insumos y laboratorio. */
  costoEstructuraPorHora: number | null;
  /** Utilidad entre las horas trabajadas. */
  utilidadPorHora: number | null;
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
  /** Horas que se trabajaron: citas atendidas dentro de los bloques. */
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
  // La inversión va aparte: no es un gasto de operación.
  const inversion = redondearDinero(delMes.filter((g) => naturalezaDeGasto(g) === "inversion").reduce((a, g) => a + (Number(g.monto) || 0), 0));
  const inicioAnio = `${primero.slice(0, 4)}-01-01`;
  const inversionDelAnio = redondearDinero(
    e.gastos.filter((g) => naturalezaDeGasto(g) === "inversion" && g.fecha >= inicioAnio && g.fecha <= ultimo).reduce((a, g) => a + (Number(g.monto) || 0), 0)
  );
  const costos = redondearDinero(delMes.filter((g) => naturalezaDeGasto(g) === "costo").reduce((a, g) => a + (Number(g.monto) || 0), 0));
  const financieros = redondearDinero(delMes.filter((g) => naturalezaDeGasto(g) === "financiero").reduce((a, g) => a + (Number(g.monto) || 0), 0));
  const inversionAcumulada = redondearDinero(
    e.gastos.filter((g) => naturalezaDeGasto(g) === "inversion" && g.fecha <= ultimo).reduce((a, g) => a + (Number(g.monto) || 0), 0)
  );
  // Costos y gastos de operación: la inversión y los impuestos e intereses van aparte.
  const operativos = delMes.filter((g) => {
    const n = naturalezaDeGasto(g);
    return n !== "inversion" && n !== "financiero";
  });

  // Cada gasto es fijo o variable según lo que se le puso; sin eso, lo de su categoría (por defecto, variable).
  const porCategoria = new Map<string, { monto: number; fijo: number; variable: number }>();
  for (const g of operativos) {
    const monto = Number(g.monto) || 0;
    const esFijo = (g.clasificacion ?? e.clasificacionPorCategoria[g.categoria as GastoCategoria] ?? "variable") === "fijo";
    const actual = porCategoria.get(g.categoria) ?? { monto: 0, fijo: 0, variable: 0 };
    actual.monto = redondearDinero(actual.monto + monto);
    if (esFijo) actual.fijo = redondearDinero(actual.fijo + monto);
    else actual.variable = redondearDinero(actual.variable + monto);
    porCategoria.set(g.categoria, actual);
  }
  const gastosPorCategoria: GastoDeCategoria[] = [...porCategoria.entries()]
    .map(([categoria, v]) => ({
      categoria,
      monto: v.monto,
      porcentajeDeIngresos: ingresosNetos > 0 ? v.monto / ingresosNetos : null,
      clasificacion: (v.fijo > 0 && v.variable > 0 ? "mixto" : v.fijo > 0 ? "fijo" : "variable") as GastoDeCategoria["clasificacion"],
    }))
    .sort((a, b) => b.monto - a.monto);
  const gastos = redondearDinero(gastosPorCategoria.reduce((a, g) => a + g.monto, 0));
  const gastosFijos = redondearDinero([...porCategoria.values()].reduce((a, v) => a + v.fijo, 0));
  const gastosVariables = redondearDinero(gastos - gastosFijos);
  const gastosOperativos = redondearDinero(gastos - costos);
  const utilidadBruta = redondearDinero(ingresosNetos - costos);
  const margenBruto = ingresosNetos > 0 ? utilidadBruta / ingresosNetos : null;
  const utilidad = redondearDinero(ingresosNetos - gastos);
  const flujoTrasInversion = redondearDinero(utilidad - inversion);
  const margen = ingresosNetos > 0 ? utilidad / ingresosNetos : null;
  const utilidadNeta = redondearDinero(utilidad - financieros);
  const margenNeto = ingresosNetos > 0 ? utilidadNeta / ingresosNetos : null;
  // Lo pagado con cashback es venta (cuenta en los ingresos) pero no es dinero que entró: no suma al flujo de efectivo.
  const pagadoConCashback = redondearDinero(dias.reduce((a, d) => a + (e.finanzas.porFechaYFormaPago?.[d]?.Cashback ?? 0), 0));
  const entradasEfectivo = redondearDinero(ingresosNetos - pagadoConCashback);
  const salidasEfectivo = redondearDinero(gastos + inversion + financieros);
  const flujoEfectivo = redondearDinero(entradasEfectivo - salidasEfectivo);

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

  // Cobranza: días de cobros que representa lo que te deben, con el promedio diario de los últimos 90 días.
  const topeCobranza = e.hoyISO < ultimo ? e.hoyISO : ultimo;
  const dias90 = Array.from({ length: 90 }, (_, i) => sumarDias(topeCobranza, -i));
  const cobros90 = redondearDinero(sumaPorFecha(e.finanzas.porFecha, dias90) - sumaPorFecha(e.finanzas.devolucionesPorFecha, dias90));
  const diasDeCobranza = cobros90 > 0 ? (cuentasPorCobrar.total / (cobros90 / 90)) : null;

  // Rentabilidad de la inversión: utilidad neta de los últimos 12 meses entre lo invertido hasta hoy.
  let utilidadNeta12m = 0;
  let mesesConDatos = 0;
  for (let k = 0; k < 12; k++) {
    const m = diasDelMes(mesDesplazado(e.mes, -k));
    const ing = sumaPorFecha(e.finanzas.porFecha, m.dias) - sumaPorFecha(e.finanzas.devolucionesPorFecha, m.dias);
    const egr = e.gastos
      .filter((g) => g.fecha >= m.primero && g.fecha <= m.ultimo && naturalezaDeGasto(g) !== "inversion")
      .reduce((a, g) => a + (Number(g.monto) || 0), 0);
    if (ing !== 0 || egr !== 0) {
      mesesConDatos += 1;
      utilidadNeta12m += ing - egr;
    }
  }
  utilidadNeta12m = redondearDinero(utilidadNeta12m);
  const promedioMensual = mesesConDatos > 0 ? utilidadNeta12m / mesesConDatos : 0;
  const rentabilidadInversion =
    inversionAcumulada > 0
      ? {
          rendimiento: utilidadNeta12m / inversionAcumulada,
          utilidadNeta12m,
          mesesConDatos,
          mesesParaRecuperar: promedioMensual > 0 ? inversionAcumulada / promedioMensual : null,
        }
      : null;

  const balance = calcularBalance(e.balance, cuentasPorCobrar.total, inversionAcumulada);

  const porMedico = new Map<string, number>();
  for (const d of dias) for (const [nombre, monto] of Object.entries(e.finanzas.porFechaYMedico?.[d] ?? {})) porMedico.set(nombre, (porMedico.get(nombre) ?? 0) + monto);
  const totalMedicos = [...porMedico.values()].reduce((a, v) => a + v, 0);
  const top = [...porMedico.entries()].sort((a, b) => b[1] - a[1])[0];
  const concentracionMedico = top && totalMedicos > 0 ? { nombre: top[0], porcentaje: top[1] / totalMedicos } : null;

  // ----- Horas (para el costo por hora) -----
  const horas = resumenDeDias({ dias, recursos: e.recursos, sedes: e.sedes, citas: e.citas });
  const horasDisponibles = horas.totales.horasDisponibles;
  const horasAtendidas = horas.totales.horasAtendidas;
  const gastosDirectos = costos;
  const costoPorHoraTrabajada = horasAtendidas > 0 ? redondearDinero(gastos / horasAtendidas) : null;
  const costoPorHoraDisponible = horasDisponibles > 0 ? redondearDinero(gastos / horasDisponibles) : null;
  const costoEstructuraPorHora = horasAtendidas > 0 ? redondearDinero((gastos - gastosDirectos) / horasAtendidas) : null;
  const utilidadPorHora = horasAtendidas > 0 ? redondearDinero(utilidad / horasAtendidas) : null;

  // ----- Administración y operación -----
  const citasDelMes = e.citas.filter((c) => c.fecha >= primero && c.fecha <= ultimo);
  const atendidas = citasDelMes.filter((c) => c.estatus === "Atendida").length;
  const canceladas = citasDelMes.filter((c) => c.estatus === "Cancelada").length;
  const noAsistio = citasDelMes.filter((c) => c.estatus === "No Asistió").length;
  const citasAgendadas = citasDelMes.filter((c) => c.estatus !== "Reagendada").length;
  const tasaPerdida = citasAgendadas > 0 ? (canceladas + noAsistio) / citasAgendadas : null;

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
      costos,
      gastosOperativos,
      inversion,
      inversionDelAnio,
      gastosFijos,
      gastosVariables,
      gastosPorCategoria,
      utilidadBruta,
      margenBruto,
      utilidad,
      flujoTrasInversion,
      financieros,
      utilidadNeta,
      margenNeto,
      entradasEfectivo,
      salidasEfectivo,
      flujoEfectivo,
      inversionAcumulada,
      rentabilidadInversion,
      diasDeCobranza,
      balance,
      margen,
      costoPorHoraTrabajada,
      costoPorHoraDisponible,
      costoEstructuraPorHora,
      utilidadPorHora,
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
