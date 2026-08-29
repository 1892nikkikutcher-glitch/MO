import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "studio-6139822035-f2e85",
  appId: "1:760512381886:web:da6fdf96347e2a8042afef",
  apiKey: "AIzaSyAfvATOQ5SUGhYrmG6KdS3tC5VkFq7VaVU",
  authDomain: "studio-6139822035-f2e85.firebaseapp.com",
  messagingSenderId: "760512381886",
  storageBucket: "studio-6139822035-f2e85.firebasestorage.app",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/** Modo sin conexión: Firestore guarda en IndexedDB lo último que se leyó y
 * pone en cola los cambios hechos sin internet, sincronizándolos solos al
 * reconectar — así "ver los pendientes" y "hacer cambios que se guarden"
 * siguen funcionando aunque se vaya la luz o se acabe el internet a medio
 * consultorio o depósito. `persistentMultipleTabManager` es necesario
 * porque el usuario suele tener MO abierto en más de una pestaña a la vez
 * (solo una pestaña puede usar la caché persistente con el manejador de
 * pestaña única). Esto solo cubre datos ya cargados en ALGÚN momento previo
 * — si el navegador nunca llegó a cargar la página con conexión, no hay
 * nada que ofrecer sin conexión (eso requeriría un service worker
 * cacheando la aplicación misma, que es una mejora aparte, no incluida
 * aquí). `initializeFirestore` con caché persistente necesita `window`
 * (usa IndexedDB) — con `getFirestore` normal como respaldo si algo falla
 * (ej. modo privado de algunos navegadores, donde IndexedDB puede no estar
 * disponible) para que la app nunca truene por esto, solo pierda el modo
 * sin conexión en ese caso puntual. */
/** `ignoreUndefinedProperties: true` — el modelo de datos tiene muchos
 * campos opcionales (`campo?: string`) que en JS, cuando la expresión que
 * los llena da `undefined` (ej. `cita ? algo : undefined`), quedan como
 * propiedad presente con valor `undefined` en vez de simplemente ausente.
 * Firestore rechaza CUALQUIER `undefined` explícito en `setDoc`/`updateDoc`
 * con el error "Unsupported field value: undefined" — sin este flag, toda
 * nota de evolución registrada sin una cita asociada (o cualquier otro
 * documento con un campo opcional así) fallaba al guardar. Es la solución
 * oficial de Firestore para esto, en vez de perseguir a mano cada campo
 * opcional de cada tipo. */
function crearFirestore() {
  if (typeof window === "undefined") return initializeFirestore(app, { ignoreUndefinedProperties: true });
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch (err) {
    // Nunca se vuelve a llamar `initializeFirestore` aquí — si ya se
    // registró (aunque su configuración de caché haya fallado), una segunda
    // llamada a `initializeFirestore` para la misma app lanza "Firestore
    // has already been initialized", un error peor que el que se intenta
    // evitar. `getFirestore(app)` sí es seguro llamarlo de nuevo. El único
    // costo de este camino de respaldo (IndexedDB no disponible, ej. modo
    // privado) es perder también `ignoreUndefinedProperties` en ese caso
    // puntual — no perder Firestore por completo.
    console.error("No se pudo activar el modo sin conexión de Firestore — la app sigue funcionando, solo sin caché local.", err);
    return getFirestore(app);
  }
}

export const db = crearFirestore();
export const storage = getStorage(app);
