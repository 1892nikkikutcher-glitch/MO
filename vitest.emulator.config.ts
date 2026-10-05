import { defineConfig } from "vitest/config";
import path from "path";

/** Config aparte para las pruebas que necesitan el emulador de Firebase
 * (reglas + integración de rutas de MO Conecta) — separadas de
 * `vitest.config.ts` (lógica pura, rápida, sin red) para que `npm run test`
 * nunca dependa de tener el emulador corriendo. Se ejecuta con:
 *   firebase emulators:exec --only auth,firestore,storage "npm run test:emulator"
 * (ver §8.B / §9 del plan de MO Conecta). */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: [
      "src/lib/__tests__/rules/**/*.test.ts",
      "src/lib/__tests__/integracion/**/*.test.ts",
    ],
    testTimeout: 20000,
    // Todos los archivos comparten UN emulador y un mismo projectId, y casi
    // todos hacen `clearFirestore()` entre pruebas: en paralelo, el
    // `clearFirestore` de un archivo borra los datos que otro acaba de
    // sembrar y aparecen fallas de "evaluation error" que no son de las
    // reglas. Archivos en serie (las pruebas dentro de cada archivo ya
    // corrían en serie).
    fileParallelism: false,
  },
});
