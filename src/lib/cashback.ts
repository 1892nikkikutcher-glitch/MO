/** Cashback: un porcentaje de lo que el paciente paga en sus tratamientos vuelve como saldo para su siguiente tratamiento.
 * Cada cashback generado nace "pendiente" y el administrador lo aprueba, lo rechaza o le cambia el monto; el paciente
 * puede transferir su saldo a un conocido o familiar (también con aprobación) y usarlo como forma de pago.
 * Lógica pura: nada de Firestore ni de React aquí. */

import { redondearDinero } from "./dinero";
import { fechaPagoAIso } from "./metas";
import type { Pago } from "./patientData";

/** Forma de pago con la que se usa el saldo de cashback en un pago. */
/** Cómo se llama el programa para el paciente y en todas las pantallas. */
export const NOMBRE_PROGRAMA_CASHBACK = "Cashback";

export const FORMA_PAGO_CASHBACK = "Cashback";

/** Nombres con los que esta forma de pago se guardó antes: los pagos ya hechos con ellos siguen siendo cashback. */
export const NOMBRES_ANTERIORES_FORMA_CASHBACK = ["Saldo Sonríe"];
export const esFormaPagoCashback = (forma: string) => forma === FORMA_PAGO_CASHBACK || NOMBRES_ANTERIORES_FORMA_CASHBACK.includes(forma);

export type CashbackConfig = {
  activo: boolean;
  /** 5 = 5% de lo efectivamente pagado en tratamientos ($50 por cada $1,000). */
  porcentaje: number;
  /** Meses que dura el saldo desde que se aprueba. 0 = no vence. */
  vigenciaMeses: number;
  /** Si el paciente puede pasar su saldo a otra persona (por defecto no: un beneficio cerrado). */
  transferible: boolean;
  /** Lo máximo del valor de una atención que se puede cubrir con saldo (20 = 20%). 0 = sin límite. */
  porcentajeMaxCanje: number;
  /** Lo máximo de saldo que se usa en una visita, en pesos. 0 = sin límite. */
  topeCanjePorVisita: number;
  /** Lo máximo de saldo que un paciente puede tener acumulado, en pesos. 0 = sin límite. */
  saldoMaximo: number;
  /** El saldo ganado se puede usar a partir del día siguiente (la siguiente visita), no el mismo día. */
  liberarSiguienteDia: boolean;
};

export const cashbackConfigInicial: CashbackConfig = {
  activo: false,
  porcentaje: 5,
  vigenciaMeses: 12,
  transferible: false,
  porcentajeMaxCanje: 20,
  topeCanjePorVisita: 500,
  saldoMaximo: 1000,
  liberarSiguienteDia: true,
};

/** La configuración guardada puede ser anterior a algún campo: lo que falte toma el valor de siempre. */
export function normalizarConfigCashback(guardada: Partial<CashbackConfig> | null | undefined): CashbackConfig {
  return { ...cashbackConfigInicial, ...(guardada ?? {}) };
}

/** Lo que se puede cubrir con saldo en una atención: lo menor entre el saldo disponible, el % del valor de la atención y el tope por visita. */
export function montoMaximoCanje(saldoDisponible: number, valorAtencion: number, config: CashbackConfig): number {
  const limites = [saldoDisponible];
  if (config.porcentajeMaxCanje > 0) limites.push(redondearDinero((valorAtencion * config.porcentajeMaxCanje) / 100));
  if (config.topeCanjePorVisita > 0) limites.push(config.topeCanjePorVisita);
  return Math.max(0, redondearDinero(Math.min(...limites)));
}

/** Cuánto más puede acumular un paciente sin pasar del saldo máximo (Infinity si no hay tope). */
export function espacioParaAcumular(saldo: Pick<SaldoCashback, "disponible" | "porLiberar">, config: CashbackConfig): number {
  if (!(config.saldoMaximo > 0)) return Infinity;
  return Math.max(0, redondearDinero(config.saldoMaximo - saldo.disponible - saldo.porLiberar));
}

