/** Pruebas de reglas de Firestore para MO Conecta (grupo A del plan, §8).
 *
 * PENDIENTE DE EJECUCIÓN EN ESTA MÁQUINA: el emulador de Firestore/Storage
 * (basado en Java) no arranca en este entorno de desarrollo — Java 21 falla
 * al crear su socket de loopback interno (AF_UNIX) por una restricción de
 * red de Windows en esta máquina, confirmado tras probar tres banderas de
 * JVM distintas. No es un problema del código ni de estas pruebas. Quedan
 * escritas y listas para correr en cuanto haya un entorno compatible (otra
 * máquina, o CI con Linux) con:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator"
 *
 * Nunca corren contra el proyecto de producción — `setup.ts` apunta
 * explícitamente a 127.0.0.1. */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
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

const UID_REMITENTE = "uidRemitente";
const UID_DESTINATARIO = "uidDestinatario";
const UID_AJENO = "uidAjeno";

async function sembrarInterconsulta(overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "interconsultas/ic1"), {
      odontologoRemitenteUid: UID_REMITENTE,
      destinatarioUid: UID_DESTINATARIO,
      participantesAutorizados: [UID_REMITENTE, UID_DESTINATARIO],
      estado: "accepted",
      ...overrides,
    });
  });
}

describe("perfilesProfesionalesPublicos", () => {
  it("cualquier autenticado puede leer un perfil ajeno (directorio)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "perfilesProfesionalesPublicos/otroUid"), { nombreCompleto: "Dr. X" });
    });
    const alice = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertSucceeds(getDoc(doc(alice, "perfilesProfesionalesPublicos/otroUid")));
  });

  it("un no autenticado no puede leer el directorio", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "perfilesProfesionalesPublicos/otroUid"), { nombreCompleto: "Dr. X" });
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "perfilesProfesionalesPublicos/otroUid")));
  });

  it("el cliente nunca puede escribir su propio perfil directo (ni siquiera el dueño)", async () => {
    const alice = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertFails(setDoc(doc(alice, `perfilesProfesionalesPublicos/${UID_AJENO}`), { nombreCompleto: "Yo mismo" }));
  });

  it("un intento de autoverificarse (estadoVerificacion) también se bloquea por el 'if false' de escritura", async () => {
    const alice = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertFails(
      setDoc(doc(alice, `perfilesProfesionalesPublicos/${UID_AJENO}`), {
        nombreCompleto: "Yo mismo",
        estadoVerificacion: "verificado",
      })
    );
  });
});

describe("perfilesProfesionalesPrivados y Admin", () => {
  it("el dueño puede leer su propio privado", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `perfilesProfesionalesPrivados/${UID_AJENO}`), { correo: "x@x.com" });
    });
    const alice = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertSucceeds(getDoc(doc(alice, `perfilesProfesionalesPrivados/${UID_AJENO}`)));
  });

  it("otro usuario no puede leer el privado ajeno", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `perfilesProfesionalesPrivados/${UID_AJENO}`), { correo: "x@x.com" });
    });
    const otro = testEnv.authenticatedContext("otro").firestore();
    await assertFails(getDoc(doc(otro, `perfilesProfesionalesPrivados/${UID_AJENO}`)));
  });

  it("ni siquiera el propio dueño puede leer su documento admin (notas administrativas)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `perfilesProfesionalesAdmin/${UID_AJENO}`), { notasAdministrativas: "nota" });
    });
    const alice = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertFails(getDoc(doc(alice, `perfilesProfesionalesAdmin/${UID_AJENO}`)));
  });
});

