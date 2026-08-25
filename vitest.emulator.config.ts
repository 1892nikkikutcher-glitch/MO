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
  },
});
