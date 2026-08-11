// Carga masiva de pacientes directo a Firestore usando Firebase Admin.
// No requiere iniciar sesión en la app ni tocar tu contraseña.
//
// Uso:
//   node scripts/importar-pacientes-admin.mjs tu-correo@ejemplo.com
//
// Requiere:
//   1. Haber creado tu cuenta real en https://mo-ten-lime.vercel.app (Registrarse)
//   2. Tener serviceAccountKey.json en la raíz del proyecto (ver instrucciones)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = join(__dirname, "..");

const correo = process.argv[2];
if (!correo) {
  console.error("Uso: node scripts/importar-pacientes-admin.mjs tu-correo@ejemplo.com");
  process.exit(1);
}

const serviceAccountPath = join(raiz, "serviceAccountKey.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch {
  console.error(
    `No encontré ${serviceAccountPath}.\n` +
      "Descárgalo desde Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada, " +
      "y guárdalo exactamente en esa ruta con ese nombre."
  );
  process.exit(1);
}

const pacientesPath = join(raiz, "pacientes_importar.json");
let pacientes;
try {
  pacientes = JSON.parse(readFileSync(pacientesPath, "utf8"));
} catch {
  console.error(`No encontré ${pacientesPath}. Coloca ahí tu archivo de pacientes limpio.`);
  process.exit(1);
}
if (!Array.isArray(pacientes) || pacientes.length === 0) {
  console.error("El archivo de pacientes está vacío o no es una lista.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

async function main() {
  let uid;
  try {
    const user = await auth.getUserByEmail(correo);
    uid = user.uid;
  } catch {
    console.error(
      `No existe ninguna cuenta con el correo ${correo}.\n` +
        "Primero regístrate en https://mo-ten-lime.vercel.app con ese correo (botón 'Registrarse')."
    );
    process.exit(1);
  }

  console.log(`Cuenta encontrada: ${correo} (uid: ${uid})`);
  console.log(`Importando ${pacientes.length} pacientes a users/${uid}/pacientes ...`);

  const coleccion = db.collection("users").doc(uid).collection("pacientes");
  const TAMANO_LOTE = 450;
  let hechos = 0;

  for (let i = 0; i < pacientes.length; i += TAMANO_LOTE) {
    const lote = pacientes.slice(i, i + TAMANO_LOTE);
    const batch = db.batch();
    lote.forEach((p, idx) => {
      const id = `imp${Date.now()}${i + idx}`;
      batch.set(coleccion.doc(id), {
        name: p.name ?? "",
        phone: p.phone ?? "",
        birthDate: p.birthDate ?? "",
        email: p.email ?? "",
        notas: p.notas ?? "",
      });
    });
    await batch.commit();
    hechos += lote.length;
    console.log(`  ${hechos}/${pacientes.length}`);
  }

  console.log("Listo. Los pacientes ya están en tu cuenta real.");
}

main().catch((err) => {
  console.error("Error durante la importación:", err);
  process.exit(1);
});
