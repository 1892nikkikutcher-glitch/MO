/** Lógica pura para fusionar dos expedientes de paciente duplicados — ver el
 * plan "Fusionar Expedientes de pacientes duplicados". Nunca toca Firestore
 * ni el DOM, así que es fácil de probar sin navegador.
 *
 * Principio: la fusión nunca debe requerir que el usuario decida sobre CADA
 * campo — solo cuando de verdad hay un choque (ambos expedientes tienen un
 * valor y son distintos). Si solo uno tiene dato, se usa ese automáticamente;
 * si ambos tienen el mismo valor, tampoco hay nada que decidir. */

export type ConflictoCampo<T> = { clave: string; valorSobreviviente: T; valorPerdedor: T };
export type ResultadoFusionCampos<T> = { fusionado: Record<string, T>; conflictos: ConflictoCampo<T>[] };

function estaVacio(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === "") return true;
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

function sonIguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Fusiona dos "diccionarios de campos" (los campos de un `Patient`, las
 * respuestas de historia clínica por pregunta, o los campos únicos de
 * `FotosPaciente` — cualquier `Record<string, valor>`). Por cada clave
 * presente en cualquiera de los dos:
 * - si ambos están vacíos, se omite (no hay nada que fusionar);
 * - si solo uno tiene valor, se usa ese, sin reportarlo como conflicto;
 * - si ambos tienen el mismo valor, se usa ese, sin conflicto;
 * - si ambos tienen valores distintos y no vacíos, es un conflicto real:
 *   `fusionado` toma el valor del sobreviviente como default (nunca oculto —
 *   el llamador siempre ve la lista de `conflictos` y puede sobreescribirlo
 *   con `aplicarResolucionesConflicto`). */
export function fusionarCamposPorClave<T>(
  sobreviviente: Record<string, T | undefined>,
  perdedor: Record<string, T | undefined>
): ResultadoFusionCampos<T> {
  const claves = new Set([...Object.keys(sobreviviente), ...Object.keys(perdedor)]);
  const fusionado: Record<string, T> = {};
  const conflictos: ConflictoCampo<T>[] = [];

  for (const clave of claves) {
    const valorA = sobreviviente[clave];
    const valorB = perdedor[clave];
    const vacioA = estaVacio(valorA);
    const vacioB = estaVacio(valorB);

    if (vacioA && vacioB) continue;
    if (vacioA) {
      fusionado[clave] = valorB as T;
      continue;
    }
    if (vacioB) {
      fusionado[clave] = valorA as T;
      continue;
    }
    if (sonIguales(valorA, valorB)) {
      fusionado[clave] = valorA as T;
      continue;
    }
    conflictos.push({ clave, valorSobreviviente: valorA as T, valorPerdedor: valorB as T });
    fusionado[clave] = valorA as T;
  }

  return { fusionado, conflictos };
}

/** Aplica las decisiones que el usuario tomó para los conflictos reales —
 * el resto de `fusionado` (lo que ya se resolvió solo) queda intacto. */
export function aplicarResolucionesConflicto<T>(
  fusionado: Record<string, T>,
  resoluciones: Record<string, T>
): Record<string, T> {
  return { ...fusionado, ...resoluciones };
}

/** Une dos listas de alergias en vez de competir por una — nunca se debe
 * poder "perder" una alergia real por resolver un conflicto a favor del
 * otro expediente, ya que esto alimenta la alerta de seguridad antes de
 * recetar. Deduplica por texto exacto (normalizado a minúsculas/espacios)
 * para no repetir la misma sustancia dos veces si ambos la registraron
 * igual. */
export function fusionarAlergias(alergiasSobreviviente: string | undefined, alergiasPerdedor: string | undefined): string {
  const partes = [alergiasSobreviviente, alergiasPerdedor]
    .flatMap((texto) => (texto ?? "").split(","))
    .map((p) => p.trim())
    .filter(Boolean);
  const vistas = new Set<string>();
  const unicas: string[] = [];
  for (const parte of partes) {
    const clave = parte.toLowerCase();
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    unicas.push(parte);
  }
  return unicas.join(", ");
}
