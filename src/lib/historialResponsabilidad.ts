/** Bitácora de transferencias de responsable principal
 * (`expedientesClinicos/{id}/historialResponsabilidad/{id}`, arquitectura
 * MO Conecta v3, §4/§10 histórico) — reconstruye el PASADO, nunca calcula
 * el presente: "¿quién es responsable hoy?" siempre se lee del puntero en
 * el documento raíz de `ExpedienteClinico`, nunca de aquí. Append-only. */

import type { Timestamp } from "firebase-admin/firestore";

export type HistorialResponsabilidad = {
  id: string;
  expedienteId: string;
  deQuienUid: string;
  aQuienUid: string;
  clinicaDeId: string;
  clinicaAId: string;
  motivo: string;
  interconsultaId: string;
  fecha: Timestamp;
};
