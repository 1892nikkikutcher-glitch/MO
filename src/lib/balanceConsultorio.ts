/** Balance sencillo del consultorio: lo que se tiene y lo que se debe. Sirve para el capital de trabajo y el
 * endeudamiento. Lo que MO ya sabe (cuentas por cobrar, equipo comprado) se toma solo; lo que no puede saber
 * (efectivo en bancos, deudas, lo que se debe a proveedores) lo captura el administrador. Lógica pura. */

import { redondearDinero } from "./dinero";

export type BalanceConsultorio = {
  /** Efectivo en caja y bancos. */
  efectivo: number;
  /** Insumos y materiales en existencia. */
  inventario: number;
  /** Otros activos que se vuelven dinero en menos de un año. */
  otrosCirculantes: number;
  /** Lo que se debe a proveedores y laboratorios (a menos de un año). */
  cuentasPorPagar: number;
  /** Préstamos, tarjetas y otras deudas a menos de un año. */
  deudaCortoPlazo: number;
  /** Deudas a más de un año. */
  deudaLargoPlazo: number;
  /** Valor del equipo y mobiliario. `null` = usar lo que se ha registrado como inversión en Gastos. */
  valorEquipo: number | null;
  actualizadoEl?: string;
};

export const balanceInicial: BalanceConsultorio = {
  efectivo: 0,
  inventario: 0,
  otrosCirculantes: 0,
  cuentasPorPagar: 0,
  deudaCortoPlazo: 0,
  deudaLargoPlazo: 0,
  valorEquipo: null,
};

export type ResultadoBalance = {
  /** Si ya se capturó algo del balance (si no, capital de trabajo y endeudamiento no dicen nada). */
  capturado: boolean;
  /** Efectivo + inventario + otros circulantes + cuentas por cobrar. */
  activoCirculante: number;
  /** Cuentas por pagar + deuda a corto plazo. */
  pasivoCirculante: number;
  /** Activo circulante − pasivo circulante. */
  capitalTrabajo: number;
  /** Activo circulante entre pasivo circulante (liquidez); `null` si no hay pasivo circulante. */
  razonCirculante: number | null;
  activosFijos: number;
  activosTotales: number;
  pasivosTotales: number;
  /** Pasivos totales entre activos totales (0.4 = 40%); `null` si no hay activos. */
  endeudamiento: number | null;
};

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

export function calcularBalance(balance: BalanceConsultorio | undefined, cuentasPorCobrar: number, inversionAcumulada: number): ResultadoBalance {
  const b = balance ?? balanceInicial;
  const capturado =
    [b.efectivo, b.inventario, b.otrosCirculantes, b.cuentasPorPagar, b.deudaCortoPlazo, b.deudaLargoPlazo].some((n) => num(n) > 0) ||
    (b.valorEquipo !== null && b.valorEquipo !== undefined && num(b.valorEquipo) > 0);
  const activoCirculante = redondearDinero(num(b.efectivo) + num(b.inventario) + num(b.otrosCirculantes) + num(cuentasPorCobrar));
  const pasivoCirculante = redondearDinero(num(b.cuentasPorPagar) + num(b.deudaCortoPlazo));
  const activosFijos = redondearDinero(b.valorEquipo !== null && b.valorEquipo !== undefined ? num(b.valorEquipo) : num(inversionAcumulada));
  const activosTotales = redondearDinero(activoCirculante + activosFijos);
  const pasivosTotales = redondearDinero(pasivoCirculante + num(b.deudaLargoPlazo));
  return {
    capturado,
    activoCirculante,
    pasivoCirculante,
    capitalTrabajo: redondearDinero(activoCirculante - pasivoCirculante),
    razonCirculante: pasivoCirculante > 0 ? activoCirculante / pasivoCirculante : null,
    activosFijos,
    activosTotales,
    pasivosTotales,
    endeudamiento: activosTotales > 0 ? pasivosTotales / activosTotales : null,
  };
}
