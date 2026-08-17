import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import type { FotoPaciente } from "./patientData";

/** Reescala una imagen a un lado máximo razonable (por default pensado
 * para que una identificación oficial o una foto clínica se sigan
 * pudiendo leer con detalle, a diferencia de los 240px usados para logos
 * pequeños en imagenLogo.ts) y la comprime a JPEG — evita subir fotos de
 * cámara de celular de 4000px+ tal cual, sin sacrificar legibilidad. */
function reescalarImagen(file: File, maxLado = 1600, calidad = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))),
        "image/jpeg",
        calidad
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

/** Firebase Storage reintenta solo internamente hasta ~2 minutos antes de
 * rechazar una subida atorada (ej. bucket sin crear, sin conexión) — sin
 * este límite propio, el botón se queda en "Subiendo…" ese tiempo entero
 * sin avisar nada. */
function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensaje)), ms)),
  ]);
}

/** Sube una foto de paciente a Storage (reescalada) y devuelve el registro
 * listo para guardar en Firestore. `carpeta` agrupa por tipo (ej. "perfil",
 * "extraorales", "intraorales", "ine") dentro del árbol del paciente. */
export async function subirFotoPaciente(
  clinicUid: string,
  patientId: string,
  carpeta: string,
  file: File,
  opciones?: { maxLado?: number; calidad?: number }
): Promise<FotoPaciente> {
  const blob = await reescalarImagen(file, opciones?.maxLado, opciones?.calidad);
  const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `users/${clinicUid}/pacientes/${patientId}/fotos/${carpeta}/${nombreArchivo}`;
  const storageRef = ref(storage, path);
  await conTimeout(
    uploadBytes(storageRef, blob, { contentType: "image/jpeg" }),
    20000,
    "No se pudo subir la foto (tardó demasiado). Verifica tu conexión — si el problema sigue, es posible que Firebase Storage todavía no esté activado en la cuenta."
  );
  const url = await getDownloadURL(storageRef);
  return {
    id: nombreArchivo,
    url,
    path,
    name: file.name,
    fecha: new Date().toISOString(),
  };
}

/** Borra el archivo del Storage — si ya no existe (ej. doble clic) no
 * truena, para que la limpieza del registro en Firestore siga adelante. */
export async function borrarFotoPaciente(foto: FotoPaciente): Promise<void> {
  try {
    await deleteObject(ref(storage, foto.path));
  } catch (err) {
    console.error(`No se pudo borrar ${foto.path} de Storage`, err);
  }
}
