/** Subida de archivos de una interconsulta (contra el emulador): la ruta de Storage la decide el
 * servidor, solo suben participantes, no se pisa un archivo ya subido y solo entran imágenes/PDF
 * cuyo contenido real coincide con su tipo. Nunca toca producción. */

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getStorage } = await import("firebase-admin/storage");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local", storageBucket: "demo-mo-local.appspot.com" });
  return { dbAdmin: getFirestore(app), bucketAdmin: getStorage(app).bucket() };
});

import { dbAdmin, bucketAdmin } from "../../firebaseAdmin";
import { completarSubidaArchivo, iniciarSubidaArchivo } from "../../conectaArchivos";

const CASO = "caso-archivos-prueba";
// Único por corrida: el límite de subidas se guarda en el emulador y duraría entre corridas.
const PARTICIPANTE = `uid-participante-archivos-${Date.now()}`;
const AJENO = "uid-ajeno-archivos";
const JPEG_BASE64 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(512, 3)]).toString("base64");

const datos = (archivoId: string, storagePath: string) => ({
  archivoId,
  storagePath,
  mimeType: "image/jpeg",
  contenidoBase64: JPEG_BASE64,
  nombreOriginal: "radiografia.jpg",
  categoriaClinica: "radiografia" as const,
});

beforeAll(async () => {
  await dbAdmin.collection("interconsultas").doc(CASO).set({
    id: CASO,
    participantesAutorizados: [PARTICIPANTE],
    archivos: [],
  });
});

describe("archivos de una interconsulta", () => {
  it("sube un archivo con la ruta que decidió el servidor", async () => {
    const { storagePath, archivoId } = await iniciarSubidaArchivo(PARTICIPANTE, CASO, "image/jpeg");
    const archivo = await completarSubidaArchivo(PARTICIPANTE, CASO, datos(archivoId, storagePath));
    expect(archivo.storagePath).toBe(storagePath);
    const [existe] = await bucketAdmin.file(storagePath).exists();
    expect(existe).toBe(true);
  });

  it("rechaza una ruta distinta a la que le tocaba, aunque cuelgue del mismo caso", async () => {
    const { storagePath, archivoId } = await iniciarSubidaArchivo(PARTICIPANTE, CASO, "image/jpeg");
    const otraRuta = storagePath.replace(archivoId, "otro-archivo");
    await expect(completarSubidaArchivo(PARTICIPANTE, CASO, datos(archivoId, otraRuta))).rejects.toMatchObject({ status: 400 });
    await expect(
      completarSubidaArchivo(PARTICIPANTE, CASO, datos(archivoId, `interconsultas/${CASO}/archivos/../../x/${archivoId}.jpg`))
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rechaza un id que no es de los que genera el servidor", async () => {
    const ruta = `interconsultas/${CASO}/archivos/id-inventado.jpg`;
    await expect(completarSubidaArchivo(PARTICIPANTE, CASO, datos("id-inventado", ruta))).rejects.toMatchObject({ status: 400 });
  });

  it("no deja volver a subir sobre un archivo que ya existe en el caso", async () => {
    const { storagePath, archivoId } = await iniciarSubidaArchivo(PARTICIPANTE, CASO, "image/jpeg");
    await completarSubidaArchivo(PARTICIPANTE, CASO, datos(archivoId, storagePath));
    await expect(completarSubidaArchivo(PARTICIPANTE, CASO, datos(archivoId, storagePath))).rejects.toMatchObject({ status: 409 });
  });

  it("rechaza un contenido que no corresponde al tipo declarado", async () => {
    const { storagePath, archivoId } = await iniciarSubidaArchivo(PARTICIPANTE, CASO, "image/jpeg");
    const texto = Buffer.from("<html><script>alert(1)</script></html>").toString("base64");
    await expect(
      completarSubidaArchivo(PARTICIPANTE, CASO, { ...datos(archivoId, storagePath), contenidoBase64: texto })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("alguien que no participa en el caso no puede subir", async () => {
    await expect(iniciarSubidaArchivo(AJENO, CASO, "image/jpeg")).rejects.toMatchObject({ status: 403 });
    const { storagePath, archivoId } = await iniciarSubidaArchivo(PARTICIPANTE, CASO, "image/jpeg");
    await expect(completarSubidaArchivo(AJENO, CASO, datos(archivoId, storagePath))).rejects.toMatchObject({ status: 403 });
  });

  it("no acepta tipos que no sean imagen o PDF", async () => {
    await expect(iniciarSubidaArchivo(PARTICIPANTE, CASO, "text/html")).rejects.toMatchObject({ status: 400 });
  });
});
