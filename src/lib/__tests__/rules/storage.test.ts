/** Pruebas de reglas de Storage para MO Conecta (grupo A, §8) — mismo aviso
 * que firestore.test.ts: pendientes de ejecutar hasta tener un entorno sin
 * el bloqueo de Java/AF_UNIX de esta máquina. */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { crearEntornoDePrueba } from "./setup";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await crearEntornoDePrueba();
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearStorage();
});

const UID_REMITENTE = "uidRemitente";
const UID_AJENO = "uidAjeno";
const RUTA = "interconsultas/ic1/archivos/prueba.pdf";

describe("Storage — interconsultas/{id}/archivos/** — 100% servidor, cero acceso de cliente", () => {
  it("el cliente no puede subir un archivo directo, ni siquiera el remitente del caso", async () => {
    const remitente = testEnv.authenticatedContext(UID_REMITENTE).storage();
    await assertFails(uploadBytes(ref(remitente, RUTA), new Uint8Array([1, 2, 3])));
  });

  it("el cliente no puede leer/descargar un archivo directo, ni siquiera existiendo ya", async () => {
    // El objeto se sube saltándose las reglas, simulando que el servidor ya
    // lo puso ahí — la prueba es que el CLIENTE no puede leerlo de todos
    // modos (toda lectura real pasa por el proxy autenticado del servidor).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), RUTA), new Uint8Array([1, 2, 3]));
    });
    const ajeno = testEnv.authenticatedContext(UID_AJENO).storage();
    await assertFails(getBytes(ref(ajeno, RUTA)));

    const remitente = testEnv.authenticatedContext(UID_REMITENTE).storage();
    await assertFails(getBytes(ref(remitente, RUTA)));
  });

  it("un usuario no autenticado no puede acceder a nada", async () => {
    const anon = testEnv.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(anon, RUTA), new Uint8Array([1, 2, 3])));
  });
});
