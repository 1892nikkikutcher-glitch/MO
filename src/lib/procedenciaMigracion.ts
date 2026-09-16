/** Procedencia que lleva CADA documento importado a `expedientesClinicos`
 * durante una migración (arquitectura MO Conecta v3, §3/§11.2) — sin esto
 * es imposible reconciliar dos clínicas aportando al mismo expediente sin
 * perder de dónde vino cada cosa. */

import type { Timestamp } from "firebase-admin/firestore";

export type ProcedenciaMigracion = {
  origenClinicaId: string;
  origenPatientId: string;
  origenDocumentoId: string;
  migracionId: string;
  autorOriginalUid?: string;
  fechaOriginal: Timestamp;
  importadoEl: Timestamp;
};
