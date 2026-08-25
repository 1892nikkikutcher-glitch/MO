import { createHash } from "node:crypto";

/** sha256 en hex — SOLO se importa desde rutas de servidor (`route.ts`) y
 * pruebas (entorno Node de Vitest). Nunca desde un componente "use client":
 * `node:crypto` no debe entrar al bundle del navegador. El token crudo
 * nunca se persiste, solo este hash. */
export function hashToken(tokenCrudo: string): string {
  return createHash("sha256").update(tokenCrudo).digest("hex");
}