describe("interconsultas — solo participantes autorizados", () => {
  it("el remitente puede leer su propia interconsulta", async () => {
    await sembrarInterconsulta();
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertSucceeds(getDoc(doc(remitente, "interconsultas/ic1")));
  });

  it("el destinatario puede leer la interconsulta", async () => {
    await sembrarInterconsulta();
    const destinatario = testEnv.authenticatedContext(UID_DESTINATARIO).firestore();
    await assertSucceeds(getDoc(doc(destinatario, "interconsultas/ic1")));
  });

  it("un odontólogo no participante NO puede leer la interconsulta (acceso cruzado entre clínicas)", async () => {
    await sembrarInterconsulta();
    const ajeno = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertFails(getDoc(doc(ajeno, "interconsultas/ic1")));
  });

  it("un usuario no autenticado no puede leer nada", async () => {
    await sembrarInterconsulta();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "interconsultas/ic1")));
  });

  it("el cliente nunca puede crear ni actualizar una interconsulta directo", async () => {
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(
      setDoc(doc(remitente, "interconsultas/ic2"), {
        odontologoRemitenteUid: UID_REMITENTE,
        participantesAutorizados: [UID_REMITENTE],
        estado: "sent",
      })
    );
  });

  it("un participante no puede alterar participantesAutorizados directo (agregarse otro caso)", async () => {
    await sembrarInterconsulta();
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(
      setDoc(
        doc(remitente, "interconsultas/ic1"),
        { participantesAutorizados: [UID_REMITENTE, UID_DESTINATARIO, UID_AJENO] },
        { merge: true }
      )
    );
  });
});

describe("interconsultas/{id}/mensajes y eventos — subcolecciones", () => {
  it("un participante puede leer los mensajes", async () => {
    await sembrarInterconsulta();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "interconsultas/ic1/mensajes/m1"), { autor: UID_REMITENTE, contenido: "hola" });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertSucceeds(getDoc(doc(remitente, "interconsultas/ic1/mensajes/m1")));
  });

  it("un no-participante no puede leer los mensajes", async () => {
    await sembrarInterconsulta();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "interconsultas/ic1/mensajes/m1"), { autor: UID_REMITENTE, contenido: "hola" });
    });
    const ajeno = testEnv.authenticatedContext(UID_AJENO).firestore();
    await assertFails(getDoc(doc(ajeno, "interconsultas/ic1/mensajes/m1")));
  });

  it("el cliente nunca puede escribir un mensaje directo (autor/fecha los pone el servidor)", async () => {
    await sembrarInterconsulta();
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(
      addDoc(collection(remitente, "interconsultas/ic1/mensajes"), { autor: UID_REMITENTE, contenido: "hola" })
    );
  });

  it("los eventos de auditoría son inmutables — ni siquiera el servidor los actualiza vía cliente", async () => {
    await sembrarInterconsulta();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "interconsultas/ic1/eventos/e1"), { tipo: "estado_cambiado" });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(setDoc(doc(remitente, "interconsultas/ic1/eventos/e1"), { tipo: "manipulado" }, { merge: true }));
  });
});

describe("invitacionesConecta — nunca lectura ni escritura de cliente", () => {
  it("nadie puede leer una invitación directo, ni el propio remitente", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "invitacionesConecta/inv1"), { remitenteUid: UID_REMITENTE });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(getDoc(doc(remitente, "invitacionesConecta/inv1")));
  });

  it("nadie puede crear una invitación directo desde el cliente", async () => {
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(setDoc(doc(remitente, "invitacionesConecta/inv2"), { remitenteUid: UID_REMITENTE }));
  });
});

describe("consentimientosInterconsulta — inmutable, solo el dueño lo lee", () => {
  it("el odontólogo que lo registró puede leerlo", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "consentimientosInterconsulta/c1"), { odontologoUid: UID_REMITENTE });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertSucceeds(getDoc(doc(remitente, "consentimientosInterconsulta/c1")));
  });

  it("nadie puede modificarlo desde el cliente, ni el propio dueño", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "consentimientosInterconsulta/c1"), { odontologoUid: UID_REMITENTE });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(
      setDoc(doc(remitente, "consentimientosInterconsulta/c1"), { estado: "revocado" }, { merge: true })
    );
  });
});

describe("eventosCrecimientoConecta — solo superadmin vía dbAdmin", () => {
  it("nadie puede leerlos ni escribirlos desde el cliente", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "eventosCrecimientoConecta/e1"), { tipo: "referral_created" });
    });
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).firestore();
    await assertFails(getDoc(doc(remitente, "eventosCrecimientoConecta/e1")));
    await assertFails(setDoc(doc(remitente, "eventosCrecimientoConecta/e2"), { tipo: "manipulado" }));
  });
});
