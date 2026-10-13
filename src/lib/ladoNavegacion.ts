/** De qué lado de la pantalla va la barra de navegación lateral (solo en computadora). Es una
 * preferencia de cada usuario, guardada en este navegador bajo su uid. Pura: la lectura/escritura
 * real del almacenamiento vive en useLadoNavegacion. */

export type LadoNavegacion = "izquierda" | "derecha";

export const LADO_NAVEGACION_INICIAL: LadoNavegacion = "derecha";

export const claveLadoNavegacion = (uid: string) => `mo:lado-navegacion:${uid}`;

/** Cualquier valor que no sea exactamente "izquierda" cae al lado de siempre (derecha). */
export function normalizarLadoNavegacion(valor: unknown): LadoNavegacion {
  return valor === "izquierda" ? "izquierda" : LADO_NAVEGACION_INICIAL;
}

export const ladoOpuesto = (lado: LadoNavegacion): LadoNavegacion => (lado === "izquierda" ? "derecha" : "izquierda");
