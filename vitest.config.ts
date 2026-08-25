import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    // Las pruebas de reglas/integración de MO Conecta necesitan el emulador
    // de Firebase corriendo — se excluyen de `npm run test` (rápido, sin
    // red) y se corren aparte con `npm run test:emulator`. Ver
    // vitest.emulator.config.ts.
    exclude: [
      ...configDefaults.exclude,
      "src/lib/__tests__/rules/**",
      "src/lib/__tests__/integracion/**",
    ],
  },
});
