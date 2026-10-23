/** Rehacer el resumen de cobros (`config/finanzas`) desde los pagos reales de cada
 * expediente. El resumen se arma sumando cada pago al momento de registrarlo;
 * si alguno nunca pasó por ahí (fecha en otro formato, importado, registrado en
 * un flujo viejo...), el Corte de Caja y Fondos quedan cortos aunque el dinero
 * sí entró. Pura: recibe los pagos ya leídos. */

import { redondearDinero } from "./dinero";
import { fechaPagoAIso, sumarRango, type FinanzasConfig } from "./metas";
import { sumarRangoPorFormaPago } from "./fondosFinancieros";
import type { Pago } from "./patientData";

export type ResultadoRecalculo = {
  /** Resumen reconstruido — conserva lo que no se calcula aquí (devoluciones). */
  nuevo: FinanzasConfig;
  pagosLeidos: number;
  /** Pagos cuya fecha no se entiende: no entran a ningún periodo. */
  sinFechaValida: number;
};

export function construirFinanzasDesdePagos(pagos: Pago[], actual: FinanzasConfig): ResultadoRecalculo {
  const porFecha: Record<string, number> = {};
  const porFechaYFormaPago: Record<string, Record<string, number>> = {};
  const porFechaYMedico: Record<string, Record<string, number>> = {};
  const porFechaMedicoYFormaPago: Record<string, Record<string, Record<string, number>>> = {};
  const pagosCountPorFecha: Record<string, number> = {};
  let sinFechaValida = 0;

  for (const p of pagos) {
    const iso = fechaPagoAIso(p.fecha);
    if (!iso) {
      sinFechaValida += 1;
      continue;
    }
    porFecha[iso] = (porFecha[iso] ?? 0) + p.total;
    pagosCountPorFecha[iso] = (pagosCountPorFecha[iso] ?? 0) + 1;
    const forma = (porFechaYFormaPago[iso] ??= {});
    forma[p.formaPago] = (forma[p.formaPago] ?? 0) + p.total;
    const medico = (porFechaYMedico[iso] ??= {});
    medico[p.medico] = (medico[p.medico] ?? 0) + p.total;
    const delMedico = ((porFechaMedicoYFormaPago[iso] ??= {})[p.medico] ??= {});
    delMedico[p.formaPago] = (delMedico[p.formaPago] ?? 0) + p.total;
  }

  const redondear = <T extends Record<string, number>>(m: T) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, redondearDinero(v)]));
  const redondearDoble = (m: Record<string, Record<string, number>>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, redondear(v)]));

  return {
    nuevo: {
      ...actual,
      porFecha: redondear(porFecha),
      porFechaYFormaPago: redondearDoble(porFechaYFormaPago),
      porFechaYMedico: redondearDoble(porFechaYMedico),
      porFechaMedicoYFormaPago: Object.fromEntries(Object.entries(porFechaMedicoYFormaPago).map(([k, v]) => [k, redondearDoble(v)])),
      pagosCountPorFecha,
    },
    pagosLeidos: pagos.length,
    sinFechaValida,
  };
}

/** Lo cobrado entre dos fechas según un resumen (efectivo + electrónico). */
export function cobradoEnRango(f: FinanzasConfig, desde: Date, hasta: Date): number {
  const r = sumarRangoPorFormaPago(f.porFechaYFormaPago ?? {}, desde, hasta);
  return redondearDinero(r.efectivo + r.electronico);
}

/** Total histórico de un resumen. */
export function cobradoTotal(f: FinanzasConfig): number {
  return redondearDinero(Object.values(f.porFecha ?? {}).reduce((s, v) => s + v, 0));
}

export { sumarRango };
