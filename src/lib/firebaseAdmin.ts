import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** Firebase Admin para uso exclusivamente en servidor (API routes/webhooks)
 * — tiene acceso total a Firestore sin pasar por las reglas de seguridad.
 * Requiere la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY con el JSON
 * completo de la cuenta de servicio (como una sola línea). */
function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY");
  }
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export const dbAdmin = getFirestore(getAdminApp());
