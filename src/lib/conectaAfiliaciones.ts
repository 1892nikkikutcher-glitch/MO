/** Lógica de negocio de afiliaciones profesional↔clínica de MO Conecta —
 * nunca auto-escrita por el cliente, siempre vía solicitud/aprobación
 * server-side (§4 del plan). */

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, esAdminDeClinica, nowISO, sinIndefinidos } from "./conectaServer";
import type { AfiliacionClinica } from "./moConecta";
import type { ClinicInfo } from "./patientData";

export async function solicitarAfiliacion(uid: string, clinicaId: string): Promise<AfiliacionClinica> {
  const clinicaSnap = await dbAdmin.collection("clinics").doc(clinicaId).get();
  if (!clinicaSnap.exists) throw new ConectaError(404, "No existe esa clínica.");
  const clinica = clinicaSnap.data() as ClinicInfo;

  const pendienteSnap = await dbAdmin
    .collection("afiliaciones")
    .where("uid", "==", uid)
    .where("clinicaId", "==", clinicaId)
    .where("estado", "==", "pendiente")
    .limit(1)
    .get();
  if (!pendienteSnap.empty) {
    throw new ConectaError(409, "Ya tienes una solicitud pendiente con esta clínica.");
  }

  const ahora = nowISO();
  const ref = dbAdmin.collection("afiliaciones").doc();
  const afiliacion: AfiliacionClinica = {
    id: ref.id,
    uid,
    clinicaId,
    clinicaNombre: clinica.nombre,
    rol: "colaborador",
    estado: "pendiente",
    solicitadaEl: ahora,
  };
  await ref.set(afiliacion);
  return afiliacion;
}

export async function resolverAfiliacion(
  resolutorUid: string,
  afiliacionId: string,
  accion: "aceptar" | "rechazar" | "revocar"
): Promise<void> {
  const ref = dbAdmin.collection("afiliaciones").doc(afiliacionId);
  const snap = await ref.get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa afiliación.");
  const afiliacion = snap.data() as AfiliacionClinica;

  const esAdmin = await esAdminDeClinica(resolutorUid, afiliacion.clinicaId);
  if (!esAdmin) throw new ConectaError(403, "Solo un administrador de esa clínica puede resolver esta afiliación.");

  if (accion === "aceptar" || accion === "rechazar") {
    if (afiliacion.estado !== "pendiente") throw new ConectaError(409, "Esta afiliación ya fue resuelta.");
  }
  if (accion === "revocar" && afiliacion.estado !== "activa") {
    throw new ConectaError(409, "Solo se puede revocar una afiliación activa.");
  }

  const ahora = nowISO();
  const nuevoEstado = accion === "aceptar" ? "activa" : accion === "rechazar" ? "rechazada" : "revocada";
  await ref.set(
    sinIndefinidos({ estado: nuevoEstado, resueltaEl: ahora, resueltaPorUid: resolutorUid }),
    { merge: true }
  );

  const perfilPublicoRef = dbAdmin.collection("perfilesProfesionalesPublicos").doc(afiliacion.uid);
  if (accion === "aceptar") {
    await perfilPublicoRef.set({ clinicaNombre: afiliacion.clinicaNombre, actualizadoEl: ahora }, { merge: true });
  } else if (accion === "revocar") {
    const perfilSnap = await perfilPublicoRef.get();
    if (perfilSnap.exists && perfilSnap.data()?.clinicaNombre === afiliacion.clinicaNombre) {
      await perfilPublicoRef.set({ clinicaNombre: FieldValue.delete(), actualizadoEl: ahora }, { merge: true });
    }
  }
}
