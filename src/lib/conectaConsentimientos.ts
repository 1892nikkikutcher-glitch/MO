/** Revocación de consentimiento — el documento original de
 * `ConsentimientoInterconsulta` es inmutable de por vida (§7 del plan):
 * revocar escribe un registro NUEVO en la subcolección `revocaciones` y,
 * en la misma transacción, solo actualiza el campo operativo `estado` del
 * original — nunca sus campos de contenido/evidencia. */

import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import type { ConsentimientoInterconsulta, EventoRevocacionConsentimiento } from "./moConecta";

export async function revocarConsentimiento(uid: string, consentimientoId: string, motivo: string | undefined): Promise<void> {
  const ref = dbAdmin.collection("consentimientosInterconsulta").doc(consentimientoId);

  await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe ese registro de consentimiento.");
    const consentimiento = snap.data() as ConsentimientoInterconsulta;

    if (consentimiento.odontologoUid !== uid) {
      throw new ConectaError(403, "No tienes acceso a este registro de consentimiento.");
    }
    if (consentimiento.estado !== "vigente") {
      throw new ConectaError(409, "Este consentimiento ya no está vigente.");
    }

    const ahora = nowISO();
    const revocacionRef = ref.collection("revocaciones").doc();
    const revocacion: EventoRevocacionConsentimiento = sinIndefinidos({
      id: revocacionRef.id,
      fecha: ahora,
      revocadoPorUid: uid,
      motivo,
    });

    tx.set(revocacionRef, revocacion);
    tx.set(ref, { estado: "revocado" }, { merge: true });
  });
}
