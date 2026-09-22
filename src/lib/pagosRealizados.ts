import type { Pago } from "./patientData";

/** Bitácora de pagos realizados — mismo patrón que pagosEliminados.ts
 * (colección plana, no anidada por paciente) para poder juntar los pagos
 * de TODOS los pacientes en un solo lugar consultable desde Reportes →
 * Pagos, sin tener que abrir expediente por expediente. A diferencia de
 * `pago` (que ya vive en users/{clinicId}/pacientes/{patientId}/pagos),
 * este registro es una COPIA de solo lectura para el reporte — el
 * original en el expediente del paciente sigue siendo la fuente de
 * verdad.
 *
 * Importante: esta bitácora arranca vacía el día que se despliega este
 * cambio — nunca contiene pagos anteriores a esa fecha, porque no hay
 * forma de reconstruir retroactivamente un registro que nunca se
 * escribió. Ver el aviso correspondiente en ReportePagos.tsx. */
export type PagoRealizado = {
  /** Mismo id que `pago.id` a propósito (no uno nuevo) — así, si por lo
   * que sea `upsertPago` llega a dispararse dos veces para el mismo pago
   * nuevo, la segunda escritura sobreescribe la misma entrada en vez de
   * crear un duplicado en el reporte. */
  id: string;
  patientId: string;
  patientName: string;
  pago: Pago;
  registradoEn: string;
  registradoPor: string;
};
