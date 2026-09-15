/** Predicado puro de la transferencia de responsable principal
 * (arquitectura MO Conecta v3, §10) — separado de la transacción real de
 * Firestore para poder probarlo con Vitest sin emulador. La transacción
 * en sí (Fase 4, todavía no escrita) llama a esta función tras releer el
 * puntero del expediente, y confía en que Firestore reintente la
 * transacción entera si el puntero cambió mientras tanto — este
 * predicado no necesita saber nada de reintentos, solo evaluar un
 * estado ya leído. */

export type ExpedienteResponsable = { responsablePrincipalUid: string };
export type SolicitanteTransferencia = { uid: string; esAdmin: boolean };

/** true si `solicitante` puede transferir la responsabilidad principal
 * de `expediente`, dado que `receptorAcepto` ya refleja si el receptor
 * aceptó (verificado aparte, contra el estado de la interconsulta). Solo
 * el responsable principal actual o un admin pueden iniciarla — nunca el
 * receptor mismo, y nunca sin que haya aceptado primero. */
export function puedeTransferirResponsable(
  expediente: ExpedienteResponsable,
  solicitante: SolicitanteTransferencia,
  receptorAcepto: boolean
): boolean {
  if (!receptorAcepto) return false;
  return solicitante.uid === expediente.responsablePrincipalUid || solicitante.esAdmin;
}
