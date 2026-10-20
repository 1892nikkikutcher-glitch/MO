/** Textos de la barra superior: quién administra la clínica, dónde está y la fecha de hoy. Lógica pura. */

/** Títulos que se sugieren al capturar el nombre (el campo es libre: se puede escribir cualquier otro). */
export const TITULOS_SUGERIDOS = ["C.D.", "C.D.E.O.", "C.D.E.E.", "C.D.E.P.", "C.D.E.R.", "C.D.E.C.M.", "Dr.", "Dra.", "Mtro.", "Mtra.", "Lic."] as const;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "martes 20 de octubre de 2026" */
export function fechaDeHoyLarga(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

/** "C.D. Nicolás Medina González"; si falta el título solo el nombre, y si falta el nombre, nada. */
export function tituloYNombre(titulo: string | undefined, nombre: string | undefined): string {
  const n = (nombre ?? "").replace(/\s+/g, " ").trim();
  if (!n) return "";
  const t = (titulo ?? "").replace(/\s+/g, " ").trim();
  return t ? `${t} ${n}` : n;
}

/** Cuántos milisegundos faltan para que cambie el día (para refrescar la fecha de la barra a medianoche). */
export function msHastaMedianoche(ahora: Date): number {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0, 0);
  return manana.getTime() - ahora.getTime();
}
