// Crea en los EMULADORES un colega ficticio con perfil de MO Conecta, para probar
// interconsultas sin tocar producción. Requiere `npm run emuladores` y
// `npm run dev:emulador` (puerto con PORT=3004 si usas ese).
//
//   PORT=3004 node scripts/sembrar-colega-conecta.mjs
//
// Entra como el colega con colega.prueba@mo.test / prueba-local-1234.

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
initializeApp({ projectId: "demo-mo-local" });

const CORREO = "colega.prueba@mo.test";
const CLAVE = "prueba-local-1234";
const app = `http://localhost:${process.env.PORT ?? "3000"}`;
const auth = getAuth();

let usuario;
try {
  usuario = await auth.getUserByEmail(CORREO);
} catch {
  usuario = await auth.createUser({ email: CORREO, password: CLAVE, emailVerified: true });
}

const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: CORREO, password: CLAVE, returnSecureToken: true }),
});
const { idToken } = await r.json();

const res = await fetch(`${app}/api/conecta/perfiles`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
  body: JSON.stringify({
    nombreCompleto: "Dra. Mariana Solís Ortega",
    universidad: "UNAM",
    municipio: "Toluca",
    estado: "Estado de México",
    areasPractica: ["Endodoncia", "Ortodoncia"],
    descripcion: "Perfil de prueba. Endodoncia y ortodoncia; recibe interconsultas de pacientes referidos.",
    modalidadAtencion: ["Consultorio", "Clínica dental"],
    horariosGenerales: "Lun a Vie 9:00 a 18:00",
    tiposCasosRecibe: ["Endodoncia", "Ortodoncia", "Urgencias dentales"],
    tiempoRespuestaHabitual: "dentro de 24 horas",
    cedulaProfesional: "12345678",
    telefonoProfesional: "7221234567",
    aceptaInterconsultas: true,
    aceptaUrgencias: true,
    activoEnDirectorio: true,
  }),
});
console.log(res.status, JSON.stringify(await res.json()).slice(0, 400));
console.log(`Colega: ${CORREO} / ${CLAVE} (uid ${usuario.uid})`);
