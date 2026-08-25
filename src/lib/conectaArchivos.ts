/** Archivos de una interconsulta — subida en 2 fases y descarga por proxy
 * autenticado. Nunca se guarda ni se expone una URL: la descarga siempre
 * revisa participante en el momento exacto de la lectura (§6 del plan —
 * "revocación efectiva"). */

import { randomUUID } from "node:crypto";
import { dbAdmin, bucketAdmin } from "./firebaseAdmin";
import { ConectaError, nowISO, sinIndefinidos } from "./conectaServer";
import {
  excedeLimitePorInterconsulta,
  sanearNombreArchivo,
  validarFirmaArchivo,
  TAMANIO_MAXIMO_ARCHIVO_BYTES,
} from "./archivosConecta";
import type { ArchivoInterconsulta, CategoriaArchivoInterconsulta, Interconsulta } from "./moConecta";

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

async function obtenerInterconsultaComoParticipante(uid: string, interconsultaId: string): Promise<Interconsulta> {
  const snap = await dbAdmin.collection("interconsultas").doc(interconsultaId).get();
  if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
  const interconsulta = snap.data() as Interconsulta;
  if (!interconsulta.participantesAutorizados.includes(uid)) {
    throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
  }
  return interconsulta;
}

/** Fase 1 — decide la ruta de Storage; no escribe nada todavía. */
export async function iniciarSubidaArchivo(
  uid: string,
  interconsultaId: string,
  mimeType: string
): Promise<{ storagePath: string; archivoId: string }> {
  const interconsulta = await obtenerInterconsultaComoParticipante(uid, interconsultaId);
  if (excedeLimitePorInterconsulta(interconsulta.archivos, 0)) {
    throw new ConectaError(409, "Este caso ya alcanzó el límite de archivos adjuntos.");
  }
  const extension = EXTENSION_POR_MIME[mimeType];
  if (!extension) throw new ConectaError(400, "Tipo de archivo no permitido.");

  const archivoId = randomUUID();
  const storagePath = `interconsultas/${interconsultaId}/archivos/${archivoId}.${extension}`;
  return { storagePath, archivoId };
}

/** Fase 2 — recibe los bytes completos, valida firma real, y solo entonces
 * escribe a Storage (Admin SDK) y registra los metadatos en Firestore. */
export async function completarSubidaArchivo(
  uid: string,
  interconsultaId: string,
  input: {
    archivoId: string;
    storagePath: string;
    mimeType: string;
    contenidoBase64: string;
    nombreOriginal: string;
    categoriaClinica: CategoriaArchivoInterconsulta;
  }
): Promise<ArchivoInterconsulta> {
  const prefijoEsperado = `interconsultas/${interconsultaId}/archivos/`;
  if (!input.storagePath.startsWith(prefijoEsperado)) throw new ConectaError(400, "Ruta de archivo inválida.");

  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.contenidoBase64, "base64");
  } catch {
    throw new ConectaError(400, "Contenido de archivo inválido.");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > TAMANIO_MAXIMO_ARCHIVO_BYTES) {
    throw new ConectaError(400, "El archivo excede el tamaño máximo permitido (10 MB).");
  }
  if (!validarFirmaArchivo(bytes, input.mimeType)) {
    throw new ConectaError(400, "El contenido del archivo no corresponde al tipo declarado.");
  }

  const ref = dbAdmin.collection("interconsultas").doc(interconsultaId);
  const ahora = nowISO();

  const archivo = await dbAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ConectaError(404, "No existe esa interconsulta.");
    const interconsulta = snap.data() as Interconsulta;
    if (!interconsulta.participantesAutorizados.includes(uid)) {
      throw new ConectaError(403, "No tienes acceso a esa interconsulta.");
    }
    if (excedeLimitePorInterconsulta(interconsulta.archivos, bytes.byteLength)) {
      throw new ConectaError(409, "Este caso ya alcanzó el límite de archivos adjuntos.");
    }

    const nuevoArchivo: ArchivoInterconsulta = sinIndefinidos({
      id: input.archivoId,
      nombreOriginalSaneado: sanearNombreArchivo(input.nombreOriginal),
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      tamanioBytes: bytes.byteLength,
      categoriaClinica: input.categoriaClinica,
      subidoPorUid: uid,
      fecha: ahora,
    });

    tx.set(ref, { archivos: [...interconsulta.archivos, nuevoArchivo], actualizadoEl: ahora }, { merge: true });
    return nuevoArchivo;
  });

  // Se escribe a Storage DESPUÉS de que la transacción de Firestore confirmó
  // que hay cupo — si la subida a Storage fallara aquí, el metadato ya
  // escrito quedaría huérfano de su archivo real; se documenta como límite
  // aceptado de esta fase (ver "limpieza de archivos huérfanos" en el plan).
  await bucketAdmin.file(input.storagePath).save(bytes, { contentType: input.mimeType });

  await ref.collection("eventos").add({
    tipo: "archivo_subido",
    fecha: ahora,
    uid,
    archivoId: input.archivoId,
  });

  return archivo;
}

export type DescargaArchivo = {
  nombreOriginalSaneado: string;
  mimeType: string;
  storagePath: string;
};

/** Revisa participante EN ESTE MOMENTO (no cachea nada) — así una
 * revocación de acceso corta la siguiente descarga de inmediato. */
export async function autorizarDescargaArchivo(
  uid: string,
  interconsultaId: string,
  archivoId: string
): Promise<DescargaArchivo> {
  const interconsulta = await obtenerInterconsultaComoParticipante(uid, interconsultaId);
  const archivo = interconsulta.archivos.find((a) => a.id === archivoId);
  if (!archivo) throw new ConectaError(404, "No existe ese archivo en este caso.");

  await dbAdmin
    .collection("interconsultas")
    .doc(interconsultaId)
    .collection("eventos")
    .add({ tipo: "archivo_descargado", fecha: nowISO(), uid, archivoId });

  return {
    nombreOriginalSaneado: archivo.nombreOriginalSaneado,
    mimeType: archivo.mimeType,
    storagePath: archivo.storagePath,
  };
}
