/** Bitácora plana de auditoría de devoluciones — mismo patrón que
 * pagosEliminados.ts (colección de nivel superior, no anidada bajo el
 * paciente), para que un futuro "Reportes → Devoluciones" pueda leerla
 * directo sin recorrer cada expediente. Admin-only en Firestore, igual que
 * el resto del dominio financiero de MO — inmutable en la práctica porque
 * ningún código de MO expone editar/borrar un evento, aunque no es
 * criptográficamente a prueba de manipulación (mismo nivel de confianza
 * que ya opera el resto de las finanzas de la app hoy). */

export type TipoEventoDevolucion =
  | "devolucion_creada"
  | "devolucion_completada"
  | "devolucion_cancelada"
  | "devolucion_corregida"
  | "comprobante_generado"
  | "firma_recepcion_agregada";

export type EventoDevolucionLog = {
  id: string;
  tipo: TipoEventoDevolucion;
  patientId: string;
  patientName: string;
  devolucionId: string;
  pagoOrigenId: string;
  monto?: number;
  motivo?: string;
  uid: string;
  creadoEn: string;
};
