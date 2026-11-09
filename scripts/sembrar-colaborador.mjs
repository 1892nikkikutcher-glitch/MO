// Agrega a los emuladores locales un COLABORADOR de la clínica de prueba, para ver la plataforma como la ve
// él (nunca producción: igual que sembrar-emulador.mjs, solo se conecta a los emuladores). Datos inventados.
//
//   node scripts/sembrar-emulador.mjs      (antes, para que exista la clínica de prueba)
//   node scripts/sembrar-colaborador.mjs
//   -> entrar en http://localhost:3004 con la cuenta de abajo

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ projectId: "demo-mo-local" });

export const CORREO_COLABORADOR = "enrique@mo.test";
export const CLAVE_COLABORADOR = "prueba-local-1234";
const ROL = process.argv[2] === "odontologo" ? "odontologo" : "colaborador";

const auth = getAuth();
const db = getFirestore();

const dueno = await auth.getUserByEmail("odontologa@mo.test");
let usuario;
try {
  usuario = await auth.getUserByEmail(CORREO_COLABORADOR);
} catch {
  usuario = await auth.createUser({ email: CORREO_COLABORADOR, password: CLAVE_COLABORADOR, emailVerified: true });
}

await db.doc(`clinicMembers/${dueno.uid}_${usuario.uid}`).set({
  clinicId: dueno.uid,
  uid: usuario.uid,
  nombre: "Dr. Enrique",
  correo: CORREO_COLABORADOR,
  role: ROL,
  status: "active",
});

// Como en la app real, todo colaborador queda también como médico de la Agenda.
await db.doc(`users/${dueno.uid}/recursos/ruid_${usuario.uid}`).set({
  id: `ruid_${usuario.uid}`,
  nombre: "Dr. Enrique",
  color: "#22C55E",
  tipo: "medico",
  bloques: [{ id: "b-enrique", sedeId: "jc", dias: [1, 3, 5], inicio: "09:00", fin: "14:00" }],
});

console.log(`Colaborador listo (${ROL}): ${CORREO_COLABORADOR}`);
