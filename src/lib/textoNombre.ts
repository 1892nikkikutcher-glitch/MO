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
  const antesDelCursor = input.value.slice(0, cursor);
  const nuevoValor = capitalizarNombre(input.value);
  setter(nuevoValor);
  const nuevoCursor = capitalizarNombre(antesDelCursor).length;
  requestAnimationFrame(() => {
    input.setSelectionRange(nuevoCursor, nuevoCursor);
  });
}
