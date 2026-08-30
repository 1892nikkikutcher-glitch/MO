/** Comparativa de rehabilitación — compara 2 a 4 presupuestos ya guardados
 * del mismo paciente (mismas piezas/necesidad, distintas alternativas) en
 * cuatro dimensiones: economía, función, estética y conservación biológica
 * (el inverso de "costo biológico" — entre más alto, menos desgaste o daño
 * a estructuras sanas). Ver el plan "Botón Comparativa de Rehabilitación en
 * Presupuestos".
 *
 * Nunca se copian los datos del presupuesto (procedimientos, precios) —
 * `OpcionComparativa` solo referencia su `presupuestoId`; quien la muestra
 * siempre busca el presupuesto real por ese id. Economía nunca se captura a
 * mano, se deriva de los totales reales (`calcularEconomiaRelativa`). */

import type { SavedBudget } from "./patientData";

export type NivelComparativa = 1 | 2 | 3 | 4 | 5;

export type OpcionComparativa = {
  presupuestoId: string;
  funcion: NivelComparativa;
  estetica: NivelComparativa;
  conservacionBiologica: NivelComparativa;
  /** Texto libre, opcional — se puede dejar vacío. */
  ventajas?: string;
  desventajas?: string;
};

export type ComparativaRehabilitacion = {
  id: string;
  /** Ej. "Reemplazo OD 30" — editable, sugerido desde el primer
   * presupuesto elegido al crearla. */
  titulo: string;
  /** ISO datetime — cuándo se creó. */
  fecha: string;
  opciones: OpcionComparativa[];
};

export function idComparativa(): string {
  return `cmp${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

/** Al presentar la comparativa (en pantalla, impresa o por WhatsApp) se
 * identifica cada presupuesto por el nombre del tratamiento, no por su
 * folio — es lo que se explica al paciente, el folio es solo un dato
 * administrativo interno (sigue usándose tal cual en el paso de "elegir
 * presupuestos" de NuevaComparativaRehabilitacion, donde folio SÍ es el
 * identificador relevante). */
export function etiquetaTratamiento(presupuesto: SavedBudget): string {
  const nombre = presupuesto.items[0]?.procedure ?? "Sin procedimientos";
  return presupuesto.items.length > 1 ? `${nombre} +${presupuesto.items.length - 1}` : nombre;
}

/** Economía siempre se deriva de los totales reales de cada presupuesto
 * comparado, nunca se captura a mano — el más barato del grupo obtiene 5,
 * el más caro obtiene 1, escalado linealmente entre ambos. Si todos cuestan
 * igual (incluido el caso de un solo total), todos obtienen 3 (neutral) —
 * no hay ganador/perdedor económico que mostrar. */
export function calcularEconomiaRelativa(totales: number[]): NivelComparativa[] {
  if (totales.length === 0) return [];
  const minimo = Math.min(...totales);
  const maximo = Math.max(...totales);
  if (minimo === maximo) return totales.map(() => 3);
  return totales.map((total) => {
    const proporcion = (maximo - total) / (maximo - minimo);
    const nivel = Math.round(1 + proporcion * 4);
    return Math.min(5, Math.max(1, nivel)) as NivelComparativa;
  });
}
