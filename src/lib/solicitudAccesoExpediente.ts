/** Solicitud de acceso al expediente compartido (arquitectura MO Conecta
 * v3, §8) — deliberadamente distinta de `interconsultas/{id}/solicitudesAcceso`
 * ya existente (esa es el mecanismo de "el correo verificado no coincide
 * con la invitación"; esta es "encontré un folio, quiero acceso"). Se
 * dirige siempre al `responsablePrincipalUid` vigente del expediente,
 * nunca a alguien elegido a mano por quien busca. Fase 3, todavía sin
 * escribir el módulo que la crea/resuelve de verdad — solo el tipo. */

import type { Timestamp } from "firebase-admin/firestore";

export type FinalidadSolicitudAcceso =
  | "aislado_con_retorno"
  | "transferencia_continuidad";
// + "segunda_opinion" cuando se habilite (v3 §8) — no agregado todavía a
// propósito, para no ofrecer una opción que ningún flujo sabe resolver.

export type EstadoSolicitudAccesoExpediente =
  | "pendiente"
  | "esperando_consentimiento"
  | "autorizada"
  | "rechazada"
  | "cancelada"
  | "vencida"
  | "revocada";

export type SolicitudAccesoExpediente = {
  id: string;
  expedienteId: string;
  solicitanteUid: string;
  clinicaSolicitanteId: string;
  motivo: string;
  finalidad: FinalidadSolicitudAcceso;
  especialidad: string;
  tratamientoSolicitado: string;
  alcanceRequerido: "completo";
  tiempoEstimadoAcceso: string;
  mensaje: string;
  declaracionFolioProporcionadoPorPaciente?: boolean;
  /** Resuelto server-side desde el puntero del expediente (v3 §4) —
   * nunca elegido a mano por el solicitante. Ver v3 §15 para el caso en
   * que este responsable no puede recibirla (bandeja de continuidad). */
  responsablePrincipalUidDestino: string;
  /** Presente solo cuando la solicitud se enrutó a la bandeja de
   * continuidad clínica de la clínica dueña del expediente en vez de al
   * responsable principal directo (v3 §15) — nunca implica que alguien
   * obtuvo acceso automáticamente. */
  motivoContingencia?: "responsable_no_disponible";
  estado: EstadoSolicitudAccesoExpediente;
  creadoEl: Timestamp;
  resueltoEl?: Timestamp;
  resueltoPorUid?: string;
};
