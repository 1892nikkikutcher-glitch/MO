/** Lo que hay que SUMARLE al resumen de cobros (`config/finanzas`) cuando se
 * registra, se edita o se borra un pago.
 *
 * POR QUÉ UN DELTA Y NO LA CIFRA FINAL
 *
 * El resumen se venía guardando como cifra absoluta: cada navegador tomaba la
 * copia que tenía en memoria, le sumaba el pago y escribía el resultado. Dos
 * aparatos cobrando el mismo día —la recepción y el consultorio, o dos
 * pestañas abiertas— calculan su cifra sobre bases distintas, y el segundo en
 * guardar borra lo del primero. El pago queda en el expediente, con su recibo,
 * pero el total del día no lo incluye nunca más.
 *
 * Aquí solo se calcula CUÁNTO CAMBIA. Quien escribe convierte cada número en
 * un incremento atómico de Firestore, que suma del lado del servidor sobre lo
 * que de verdad hay guardado. Deja de importar qué tenía en memoria el
 * navegador que cobró, si el documento alcanzó a cargar, o si en ese momento
 * no había internet.
 */

import { redondearDinero } from "./dinero";
import { fechaPagoAIso } from "./metas";
import type { Pago } from "./patientData";

/** Un pago viejo o importado puede no traer médico o forma de pago. Firestore
 * rechaza un documento con un nombre de campo vacío, y como el resumen se
 * guarda en un solo documento, ESE pago tiraba la escritura entera: se perdía
 * también el dinero de los demás pagos del mismo movimiento. Un cajón con
 * nombre visible conserva el dinero en el total y deja el hueco a la vista en
 * el desglose, que es donde se puede corregir. */
export const CLAVE_SIN_DATO = "Sin especificar";

export function claveDeResumen(texto: string | null | undefined): string {
  const limpio = (texto ?? "").trim();
  return limpio === "" ? CLAVE_SIN_DATO : limpio;
}

/**
 * Cambia cada número del árbol de deltas por un incremento atómico,
 * conservando la forma del documento (fecha → médico → forma de pago). Lo
 * que se manda deja de ser "la cifra que me da a mí" y pasa a ser "súmale
 * esto a lo que tengas".
 *
 * `incrementar` se recibe de fuera —`increment` del SDK del navegador o
 * `FieldValue.increment` del de administrador— para que las pruebas contra
 * el emulador ejerciten este mismo código y no una copia parecida.
 */
export function aIncrementos(
  nodo: Record<string, unknown>,
  incrementar: (monto: number) => unknown
): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(nodo)) {
    salida[clave] =
      typeof valor === "number"
        ? incrementar(valor)
        : aIncrementos(valor as Record<string, unknown>, incrementar);
  }
  return salida;
}

export type DeltasFinanzas = {
  porFecha: Record<string, number>;
  pagosCountPorFecha: Record<string, number>;
  porFechaYFormaPago: Record<string, Record<string, number>>;
  porFechaYMedico: Record<string, Record<string, number>>;
  porFechaMedicoYFormaPago: Record<string, Record<string, Record<string, number>>>;
};

function vacio(): DeltasFinanzas {
  return {
    porFecha: {},
    pagosCountPorFecha: {},
    porFechaYFormaPago: {},
    porFechaYMedico: {},
    porFechaMedicoYFormaPago: {},
  };
}

/** Suma (signo 1) o resta (signo -1) una lista de pagos sobre el acumulado. */
function acumular(destino: DeltasFinanzas, pagos: Pago[], signo: 1 | -1): void {
  for (const p of pagos) {
    // Un pago con fecha que no se entiende no entra a ningún periodo, igual
    // que en la reconstrucción: se cuenta aparte, no se adivina su día.
    const iso = fechaPagoAIso(p.fecha);
    if (!iso) continue;
    const monto = signo * p.total;
    const forma = claveDeResumen(p.formaPago);
    const medico = claveDeResumen(p.medico);

    destino.porFecha[iso] = (destino.porFecha[iso] ?? 0) + monto;
    destino.pagosCountPorFecha[iso] = (destino.pagosCountPorFecha[iso] ?? 0) + signo;

    const porForma = (destino.porFechaYFormaPago[iso] ??= {});
    porForma[forma] = (porForma[forma] ?? 0) + monto;

    const porMedico = (destino.porFechaYMedico[iso] ??= {});
    porMedico[medico] = (porMedico[medico] ?? 0) + monto;

    const delMedico = ((destino.porFechaMedicoYFormaPago[iso] ??= {})[medico] ??= {});
    delMedico[forma] = (delMedico[forma] ?? 0) + monto;
  }
}

/** Quita los ceros: un pago que se editó sin tocar su monto no tiene por qué
 * escribir nada, y un incremento de cero solo ensucia el documento. */
function podar(mapa: Record<string, number>, redondear: boolean): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [clave, valor] of Object.entries(mapa)) {
    const v = redondear ? redondearDinero(valor) : valor;
    if (v !== 0) salida[clave] = v;
  }
  return salida;
}

function podarDoble(mapa: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const salida: Record<string, Record<string, number>> = {};
  for (const [clave, interno] of Object.entries(mapa)) {
    const podado = podar(interno, true);
    if (Object.keys(podado).length > 0) salida[clave] = podado;
  }
  return salida;
}

/**
 * Cuánto cambia el resumen de cobros al pasar de `prevArr` a `next`.
 *
 * Devuelve `null` cuando no cambia nada en dinero ni en número de pagos —
 * editar la firma o la factura de un pago no mueve ninguna cifra.
 */
export function calcularDeltasFinanzas(prevArr: Pago[], next: Pago[]): DeltasFinanzas | null {
  const acumulado = vacio();
  acumular(acumulado, next, 1);
  acumular(acumulado, prevArr, -1);

  const deltas: DeltasFinanzas = {
    porFecha: podar(acumulado.porFecha, true),
    pagosCountPorFecha: podar(acumulado.pagosCountPorFecha, false),
    porFechaYFormaPago: podarDoble(acumulado.porFechaYFormaPago),
    porFechaYMedico: podarDoble(acumulado.porFechaYMedico),
    porFechaMedicoYFormaPago: Object.fromEntries(
      Object.entries(acumulado.porFechaMedicoYFormaPago)
        .map(([fecha, porMedico]) => [fecha, podarDoble(porMedico)] as const)
        .filter(([, porMedico]) => Object.keys(porMedico).length > 0)
    ),
  };

  const hayAlgo =
    Object.keys(deltas.porFecha).length > 0 ||
    Object.keys(deltas.pagosCountPorFecha).length > 0 ||
    Object.keys(deltas.porFechaYFormaPago).length > 0 ||
    Object.keys(deltas.porFechaYMedico).length > 0 ||
    Object.keys(deltas.porFechaMedicoYFormaPago).length > 0;

  return hayAlgo ? deltas : null;
}
