/** Sesión de acceso auditada real — abrir/renovar/cerrar (arquitectura MO
 * Conecta v3, §10) — la única forma de que `tieneSesionAccesoActiva`
 * (firestore.rules) encuentre una sesión válida. Server-only. Ver
 * `calcularExpiresAt` en sesionAccesoExpediente.ts para cómo `expiresAt`
 * codifica tanto la inactividad de 15 min como el tope absoluto de 60.
 *
 * FASE 3 ("solo código y pruebas"): escrita, sin ninguna ruta de API que
 * la invoque — ninguna sesión real se abre en producción todavía. */

import { Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";
import { dbAdmin } from "./firebaseAdmin";
import { ConectaError, sinIndefinidos } from "./conectaServer";
import { idParticipacion, participacionVigente, type Participacion } from "./participaciones";
import {
  calcularExpiresAt,
  idSesionAccesoExpediente,
  DURACION_ABSOLUTA_MAXIMA_MINUTOS,
  type SesionAccesoExpediente,
} from "./sesionAccesoExpediente";
import type { ConsentimientoExpediente } from "./consentimientoExpediente";
import { registrarEventoExpediente } from "./conectaEventosExpediente";

function refSesion(expedienteId: string, profesionalUid: string) {
  return dbAdmin.collection("sesionesAccesoExpediente").doc(idSesionAccesoExpediente(expedienteId, profesionalUid));
}

/** Revalida participación + consentimiento vinculado desde cero — nunca se
 * confía en que ya se validaron antes (v3 §10: "vuelve a validar
 * participación+consentimiento+vigencia en servidor, nunca un simple
 * bump"). Compartida por abrir y renovar. */
async function validarParticipacionYConsentimiento(
  tx: Transaction,
  expedienteId: string,
  profesionalUid: string
): Promise<Participacion> {
  const participacionRef = dbAdmin.collection("participaciones").doc(idParticipacion(expedienteId, profesionalUid));
  const participacionSnap = await tx.get(participacionRef);
  if (!participacionSnap.exists) throw new ConectaError(403, "No tienes ninguna participación sobre este expediente.");
  const participacion = participacionSnap.data() as Participacion;

  if (!participacionVigente(participacion, Timestamp.now())) {
    throw new ConectaError(403, "Tu participación sobre este expediente no está vigente.");
  }

  if (participacion.consentimientoId) {
    const consentimientoSnap = await tx.get(dbAdmin.collection("consentimientosExpediente").doc(participacion.consentimientoId));
    if (!consentimientoSnap.exists || (consentimientoSnap.data() as ConsentimientoExpediente).estado !== "vigente") {
      throw new ConectaError(403, "El consentimiento que respalda tu acceso ya no está vigente.");
    }
  }

  return participacion;
}

export async function abrirSesionAccesoExpediente(
  profesionalUid: string,
  expedienteId: string,
  motivo: string
): Promise<SesionAccesoExpediente> {
  const sesionRef = refSesion(expedienteId, profesionalUid);

  const sesion = await dbAdmin.runTransaction(async (tx) => {
    const participacion = await validarParticipacionYConsentimiento(tx, expedienteId, profesionalUid);

    const ahora = Timestamp.now();
    const nuevaSesion: SesionAccesoExpediente = sinIndefinidos({
      expedienteId,
      profesionalUid,
      clinicaId: participacion.clinicaId,
      participacionId: participacion.id,
      consentimientoId: participacion.consentimientoId,
      solicitudAccesoId: participacion.solicitudAccesoId,
      motivo,
      iniciadaEl: ahora,
      ultimaActividadEl: ahora,
      expiresAt: calcularExpiresAt(ahora, ahora),
      estado: "activa",
      seccionesConsultadas: [],
    });
    // Id determinístico — reemplaza cualquier sesión previa del mismo
    // profesional sobre este expediente (v3 §10: una sola sesión viva a
    // la vez). La misma transacción escribe el evento de apertura más
    // abajo (fuera de esta función) — si esa escritura fallara, Firestore
    // no comprometería tampoco esta, por ser la misma operación atómica en
    // conjunto... salvo que aquí el evento se escribe DESPUÉS, en una
    // llamada aparte (ver nota de "nunca dentro del callback" en
    // conectaConsentimientoExpediente.ts) — así que la garantía real es
    // "nunca hay sesión sin haber pasado por aquí", no "el evento nunca
    // puede faltar por una falla de red posterior a confirmar la sesión".
    tx.set(sesionRef, nuevaSesion);
    return nuevaSesion;
  });

  await registrarEventoExpediente(expedienteId, {
    tipo: "expediente_abierto",
    uid: profesionalUid,
    participacionId: sesion.participacionId,
    sesionId: sesionRef.id,
    finalidad: motivo,
  });

  return sesion;
}

export async function renovarSesionAccesoExpediente(profesionalUid: string, expedienteId: string): Promise<SesionAccesoExpediente> {
  const sesionRef = refSesion(expedienteId, profesionalUid);

  return dbAdmin.runTransaction(async (tx) => {
    const sesionSnap = await tx.get(sesionRef);
    if (!sesionSnap.exists) throw new ConectaError(404, "No hay ninguna sesión que renovar — abre una nueva.");
    const sesionActual = sesionSnap.data() as SesionAccesoExpediente;

    const ahora = Timestamp.now();
    if (sesionActual.estado !== "activa" || sesionActual.expiresAt.toMillis() <= ahora.toMillis()) {
      if (sesionActual.estado === "activa") tx.set(sesionRef, { estado: "expirada" }, { merge: true });
      throw new ConectaError(409, "La sesión ya no está activa — abre una nueva.");
    }
    if (ahora.toMillis() >= sesionActual.iniciadaEl.toMillis() + DURACION_ABSOLUTA_MAXIMA_MINUTOS * 60_000) {
      // Duración absoluta agotada — "obliga a reabrir" aunque no hubiera
      // habido ninguna interrupción (v3 §10).
      tx.set(sesionRef, { estado: "expirada" }, { merge: true });
      throw new ConectaError(409, "Se alcanzó la duración máxima de la sesión (60 min) — abre una nueva.");
    }

    const participacion = await validarParticipacionYConsentimiento(tx, expedienteId, profesionalUid);

    const sesionRenovada: SesionAccesoExpediente = {
      ...sesionActual,
      clinicaId: participacion.clinicaId,
      ultimaActividadEl: ahora,
      expiresAt: calcularExpiresAt(sesionActual.iniciadaEl, ahora),
    };
    tx.set(sesionRef, sinIndefinidos(sesionRenovada));
    return sesionRenovada;
  });
}

export async function cerrarSesionAccesoExpediente(profesionalUid: string, expedienteId: string): Promise<void> {
  const sesionRef = refSesion(expedienteId, profesionalUid);
  const sesionSnap = await sesionRef.get();
  if (!sesionSnap.exists) return;
  const sesion = sesionSnap.data() as SesionAccesoExpediente;
  if (sesion.estado !== "activa") return;

  await sesionRef.set({ estado: "cerrada", cerradaEl: Timestamp.now() }, { merge: true });
  await registrarEventoExpediente(expedienteId, {
    tipo: "sesion_cerrada",
    uid: profesionalUid,
    participacionId: sesion.participacionId,
  });
}
