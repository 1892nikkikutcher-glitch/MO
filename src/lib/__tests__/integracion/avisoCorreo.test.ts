/** Aviso por correo al colega (contra el emulador, con el envío de correo simulado): estados del aviso,
 * agrupar varios casos en un solo correo, y que un fallo del correo nunca afecta al caso. */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local" });
  return { dbAdmin: getFirestore(app), authAdmin: getAuth(app) };
});

vi.mock("../../enviarCorreoServidor", () => ({ correoConfigurado: vi.fn(), enviarCorreo: vi.fn() }));

import { authAdmin, dbAdmin } from "../../firebaseAdmin";
import { correoConfigurado, enviarCorreo } from "../../enviarCorreoServidor";
import { avisarCasoNuevoPorCorreo, avisarInvitacionPorCorreo } from "../../conectaAvisoCorreo";

const REMITENTE = "uid-remitente-aviso";
const COLEGA = "uid-colega-aviso";
const CORREO_COLEGA = "colega-aviso@mo.test";
const CASOS = ["ic-aviso-1", "ic-aviso-2", "ic-aviso-3"];
const casoRef = (id: string) => dbAdmin.collection("interconsultas").doc(id);

async function limpiarLimites() {
  const snap = await dbAdmin.collection("rateLimitsConecta").get();
  await Promise.all(snap.docs.filter((d) => d.id.startsWith("aviso_correo_")).map((d) => d.ref.delete()));
}

beforeAll(async () => {
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(REMITENTE).set({ uid: REMITENTE, nombreCompleto: "Dra. Remitente Prueba" });
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(COLEGA).set({ uid: COLEGA, nombreCompleto: "Dr. Colega Prueba" });
  try {
    await authAdmin.createUser({ uid: COLEGA, email: CORREO_COLEGA, password: "prueba-local-1234", emailVerified: true });
  } catch {
    /* ya existía de otra corrida */
  }
  for (const id of CASOS) await casoRef(id).set({ id, odontologoRemitenteUid: REMITENTE, destinatarioUid: COLEGA, participantesAutorizados: [REMITENTE, COLEGA], estado: "sent" });
});

beforeEach(async () => {
  vi.mocked(correoConfigurado).mockReturnValue(true);
  vi.mocked(enviarCorreo).mockReset().mockResolvedValue(undefined);
  await limpiarLimites();
});

afterAll(async () => {
  await Promise.all(CASOS.map((id) => casoRef(id).delete()));
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(REMITENTE).delete();
  await dbAdmin.collection("perfilesProfesionalesPublicos").doc(COLEGA).delete();
  await authAdmin.deleteUser(COLEGA).catch(() => {});
  await limpiarLimites();
});

const caso = (id: string) => ({ id, odontologoRemitenteUid: REMITENTE, destinatarioUid: COLEGA });

describe("aviso por correo al colega con cuenta en MO", () => {
  it("manda el correo a la cuenta del colega, sin datos del paciente, y lo anota en el caso", async () => {
    const aviso = await avisarCasoNuevoPorCorreo(caso("ic-aviso-1"), "https://mo.example");
    expect(aviso?.estado).toBe("enviado");
    expect(enviarCorreo).toHaveBeenCalledTimes(1);
    const enviado = vi.mocked(enviarCorreo).mock.calls[0][0];
    expect(enviado.para).toBe(CORREO_COLEGA);
    expect(enviado.asunto).toContain("Dra. Remitente Prueba");
    expect(enviado.texto).toContain("https://mo.example");
    expect((await casoRef("ic-aviso-1").get()).data()?.avisoCorreo?.estado).toBe("enviado");
  });

  it("varios casos al mismo colega generan UN solo correo; los demás quedan como 'agrupado'", async () => {
    expect((await avisarCasoNuevoPorCorreo(caso("ic-aviso-1"), "https://mo.example"))?.estado).toBe("enviado");
    expect((await avisarCasoNuevoPorCorreo(caso("ic-aviso-2"), "https://mo.example"))?.estado).toBe("agrupado");
    expect((await avisarCasoNuevoPorCorreo(caso("ic-aviso-3"), "https://mo.example"))?.estado).toBe("agrupado");
    expect(enviarCorreo).toHaveBeenCalledTimes(1);
  });

  it("si MO no tiene correo activado no manda nada y lo anota", async () => {
    vi.mocked(correoConfigurado).mockReturnValue(false);
    expect((await avisarCasoNuevoPorCorreo(caso("ic-aviso-1"), "https://mo.example"))?.estado).toBe("no_configurado");
    expect(enviarCorreo).not.toHaveBeenCalled();
  });

  it("si el envío falla, no truena: queda anotado como 'fallo'", async () => {
    vi.mocked(enviarCorreo).mockRejectedValue(new Error("SMTP caído"));
    const aviso = await avisarCasoNuevoPorCorreo(caso("ic-aviso-1"), "https://mo.example");
    expect(aviso?.estado).toBe("fallo");
    expect((await casoRef("ic-aviso-1").get()).data()?.avisoCorreo?.estado).toBe("fallo");
  });

  it("un caso sin destinatario registrado no genera aviso", async () => {
    expect(await avisarCasoNuevoPorCorreo({ id: "ic-aviso-1", odontologoRemitenteUid: REMITENTE }, "https://mo.example")).toBeNull();
    expect(enviarCorreo).not.toHaveBeenCalled();
  });
});

describe("aviso por correo al colega invitado", () => {
  it("le manda el enlace de invitación (un solo uso) al correo que se dio", async () => {
    const aviso = await avisarInvitacionPorCorreo({
      remitenteUid: REMITENTE,
      interconsultaId: "ic-aviso-2",
      correo: "  Invitado@Mail.COM ",
      destinatarioNombre: "Dr. Invitado",
      tokenCrudo: "tok-crudo-123",
      origen: "https://mo.example",
      venceEl: "2026-10-21T00:00:00.000Z",
    });
    expect(aviso.estado).toBe("enviado");
    const enviado = vi.mocked(enviarCorreo).mock.calls[0][0];
    expect(enviado.para).toBe("invitado@mail.com");
    expect(enviado.texto).toContain("tok-crudo-123");
    expect(enviado.asunto).toContain("te invitó");
    expect((await casoRef("ic-aviso-2").get()).data()?.avisoCorreo?.estado).toBe("enviado");
  });
});
