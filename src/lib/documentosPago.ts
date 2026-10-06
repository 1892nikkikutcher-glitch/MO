/** Utilidades puras para los documentos de pago (Acuerdo de pago y Contrato
 * de prestación de servicios): cantidad en letra y calendario de pagos. */

import { redondearDinero } from "./dinero";

const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE",
  "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIÚN", "VEINTIDÓS",
  "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS",
  "OCHOCIENTOS", "NOVECIENTOS",
];

function menorDeMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (r > 0) {
    if (r < 30) partes.push(UNIDADES[r]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`);
    }
  }
  return partes.join(" ");
}

/** Entero 0–999,999,999 en letra, en mayúsculas ("UN" antes de sustantivo,
 * como se escribe en contratos: "UN MIL", "VEINTIÚN MIL"). */
function enteroEnLetra(n: number): string {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) partes.push(millones === 1 ? "UN MILLÓN" : `${menorDeMil(millones)} MILLONES`);
  if (miles > 0) partes.push(miles === 1 ? "UN MIL" : `${menorDeMil(miles)} MIL`);
  if (resto > 0) partes.push(menorDeMil(resto));
  return partes.join(" ");
}

/** 1500.5 -> "UN MIL QUINIENTOS PESOS 50/100 M.N." (formato de contratos y
 * pagarés en México). Fuera de rango (negativo, > 999,999,999.99) devuelve "". */
export function montoEnLetra(monto: number): string {
  if (!Number.isFinite(monto) || monto < 0 || monto >= 1_000_000_000) return "";
  const total = redondearDinero(monto);
  const enteros = Math.floor(total);
  const centavos = Math.round((total - enteros) * 100);
  const palabras = enteroEnLetra(enteros);
  const moneda = enteros === 1 ? "PESO" : enteros !== 0 && enteros % 1_000_000 === 0 ? "DE PESOS" : "PESOS";
  return `${palabras} ${moneda} ${String(centavos).padStart(2, "0")}/100 M.N.`;
}

export type Periodicidad = "semanal" | "quincenal" | "mensual";

export function sumarPeriodo(fechaISO: string, periodicidad: Periodicidad, veces: number): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(a, m - 1, d);
  if (periodicidad === "semanal") f.setDate(f.getDate() + 7 * veces);
  else if (periodicidad === "quincenal") f.setDate(f.getDate() + 15 * veces);
  else {
    // Mensual: mismo día del mes; si el mes destino no lo tiene (31 -> feb), el último día de ese mes.
    const destino = new Date(a, m - 1 + veces, 1);
    const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(d, ultimo));
    return `${destino.getFullYear()}-${String(destino.getMonth() + 1).padStart(2, "0")}-${String(destino.getDate()).padStart(2, "0")}`;
  }
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

export type PagoProgramado = { numero: number; fechaISO: string; monto: number };

/** Reparte (total − anticipo) en `parcialidades` pagos iguales; el último
 * absorbe el redondeo para que la suma sea exacta. El primer pago cae en
 * `primeraFechaISO` y los demás cada periodo. */
export function calendarioDePagos(args: {
  total: number;
  anticipo: number;
  parcialidades: number;
  periodicidad: Periodicidad;
  primeraFechaISO: string;
}): PagoProgramado[] {
  const { total, anticipo, parcialidades, periodicidad, primeraFechaISO } = args;
  const n = Math.floor(parcialidades);
  const saldo = redondearDinero(Math.max(0, total - Math.max(0, anticipo)));
  if (n < 1 || saldo <= 0 || !primeraFechaISO) return [];
  const base = Math.floor((saldo / n) * 100) / 100;
  const pagos: PagoProgramado[] = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    const monto = i === n - 1 ? redondearDinero(saldo - acumulado) : base;
    acumulado = redondearDinero(acumulado + monto);
    pagos.push({ numero: i + 1, fechaISO: sumarPeriodo(primeraFechaISO, periodicidad, i), monto });
  }
  return pagos;
}
