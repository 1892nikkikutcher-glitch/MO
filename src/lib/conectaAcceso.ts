/** Revocar el acceso de un participante a una interconsulta en curso — a
 * diferencia de cancelar el caso (que lo termina para todos), esto solo saca
 * a UNA persona de `participantesAutorizados`; el efecto es inmediato en la
 * siguiente lectura/descarga porque tanto las reglas de Firestore como el
 * proxy de archivos revisan esa lista en el momento, nunca una copia
 * cacheada. */

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import type { Interconsulta } from "./moConecta";

export async function revocarAccesoInterconsulta(
  uid: string,
  interconsultaId: string,
  uidARevocar: string,
  motivo: string | undefined
): Promise<void> {
  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);

  await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const interconsulta = snap.data() as Interconsulta;

    if (!interconsulta.participantesAutorizados.includes(uid)) {
      throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
    }
    if (uidARevocar === interconsulta.odontologoRemitenteUid) {
      throw new ConectaError(400, "No se puede revocar al odontólogo remitente del caso.");
    }
    if (uidARevocar === uid) {
      throw new ConectaError(400, "No puedes revocarte el acceso a ti mismo.");
    }
    if (!interconsulta.participantesAutorizados.includes(uidARevocar)) {
      throw new ConectaError(404, "Ese usuario no es participante de este caso.");
    }

    const ahora = nowISO();
    const actualizacion: Record<string, unknown> = sinIndefinidos({
      participantesAutorizados: interconsulta.participantesAutorizados.filter((p) => p !== uidARevocar),
      actualizadoEl: ahora,
    });
    // Si el revocado era el destinatario asignado, se limpia — el caso queda
    // sin destinatario hasta que el remitente invite a alguien más.
    if (interconsulta.destinatarioUid === uidARevocar) {
      actualizacion.destinatarioUid = FieldValue.delete();
    }
    tx.set(ref, actualizacion, { merge: true });

    tx.set(
      ref.collection("eventos").doc(),
      sinIndefinidos({ tipo: "acceso_revocado", fecha: ahora, uid, uidRevocado: uidARevocar, motivo })
    );
  });
}
