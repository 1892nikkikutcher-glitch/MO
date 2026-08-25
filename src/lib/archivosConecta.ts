/** Archivos de una interconsulta — validación de firma real (no solo
 * MIME/extensión declarados), saneado de nombre para descarga, y límites.
 * Puro, sin Firebase — se usa tanto del lado servidor (antes de aceptar una
 * subida) como en Vitest. Ver §6 del plan: nunca se guarda una URL, la
 * descarga siempre pasa por un proxy autenticado. */

export const MIME_TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "application/pdf"] as const;
export type MimeTipoPermitido = (typeof MIME_TIPOS_PERMITIDOS)[number];

export const TAMANIO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024; // 10 MB
export const LIMITE_ARCHIVOS_POR_INTERCONSULTA = 20;
export const LIMITE_BYTES_TOTAL_POR_INTERCONSULTA = 100 * 1024 * 1024; // 100 MB

export function esMimeTypePermitido(mime: string): mime is MimeTipoPermitido {
  return (MIME_TIPOS_PERMITIDOS as readonly string[]).includes(mime);
}

/** Firma real (primeros bytes) por tipo — evita aceptar un archivo cuyo
 * contenido no corresponde al MIME/extensión que declaró el cliente. */
const FIRMAS: Record<MimeTipoPermitido, readonly number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // "%PDF"
};

function coincideFirma(bytes: Uint8Array, firma: readonly number[]): boolean {
  if (bytes.length < firma.length) return false;
  return firma.every((b, i) => bytes[i] === b);
}

/** true si los primeros bytes del archivo realmente corresponden al
 * `mimeTypeDeclarado` — rechaza, por ejemplo, un .exe renombrado a .pdf. */
export function validarFirmaArchivo(bytes: Uint8Array, mimeTypeDeclarado: string): boolean {
  if (!esMimeTypePermitido(mimeTypeDeclarado)) return false;
  const firmas = FIRMAS[mimeTypeDeclarado];
  return firmas.some((firma) => coincideFirma(bytes, firma));
}

/** Nombre para mostrar/descargar — nunca el nombre interno real del objeto
 * en Storage. Quita separadores de ruta, caracteres de control, y limita la
 * longitud; conserva la extensión si es reconocible. */
export function sanearNombreArchivo(nombreOriginal: string): string {
  const base = nombreOriginal
    .replace(/[/\\]/g, "_")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  const limpio = base.length > 0 ? base : "archivo";
  return limpio.length > 150 ? limpio.slice(0, 150) : limpio;
}

export function excedeLimitePorInterconsulta(
  archivosActuales: { tamanioBytes: number }[],
  nuevoTamanioBytes: number
): boolean {
  if (archivosActuales.length + 1 > LIMITE_ARCHIVOS_POR_INTERCONSULTA) return true;
  const totalActual = archivosActuales.reduce((sum, a) => sum + a.tamanioBytes, 0);
  return totalActual + nuevoTamanioBytes > LIMITE_BYTES_TOTAL_POR_INTERCONSULTA;
}
