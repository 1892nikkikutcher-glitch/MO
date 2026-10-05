/** Pruebas de reglas de la Papelera (users/{clinicUid}/papelera). Corren
 * contra el emulador de Firestore, nunca contra producción:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator"
 *
 * Lo que se protege: cualquier miembro activo puede GUARDAR una copia al
 * eliminar algo (si no, su eliminación completa se rechaza), pero solo un
 * administrador puede LEER la papelera, y nadie con un rol operativo puede
 * modificar o borrar lo que ya está guardado. */

import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { crearEntornoDePrueba } from "./setup";

let testEnv: RulesTestEnvironment;

const CLINICA = "clinicaDueno"; // el uid del dueño es el id de la clínica
const ADMIN = "uidAdminColab";
const ODONTOLOGO = "uidOdontologo";
const INACTIVO = "uidInactivo";
const OTRA_CLINICA_ADMIN = "uidAdminOtraClinica";
const AJENO = "uidAjeno";

beforeAll(async () => {
  testEnv = await crearEntornoDePrueba();
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics", CLINICA), { ownerId: CLINICA, nombre: "Clínica de prueba" });
    await setDoc(doc(db, `clinicMembers/${CLINICA}_${ADMIN}`), {
      clinicId: CLINICA, uid: ADMIN, role: "admin", status: "active",
    });
    await setDoc(doc(db, `clinicMembers/${CLINICA}_${ODONTOLOGO}`), {
      clinicId: CLINICA, uid: ODONTOLOGO, role: "odontologo", status: "active",
    });
    await setDoc(doc(db, `clinicMembers/${CLINICA}_${INACTIVO}`), {
      clinicId: CLINICA, uid: INACTIVO, role: "odontologo", status: "suspended",
    });
    await setDoc(doc(db, `clinicMembers/otraClinica_${OTRA_CLINICA_ADMIN}`), {
      clinicId: "otraClinica", uid: OTRA_CLINICA_ADMIN, role: "admin", status: "active",
    });
  });
});

const ENTRADA = {
  rutaOrigen: `users/${CLINICA}/citas`,
  tipo: "citas",
  docId: "c1",
  pacienteId: null,
  etiqueta: "Ana López · 12/10/2026 · 09:00",
  datos: { id: "c1", paciente: "Ana López", fecha: "2026-10-12", horaInicio: "09:00" },
  eliminadoEl: "2026-10-12T22:35:00.000Z",
  eliminadoPorUid: ODONTOLOGO,
  eliminadoPorEmail: "doc@clinica.mx",
};

const RUTA = `users/${CLINICA}/papelera/entrada1`;

async function sembrarEntrada() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), RUTA), ENTRADA);
  });
}

describe("papelera — quién puede guardar una copia", () => {
  it("el dueño de la cuenta puede guardar", async () => {
    const db = testEnv.authenticatedContext(CLINICA).firestore();
    await assertSucceeds(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("un administrador colaborador puede guardar", async () => {
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("un odontólogo (rol operativo) puede guardar: si no pudiera, no podría eliminar nada", async () => {
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    await assertSucceeds(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("un miembro suspendido no puede guardar", async () => {
    const db = testEnv.authenticatedContext(INACTIVO).firestore();
    await assertFails(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("un administrador de OTRA clínica no puede guardar en esta", async () => {
    const db = testEnv.authenticatedContext(OTRA_CLINICA_ADMIN).firestore();
    await assertFails(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("un usuario sin ninguna membresía no puede guardar", async () => {
    const db = testEnv.authenticatedContext(AJENO).firestore();
    await assertFails(setDoc(doc(db, RUTA), ENTRADA));
  });

  it("sin sesión no se puede guardar", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, RUTA), ENTRADA));
  });
});

describe("papelera — quién puede leerla", () => {
  it("el dueño y el administrador colaborador la leen", async () => {
    await sembrarEntrada();
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext(CLINICA).firestore(), RUTA)));
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext(ADMIN).firestore(), RUTA)));
  });

  it("el administrador puede listar la colección completa", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(getDocs(collection(db, `users/${CLINICA}/papelera`)));
  });

  it("un odontólogo NO la lee (contiene datos financieros que no ve)", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    await assertFails(getDoc(doc(db, RUTA)));
    await assertFails(getDocs(collection(db, `users/${CLINICA}/papelera`)));
  });

  it("alguien de otra clínica ni sin membresía la lee", async () => {
    await sembrarEntrada();
    await assertFails(getDoc(doc(testEnv.authenticatedContext(OTRA_CLINICA_ADMIN).firestore(), RUTA)));
    await assertFails(getDoc(doc(testEnv.authenticatedContext(AJENO).firestore(), RUTA)));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), RUTA)));
  });
});

describe("papelera — modificar y borrar entradas guardadas", () => {
  it("el administrador puede marcar una entrada como restaurada", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(
      updateDoc(doc(db, RUTA), { restauradoEl: "2026-10-13T10:00:00.000Z", restauradoPorEmail: "admin@clinica.mx" })
    );
  });

  it("un odontólogo no puede modificar una entrada (ni para borrar evidencia)", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    await assertFails(updateDoc(doc(db, RUTA), { etiqueta: "otra cosa" }));
  });

  it("un odontólogo tampoco puede sobrescribir una entrada existente con set()", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    await assertFails(setDoc(doc(db, RUTA), { ...ENTRADA, datos: {} }));
  });

  it("un odontólogo no puede borrar entradas", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    await assertFails(deleteDoc(doc(db, RUTA)));
  });

  it("un administrador colaborador tampoco puede borrar entradas", async () => {
    await sembrarEntrada();
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertFails(deleteDoc(doc(db, RUTA)));
  });
});

describe("eliminar con papelera — el batch completo", () => {
  async function sembrarCita() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CLINICA}/citas/c1`), ENTRADA.datos);
    });
  }

  it("un odontólogo elimina una cita y guarda su copia en un solo batch", async () => {
    await sembrarCita();
    const db = testEnv.authenticatedContext(ODONTOLOGO).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, RUTA), ENTRADA);
    batch.delete(doc(db, `users/${CLINICA}/citas/c1`));
    await assertSucceeds(batch.commit());
  });

  it("si la copia no se puede guardar, el batch entero se rechaza y la cita sigue ahí", async () => {
    await sembrarCita();
    const db = testEnv.authenticatedContext(INACTIVO).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, RUTA), ENTRADA);
    batch.delete(doc(db, `users/${CLINICA}/citas/c1`));
    await assertFails(batch.commit());
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), `users/${CLINICA}/citas/c1`));
      if (!snap.exists()) throw new Error("La cita no debió borrarse");
    });
  });
});
