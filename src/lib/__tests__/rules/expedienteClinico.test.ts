/** Pruebas de reglas de Firestore para el expediente clínico compartido
 * (arquitectura MO Conecta v3) — cubre las 12 pruebas prioritarias de
 * Fase 0 que sí son verificables contra firestore.rules (las que
 * dependen de una ruta de servidor todavía sin escribir — creación
 * atómica de sesión+evento en /abrir, y que el odontólogo no pueda
 * invocar la ruta de consentimiento directo — se marcan explícitamente
 * como diferidas más abajo, no se simulan aquí).
 *
 * PENDIENTE DE EJECUCIÓN EN ESTA MÁQUINA: mismo bloqueo documentado en
 * ./firestore.test.ts — el emulador de Firestore (basado en Java) no
 * arranca aquí; confirmado de nuevo en esta sesión con Java 21 y 25,
 * con y sin forzar `WindowsSelectorProvider`, y con el sandbox de
 * ejecución deshabilitado — mismo error de fondo en los tres casos:
 * `java.net.SocketException: Invalid argument: connect` al intentar
 * abrir el socket de loopback interno (AF_UNIX) que usa Netty/NIO.
 * Escritas y listas para correr en cuanto haya un entorno compatible
 * con: firebase emulators:exec --only auth,firestore "npm run test:emulator"
 *
 * Nunca corren contra el proyecto de producción — setup.ts apunta
 * explícitamente a 127.0.0.1 (prueba prioritaria #12 de Fase 0). */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { crearEntornoDePrueba } from "./setup";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await crearEntornoDePrueba();
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

const EXP_ID = "exp1";
const UID = "uidProfesional";
const UID_OTRO = "uidOtroProfesional";

const AHORA_MS = Date.now();
const EN_UNA_HORA = Timestamp.fromMillis(AHORA_MS + 60 * 60 * 1000);
const HACE_UNA_HORA = Timestamp.fromMillis(AHORA_MS - 60 * 60 * 1000);

function participacionGeneralValida(overrides: Record<string, unknown> = {}) {
  return {
    expedienteId: EXP_ID,
    profesionalUid: UID,
    clinicaId: "clinica-a",
    rol: "colaborador",
    estado: "activa",
    ...overrides,
  };
}

function sesionValida(overrides: Record<string, unknown> = {}) {
  return {
    expedienteId: EXP_ID,
    profesionalUid: UID,
    estado: "activa",
    expiresAt: EN_UNA_HORA,
    participacionId: `${EXP_ID}_${UID}_general`,
    ...overrides,
  };
}

async function sembrar(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

describe("prueba prioritaria de Fase 0 #1/#2 — participación y sesión, cada una por separado, no bastan", () => {
  it("participación activa sin ninguna sesión no permite leer el expediente", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });

  it("una sesión activa y vigente sin participación tampoco permite leer", async () => {
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    // La regla contra sesionesAccesoExpediente es allow read,write: if false
    // incluso para el propio dueño — el cliente no puede ni siquiera leer
    // su propia sesión directo, solo la propia regla de expedientesClinicos
    // la consulta internamente.
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });

  it("con participación activa Y sesión activa/vigente, sí se puede leer", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertSucceeds(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #3 — la sesión de otro usuario no puede reutilizarse", () => {
  it("uidOtro no puede leer usando la sesión/participación sembradas para uid", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    // uidOtro no tiene su propio doc de sesión en sesionesAccesoExpediente/{EXP_ID}_uidOtro
    // — el id determinístico ya lo aísla, esto confirma que aislarlo por id
    // basta y que no hace falta ninguna comprobación adicional para este caso.
    const otro = testEnv.authenticatedContext(UID_OTRO).firestore();
    await assertFails(getDoc(doc(otro, `expedientesClinicos/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #4 — una sesión con expedienteId inconsistente no funciona", () => {
  it("false si el campo expedienteId de la sesión no coincide con el expediente solicitado, aunque el id del documento sea el correcto", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    // El id del documento SÍ es exp1_uid (el esperado), pero su CAMPO
    // expedienteId dice otra cosa — exactamente el escenario que la
    // tercera precisión de la ronda de aprobación de v3 pide cubrir.
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida({ expedienteId: "exp-otro" }));
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #5 — una sesión vencida no funciona", () => {
  it("false si expiresAt ya pasó, aunque estado siga 'activa'", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida({ expiresAt: HACE_UNA_HORA }));
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #6 — la revocación bloquea de inmediato", () => {
  it("participación revocada bloquea la lectura aunque la sesión siga 'activa' y vigente en apariencia", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida({ estado: "revocada" }));
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });

  it("una participación concluida (cierre normal, no revocación) tampoco permite leer — la regla exige == 'activa', no 'distinto de revocada'", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida({ estado: "concluida" }));
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}`, { responsablePrincipalUid: UID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #7 — pacientesGlobales exige sesión, igual que el expediente", () => {
  it("participación activa sin sesión tampoco permite leer pacientesGlobales", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`pacientesGlobales/${EXP_ID}`, { nombre: "no debería importar el contenido" });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `pacientesGlobales/${EXP_ID}`)));
  });

  it("con participación y sesión, pacientesGlobales sí se puede leer", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`pacientesGlobales/${EXP_ID}`, {});
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertSucceeds(getDoc(doc(cliente, `pacientesGlobales/${EXP_ID}`)));
  });
});

