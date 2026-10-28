/** Fotografías de documentos del paciente (estudios de laboratorio, recetas de otro médico, referencias, consentimientos
 * firmados...). Cada una lleva un tipo y una nota breve, igual que las radiografías. Lógica pura, sin Firestore ni
 * pantalla. */

import { limpiarNotaRadiografia } from "./radiografias";

export const TIPOS_DOCUMENTO = [
  "Estudio de laboratorio",
  "Receta o indicaciones",
  "Referencia o interconsulta",
  "Consentimiento firmado",
  "Resumen médico",
  "Otro",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

type ConDetalles = { tipo?: string; nota?: string };

export function esTipoDocumento(valor: unknown): valor is TipoDocumento {
  return typeof valor === "string" && (TIPOS_DOCUMENTO as readonly string[]).includes(valor);
}

/** Lo que se guarda junto a la foto: solo las llaves que traen algo (Firestore no acepta `undefined`). */
export function detallesDocumentoParaGuardar(detalles: ConDetalles): ConDetalles {
  const resultado: ConDetalles = {};
  if (esTipoDocumento(detalles.tipo)) resultado.tipo = detalles.tipo;
  const nota = limpiarNotaRadiografia(detalles.nota);
  if (nota) resultado.nota = nota;
  return resultado;
}

/** La foto con sus detalles nuevos: reemplaza el tipo y la nota anteriores (si se vacían, se quitan). */
export function conDetallesDocumento<T extends ConDetalles>(foto: T, detalles: ConDetalles): Omit<T, "tipo" | "nota"> & ConDetalles {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tipo: _tipo, nota: _nota, ...resto } = foto;
  return { ...resto, ...detallesDocumentoParaGuardar(detalles) };
}

/** "Estudio de laboratorio" o, si no se dijo el tipo, "Documento". */
export function etiquetaDocumento(foto: ConDetalles): string {
  return esTipoDocumento(foto.tipo) ? foto.tipo : "Documento";
}

/** "Estudio de laboratorio — biometría hemática" (o solo una de las dos partes); `undefined` si no hay nada que decir. */
export function descripcionDeDocumento(foto: ConDetalles): string | undefined {
  const partes = [esTipoDocumento(foto.tipo) ? foto.tipo : "", limpiarNotaRadiografia(foto.nota)].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : undefined;
}

/** Nombre del archivo con el que le llega el documento al colega: "Documento Estudio de laboratorio (2026-10-20).jpg".
 * Sin tipo queda "Documento (2026-10-20).jpg". */
export function nombreCompartidoDeDocumento(foto: ConDetalles & { fecha: string }): string {
  const fecha = (foto.fecha ?? "").slice(0, 10);
  return `Documento${esTipoDocumento(foto.tipo) ? ` ${foto.tipo}` : ""}${fecha ? ` (${fecha})` : ""}.jpg`;
}
