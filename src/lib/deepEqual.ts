/** Comparación profunda de igualdad, insensible al ORDEN de las llaves de un
 * objeto — a diferencia de comparar `JSON.stringify(a) !== JSON.stringify(b)`
 * (patrón usado para detectar "cambios sin guardar" en varias pantallas),
 * que puede reportar una diferencia falsa cuando uno de los dos objetos viene
 * de un `snap.data()` de Firestore: Firestore no garantiza que el orden de
 * llaves del documento reconstruido coincida con el del objeto original que
 * se guardó, aunque el contenido sea idéntico. */
export function sonEquivalentes(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => sonEquivalentes(item, b[i]));
  }

  const registroA = a as Record<string, unknown>;
  const registroB = b as Record<string, unknown>;
  const clavesA = Object.keys(registroA);
  const clavesB = Object.keys(registroB);
  if (clavesA.length !== clavesB.length) return false;
  return clavesA.every(
    (clave) =>
      Object.prototype.hasOwnProperty.call(registroB, clave) &&
      sonEquivalentes(registroA[clave], registroB[clave])
  );
}
