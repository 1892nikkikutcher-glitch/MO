import { dbAdmin } from "./firebaseAdmin";
import { normalizarCorreo } from "./cambioCorreo";

/**
 * El correo de entrada vive en Firebase Auth, pero MO guarda dos copias de
 * adorno que hay que mantener al día cuando cambia:
 *
 *  - `clinicMembers.correo`: lo que ve el equipo de la clínica y el panel de
 *    administrador en la lista de usuarios.
 *  - `clinics.correoContacto`: el correo de contacto de la clínica — pero solo
 *    se toca si era IGUAL al correo viejo del dueño. Si alguien escribió a mano
 *    otro correo de contacto (el de recepción, por ejemplo) se respeta.
 *
 * Lo que NO se toca, a propósito:
 *  - El expediente (`users/{uid}/**`) y las membresías: van por `uid`.
 *  - `clinicInvites`: son invitaciones dirigidas A un correo; no son de la cuenta.
 *
 * Es idempotente: correrla dos veces con el mismo correo no hace nada la segunda.
 */
export async function sincronizarCopiasDeCorreo(
  uid: string,
  correoNuevo: string
): Promise<{ membresiasActualizadas: number; clinicasActualizadas: number }> {
  const nuevo = normalizarCorreo(correoNuevo);
  const membresias = await dbAdmin.collection("clinicMembers").where("uid", "==", uid).get();

  // Correos viejos que figuraban para esta persona, para reconocer su correo de contacto.
  const viejos = new Set<string>();
  const batch = dbAdmin.batch();
  let membresiasActualizadas = 0;
  for (const doc of membresias.docs) {
    const actual = normalizarCorreo(String(doc.get("correo") ?? ""));
    if (actual && actual !== nuevo) viejos.add(actual);
    if (actual !== nuevo) {
      batch.update(doc.ref, { correo: nuevo });
      membresiasActualizadas++;
    }
  }

  let clinicasActualizadas = 0;
  const clinicas = await dbAdmin.collection("clinics").where("ownerId", "==", uid).get();
  for (const doc of clinicas.docs) {
    const contacto = normalizarCorreo(String(doc.get("correoContacto") ?? ""));
    if (contacto && contacto !== nuevo && viejos.has(contacto)) {
      batch.update(doc.ref, { correoContacto: nuevo });
      clinicasActualizadas++;
    }
  }

  if (membresiasActualizadas + clinicasActualizadas > 0) await batch.commit();
  return { membresiasActualizadas, clinicasActualizadas };
}

/**
 * Manda el correo estándar de Firebase para elegir contraseña, a nombre del
 * servidor. El Admin SDK solo sabe GENERAR el enlace, no enviarlo, así que se
 * usa el mismo servicio que usa el botón "¿Olvidé mi contraseña?" del navegador.
 * La llave web de Firebase es pública (ya viaja en cada página).
 */
export async function enviarCorreoDeRestablecimiento(correo: string): Promise<boolean> {
  const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  // Misma llave pública que `firebaseConfig.apiKey` en firebase.ts (ese archivo
  // arranca el SDK del navegador y no se puede importar desde el servidor).
  // El emulador acepta cualquiera.
  const apiKey = emulador ? "demo-local" : "AIzaSyAfvATOQ5SUGhYrmG6KdS3tC5VkFq7VaVU";
  const base = emulador
    ? `http://${emulador}/identitytoolkit.googleapis.com/v1`
    : "https://identitytoolkit.googleapis.com/v1";
  try {
    const res = await fetch(`${base}/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email: normalizarCorreo(correo) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
