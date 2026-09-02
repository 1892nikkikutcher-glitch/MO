/** Todo presupuesto creado, con su paciente y folio, mantenido de forma
 * incremental — mismo patrón que `presupuestosPendientesDetalle.ts` y
 * `laboratoriosPendientes.ts`: solo refleja la realidad desde que se creó
 * este rollup, no es un recálculo retroactivo de los presupuestos ya
 * existentes. A diferencia de `presupuestosPendientesDetalle`, esta entrada
 * NO se quita cuando cambia el `estado` del presupuesto — trackea "fue
 * creado", no "está pendiente"; solo se quita si el presupuesto se elimina.
 * Habilita el detalle clicable de "Presupuestado (periodo)" y "Valor
 * Presupuestado (histórico)" del Dashboard. */

export type PresupuestoCreadoEntry = {
  id: string;
  patientId: string;
  patientName: string;
  folio: string;
  total: number;
  fecha: string;
};

export type PresupuestosCreadosDetalleConfig = {
  porPresupuesto: Record<string, PresupuestoCreadoEntry>;
};

export const presupuestosCreadosDetalleInicial: PresupuestosCreadosDetalleConfig = {
  porPresupuesto: {},
};
