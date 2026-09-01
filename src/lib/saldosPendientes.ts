/** Saldos pendientes por paciente, mantenido de forma incremental (mismo
 * patrón que `estadisticas`/`finanzas`) cada vez que se crea/edita un
 * presupuesto o un pago de un paciente cuyo expediente esté cargado — no es
 * un recálculo retroactivo de los 1006 expedientes existentes, solo empieza
 * a reflejar la realidad desde que se activó este rollup. Los pacientes sin
 * saldo pendiente (pagado === presupuestado) se quitan del mapa para que el
 * reporte solo muestre a quien realmente debe algo. */

import { redondearDinero } from "./dinero";
import type { DevolucionPago, Pago, SavedBudget } from "./patientData";

export type SaldoPendienteEntry = {
  patientId: string;
  patientName: string;
  totalPresupuestado: number;
  totalPagado: number;
  actualizadoEn: string;
};

export type SaldosPendientesConfig = {
  porPaciente: Record<string, SaldoPendienteEntry>;
};

export const saldosPendientesInicial: SaldosPendientesConfig = { porPaciente: {} };

/** Cálculo puro del rollup — extraído para poder testearlo sin Firestore y
 * para poder reusarlo como recompute idempotente en Fase 2 (ver
 * "Devoluciones de pago", donde saldosPendientes queda fuera de la
 * transacción atómica por necesitar la lista completa de presupuestos/
 * pagos/devoluciones del paciente, no una referencia directa). Solo las
 * devoluciones completadas con efectoTratamiento === "continua" (por
 * renglón, nunca un efecto general) reabren saldo. */
export function calcularSaldoPendiente(
  presupuestos: SavedBudget[],
  pagos: Pago[],
  devoluciones: DevolucionPago[] = []
): { totalPresupuestado: number; totalPagado: number; saldo: number } {
  const totalPresupuestado = redondearDinero(presupuestos.reduce((s, p) => s + p.total, 0));
  const totalPagadoBruto = redondearDinero(
    pagos.reduce((s, p) => s + p.lineas.reduce((ls, l) => ls + (l.tratamientoId ? l.monto : 0), 0), 0)
  );
  const totalDevueltoQueReabreDeuda = redondearDinero(
    devoluciones
      .filter((d) => d.estado === "completada")
      .reduce(
        (s, d) =>
          s +
          (d.itemsAfectados ?? [])
            .filter((i) => i.efectoTratamiento === "continua")
            .reduce((ls, i) => ls + (i.tratamientoId ? i.montoDevuelto : 0), 0),
        0
      )
  );
  const totalPagado = redondearDinero(totalPagadoBruto - totalDevueltoQueReabreDeuda);
  return { totalPresupuestado, totalPagado, saldo: redondearDinero(totalPresupuestado - totalPagado) };
}
