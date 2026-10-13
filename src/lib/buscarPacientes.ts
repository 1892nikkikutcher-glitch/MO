/** Búsqueda de pacientes por nombre para el selector de interconsultas:
 * ignora acentos, mayúsculas y orden de las palabras, y entiende los "?" que
 * dejó la importación de pacientes (un "Pérez" quedó como "P?rez"): ahí el "?"
 * vale por cualquier letra, así buscar "perez" o "lopez" sí los encuentra. */

export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿`token` aparece dentro de `palabra`, tomando "?" de la palabra como comodín? */
function contieneConComodin(palabra: string, token: string): boolean {
  if (!token) return true;
  if (!palabra.includes("?")) return palabra.includes(token);
  for (let i = 0; i + token.length <= palabra.length; i++) {
    let ok = true;
    for (let j = 0; j < token.length; j++) {
      const c = palabra[i + j];
      if (c !== "?" && c !== token[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** Todas las palabras que se escribieron deben aparecer en el nombre (en cualquier orden). */
export function coincidePaciente(nombre: string, consulta: string): boolean {
  const tokens = normalizarBusqueda(consulta).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const palabras = normalizarBusqueda(nombre).split(" ").filter(Boolean);
  return tokens.every((t) => palabras.some((p) => contieneConComodin(p, t)));
}

/** Filtra y ordena: primero los que EMPIEZAN con lo escrito, luego el resto. */
export function buscarPacientes<T extends { name: string }>(pacientes: T[], consulta: string): T[] {
  const q = normalizarBusqueda(consulta);
  if (!q) return pacientes;
  const coinciden = pacientes.filter((p) => coincidePaciente(p.name, consulta));
  const empieza = (p: T) => normalizarBusqueda(p.name).startsWith(q);
  return [...coinciden.filter(empieza), ...coinciden.filter((p) => !empieza(p))];
}
