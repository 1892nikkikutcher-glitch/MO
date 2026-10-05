import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/** SOLO DESARROLLO: con NEXT_PUBLIC_USAR_EMULADORES=1 (lo pone
 * `npm run dev:emulador`, ver scripts/dev-emulador.mjs) la app habla con los
 * emuladores LOCALES de Firebase (Auth 9099, Firestore 8080, Storage 9199,
 * levantados con `npm run emuladores`) en vez de con el proyecto real — así
 * se pueden crear cuentas y datos de prueba, y probar de punta a punta
 * flujos que borran o modifican datos, sin tocar jamás producción. Next
 * sustituye esta variable al compilar: en Vercel no existe, el bloque queda
 * como código muerto. */
const usarEmuladores = process.env.NEXT_PUBLIC_USAR_EMULADORES === "1";

const firebaseConfig = {
  projectId: "studio-6139822035-f2e85",
  appId: "1:760512381886:web:da6fdf96347e2a8042afef",
  apiKey: "AIzaSyAfvATOQ5SUGhYrmG6KdS3tC5VkFq7VaVU",
  authDomain: "studio-6139822035-f2e85.firebaseapp.com",
  messagingSenderId: "760512381886",
  storageBucket: "studio-6139822035-f2e85.firebasestorage.app",
};

// En modo emuladores se usa un proyecto "demo-": ni siquiera por error puede
// hablar con servicios reales de Firebase (el emulador y el cliente coinciden
// en este id, que también usa scripts/sembrar-emulador.mjs).
export const PROYECTO_EMULADORES = "demo-mo-local";
export const app = getApps().length
  ? getApp()
  : initializeApp(usarEmuladores ? { ...firebaseConfig, projectId: PROYECTO_EMULADORES, apiKey: "demo-local" } : firebaseConfig);
export const auth = getAuth(app);
if (usarEmuladores && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    console.info("[MO] Modo emuladores: Auth, Firestore y Storage apuntan a 127.0.0.1 (no a producción).");
  } catch {
    // Ya conectado (recarga en caliente del módulo) — nada que hacer.
  }
}

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
  if (usarEmuladores) {
    // Sin caché persistente: el IndexedDB del navegador sobreviviría a los
    // reinicios del emulador y mostraría datos de una sesión anterior.
    try {
      const emulado = initializeFirestore(app, { ignoreUndefinedProperties: true });
      connectFirestoreEmulator(emulado, "127.0.0.1", 8080);
      return emulado;
    } catch {
      return getFirestore(app); // ya inicializado y conectado (recarga en caliente)
    }
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch (err) {
    console.error("No se pudo activar el modo sin conexión de Firestore — se reintenta sin caché local.", err);
    // `ignoreUndefinedProperties` es la protección real contra "Unsupported
    // field value: undefined" al guardar — no debe perderse solo porque la
    // caché persistente (IndexedDB) falló. Se reintenta SIN esa caché pero
    // CON el flag. Si el primer intento no llegó a registrar nada (el caso
    // típico de este catch), este segundo intento es seguro.
    try {
      return initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch (err2) {
      // Si esto también falla, es casi seguro porque el primer intento SÍ
      // alcanzó a registrarse pese al error ("Firestore has already been
      // initialized") — en ese caso `getFirestore(app)` devuelve esa misma
      // instancia ya registrada, que de cualquier forma se intentó crear
      // con `ignoreUndefinedProperties: true` desde el primer intento.
      console.error("Tampoco se pudo inicializar Firestore sin caché — se usa la instancia por defecto.", err2);
      return getFirestore(app);
    }
  }
}

export const db = crearFirestore();
export const storage = getStorage(app);
if (usarEmuladores && typeof window !== "undefined") {
  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch {
    // Ya conectado (recarga en caliente del módulo).
  }
}
