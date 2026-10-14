/** Reglas del rol "Cirujano dentista" (role 'odontologo' en clinicMembers): atiende y edita, pero no
 * elimina registros ni ve finanzas. Corren contra el emulador, nunca contra producción:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator" */

import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { crearEntornoDePrueba } from "./setup";

let testEnv: RulesTestEnvironment;

const CLINICA = "clinicaDueno";
const ADMIN = "uidAdmin";
const DENTISTA = "uidCirujanoDentista";
const COLABORADOR = "uidColaborador";

beforeAll(async () => {
  testEnv = await crearEntornoDePrueba();
});
afterAll(async () => {
  await testEnv.cleanup();
});
afterEach(async () => {
  await testEnv.clearFirestore();
});

const base = `users/${CLINICA}`;
const paciente = `${base}/pacientes/p1`;
// Una ruta por cada tipo de dato que el cirujano dentista usa en el día a día.
const REGISTROS = [
  ["paciente", paciente],
  ["presupuesto", `${paciente}/presupuestos/b1`],
  ["nota de evolución", `${paciente}/notasEvolucion/n1`],
  ["receta", `${paciente}/recetas/r1`],
  ["diagnóstico", `${paciente}/diagnosticos/d1`],
  ["plan de tratamiento", `${paciente}/planTratamiento/pl1`],
  ["historia clínica", `${paciente}/historiaClinica/respuestas`],
  ["laboratorio", `${paciente}/laboratorios/l1`],
  ["cita", `${base}/citas/c1`],
] as const;

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics", CLINICA), { ownerId: CLINICA, nombre: "Clínica de prueba" });
    for (const [uid, role] of [[ADMIN, "admin"], [DENTISTA, "odontologo"], [COLABORADOR, "colaborador"]] as const) {
      await setDoc(doc(db, `clinicMembers/${CLINICA}_${uid}`), { clinicId: CLINICA, uid, role, status: "active" });
    }
    for (const [, ruta] of REGISTROS) {
      await setDoc(doc(db, ruta), ruta.endsWith("/c1") ? { medicoId: "m1", fecha: "2026-10-20" } : { id: "x", nombre: "dato" });
    }
    await setDoc(doc(db, `${paciente}/pagos/pg1`), { total: 500 });
    await setDoc(doc(db, `${base}/config/finanzas`), { porFecha: {} });
  });
});

const como = (uid: string) => testEnv.authenticatedContext(uid).firestore();

describe("Cirujano dentista (odontologo)", () => {
  it.each(REGISTROS)("puede leer y editar: %s", async (_nombre, ruta) => {
    const db = como(DENTISTA);
    await assertSucceeds(getDoc(doc(db, ruta)));
    await assertSucceeds(updateDoc(doc(db, ruta), { editadoPor: "dentista" }));
  });

  it("puede crear un paciente, una cita y una nota nuevos", async () => {
    const db = como(DENTISTA);
    await assertSucceeds(setDoc(doc(db, `${base}/pacientes/pNuevo`), { id: "pNuevo", name: "Nuevo" }));
    await assertSucceeds(setDoc(doc(db, `${base}/citas/cNueva`), { medicoId: "m1", fecha: "2026-10-21" }));
    await assertSucceeds(setDoc(doc(db, `${paciente}/notasEvolucion/nNueva`), { id: "nNueva" }));
  });

  it.each(REGISTROS)("NO puede eliminar: %s", async (_nombre, ruta) => {
    await assertFails(deleteDoc(doc(como(DENTISTA), ruta)));
  });

  it("no ve pagos ni finanzas, ni puede cambiar la configuración", async () => {
    const db = como(DENTISTA);
    await assertFails(getDoc(doc(db, `${paciente}/pagos/pg1`)));
    await assertFails(setDoc(doc(db, `${paciente}/pagos/pg2`), { total: 1 }));
    await assertFails(setDoc(doc(db, `${base}/config/finanzas`), { porFecha: { x: 1 } }));
  });

  it("puede guardar la copia en la Papelera pero no leerla ni borrarla", async () => {
    const db = como(DENTISTA);
    await assertSucceeds(setDoc(doc(db, `${base}/papelera/e1`), { tipo: "citas" }));
    await assertFails(getDoc(doc(db, `${base}/papelera/e1`)));
    await assertFails(deleteDoc(doc(db, `${base}/papelera/e1`)));
  });

  it("no puede darse a sí mismo otro rol", async () => {
    await assertFails(updateDoc(doc(como(DENTISTA), `clinicMembers/${CLINICA}_${DENTISTA}`), { role: "admin" }));
  });
});

describe("el resto de los roles no cambia", () => {
  it("el colaborador de siempre sigue pudiendo eliminar lo operativo", async () => {
    const db = como(COLABORADOR);
    await assertSucceeds(deleteDoc(doc(db, `${paciente}/presupuestos/b1`)));
    await assertSucceeds(deleteDoc(doc(db, `${base}/citas/c1`)));
  });

  it("el administrador puede eliminar y ve los pagos", async () => {
    const db = como(ADMIN);
    await assertSucceeds(getDoc(doc(db, `${paciente}/pagos/pg1`)));
    await assertSucceeds(deleteDoc(doc(db, `${paciente}/notasEvolucion/n1`)));
    await assertSucceeds(deleteDoc(doc(db, paciente)));
  });
});