export type TipoMovimientoCashback = "generado" | "canje" | "transferencia";
export type EstadoMovimientoCashback = "pendiente" | "aprobado" | "rechazado";

export type MovimientoCashback = {
  id: string;
  /** Paciente dueño del saldo (en una transferencia, quien lo manda). */
  patientId: string;
  patientName: string;
  tipo: TipoMovimientoCashback;
  estado: EstadoMovimientoCashback;
  monto: number;
  /** Fecha ISO (AAAA-MM-DD) del movimiento. */
  fecha: string;
  creadoEn: string;
  /** Pago que lo originó (generado) o que se pagó con el saldo (canje). */
  pagoId?: string;
  /** Lo que se pagó en tratamientos y el porcentaje con el que se calculó. */
  baseMonto?: number;
  porcentaje?: number;
  /** Lo que salió del cálculo automático; si `monto` es distinto, alguien lo modificó. */
  montoCalculado?: number;
  /** Solo transferencias: quién lo recibe. */
  destinoId?: string;
  destinoNombre?: string;
  nota?: string;
  resueltoPor?: string;
  resueltoEn?: string;
};

export const etiquetaTipoCashback: Record<TipoMovimientoCashback, string> = {
  generado: "Cashback ganado",
  canje: "Usado en un pago",
  transferencia: "Transferencia",
};

export const etiquetaEstadoCashback: Record<EstadoMovimientoCashback, string> = {
  pendiente: "Por aprobar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function calcularCashback(base: number, porcentaje: number): number {
  if (!(base > 0) || !(porcentaje > 0)) return 0;
  return redondearDinero((base * porcentaje) / 100);
}

/** Lo que cuenta para ganar cashback: lo pagado en tratamientos (no membresías ni conceptos sueltos) y nunca un pago hecho con cashback. */
export function baseCashbackDePago(pago: Pago): number {
  if (esFormaPagoCashback(pago.formaPago) || pago.sinCashback) return 0;
  return redondearDinero(pago.lineas.reduce((s, l) => s + (l.tratamientoId ? l.monto : 0), 0));
}

const hoyIsoLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function sumarMesesIso(iso: string, meses: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function venceElCashback(fechaIso: string, vigenciaMeses: number): string {
  return vigenciaMeses > 0 ? sumarMesesIso(fechaIso, vigenciaMeses) : "9999-12-31";
}

export const idCashbackGenerado = (pagoId: string) => `cb-${pagoId}`;
export const idCashbackCanje = (pagoId: string) => `cbc-${pagoId}`;

export function movimientoGenerado(pago: Pago, patientId: string, patientName: string, config: CashbackConfig, ahoraIso: string): MovimientoCashback | null {
  const base = baseCashbackDePago(pago);
  const monto = calcularCashback(base, config.porcentaje);
  if (monto <= 0) return null;
  return {
    id: idCashbackGenerado(pago.id),
    patientId,
    patientName,
    tipo: "generado",
    estado: "pendiente",
    monto,
    montoCalculado: monto,
    baseMonto: base,
    porcentaje: config.porcentaje,
    fecha: fechaPagoAIso(pago.fecha) ?? ahoraIso.slice(0, 10),
    creadoEn: ahoraIso,
    pagoId: pago.id,
  };
}

export function movimientoCanje(pago: Pago, patientId: string, patientName: string, ahoraIso: string): MovimientoCashback {
  return {
    id: idCashbackCanje(pago.id),
    patientId,
    patientName,
    tipo: "canje",
    estado: "aprobado",
    monto: redondearDinero(pago.total),
    fecha: fechaPagoAIso(pago.fecha) ?? ahoraIso.slice(0, 10),
    creadoEn: ahoraIso,
    pagoId: pago.id,
    resueltoEn: ahoraIso,
  };
}

// ---------- Saldo ----------

export type SaldoCashback = {
  /** Lo que el paciente puede usar hoy. */
  disponible: number;
  /** Ganado hoy: se puede usar a partir de mañana (la siguiente visita). */
  porLiberar: number;
  /** Cashback ganado que todavía espera aprobación. */
  porAprobar: number;
  /** Transferencias que ya salieron de su saldo y esperan aprobación. */
  enTransferencia: number;
  /** Saldo que ya venció. */
  vencido: number;
  /** El lote más próximo a vencer, si hay vigencia. */
  proximoAVencer: { fecha: string; monto: number } | null;
  /** Lo gastado o transferido por encima de lo que había (pasa si se baja un monto ya usado); 0 en lo normal. */
  deficit: number;
};

type Evento = { fecha: string; orden: number; tipo: "credito" | "debito"; monto: number };

/** Simula el saldo en orden cronológico: cada gasto o transferencia se descuenta de lo más antiguo que seguía vigente ese día. */
export function saldoCashback(movimientos: MovimientoCashback[], patientId: string, config: CashbackConfig, hoyIso: string = hoyIsoLocal()): SaldoCashback {
  const eventos: Evento[] = [];
  let porAprobar = 0;
  let enTransferencia = 0;
  for (const m of movimientos) {
    if (m.tipo === "generado" && m.patientId === patientId) {
      if (m.estado === "aprobado") eventos.push({ fecha: m.fecha, orden: 0, tipo: "credito", monto: m.monto });
      else if (m.estado === "pendiente") porAprobar += m.monto;
    } else if (m.tipo === "canje" && m.patientId === patientId && m.estado === "aprobado") {
      eventos.push({ fecha: m.fecha, orden: 1, tipo: "debito", monto: m.monto });
    } else if (m.tipo === "transferencia") {
      if (m.patientId === patientId && m.estado !== "rechazado") {
        eventos.push({ fecha: m.fecha, orden: 1, tipo: "debito", monto: m.monto });
        if (m.estado === "pendiente") enTransferencia += m.monto;
      }
      if (m.destinoId === patientId && m.estado === "aprobado") {
        eventos.push({ fecha: (m.resueltoEn ?? m.fecha).slice(0, 10), orden: 0, tipo: "credito", monto: m.monto });
      }
    }
  }
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);

  const lotes: { fecha: string; vence: string; restante: number }[] = [];
  let deficit = 0;
  const desdeSiguienteDia = config.liberarSiguienteDia !== false;
  for (const e of eventos) {
    if (e.tipo === "credito") {
      lotes.push({ fecha: e.fecha, vence: venceElCashback(e.fecha, config.vigenciaMeses), restante: e.monto });
      continue;
    }
    let porDescontar = e.monto;
    for (const lote of lotes) {
      if (porDescontar <= 0) break;
      if (lote.restante <= 0 || lote.vence < e.fecha) continue;
      if (desdeSiguienteDia && lote.fecha >= e.fecha) continue; // lo ganado ese mismo día todavía no se puede usar
      const toma = Math.min(lote.restante, porDescontar);
      lote.restante = redondearDinero(lote.restante - toma);
      porDescontar = redondearDinero(porDescontar - toma);
    }
    deficit += porDescontar;
  }

  let disponible = 0;
  let porLiberar = 0;
  let vencido = 0;
  let proximo: { fecha: string; monto: number } | null = null;
  for (const lote of lotes) {
    if (lote.restante <= 0) continue;
    if (lote.vence >= hoyIso) {
      if (desdeSiguienteDia && lote.fecha >= hoyIso) {
        porLiberar += lote.restante;
        continue;
      }
      disponible += lote.restante;
      if (lote.vence !== "9999-12-31" && (!proximo || lote.vence < proximo.fecha)) proximo = { fecha: lote.vence, monto: lote.restante };
    } else vencido += lote.restante;
  }
  return {
    disponible: redondearDinero(disponible),
    porLiberar: redondearDinero(porLiberar),
    porAprobar: redondearDinero(porAprobar),
    enTransferencia: redondearDinero(enTransferencia),
    vencido: redondearDinero(vencido),
    proximoAVencer: proximo ? { fecha: proximo.fecha, monto: redondearDinero(proximo.monto) } : null,
    deficit: redondearDinero(deficit),
  };
}

