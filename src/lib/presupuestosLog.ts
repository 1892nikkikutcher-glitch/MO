/** Bitácora de presupuestos creados, para Reportes → Presupuestos. Se
 * registra cada vez que se crea un presupuesto nuevo de un paciente cuyo
 * expediente esté cargado — no es un espejo en vivo de ediciones o
 * borrados, solo un historial de creación (igual que la bitácora de pagos
 * eliminados). */

export type PresupuestoLogEntry = {
  id: string;
  patientId: string;
  patientName: string;
  folio: string;
  fecha: string;
  medico: string;
  total: number;
  procedimientos: string[];
  creadoEn: string;
};
