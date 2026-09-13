/** Máquina de estados legal de una nota de evolución dentro de MO Conecta.
 * Hoy `notasEvolucion.ts` (por clínica) solo valida completitud de campos
 * al guardar, nunca si la TRANSICIÓN de estado es válida — esta es esa
 * validación, pura y testeable sin emulador (mismo criterio que
 * `puedeTransicionar` en moConecta.ts): quien la llama resuelve
 * autoría/permisos reales (uid, rol, participación) y le pasa el
 * resultado ya como booleano, esta función no conoce Firestore. */

export type NotaEvolucionEstado = "borrador" | "lista_revision" | "firmada";

/** "firmada" es terminal e inmutable — un registro legal firmado nunca
 * vuelve a borrador ni se re-firma; corregir su contenido exige una nota
 * nueva que la referencie, nunca editar la ya firmada (mismo principio
 * que un asiento contable, no un documento de texto suelto). */
const ESTADOS_TERMINALES_NOTA: NotaEvolucionEstado[] = ["firmada"];

/** true si `actual` → `siguiente` es una transición legal válida.
 * `quienTransiciona.esAutor`: solo el autor de la nota mueve su propio
 * borrador a revisión, o lo regresa a borrador para seguir editando.
 * `quienTransiciona.puedeFirmar`: firmar exige el rol/permiso que el
 * llamador determine (responsable del episodio, del expediente, etc.) —
 * no basta con ser el autor; un autor sin ese permiso no puede autofirmar
 * su propia nota. */
export function puedeTransicionarNota(
  actual: NotaEvolucionEstado,
  siguiente: NotaEvolucionEstado,
  quienTransiciona: { esAutor: boolean; puedeFirmar: boolean }
): boolean {
  if (actual === siguiente) return false;
  if (ESTADOS_TERMINALES_NOTA.includes(actual)) return false;

  if (actual === "borrador" && siguiente === "lista_revision") return quienTransiciona.esAutor;
  if (actual === "lista_revision" && siguiente === "borrador") return quienTransiciona.esAutor;
  if (actual === "lista_revision" && siguiente === "firmada") return quienTransiciona.puedeFirmar;
  return false;
}
