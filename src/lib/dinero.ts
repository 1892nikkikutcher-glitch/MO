/** Redondeo y comparación monetaria centralizados — evita que cada función
 * financiera invente su propia tolerancia (`+0.009` ad-hoc) y que sumas de
 * decimales fallen por la representación binaria de punto flotante de
 * JavaScript (ej. 100.10 + 200.20 no da exactamente 300.30 con aritmética
 * cruda). Trabaja en centavos internamente para las comparaciones críticas,
 * sin migrar todavía todo el modelo financiero de MO a enteros. */

export function redondearDinero(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function montosIguales(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

/** true si `a` es mayor que `b` una vez redondeados a centavos — evita
 * falsos positivos por residuos de punto flotante en comparaciones
 * "mayor que" (ej. 100.10 + 200.20 apareciendo como 0.01 mayor que 300.30). */
export function montoMayorQue(a: number, b: number): boolean {
  return Math.round(a * 100) > Math.round(b * 100);
}
