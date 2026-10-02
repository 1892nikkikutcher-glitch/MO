/** Cuadrantes dentales — antes toda la lógica de dientes vivía inline en
 * Odontograma.tsx (filas "Superior/Inferior Permanente/Temporal", sin
 * ninguna noción de cuadrante) y HistoriaClinica.tsx mostraba los
 * diagnósticos guardados en una lista cronológica plana. Este módulo es la
 * base compartida y pura para agrupar ambas vistas por cuadrante, como en
 * la hoja clínica física del consultorio. */

export type Cuadrante = 1 | 2 | 3 | 4;

/** Orden de iteración 1, 2, 4, 3 a propósito: mapeado directo a una
 * cuadrícula 2×2 (fila de arriba 1|2, fila de abajo 4|3) sin reordenar
 * nada al renderizar. */
export const CUADRANTES: { numero: Cuadrante; permanentes: number[]; temporales: number[] }[] = [
  { numero: 1, permanentes: [18, 17, 16, 15, 14, 13, 12, 11], temporales: [55, 54, 53, 52, 51] },
  { numero: 2, permanentes: [21, 22, 23, 24, 25, 26, 27, 28], temporales: [61, 62, 63, 64, 65] },
  { numero: 4, permanentes: [48, 47, 46, 45, 44, 43, 42, 41], temporales: [85, 84, 83, 82, 81] },
  { numero: 3, permanentes: [31, 32, 33, 34, 35, 36, 37, 38], temporales: [71, 72, 73, 74, 75] },
];

const ORDEN_CANONICO: number[] = CUADRANTES.flatMap((c) => [...c.permanentes, ...c.temporales]);

/** `null` para cualquier número que no sea un diente FDI reconocido de
 * este esquema (permanente o temporal) — nunca lanza, nunca adivina. */
export function cuadranteDeDiente(tooth: number): Cuadrante | null {
  for (const c of CUADRANTES) {
    if (c.permanentes.includes(tooth) || c.temporales.includes(tooth)) return c.numero;
  }
  return null;
}

/** Cuadrante bajo el que se archiva una entrada con uno o varios dientes
 * (ej. un diagnóstico de Historia Clínica) — filtra primero los dientes
 * reconocidos y usa el menor valor numérico entre ellos, así que un solo
 * valor heredado/inválido en la mezcla nunca manda una entrada por lo
 * demás válida a "Sin cuadrante" (ej. cuadrantePrincipal([0, 36]) === 3).
 * `null` solo cuando NINGÚN diente de la entrada es reconocido (incluido
 * el arreglo vacío). */
export function cuadrantePrincipal(dientes: number[]): Cuadrante | null {
  const reconocidos = dientes.filter((d) => cuadranteDeDiente(d) !== null);
  if (reconocidos.length === 0) return null;
  return cuadranteDeDiente(Math.min(...reconocidos));
}

/** Orden canónico por cuadrante (según CUADRANTES) para los dientes
 * reconocidos; cualquier valor no reconocido se conserva al final,
 * ordenado numéricamente entre sí — nunca se descarta un diente. Nunca
 * muta `dientes`, siempre regresa un arreglo nuevo. */
export function ordenarDientes(dientes: number[]): number[] {
  const reconocidos: number[] = [];
  const noReconocidos: number[] = [];
  dientes.forEach((d) => (ORDEN_CANONICO.includes(d) ? reconocidos.push(d) : noReconocidos.push(d)));
  reconocidos.sort((a, b) => ORDEN_CANONICO.indexOf(a) - ORDEN_CANONICO.indexOf(b));
  noReconocidos.sort((a, b) => a - b);
  return [...reconocidos, ...noReconocidos];
}

/** "OD 16, 11" con ordenarDientes ya aplicado — reemplaza los
 * `[...dientes].sort((a,b)=>a-b)` planos que arman este texto en varios
 * lugares (mezclaban cuadrantes y denticiones sin ningún orden clínico). */
export function formatearDientes(dientes: number[]): string {
  return `OD ${ordenarDientes(dientes).join(", ")}`;
}

/** Las 5 superficies del símbolo de odontograma de diagnóstico (ver
 * OdontogramaSuperficies.tsx) — círculo central (oclusal/incisal) + anillo
 * de 4 cuadrantes. Usado SOLO ahí; los otros 4 usos de Odontograma.tsx
 * (laboratorios, presupuesto, nota de evolución) siguen siendo selección
 * de diente completo, sin superficie. */
export const SUPERFICIES_DENTALES = ["vestibular", "lingual", "mesial", "distal", "oclusal"] as const;
export type SuperficieDental = (typeof SUPERFICIES_DENTALES)[number];

/** true = anterior (incisivos/caninos, posición 1-3 dentro de su
 * cuadrante) — el centro del símbolo se rotula "Incisal". false =
 * posterior (premolares/molares, posición 4-8) — se rotula "Oclusal".
 * `null` si tooth no es un diente reconocido (ver cuadranteDeDiente) —
 * mismo criterio defensivo que el resto del módulo, nunca adivina sobre
 * un valor no reconocido. La posición (tooth % 10) usa el mismo rango
 * 1-8 tanto en permanentes como en temporales (1-5), así que no hace
 * falta distinguir dentición. */
export function esDienteAnterior(tooth: number): boolean | null {
  if (cuadranteDeDiente(tooth) === null) return null;
  const posicion = tooth % 10;
  return posicion >= 1 && posicion <= 3;
}

/** true si, para el cuadrante de este diente, "Mesial" (hacia la línea
 * media) queda del lado DERECHO del símbolo. Cuadrante 1 y 4 son las
 * cajas de la columna izquierda de la cuadrícula 2×2 — igual que la
 * simetría visual ya aplicada en Odontograma.tsx (se recargan hacia la
 * derecha para "encontrarse" con 2/3 en la línea media), su diente mesial
 * también queda del lado derecho del símbolo. Cuadrante 2 y 3 → mesial a
 * la izquierda. `null` si tooth no es un diente reconocido. */
export function ladoMesialDerecha(tooth: number): boolean | null {
  const cuadrante = cuadranteDeDiente(tooth);
  if (cuadrante === null) return null;
  return cuadrante === 1 || cuadrante === 4;
}
