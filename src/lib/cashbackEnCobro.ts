/** Usar el Cashback del paciente como parte de un cobro: se toma primero (antes de hacer las cuentas) y el paciente paga
 * solo la diferencia. En los registros queda como dos pagos del mismo cobro: uno con forma de pago "Cashback" por lo que
 * cubrió el saldo y otro con la forma de pago elegida por el resto. Lógica pura, sin React ni Firestore. */

import { redondearDinero } from "./dinero";
import { montoMaximoCanje, type CashbackConfig } from "./cashback";
import type { LineaPago } from "./patientData";

/** Cuánto Cashback se puede aplicar a este cobro: lo menor entre lo que permiten el saldo, el % de la atención y el tope
 * por visita, y lo que realmente se cobra en tratamientos o servicios (un anticipo no se paga con Cashback). Si quien
 * cobra pide una cantidad menor (`solicitado`), se respeta; si pide más, se recorta al máximo. */
export function cashbackAplicable(args: {
  disponible: number;
  /** Valor completo de los tratamientos y servicios que se atienden (base del porcentaje máximo). */
  valorAtencion: number;
  /** Lo que se cobra hoy en tratamientos y servicios (sin anticipos): el Cashback nunca pasa de aquí. */
  cobradoEnTratamientos: number;
  config: CashbackConfig;
  solicitado?: number | null;
}): { maximo: number; aplicado: number } {
  const { disponible, valorAtencion, cobradoEnTratamientos, config, solicitado } = args;
  const maximo = redondearDinero(Math.max(0, Math.min(montoMaximoCanje(disponible, valorAtencion, config), cobradoEnTratamientos)));
  const pedido = solicitado == null || !Number.isFinite(solicitado) ? maximo : Math.max(0, solicitado);
  return { maximo, aplicado: redondearDinero(Math.min(maximo, pedido)) };
}

/** Reparte los renglones de un cobro entre lo que cubre el Cashback y lo que se paga con dinero, en el orden en que se
 * capturaron. Un renglón puede quedar partido. Los anticipos (`sinAsignar`) nunca se pagan con Cashback. La suma de los
 * dos lados siempre es la del cobro original. */
export function repartirLineasConCashback(lineas: LineaPago[], cashback: number): { cashback: LineaPago[]; dinero: LineaPago[] } {
  let restante = redondearDinero(Math.max(0, cashback));
  const conCashback: LineaPago[] = [];
  const conDinero: LineaPago[] = [];
  for (const l of lineas) {
    if (l.sinAsignar || restante <= 0) {
      conDinero.push(l);
      continue;
    }
    const parte = Math.min(restante, l.monto);
    restante = redondearDinero(restante - parte);
    if (parte > 0) conCashback.push({ ...l, id: `${l.id}-cb`, monto: parte });
    const resto = redondearDinero(l.monto - parte);
    if (resto > 0) conDinero.push({ ...l, monto: resto });
  }
  return { cashback: conCashback, dinero: conDinero };
}
