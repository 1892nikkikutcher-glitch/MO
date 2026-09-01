import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/** Firebase Storage reintenta solo internamente hasta ~2 minutos antes de
 * rechazar una subida atorada — sin este límite propio, el botón se queda
 * en "Subiendo…" ese tiempo entero sin avisar nada (mismo patrón que
 * fotosPaciente.ts). */
function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return Promise.race([promesa, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensaje)), ms))]);
}

/** Sube la firma de acuse de recepción de una devolución a Storage — NUNCA
 * como base64 en Firestore (a diferencia del patrón que hoy usan Pago.firma
 * y PerfilDoctor.firmaDigitalUrl, que es deuda preexistente fuera de
 * alcance aquí). La firma representa ÚNICAMENTE que el dinero fue recibido,
 * nunca lenguaje de renuncia de derechos. */
export async function subirFirmaRecepcionDevolucion(
  clinicUid: string,
  patientId: string,
  devolucionId: string,
  blob: Blob
): Promise<{ path: string; url: string }> {
  const path = `users/${clinicUid}/pacientes/${patientId}/devoluciones/${devolucionId}/firmaRecepcion.png`;
  const storageRef = ref(storage, path);
  await conTimeout(
    uploadBytes(storageRef, blob, { contentType: "image/png" }),
    20000,
    "No se pudo guardar la firma (tardó demasiado). Verifica tu conexión."
  );
  const url = await getDownloadURL(storageRef);
  return { path, url };
}

/** FirmaCanvas entrega un dataURL PNG en memoria — esta función lo
 * convierte a Blob para poder subirlo. */
export async function dataUrlABlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
