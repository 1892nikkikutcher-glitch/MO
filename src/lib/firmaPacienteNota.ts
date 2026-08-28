/** Sube la firma manuscrita del paciente/representante (capturada en un
 * <canvas>, ver FirmaPacienteCanvas.tsx) a Storage — mismo patrón que
 * fotosPaciente.ts: nunca un base64 dentro del documento de Firestore, solo
 * la ruta/URL. Storage rules gatea esta ruta igual que `fotos/**`. */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import type { FirmaPaciente, TipoFirmante } from "./notasEvolucion";

/** Mismo límite que fotosPaciente.ts — Storage reintenta internamente hasta
 * ~2 minutos antes de rechazar una subida atorada; sin este límite propio,
 * el botón se queda en "Guardando…" ese tiempo entero sin avisar nada. */
function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensaje)), ms)),
  ]);
}

export async function subirFirmaPacienteNota(
  clinicUid: string,
  patientId: string,
  notaId: string,
  blob: Blob,
  datos: { tipoFirmante: TipoFirmante; nombreFirmante: string; relacionConPaciente?: string }
): Promise<FirmaPaciente> {
  const path = `users/${clinicUid}/pacientes/${patientId}/notasEvolucion/${notaId}/firmaPaciente.png`;
  const storageRef = ref(storage, path);
  await conTimeout(
    uploadBytes(storageRef, blob, { contentType: "image/png" }),
    20000,
    "No se pudo guardar la firma (tardó demasiado). Verifica tu conexión."
  );
  const url = await getDownloadURL(storageRef);
  return {
    tipoFirmante: datos.tipoFirmante,
    nombreFirmante: datos.nombreFirmante,
    relacionConPaciente: datos.relacionConPaciente,
    firmaStoragePath: path,
    firmaUrl: url,
  };
}
