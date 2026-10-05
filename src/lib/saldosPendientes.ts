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

/** Pagos (líneas) que no descuentan de ningún presupuesto porque no están
 * ligados a un tratamiento — el dinero entró a caja pero el saldo no baja. */
export type PagosSinLigar = { patientId: string; patientName: string; monto: number; cantidad: number };

export type EntradaRecalculo = {
  patientId: string;
  patientName: string;
  presupuestos: SavedBudget[];
  pagos: Pago[];
  devoluciones: DevolucionPago[];
};

/** Recalcula desde cero el resumen de saldos de TODOS los pacientes dados
 * (idempotente; no depende de ningún resumen previo), y detecta cuáles
 * tienen líneas de pago sin ligar a un tratamiento. Solo entran al mapa los
 * pacientes con saldo > 0, igual que el resumen incremental. */
export function calcularSaldosGlobales(entradas: EntradaRecalculo[], ahoraISO: string): {
  porPaciente: Record<string, SaldoPendienteEntry>;
  sinLigar: PagosSinLigar[];
} {
  const porPaciente: Record<string, SaldoPendienteEntry> = {};
  const sinLigar: PagosSinLigar[] = [];
  entradas.forEach((e) => {
    const { totalPresupuestado, totalPagado, saldo } = calcularSaldoPendiente(e.presupuestos, e.pagos, e.devoluciones);
    if (saldo > 0) {
      porPaciente[e.patientId] = {
        patientId: e.patientId,
        patientName: e.patientName,
        totalPresupuestado,
        totalPagado,
        actualizadoEn: ahoraISO,
      };
    }
    const lineasLibres = e.pagos.flatMap((p) => p.lineas.filter((l) => !l.tratamientoId && l.monto > 0));
    if (lineasLibres.length > 0) {
      sinLigar.push({
        patientId: e.patientId,
        patientName: e.patientName,
        monto: redondearDinero(lineasLibres.reduce((s, l) => s + l.monto, 0)),
        cantidad: lineasLibres.length,
      });
    }
  });
  return { porPaciente, sinLigar: sinLigar.sort((a, b) => b.monto - a.monto) };
}