export const movimientosDePaciente = (movimientos: MovimientoCashback[], patientId: string) =>
  movimientos.filter((m) => m.patientId === patientId || m.destinoId === patientId).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

// ---------- Decisiones del administrador ----------

export function aprobarMovimiento(m: MovimientoCashback, por: string, ahoraIso: string, montoFinal?: number): MovimientoCashback {
  const monto = montoFinal !== undefined ? redondearDinero(Math.max(0, montoFinal)) : m.monto;
  return { ...m, estado: "aprobado", monto, resueltoPor: por, resueltoEn: ahoraIso };
}

export function rechazarMovimiento(m: MovimientoCashback, por: string, ahoraIso: string, motivo?: string): MovimientoCashback {
  const base = { ...m, estado: "rechazado" as const, resueltoPor: por, resueltoEn: ahoraIso };
  return motivo?.trim() ? { ...base, nota: motivo.trim() } : base;
}

/** Cambia el monto de un cashback ya generado. Un monto de 0 o menos no se permite: para quitarlo, se rechaza. */
export function ajustarMontoGenerado(m: MovimientoCashback, nuevoMonto: number, nota?: string): MovimientoCashback {
  const monto = redondearDinero(nuevoMonto);
  return { ...m, monto, ...(nota?.trim() ? { nota: nota.trim() } : {}) };
}

/** Un ajuste no puede dejar el saldo del paciente por debajo de lo que ya usó o transfirió. */
export function ajusteValido(movimientos: MovimientoCashback[], actualizado: MovimientoCashback, config: CashbackConfig, hoyIso?: string): boolean {
  if (!(actualizado.monto > 0)) return false;
  const antes = saldoCashback(movimientos, actualizado.patientId, config, hoyIso).deficit;
  const despues = saldoCashback(
    movimientos.map((m) => (m.id === actualizado.id ? actualizado : m)),
    actualizado.patientId,
    config,
    hoyIso
  ).deficit;
  return despues <= antes;
}

export type ErrorTransferencia = "apagada" | "mismo-paciente" | "monto-invalido" | "saldo-insuficiente";

export function validarTransferencia(
  movimientos: MovimientoCashback[],
  origenId: string,
  destinoId: string,
  monto: number,
  config: CashbackConfig,
  hoyIso?: string
): ErrorTransferencia | null {
  if (!config.transferible) return "apagada";
  if (origenId === destinoId) return "mismo-paciente";
  if (!(monto > 0)) return "monto-invalido";
  if (monto > saldoCashback(movimientos, origenId, config, hoyIso).disponible + 0.001) return "saldo-insuficiente";
  return null;
}

