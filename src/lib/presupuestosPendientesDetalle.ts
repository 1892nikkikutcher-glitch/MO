/** Presupuestos sin resolver (estado "pendiente" o sin marcar), mantenido
 * de forma incremental — mismo patrón que `laboratoriosPendientes.ts` y
 * `saldosPendientes.ts`: solo refleja la realidad desde que se creó este
 * rollup, no es un recálculo retroactivo de los 1006 expedientes
 * existentes. Se quita del mapa el presupuesto que se marca Aceptado,
 * Rechazado o Expirado, o que se elimina. Habilita la alerta clicable
 * "presupuestos esperan seguimiento" en Requieren Atención. */

export type PresupuestoPendienteEntry = {
  id: string;
  patientId: string;
  patientName: string;
  folio: string;
  total: number;
  fecha: string;
  actualizadoEn: string;
};

export type PresupuestosPendientesDetalleConfig = {
  porPresupuesto: Record<string, PresupuestoPendienteEntry>;
};

export const presupuestosPendientesDetalleInicial: PresupuestosPendientesDetalleConfig = {
  porPresupuesto: {},
};
