/** Solicitudes de laboratorio pendientes (estatus distinto de "Recibido"),
 * mantenido de forma incremental — mismo patrón que `saldosPendientes.ts`:
 * solo refleja la realidad desde que se creó este rollup, no es un
 * recálculo retroactivo de los 1006 expedientes existentes. Las órdenes que
 * se marcan "Recibido" (o se eliminan) se quitan del mapa. Habilita el
 * detalle clicable de "Laboratorios Pendientes" del Dashboard sin tener que
 * cargar cada expediente. */

export type LaboratorioPendienteEntry = {
  id: string;
  patientId: string;
  patientName: string;
  tipo: string;
  laboratorio: string;
  trabajo: string;
  /** Texto libre "dd/mm/aaaa" tal como se captura en el formulario — no
   * validado ni garantizado; el parser de fecha de entrega debe tolerar
   * valores vacíos o mal formados. */
  fechaEntrega: string;
  estatus: string;
  actualizadoEn: string;
};

export type LaboratoriosPendientesConfig = {
  porOrden: Record<string, LaboratorioPendienteEntry>;
};

export const laboratoriosPendientesInicial: LaboratoriosPendientesConfig = { porOrden: {} };