describe("prueba prioritaria #8 — las subcolecciones clínicas exigen sesión (representativa: notasEvolucion)", () => {
  it("sin sesión, notasEvolucion no se puede leer aunque haya participación", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`expedientesClinicos/${EXP_ID}/notasEvolucion/n1`, { contenido: "..." });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}/notasEvolucion/n1`)));
  });

  it("con participación y sesión, notasEvolucion sí se puede leer", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_general`, participacionGeneralValida());
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}/notasEvolucion/n1`, { contenido: "..." });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertSucceeds(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}/notasEvolucion/n1`)));
  });

  it("una participación de SOLO episodio, sin la general, no abre ninguna subcolección clínica (corrige la contradicción de una ronda de diseño anterior)", async () => {
    await sembrar(`participaciones/${EXP_ID}_${UID}_ep1`, participacionGeneralValida({ episodioId: "ep1" }));
    await sembrar(`sesionesAccesoExpediente/${EXP_ID}_${UID}`, sesionValida());
    await sembrar(`expedientesClinicos/${EXP_ID}/episodios/ep1`, { titulo: "..." });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, `expedientesClinicos/${EXP_ID}/episodios/ep1`)));
  });
});

describe("prueba prioritaria #11 — el folio nunca concede acceso", () => {
  it("codigosPaciente no se puede leer ni escribir desde el cliente bajo ninguna circunstancia", async () => {
    await sembrar("codigosPaciente/hashDeEjemplo", { pacienteGlobalId: EXP_ID, expedienteId: EXP_ID });
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(getDoc(doc(cliente, "codigosPaciente/hashDeEjemplo")));
    await assertFails(setDoc(doc(cliente, "codigosPaciente/otroHash"), { pacienteGlobalId: EXP_ID }));
  });

  it("sesionesAccesoExpediente tampoco se puede crear desde el cliente, ni siquiera con datos aparentemente válidos", async () => {
    const cliente = testEnv.authenticatedContext(UID).firestore();
    await assertFails(setDoc(doc(cliente, `sesionesAccesoExpediente/${EXP_ID}_${UID}`), sesionValida()));
  });
});

describe("diferidas — no verificables solo con reglas, dependen de una ruta de servidor todavía sin escribir", () => {
  it.skip("prueba prioritaria #9: la creación de sesión y evento de apertura es atómica — depende de /api/expedientes/{id}/abrir (Fase 3, sin escribir)", () => {});
  it.skip("prueba prioritaria #10: el odontólogo no puede otorgar consentimiento directo fingiendo ser el paciente — cubierta como lógica pura en consentimientoExpediente.test.ts; la integración de la ruta real queda para cuando exista", () => {});
});
