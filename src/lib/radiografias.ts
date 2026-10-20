/** Tipo y nota de las radiografías del expediente. Lógica pura, sin Firestore ni pantalla. */

export const TIPOS_RADIOGRAFIA = [
  "Periapical",
  "Panorámica",
  "Aleta de mordida",
  "Oclusal",
  "Cefalométrica",
  "Tomografía (CBCT)",
  "Otra",
] as const;
export type TipoRadiografia = (typeof TIPOS_RADIOGRAFIA)[number];

export const NOTA_RADIOGRAFIA_MAX = 300;

type ConDetalles = { tipo?: string; nota?: string };

export function esTipoRadiografia(valor: unknown): valor is TipoRadiografia {
  return typeof valor === "string" && (TIPOS_RADIOGRAFIA as readonly string[]).includes(valor);
}

/** Nota lista para guardar: sin saltos de control raros, espacios sobrantes ni más de 300 caracteres. */
export function limpiarNotaRadiografia(texto: string | undefined | null): string {
  return (texto ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, NOTA_RADIOGRAFIA_MAX);
}

/** Lo que se guarda junto a la foto: solo las llaves que traen algo (Firestore no acepta `undefined`). */
export function detallesParaGuardar(detalles: { tipo?: string; nota?: string }): ConDetalles {
  const resultado: ConDetalles = {};
  if (esTipoRadiografia(detalles.tipo)) resultado.tipo = detalles.tipo;
  const nota = limpiarNotaRadiografia(detalles.nota);
  if (nota) resultado.nota = nota;
  return resultado;
}

/** La foto con sus detalles nuevos: reemplaza el tipo y la nota anteriores (si se vacían, se quitan). */
export function conDetallesRadiografia<T extends ConDetalles>(foto: T, detalles: { tipo?: string; nota?: string }): Omit<T, "tipo" | "nota"> & ConDetalles {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tipo: _tipo, nota: _nota, ...resto } = foto;
  return { ...resto, ...detallesParaGuardar(detalles) };
}

/** "Periapical" o, si no se dijo el tipo, "Radiografía". */
export function etiquetaRadiografia(foto: ConDetalles): string {
  return esTipoRadiografia(foto.tipo) ? foto.tipo : "Radiografía";
}

/** "Periapical — dolor en el 46" (o solo una de las dos partes); `undefined` si no hay nada que decir. */
export function descripcionDeRadiografia(foto: ConDetalles): string | undefined {
  const partes = [esTipoRadiografia(foto.tipo) ? foto.tipo : "", limpiarNotaRadiografia(foto.nota)].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : undefined;
}

/** Nombre del archivo con el que le llega la radiografía al colega: "Radiografía Panorámica (2026-10-20).jpg".
 * Sin tipo se queda con el nombre que ya tenía. */
export function nombreCompartidoDeRadiografia(foto: ConDetalles & { name: string; fecha: string }): string {
  if (!esTipoRadiografia(foto.tipo)) return foto.name || "radiografia.jpg";
  return `Radiografía ${foto.tipo} (${(foto.fecha ?? "").slice(0, 10)}).jpg`;
}
