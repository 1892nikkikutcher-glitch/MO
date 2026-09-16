/** Escritura real del evento inmutable de `expedientesClinicos/{id}/eventos`
 * (v3 §16) — compartida por toda la cadena de Fase 3 (búsqueda, solicitud,
 * consentimiento, participación, sesión), para que ninguna de esas rutas
 * reinvente su propia forma de auditar. Server-only. */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { sinIndefinidos } from "./conectaServer";
import type { EventoExpediente, EventoExpedienteTipo } from "./eventoExpediente";

export async function registrarEventoExpediente(
  expedienteId: string,
  datos: Omit<EventoExpediente, "id" | "expedienteId" | "fecha"> & { tipo: EventoExpedienteTipo }
): Promise<void> {
  const ref = dbAdmin.collection("expedientesClinicos").doc(expedienteId).collection("eventos").doc();
  const evento: EventoExpediente = sinIndefinidos({
    id: ref.id,
    expedienteId,
    fecha: Timestamp.now(),
    ...datos,
  });
  await ref.set(evento);
}