export function crearTransferencia(args: {
  origenId: string;
  origenNombre: string;
  destinoId: string;
  destinoNombre: string;
  monto: number;
  nota?: string;
  ahoraIso: string;
}): MovimientoCashback {
  return {
    id: `cbt-${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    patientId: args.origenId,
    patientName: args.origenNombre,
    tipo: "transferencia",
    estado: "pendiente",
    monto: redondearDinero(args.monto),
    fecha: args.ahoraIso.slice(0, 10),
    creadoEn: args.ahoraIso,
    destinoId: args.destinoId,
    destinoNombre: args.destinoNombre,
    ...(args.nota?.trim() ? { nota: args.nota.trim() } : {}),
  };
}

// ---------- Seguir a los pagos ----------

const igualesPago = (a: Pago, b: Pago) =>
  a.total === b.total &&
  a.formaPago === b.formaPago &&
  a.fecha === b.fecha &&
  !!a.sinCashback === !!b.sinCashback &&
  JSON.stringify(a.lineas) === JSON.stringify(b.lineas);

/** Una devolución del pago baja, en la misma proporción, el cashback que ese pago generó (si se devolvió todo, queda anulado). */
export function revertirCashbackPorDevolucion(
  movimientos: MovimientoCashback[],
  pagoId: string,
  montoDevuelto: number,
  totalPago: number,
  ahoraIso: string
): MovimientoCashback[] {
  const generado = movimientos.find((m) => m.id === idCashbackGenerado(pagoId));
  if (!generado || generado.estado === "rechazado" || !(totalPago > 0) || !(montoDevuelto > 0)) return movimientos;
  const proporcion = Math.min(1, montoDevuelto / totalPago);
  const nuevoMonto = redondearDinero(generado.monto * (1 - proporcion));
  if (generado.estado === "pendiente" && nuevoMonto <= 0) return movimientos.filter((m) => m.id !== generado.id);
  const actualizado: MovimientoCashback =
    nuevoMonto <= 0
      ? { ...generado, estado: "rechazado", nota: "Se devolvió el pago que lo generó", resueltoEn: ahoraIso }
      : { ...generado, monto: nuevoMonto, nota: "Se ajustó por una devolución del pago", ...(generado.estado === "pendiente" ? { montoCalculado: nuevoMonto } : {}) };
  return movimientos.map((m) => (m.id === generado.id ? actualizado : m));
}

/** Pone al día los movimientos de cashback según lo que cambió en los pagos del paciente: un pago nuevo genera su cashback
 * (o descuenta el saldo si se pagó con cashback), uno editado lo recalcula si nadie lo ha resuelto, y uno eliminado lo revierte. */
export function sincronizarCashbackConPagos(
  movimientos: MovimientoCashback[],
  patientId: string,
  patientName: string,
  antes: Pago[],
  despues: Pago[],
  config: CashbackConfig,
  ahoraIso: string
): MovimientoCashback[] {
  const antesPorId = new Map(antes.map((p) => [p.id, p]));
  const despuesPorId = new Map(despues.map((p) => [p.id, p]));
  let resultado = movimientos;
  let cambio = false;
  const quitar = (id: string) => {
    resultado = resultado.filter((m) => m.id !== id);
    cambio = true;
  };
  const poner = (m: MovimientoCashback) => {
    resultado = [m, ...resultado.filter((x) => x.id !== m.id)];
    cambio = true;
  };
  const reemplazar = (m: MovimientoCashback) => {
    resultado = resultado.map((x) => (x.id === m.id ? m : x));
    cambio = true;
  };

  for (const pago of despues) {
    const previo = antesPorId.get(pago.id);
    if (previo && igualesPago(previo, pago)) continue;
    const generado = resultado.find((m) => m.id === idCashbackGenerado(pago.id));
    const canje = resultado.find((m) => m.id === idCashbackCanje(pago.id));
    if (esFormaPagoCashback(pago.formaPago)) {
      if (generado && generado.estado === "pendiente") quitar(generado.id);
      poner(movimientoCanje(pago, patientId, patientName, ahoraIso));
      continue;
    }
    if (canje) quitar(canje.id);
    if (!generado) {
      if (config.activo) {
        const nuevo = movimientoGenerado(pago, patientId, patientName, config, ahoraIso);
        if (nuevo) poner(nuevo);
      }
    } else if (generado.estado === "pendiente" && generado.monto === generado.montoCalculado) {
      const recalculado = movimientoGenerado(pago, patientId, patientName, { ...config, porcentaje: generado.porcentaje ?? config.porcentaje }, generado.creadoEn);
      if (recalculado) reemplazar({ ...generado, monto: recalculado.monto, montoCalculado: recalculado.monto, baseMonto: recalculado.baseMonto, fecha: recalculado.fecha });
      else quitar(generado.id);
    }
  }

  for (const pago of antes) {
    if (despuesPorId.has(pago.id)) continue;
    const canje = resultado.find((m) => m.id === idCashbackCanje(pago.id));
    if (canje) quitar(canje.id);
    const generado = resultado.find((m) => m.id === idCashbackGenerado(pago.id));
    if (generado) {
      if (generado.estado === "pendiente") quitar(generado.id);
      else if (generado.estado === "aprobado") reemplazar({ ...generado, estado: "rechazado", nota: "Se eliminó el pago que lo generó", resueltoEn: ahoraIso });
    }
  }
  return cambio ? resultado : movimientos;
}
