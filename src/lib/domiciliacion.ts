/** Registro de pacientes con domiciliación bancaria (cargo recurrente a su
 * cuenta o tarjeta) — solo metadatos de referencia para llevar el control
 * de quién tiene un cobro automático activo y cuándo; nunca se captura el
 * número de tarjeta completo ni datos de pago reales. */

export type Domiciliacion = {
  id: string;
  patientId: string;
  patientName: string;
  banco: string;
  ultimosDigitos: string;
  monto: number;
  diaCobro: number;
  activo: boolean;
  notas: string;
  creadoEn: string;
};
