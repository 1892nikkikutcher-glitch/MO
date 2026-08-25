/** Contrarreferencia — la registra el destinatario (quien atendió el caso).
 * Si no es borrador, además transiciona el estado a "counter_referral_sent"
 * reutilizando la misma validación de `puedeTransicionar` que el resto de la
 * máquina de estados. */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import { puedeTransicionar, type Contrarreferencia, type Interconsulta } from "./moConecta";

export type ContrarreferenciaInput = {
  resumenAtencion: string;
  hallazgosRelevantes?: string;
  procedimientoRealizado?: string;
  estadoActual: string;
  recomendaciones?: string;
  proximaRevision?: string;
  devolverAlRemitente: boolean;
  esBorrador: boolean;
};

export async function registrarContrarreferencia(
  uid: string,
  interconsultaId: string,
  input: ContrarreferenciaInput
): Promise<void> {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);

  await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const interconsulta = snap.data() as Interconsulta;

    if (interconsulta.destinatarioUid !== uid) {
      throw new ConectaError(403, "Solo el odontólogo destinatario puede registrar la contrarreferencia.");
    }

    const ahora = nowISO();
    const contrarreferencia: Contrarreferencia = sinIndefinidos({
      ...input,
      archivos: interconsulta.contrarreferencia?.archivos ?? [],
      fecha: ahora,
      profesionalResponsableUid: uid,
    });

    const actualizacion: Partial<Interconsulta> = { contrarreferencia, actualizadoEl: ahora };

    if (!input.esBorrador) {
      if (!puedeTransicionar(interconsulta.estado, "counter_referral_sent", false)) {
        throw new ConectaError(409, "No se puede enviar la contrarreferencia en el estado actual del caso.");
      }
      actualizacion.estado = "counter_referral_sent";
      actualizacion.historialEstados = [
        ...interconsulta.historialEstados,
        { estado: "counter_referral_sent", fecha: ahora, uid },
      ];
    }

    tx.set(ref, sinIndefinidos(actualizacion), { merge: true });
  });
}
