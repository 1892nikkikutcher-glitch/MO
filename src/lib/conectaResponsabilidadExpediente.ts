/** Transferencia transaccional de responsable principal (arquitectura MO
 * Conecta v3, §10 histórico) — server-only. Envuelve el predicado puro
 * `puedeTransferirResponsable` (responsabilidadExpediente.ts, ya probado).
 *
 * Se dispara cuando una interconsulta `transferencia_continuidad` pasa de
 * "accepted" a "transferida" (moConecta.ts) — pero esa transición hoy vive
 * en conectaEstado.ts, que ya está desplegado y en uso real. Conectar esta
 * función ahí cambiaría comportamiento en producción (esa transición hoy
 * no tiene ningún efecto secundario) sin autorización explícita para esa
 * activación — por eso esta función existe, está probada donde se puede,
 * pero NADIE la invoca todavía (v3 §21).
 *
 * Una sola transacción, todas las lecturas antes que cualquier escritura
 * (mismo patrón que conectaInterconsultas.ts/conectaEstado.ts). */

import { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, esAdminDeClinica, sinIndefinidos } from "./conectaServer";
import { puedeTransferirResponsable } from "./responsabilidadExpediente";
import { idParticipacion, type Participacion } from "./participaciones";
import type { ExpedienteClinico } from "./expedienteClinico";
import type { HistorialResponsabilidad } from "./historialResponsabilidad";
import type { Interconsulta } from "./moConecta";
import { registrarEventoExpediente } from "./conectaEventosExpediente";

export type TransferirResponsableInput = {
  expedienteId: string;
  interconsultaId: string;
  receptorUid: string;
  receptorClinicaId: string;
  motivo: string;
};

export async function transferirResponsablePrincipal(
  solicitanteUid: string,
  input: TransferirResponsableInput
): Promise<ExpedienteClinico> {
  const expedienteRef = dbAdmin.collection("expedientesClinicos").doc(input.expedienteId);
  const interconsultaRef = dbAdmin.collection("interconsultas").doc(input.interconsultaId);

  // Pase previo, fuera de la transacción — solo para saber contra qué
  // clínica evaluar "es admin" (puedeTransferirResponsable lo necesita ya
  // resuelto). La transacción, abajo, vuelve a leer el expediente para la
  // decisión real y la escritura — este pase nunca decide nada por sí solo.
  const previoSnap = await expedienteRef.get();
  if (!previoSnap.exists) throw new ConectaError(404, "No existe ese expediente.");
  const expedientePrevio = previoSnap.data() as ExpedienteClinico;
  const esAdmin = await esAdminDeClinica(solicitanteUid, expedientePrevio.responsablePrincipalClinicaId);

  const resultado = await dbAdmin.runTransaction(async (tx) => {
    const [expedienteSnap, interconsultaSnap] = await Promise.all([tx.get(expedienteRef), tx.get(interconsultaRef)]);
    if (!expedienteSnap.exists) throw new ConectaError(404, "No existe ese expediente.");
    if (!interconsultaSnap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const expediente = expedienteSnap.data() as ExpedienteClinico;
    const interconsulta = interconsultaSnap.data() as Interconsulta;

    const receptorAcepto = interconsulta.estado === "accepted" && interconsulta.destinatarioUid === input.receptorUid;
    if (!puedeTransferirResponsable(expediente, { uid: solicitanteUid, esAdmin }, receptorAcepto)) {
      throw new ConectaError(
        403,
        "No puedes transferir la responsabilidad de este expediente, o el receptor todavía no ha aceptado."
      );
    }

    const participacionSalienteRef = dbAdmin
      .collection("participaciones")
      .doc(idParticipacion(input.expedienteId, expediente.responsablePrincipalUid));
    const participacionEntranteId = idParticipacion(input.expedienteId, input.receptorUid);
    const participacionEntranteRef = dbAdmin.collection("participaciones").doc(participacionEntranteId);
    const participacionSalienteSnap = await tx.get(participacionSalienteRef);

    const ahora = Timestamp.now();

    if (participacionSalienteSnap.exists) {
      tx.set(participacionSalienteRef, { estado: "concluida", hasta: ahora }, { merge: true });
    }

    // consentimientoId/solicitudAccesoId ausentes a propósito — la
    // transferencia no crea una nueva autorización del paciente, y no hay
    // una regla clara en el plan sobre heredar la del saliente; se deja
    // sin poblar en vez de adivinar (mismo caso ya documentado en
    // participaciones.ts para cuando estos campos legítimamente faltan).
    const participacionEntrante: Participacion = sinIndefinidos({
      id: participacionEntranteId,
      expedienteId: input.expedienteId,
      profesionalUid: input.receptorUid,
      clinicaId: input.receptorClinicaId,
      rol: "responsable_principal",
      nivelAcceso: "lectura_escritura",
      alcance: "completo",
      interconsultaId: input.interconsultaId,
      desde: ahora,
      estado: "activa",
      createdBy: solicitanteUid,
    });
    tx.set(participacionEntranteRef, participacionEntrante);

    const expedienteActualizado = {
      responsablePrincipalUid: input.receptorUid,
      responsablePrincipalClinicaId: input.receptorClinicaId,
      responsablePrincipalParticipacionId: participacionEntranteId,
      responsableDesde: ahora,
      responsabilidadVersion: expediente.responsabilidadVersion + 1,
      actualizadoEl: ahora,
    };
    tx.set(expedienteRef, expedienteActualizado, { merge: true });

    const historialRef = dbAdmin
      .collection("expedientesClinicos")
      .doc(input.expedienteId)
      .collection("historialResponsabilidad")
      .doc();
    const historial: HistorialResponsabilidad = {
      id: historialRef.id,
      expedienteId: input.expedienteId,
      deQuienUid: expediente.responsablePrincipalUid,
      aQuienUid: input.receptorUid,
      clinicaDeId: expediente.responsablePrincipalClinicaId,
      clinicaAId: input.receptorClinicaId,
      motivo: input.motivo,
      interconsultaId: input.interconsultaId,
      fecha: ahora,
    };
    tx.set(historialRef, historial);

    return { ...expediente, ...expedienteActualizado } as ExpedienteClinico;
  });

  await registrarEventoExpediente(input.expedienteId, {
    tipo: "participacion_creada",
    uid: input.receptorUid,
    participacionId: idParticipacion(input.expedienteId, input.receptorUid),
    detalle: "transferencia de responsable principal",
  });

  return resultado;
}
