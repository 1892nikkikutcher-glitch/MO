/** Saldos pendientes por paciente, mantenido de forma incremental (mismo
 * patrón que `estadisticas`/`finanzas`) cada vez que se crea/edita un
 * presupuesto o un pago de un paciente cuyo expediente esté cargado — no es
 * un recálculo retroactivo de los 1006 expedientes existentes, solo empieza
 * a reflejar la realidad desde que se activó este rollup. Los pacientes sin
 * saldo pendiente (pagado === presupuestado) se quitan del mapa para que el
 * reporte solo muestre a quien realmente debe algo. */

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
