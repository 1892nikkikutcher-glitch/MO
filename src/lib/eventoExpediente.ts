/** Auditoría inmutable de `expedientesClinicos/{id}/eventos` (arquitectura
 * MO Conecta v3, §16) — append-only, nunca se edita ni se borra. Lista
 * exacta de v3 §16; las secciones auto-reportadas por el cliente
 * (`historia_clinica_consultada`, etc.) se etiquetan explícitamente como
 * eventos de NAVEGACIÓN — el servidor no verifica que el usuario realmente
 * leyó el contenido, solo que el cliente reportó mostrarlo. Descargas y
 * exportaciones sí se verifican desde servidor (nunca auto-reportadas). */

import type { Timestamp } from "firebase-admin/firestore";

export type EventoExpedienteTipo =
  | "folio_buscado"
  | "solicitud_acceso_creada"
  | "consentimiento_solicitado"
  | "consentimiento_otorgado"
  | "consentimiento_rechazado"
  | "consentimiento_revocado"
  | "participacion_creada"
  | "participacion_revocada"
  | "expediente_abierto"
  | "historia_clinica_consultada"
  | "odontograma_consultado"
  | "notas_evolucion_consultadas"
  | "estudio_visualizado"
  | "archivo_descargado"
  | "expediente_exportado"
  | "sesion_cerrada"
  | "acceso_denegado";

export type EventoExpediente = {
  id: string;
  expedienteId: string;
  tipo: EventoExpedienteTipo;
  uid: string;
  fecha: Timestamp;
  clinicaId?: string;
  participacionId?: string;
  consentimientoId?: string;
  solicitudAccesoId?: string;
  sesionId?: string;
  seccion?: string;
  finalidad?: string;
  resultado?: string;
  detalle?: string;
};
