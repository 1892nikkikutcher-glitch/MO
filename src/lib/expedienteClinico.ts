/** Documento raíz de `expedientesClinicos/{id}` (arquitectura MO Conecta
 * v3, §4) — el puntero de responsable principal es la única fuente de
 * verdad de "¿quién es responsable hoy?"; `historialResponsabilidad`
 * reconstruye el pasado, nunca calcula el presente. Fase 2, todavía sin
 * escribir el módulo que lo crea/lee de verdad — solo el tipo. */

import type { Timestamp } from "firebase-admin/firestore";

export type ExpedienteClinico = {
  id: string; // = pacienteGlobalId
  responsablePrincipalUid: string;
  responsablePrincipalClinicaId: string;
  responsablePrincipalParticipacionId: string;
  responsableDesde: Timestamp;
  /** Incrementa en cada transferencia — punto de control de concurrencia
   * de la transacción de transferencia (v3 §10); no es lo que GARANTIZA
   * la exclusión mutua (eso lo da leer+escribir este mismo doc dentro de
   * una transacción de Firestore), es la evidencia observable de cuántas
   * veces cambió. */
  responsabilidadVersion: number;
  esquemaVersion: number;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
};
