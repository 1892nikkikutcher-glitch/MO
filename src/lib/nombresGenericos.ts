import type { MedicamentoCatalogo } from "./medicamentos";

/**
 * La Ley General de Salud (art. 226, último párrafo) y el Reglamento de Insumos (art. 31) piden que el médico recete en
 * DENOMINACIÓN GENÉRICA; la marca es opcional. Los nombres del catálogo venían con la marca primero
 * ("DALACIN C (Clindamicina) cápsulas 300mg"). Aquí se pasan a "CLINDAMICINA cápsulas 300mg (Dalacin C)".
 *
 * Solo toca las marcas que conocemos del catálogo precargado, así que un nombre que el consultorio escribió a su manera
 * no se altera. Es idempotente: un nombre que ya empieza por el genérico no cambia.
 */
const MARCAS = [
  "CLAVULIN 12H",
  "SUPRADOL SUBLINGUAL",
  "DOLO NEUROBION FORTE",
  "DALACIN C",
  "DAFLOXEN F",
  "LOSEC A-20",
  "PERIOXIDIN",
  "MACROZIT",
  "SUPRADOL",
  "CLAVULIN",
  "VELIAN",
  "ACTRON",
];

/** "DALACIN C" → "Dalacin C"; las palabras con dígitos ("A-20", "12H") se dejan igual. */
function marcaLegible(marca: string): string {
  return marca
    .toLowerCase()
    .split(" ")
    .map((p) => (/\d/.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REGEX_MARCA_CON_GENERICO = new RegExp(`^(${MARCAS.map(escapar).join("|")})\\s*\\(([^)]+)\\)\\s*(.*)$`, "i");
const REGEX_MOTRIN = /^MOTRIN\s+(IBUPROFENO)\s+(.*)$/i;

/** Nombre con la denominación genérica primero y la marca (si la hay) al final, entre paréntesis. */
export function nombreConGenericoPrimero(nombre: string): string {
  const texto = nombre.trim();

  const motrin = texto.match(REGEX_MOTRIN);
  if (motrin) return `${motrin[1].toUpperCase()} ${motrin[2].trim()} (Motrin)`;

  const m = texto.match(REGEX_MARCA_CON_GENERICO);
  if (!m) return nombre;
  const marca = m[1].toUpperCase();
  const generico = m[2].trim().toUpperCase();
  let resto = m[3].trim();
  // "SUPRADOL SUBLINGUAL (Ketorolaco) tabletas 30mg": la vía sublingual es parte de la presentación, no de la marca.
  if (marca.endsWith(" SUBLINGUAL")) resto = `sublingual ${resto}`.trim();
  return `${generico}${resto ? ` ${resto}` : ""} (${marcaLegible(marca)})`;
}

/** Aplica `nombreConGenericoPrimero` al catálogo guardado de un consultorio; devuelve cuántos renglones cambió. */
export function migrarNombresGenericos(catalogo: MedicamentoCatalogo[]): { catalogo: MedicamentoCatalogo[]; cambios: number } {
  let cambios = 0;
  const siguiente = catalogo.map((m) => {
    const nombre = nombreConGenericoPrimero(m.nombre);
    if (nombre === m.nombre) return m;
    cambios += 1;
    return { ...m, nombre };
  });
  return { catalogo: siguiente, cambios };
}
