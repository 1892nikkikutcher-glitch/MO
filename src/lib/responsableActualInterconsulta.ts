/** Quién es responsable de un paciente hoy, calculado SOLO con datos de
 * interconsultas ya en vivo — nunca con el `ExpedienteClinico.
 * responsablePrincipalUid` real de v3 (§10 histórico), que sigue inerte,
 * sin ningún dato real todavía. Se ve siempre desde la clínica que originó
 * al paciente (mismo `pacienteId` local, nunca el destinatario de un caso
 * recibido — ese ve al paciente en SU PROPIO expediente) — por eso el
 * default es siempre "la propia clínica"; solo cambia si alguna
 * interconsulta `transferencia_continuidad` de este paciente llegó a
 * "transferida", y entonces es el destinatario de la más reciente. */

export type CasoParaResponsable = {
  estado: string;
  destinatarioUid?: string;
  actualizadoEl: string;
  concluidoEl?: string;
};

export type ResultadoResponsable = { tipo: "propia_clinica" } | { tipo: "colega_transferido"; uid: string };

export function calcularResponsableActual(casos: CasoParaResponsable[]): ResultadoResponsable {
  const transferidas = casos
    .filter((c) => c.estado === "transferida" && c.destinatarioUid)
    .slice()
    .sort((a, b) => (b.concluidoEl ?? b.actualizadoEl).localeCompare(a.concluidoEl ?? a.actualizadoEl));

  const masReciente = transferidas[0];
  if (!masReciente?.destinatarioUid) return { tipo: "propia_clinica" };
  return { tipo: "colega_transferido", uid: masReciente.destinatarioUid };
}
