/** Capitaliza nombres propios mientras se escriben: cada palabra inicia con
 * mayúscula, salvo conectores comunes en apellidos en español ("de la Cruz",
 * "Pérez y González") que se mantienen en minúscula salvo al inicio. */

const CONECTORES = new Set(["de", "del", "la", "las", "los", "y"]);

export function capitalizarNombre(texto: string): string {
  return texto
    .split(" ")
    .map((palabra, i) => {
      if (!palabra) return palabra;
      const minusc = palabra.toLowerCase();
      if (i > 0 && CONECTORES.has(minusc)) return minusc;
      return minusc.charAt(0).toUpperCase() + minusc.slice(1);
    })
    .join(" ");
}

/** onChange listo para usar en un <input> de nombre: capitaliza en vivo y
 * conserva la posición del cursor para que no "salte" mientras se escribe. */
export function manejarCambioNombre(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (valor: string) => void
) {
  const input = e.target;
  const cursor = input.selectionStart ?? input.value.length;
  const nuevoValor = capitalizarNombre(input.value);
  // Aplicamos el valor y la posición del cursor directamente en el DOM,
  // de forma síncrona, antes de que React vuelva a renderizar. Así, cuando
  // React reconcilie con el mismo valor que ya está en el input, el
  // navegador no reinicia el cursor al final — evita el "salto" de cursor
  // sin depender de requestAnimationFrame, que con tecleo rápido podía
  // ejecutarse fuera de orden entre pulsaciones y duplicar/mezclar letras.
  input.value = nuevoValor;
  input.setSelectionRange(cursor, cursor);
  setter(nuevoValor);
}

/** Convierte texto a un nombre de archivo seguro (sin acentos ni símbolos),
 * para nombres de PDF descargados como "Receta_Juan_Perez_12_08_2026.pdf". */
export function slugify(texto: string): string {
  return Array.from(texto.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < 0x300 || codigo > 0x36f; // fuera del rango de marcas diacríticas combinantes
    })
    .join("")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
