/** Reglas del rol "Colaborador" (role 'colaborador' en clinicMembers): captura, edita y sube archivos (fotografías,
 * radiografías), pero NO elimina nada — si se equivoca, avisa al administrador. Corren contra el emulador, nunca contra
 * producción:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator" */

import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { crearEntornoDePrueba } from "./setup";

let testEnv: RulesTestEnvironment;

const CLINICA = "clinicaDueno";
const ADMIN = "uidAdmin";
const COLABORADOR = "uidColaborador";
const DENTISTA = "uidCirujanoDentista";
const AJENO = "uidDeOtraClinica";

beforeAll(async () => {
  testEnv = await crearEntornoDePrueba();
});
afterAll(async () => {
  await testEnv.cleanup();
});
afterEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

const base = `users/${CLINICA}`;
const paciente = `${base}/pacientes/p1`;
const REGISTROS = [
  ["paciente", paciente],
  ["presupuesto", `${paciente}/presupuestos/b1`],
  ["nota de evolución", `${paciente}/notasEvolucion/n1`],
  ["receta", `${paciente}/recetas/r1`],
  ["historia clínica", `${paciente}/historiaClinica/respuestas`],
  ["fotografías (registro)", `${paciente}/fotos/datos`],
  ["laboratorio", `${paciente}/laboratorios/l1`],
  ["membresía del paciente", `${paciente}/membresias/m1`],
  ["cita", `${base}/citas/c1`],
  ["médico o unidad de la agenda", `${base}/recursos/r1`],
  ["depósito dental", `${base}/depositosDentales/d1`],
] as const;

const RUTA_FOTO = `users/${CLINICA}/pacientes/p1/fotos/radiografias/foto1.jpg`;
const BYTES = new Uint8Array([1, 2, 3, 4]);

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics", CLINICA), { ownerId: CLINICA, nombre: "Clínica de prueba" });
    for (const [uid, role] of [[ADMIN, "admin"], [COLABORADOR, "colaborador"], [DENTISTA, "odontologo"]] as const) {
      await setDoc(doc(db, `clinicMembers/${CLINICA}_${uid}`), { clinicId: CLINICA, uid, role, status: "active" });
    }
    for (const [, ruta] of REGISTROS) {
      await setDoc(doc(db, ruta), ruta.endsWith("/c1") ? { medicoId: "m1", fecha: "2026-10-20" } : { id: "x", nombre: "dato" });
    }
    await setDoc(doc(db, `${paciente}/pagos/pg1`), { total: 500 });
    await setDoc(doc(db, `${base}/config/finanzas`), { porFecha: {} });
    await uploadBytes(ref(ctx.storage(), RUTA_FOTO), BYTES);
  });
});

const dbDe = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const storageDe = (uid: string) => testEnv.authenticatedContext(uid).storage();

describe("Colaborador — datos", () => {
  it.each(REGISTROS)("puede leer y editar: %s", async (_nombre, ruta) => {
    const db = dbDe(COLABORADOR);
    await assertSucceeds(getDoc(doc(db, ruta)));
    await assertSucceeds(updateDoc(doc(db, ruta), { editadoPor: "colaborador" }));
  });

  it("puede crear un paciente, una cita y una nota nuevos", async () => {
    const db = dbDe(COLABORADOR);
    await assertSucceeds(setDoc(doc(db, `${base}/pacientes/pNuevo`), { id: "pNuevo", name: "Nuevo" }));
    await assertSucceeds(setDoc(doc(db, `${base}/citas/cNueva`), { medicoId: "m1", fecha: "2026-10-21" }));
    await assertSucceeds(setDoc(doc(db, `${paciente}/notasEvolucion/nNueva`), { id: "nNueva" }));
  });

  it.each(REGISTROS)("NO puede eliminar: %s", async (_nombre, ruta) => {
    await assertFails(deleteDoc(doc(dbDe(COLABORADOR), ruta)));
  });

  it("no ve pagos ni finanzas", async () => {
    const db = dbDe(COLABORADOR);
    await assertFails(getDoc(doc(db, `${paciente}/pagos/pg1`)));
    await assertFails(setDoc(doc(db, `${base}/config/finanzas`), { porFecha: { x: 1 } }));
  });

  it("el administrador sí elimina", async () => {
    await assertSucceeds(deleteDoc(doc(dbDe(ADMIN), `${paciente}/presupuestos/b1`)));
    await assertSucceeds(deleteDoc(doc(dbDe(ADMIN), `${base}/citas/c1`)));
  });
});

describe("Fotografías y archivos del expediente (Storage)", () => {
  it("el colaborador puede ver una foto y subir una nueva", async () => {
    const s = storageDe(COLABORADOR);
    await assertSucceeds(getBytes(ref(s, RUTA_FOTO)));
    await assertSucceeds(uploadBytes(ref(s, `users/${CLINICA}/pacientes/p1/fotos/extraorales/nueva.jpg`), BYTES));
  });

  it("el colaborador NO puede borrar una foto que ya existe", async () => {
    await assertFails(deleteObject(ref(storageDe(COLABORADOR), RUTA_FOTO)));
  });

  // Pisar un archivo existente es un "update" en Cloud Storage (solo administrador). El emulador no distingue ese caso del "create",
  // así que no se puede comprobar aquí; en producción lo aplica Storage.

  it("el Cirujano dentista también ve y sube, pero no borra", async () => {
    const s = storageDe(DENTISTA);
    await assertSucceeds(getBytes(ref(s, RUTA_FOTO)));
    await assertSucceeds(uploadBytes(ref(s, `users/${CLINICA}/pacientes/p1/fotos/intraorales/otra.jpg`), BYTES));
    await assertFails(deleteObject(ref(s, RUTA_FOTO)));
  });

  it("el administrador y el dueño sí pueden borrar", async () => {
    await assertSucceeds(deleteObject(ref(storageDe(ADMIN), RUTA_FOTO)));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), RUTA_FOTO), BYTES);
    });
    await assertSucceeds(deleteObject(ref(storageDe(CLINICA), RUTA_FOTO)));
  });

  it("alguien de otra clínica, o sin sesión, no ve ni sube nada", async () => {
    const ajeno = storageDe(AJENO);
    await assertFails(getBytes(ref(ajeno, RUTA_FOTO)));
    await assertFails(uploadBytes(ref(ajeno, `users/${CLINICA}/pacientes/p1/fotos/extraorales/intruso.jpg`), BYTES));
    const anonimo = testEnv.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(anonimo, RUTA_FOTO)));
  });

  it("un colaborador que ya no está activo pierde el acceso", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `clinicMembers/${CLINICA}_${COLABORADOR}`), { clinicId: CLINICA, uid: COLABORADOR, role: "colaborador", status: "suspended" });
    });
    await assertFails(getBytes(ref(storageDe(COLABORADOR), RUTA_FOTO)));
  });
});
