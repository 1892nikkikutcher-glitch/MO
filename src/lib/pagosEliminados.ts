import type { Pago } from "./patientData";

/** Bitácora de pagos eliminados: guarda el motivo y una copia del pago tal
 * como estaba justo antes de borrarlo, para poder auditarlo después desde
 * Reportes → Pagos. */
export type PagoEliminado = {
  id: string;
  patientId: string;
  patientName: string;
  pago: Pago;
  motivo: string;
  eliminadoEn: string;
  eliminadoPor: string;
};
