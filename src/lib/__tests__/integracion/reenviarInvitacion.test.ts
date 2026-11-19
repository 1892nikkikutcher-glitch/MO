/** Reenviar un caso pendiente de aceptar: enlace nuevo con los mismos datos del colega, el anterior deja de
 * servir, y solo quien envió el caso puede hacerlo mientras ningún colega de MO lo haya tomado. Contra el
 * emulador; nunca toca producción. */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local" });
  return { dbAdmin: getFirestore(app) };
});

import { dbAdmin } from "../../firebaseAdmin";
import { crearInvitacion, obtenerInvitacionPublica, reenviarInvitacion } from "../../conectaInvitaciones";

const REM = "uid-rem-reenvio";
const OTRO = "uid-otro-reenvio";
const IDS = ["ic-r-pendiente", "ic-r-tomado", "ic-r-cerrado", "ic-r-sin-invitacion"];

async function caso(id: string, extra: Record<string, unknown> = {}) {
  await dbAdmin.collection("interconsultas").doc(id).set({
    id,
    clinicaRemitenteId: "clinica-r",
    odontologoRemitenteUid: REM,
    participantesAutorizados: [REM],
    estado: "sent",
    historialEstados: [],
    ...extra,
  });
}

beforeAll(async () => {
  await Promise.all([
    caso("ic-r-pendiente"),
    caso("ic-r-tomado", { destinatarioUid: "colega-en-mo", participantesAutorizados: [REM, "colega-en-mo"] }),
    caso("ic-r-cerrado", { estado: "closed" }),
    caso("ic-r-sin-invitacion"),
  ]);
});

afterAll(async () => {
  await Promise.all(IDS.map((id) => dbAdmin.recursiveDelete(dbAdmin.collection("interconsultas").doc(id))));
  for (const id of IDS) {
    const inv = await dbAdmin.collection("invitacionesConecta").where("interconsultaId", "==", id).get();
    await Promise.all(inv.docs.map((d) => d.ref.delete()));
  }
  await dbAdmin.collection("rateLimitsConecta").doc(`invitacion_crear_${REM}`).delete();
});

describe("reenviar un caso pendiente de aceptar", () => {
  it("genera un enlace nuevo con los mismos datos y deja sin efecto el anterior", async () => {
    const vieja = await crearInvitacion(REM, {
      interconsultaId: "ic-r-pendiente",
      destinatarioNombre: "Jaqueline De La Cruz",
      destinatarioCorreo: "jaque@mail.com",
      canal: "copiar_enlace",
    });

    // Con correo y una invitación activa, crear otra a mano sigue siendo "duplicada"…
    await expect(
      crearInvitacion(REM, { interconsultaId: "ic-r-pendiente", destinatarioCorreo: "jaque@mail.com", canal: "copiar_enlace" })
    ).rejects.toMatchObject({ status: 409 });

    // …pero reenviar sí funciona.
    const nueva = await reenviarInvitacion(REM, "ic-r-pendiente");
    expect(nueva.tokenCrudo).not.toBe(vieja.tokenCrudo);
    expect(nueva.destinatarioNombre).toBe("Jaqueline De La Cruz");
    expect(nueva.destinatarioCorreo).toBe("jaque@mail.com");

    expect((await obtenerInvitacionPublica(vieja.tokenCrudo)).estado).toBe("cancelada");
    const publica = await obtenerInvitacionPublica(nueva.tokenCrudo);
    expect(publica.estado).toBe("activa");
    expect(publica.destinatarioNombre).toBe("Jaqueline De La Cruz");

    // Se puede reenviar otra vez: siempre queda UNA sola activa.
    const tercera = await reenviarInvitacion(REM, "ic-r-pendiente");
    expect((await obtenerInvitacionPublica(nueva.tokenCrudo)).estado).toBe("cancelada");
    expect((await obtenerInvitacionPublica(tercera.tokenCrudo)).estado).toBe("activa");
    const activas = (await dbAdmin.collection("invitacionesConecta").where("interconsultaId", "==", "ic-r-pendiente").get()).docs.filter(
      (d) => d.data().estado === "activa"
    );
    expect(activas).toHaveLength(1);
  });

  it("funciona aunque la invitación sin correo ni nombre (solo WhatsApp) ya hubiera vencido o no exista", async () => {
    const r = await reenviarInvitacion(REM, "ic-r-sin-invitacion");
    expect(r.destinatarioNombre).toBeNull();
    expect((await obtenerInvitacionPublica(r.tokenCrudo)).estado).toBe("activa");
  });

  it("solo quien envió el caso puede reenviarlo", async () => {
    await expect(reenviarInvitacion(OTRO, "ic-r-pendiente")).rejects.toMatchObject({ status: 403 });
  });

  it("no reenvía un caso que un colega de MO ya tomó ni uno que ya no está pendiente", async () => {
    await expect(reenviarInvitacion(REM, "ic-r-tomado")).rejects.toMatchObject({ status: 409 });
    await expect(reenviarInvitacion(REM, "ic-r-cerrado")).rejects.toMatchObject({ status: 409 });
  });

  it("un caso que no existe da 404", async () => {
    await expect(reenviarInvitacion(REM, "ic-no-existe")).rejects.toMatchObject({ status: 404 });
  });
});
