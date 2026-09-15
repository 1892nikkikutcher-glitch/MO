/** Lógica pura del folio de paciente (arquitectura MO Conecta v3, §17) —
 * normalización, validación de formato, y el algoritmo de resolución de
 * versión de clave HMAC durante una rotación. Sin Firebase ni `crypto`
 * real aquí a propósito: la función de hash/lectura se inyecta, para que
 * el algoritmo de "probar la clave vigente, luego las autorizadas
 * anteriores en orden, detenerse en la primera coincidencia, nunca
 * probar una retirada" se pueda probar con Vitest sin tocar Firestore ni
 * un secreto real. `conectaFolioPaciente.ts` (Fase 2, todavía no escrito)
 * la envuelve con `crypto.createHmac` y `dbAdmin` de verdad. */

import type { Timestamp } from "firebase-admin/firestore";

/** Sin 0/O/1/I/L — ambiguos al leerlos en voz alta o escritos a mano,
 * mismo criterio ya usado en otros códigos legibles de este proyecto. */
const ALFABETO_FOLIO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LONGITUD_FOLIO = 10;

/** Doc en `codigosPaciente/{hashHMACDelFolioCrudo}` — nunca el folio
 * crudo en ningún campo (v3 §17). `hmacKeyVersion` es la versión con la
 * que SE CALCULÓ este hash — el servidor la usa para saber qué clave
 * reproducir en una verificación posterior, nunca para decidir con qué
 * clave buscar (eso lo resuelve `resolverFolioPorVersionDeClave`, antes
 * de haber encontrado el documento). */
export type CodigoPaciente = {
  pacienteGlobalId: string;
  expedienteId: string;
  estado: "activo" | "revocado" | "rotado";
  hmacKeyVersion: number;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  revokedAt?: Timestamp;
  rotatedFrom?: string;
  version: number;
};

/** Quita espacios/guiones sueltos y uniforma mayúsculas — nunca decide si
 * el folio existe, solo lo deja en la forma que el resto de las
 * funciones de este archivo esperan. */
export function normalizarFolio(crudo: string): string {
  return crudo.trim().toUpperCase().replace(/[\s-]+/g, "");
}

/** true si `folioNormalizado` tiene la forma "MO" + `LONGITUD_FOLIO`
 * caracteres del alfabeto seguro — nunca decide si existe, solo si vale
 * la pena intentar buscarlo. */
export function formatoFolioValido(folioNormalizado: string): boolean {
  const patron = new RegExp(`^MO[${ALFABETO_FOLIO}]{${LONGITUD_FOLIO}}$`);
  return patron.test(folioNormalizado);
}

export function generarFolioCrudo(): string {
  let cuerpo = "";
  for (let i = 0; i < LONGITUD_FOLIO; i++) {
    cuerpo += ALFABETO_FOLIO[Math.floor(Math.random() * ALFABETO_FOLIO.length)];
  }
  return `MO${cuerpo}`;
}

export type ResolucionFolio<T> = { encontrado: T; version: number };

/** Algoritmo de búsqueda de v3 §17: calcula el hash con la clave VIGENTE
 * primero; si no hay coincidencia, prueba únicamente las versiones
 * anteriores que sigan explícitamente autorizadas (nunca todas las que
 * alguna vez existieron), en orden de más reciente a más antigua,
 * deteniéndose en la primera coincidencia. `calcularHash`/`buscarPorHash`
 * son inyectados a propósito — aquí no hay `crypto` real ni Firestore,
 * solo el orden en que se prueban las versiones. */
export function resolverFolioPorVersionDeClave<T>(
  folioNormalizado: string,
  versionesAutorizadas: number[],
  calcularHash: (folio: string, version: number) => string,
  buscarPorHash: (hash: string) => T | null
): ResolucionFolio<T> | null {
  for (const version of versionesAutorizadas) {
    const hash = calcularHash(folioNormalizado, version);
    const encontrado = buscarPorHash(hash);
    if (encontrado) return { encontrado, version };
  }
  return null;
}
