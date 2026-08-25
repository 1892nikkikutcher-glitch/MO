/** Setup compartido para las pruebas de reglas de MO Conecta — corre contra
 * el emulador de Firestore/Storage local (nunca contra producción). Se
 * ejecuta con:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator"
 * que ya deja las variables FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST /
 * FIREBASE_STORAGE_EMULATOR_HOST puestas — `initializeTestEnvironment` las
 * respeta si no se le pasa host/port explícitos, pero aquí se apuntan
 * directo a los puertos de `firebase.json` para poder correr también
 * apuntando el emulador a mano en otra terminal durante desarrollo. */

import { readFileSync } from "fs";
import path from "path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-mo-conecta-rules-test"; // "demo-" — el emulador nunca exige credenciales reales para este prefijo

export async function crearEntornoDePrueba(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync(path.resolve(__dirname, "../../../../storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
}
