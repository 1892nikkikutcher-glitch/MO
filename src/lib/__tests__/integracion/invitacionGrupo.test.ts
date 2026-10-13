/** Varios casos enviados juntos a un colega que aún no está en MO comparten
 * grupo: aceptar UN enlace abre todos, solo los del mismo remitente. Contra el
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
import { crearInvitacion, reclamarInvitacion } from "../../conectaInvitaciones";

const REM = "uid-rem-grupo";
const OTRO = "uid-otro-rem-grupo";
const IDS = ["ic-g1", "ic-g2", "ic-g3", "ic-otro"];
const GRUPO = "grupo-prueba-123456";

async function caso(id: string, remitente: string) {
  await dbAdmin.collection("interconsultas").doc(id).set({
    id,
    clinicaRemitenteId: "clinica-g",
    odontologoRemitenteUid: remitente,
    participantesAutorizados: [remitente],
    estado: "sent",
    historialEstados: [],
  });
}

beforeAll(async () => {
  await Promise.all([caso("ic-g1", REM), caso("ic-g2", REM), caso("ic-g3", REM), caso("ic-otro", OTRO)]);
});

afterAll(async () => {
  await Promise.all(IDS.map((id) => dbAdmin.recursiveDelete(dbAdmin.collection("interconsultas").doc(id))));
  const inv = await dbAdmin.collection("invitacionesConecta").where("grupoId", "==", GRUPO).get();
  await Promise.all(inv.docs.map((d) => d.ref.delete()));
  await dbAdmin.collection("rateLimitsConecta").doc(`invitacion_crear_${REM}`).delete();
  await dbAdmin.collection("rateLimitsConecta").doc(`invitacion_crear_${OTRO}`).delete();
  for (const u of ["colega-grupo", "colega-grupo-2"]) await dbAdmin.collection("rateLimitsConecta").doc(`invitacion_reclamar_${u}`).delete();
});

const base = { destinatarioCorreo: "colega@mail.com", canal: "copiar_enlace" as const, grupoId: GRUPO };

describe("aceptar un enlace abre todos los casos enviados juntos", () => {
  it("con correo que coincide: acceso a los tres casos del mismo remitente, y no al de otro remitente", async () => {
    const a = await crearInvitacion(REM, { interconsultaId: "ic-g1", ...base });
    await crearInvitacion(REM, { interconsultaId: "ic-g2", ...base });
    await crearInvitacion(REM, { interconsultaId: "ic-g3", ...base });
    await crearInvitacion(OTRO, { interconsultaId: "ic-otro", ...base }); // mismo grupoId, otro remitente

    const r = await reclamarInvitacion("colega-grupo", "Colega@Mail.com", true, a.tokenCrudo);
    expect(r).toMatchObject({ tipo: "acceso_otorgado", interconsultaId: "ic-g1", adicionales: 2 });

    for (const id of ["ic-g1", "ic-g2", "ic-g3"]) {
      const d = (await dbAdmin.collection("interconsultas").doc(id).get()).data()!;
      expect(d.destinatarioUid).toBe("colega-grupo");
      expect(d.participantesAutorizados).toContain("colega-grupo");
      expect(typeof d.colegaSeUnioEl).toBe("string"); // para avisarle a quien envió
    }
    const ajeno = (await dbAdmin.collection("interconsultas").doc("ic-otro").get()).data()!;
    expect(ajeno.participantesAutorizados).toEqual([OTRO]);

    // Las tres quedaron usadas: el mismo enlace ya no sirve.
    await expect(reclamarInvitacion("colega-grupo-2", "colega@mail.com", true, a.tokenCrudo)).rejects.toMatchObject({ status: 410 });
  });
});
