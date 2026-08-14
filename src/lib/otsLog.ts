import type { TipoLaboratorio } from "./patientData";

/** Bitácora de Órdenes de Trabajo (OTs) — solicitudes a laboratorio dental,
 * laboratorio químico/clínico, o radiografía — para Reportes → OTs. Se
 * registra cada vez que se crea una solicitud nueva desde la pestaña
 * Laboratorios de un paciente cuyo expediente esté cargado; es una
 * bitácora de creación, no un espejo en vivo de cambios de estatus. */

export type OtLogEntry = {
  id: string;
  patientId: string;
  patientName: string;
  tipo: TipoLaboratorio;
  laboratorio: string;
  trabajo: string;
  medico: string;
  fechaEnvio: string;
  costo: number;
  creadoEn: string;
};
