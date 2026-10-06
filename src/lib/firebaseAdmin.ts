import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

/** Firebase Admin para uso exclusivamente en servidor (API routes/webhooks)
 * — tiene acceso total a Firestore sin pasar por las reglas de seguridad.
 * Requiere la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY con el JSON
 * completo de la cuenta de servicio (como una sola línea). */
function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  // Solo desarrollo local: con los emuladores activos (npm run dev:emulador) el
  // servidor habla con ellos, sin credenciales ni tocar producción.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: "demo-mo-local", storageBucket: "demo-mo-local.appspot.com" });
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY");
  }
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export const dbAdmin = getFirestore(getAdminApp());
export const authAdmin = getAuth(getAdminApp());
export const bucketAdmin = getStorage(getAdminApp()).bucket(
  process.env.FIREBASE_AUTH_EMULATOR_HOST ? "demo-mo-local.appspot.com" : "studio-6139822035-f2e85.firebasestorage.app"
);
