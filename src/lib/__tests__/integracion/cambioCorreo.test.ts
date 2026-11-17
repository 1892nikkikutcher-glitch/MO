/** Cambio de correo de una cuenta (contra los emuladores de Auth y Firestore): la ruta de soporte
 * cambia el correo en Auth sin cambiar el uid, deja inútil la contraseña anterior, mantiene al
 * día las copias del correo y no pisa un correo de contacto escrito a mano. Nunca toca producción. */

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
});

vi.mock("../../firebaseAdmin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local" });
  return { dbAdmin: getFirestore(app), authAdmin: getAuth(app) };
});

// La sesión de administrador no es lo que se prueba aquí (eso es `verificarAdmin`).
vi.mock("../../adminAuth", () => ({
  verificarAdmin: async () => ({ uid: "admin-plataforma", email: null, emailVerificado: true }),
}));

import { NextRequest } from "next/server";
import { authAdmin, dbAdmin } from "../../firebaseAdmin";
import { sincronizarCopiasDeCorreo } from "../../cuentaCorreo";
import { POST } from "../../../app/api/admin/cuentas/[uid]/correo/route";

const SUFIJO = Date.now();
const VIEJO = `vieja-${SUFIJO}@correo.mx`;
const NUEVO = `nueva-${SUFIJO}@correo.mx`;
const OCUPADO = `ocupado-${SUFIJO}@correo.mx`;
const CLINICA = `clinica-correo-${SUFIJO}`;
const VERIFICACION = "Videollamada: mostró su cédula y confirmó el teléfono del consultorio.";

let uid = "";

function peticion(cuerpo: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/cuentas/x/correo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}
const llamar = (cuerpo: Record<string, unknown>, quien = uid) =>
  POST(peticion(cuerpo), { params: Promise.resolve({ uid: quien }) });

const solicitudBuena = () => ({
  correoNuevo: NUEVO,
  confirmacionCorreoActual: VIEJO,
  verificacion: VERIFICACION,
});

beforeAll(async () => {
  const usuario = await authAdmin.createUser({ email: VIEJO, password: "contrasena-vieja-123", emailVerified: true });
  uid = usuario.uid;
  await authAdmin.createUser({ email: OCUPADO, password: "otra-contrasena-123" });

  await dbAdmin.collection("clinics").doc(CLINICA).set({ ownerId: uid, nombre: "Clínica de prueba", correoContacto: VIEJO });
  await dbAdmin
    .collection("clinicMembers")
    .doc(`${CLINICA}_${uid}`)
    .set({ clinicId: CLINICA, uid, nombre: "Dra. Prueba", correo: VIEJO, role: "admin", status: "active" });
});

describe("cambio de correo por soporte", () => {
  it("rechaza si no se escribe el correo actual para confirmar la cuenta", async () => {
    const res = await llamar({ ...solicitudBuena(), confirmacionCorreoActual: "otra@correo.mx" });
    expect(res.status).toBe(400);
    expect((await authAdmin.getUser(uid)).email).toBe(VIEJO);
  });

  it("rechaza si no se deja escrito cómo se verificó la identidad", async () => {
    const res = await llamar({ ...solicitudBuena(), verificacion: "ok" });
    expect(res.status).toBe(400);
    expect((await authAdmin.getUser(uid)).email).toBe(VIEJO);
  });

  it("rechaza un correo que ya es de otra cuenta", async () => {
    const res = await llamar({ ...solicitudBuena(), correoNuevo: OCUPADO });
    expect(res.status).toBe(409);
    expect((await authAdmin.getUser(uid)).email).toBe(VIEJO);
  });

  it("responde 404 si la cuenta no existe", async () => {
    const res = await llamar(solicitudBuena(), "uid-que-no-existe");
    expect(res.status).toBe(404);
  });

  it("cambia el correo conservando el uid, avisa y deja bitácora", async () => {
    const res = await llamar(solicitudBuena());
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.ok).toBe(true);
    expect(cuerpo.correoEnviado).toBe(true);

    const usuario = await authAdmin.getUser(uid);
    expect(usuario.uid).toBe(uid);
    expect(usuario.email).toBe(NUEVO);
    expect(usuario.emailVerified).toBe(false);

    const miembro = await dbAdmin.collection("clinicMembers").doc(`${CLINICA}_${uid}`).get();
    expect(miembro.get("correo")).toBe(NUEVO);
    const clinica = await dbAdmin.collection("clinics").doc(CLINICA).get();
    expect(clinica.get("correoContacto")).toBe(NUEVO);

    const bitacora = await dbAdmin.collection("bitacoraAdmin").where("uidAfectado", "==", uid).get();
    expect(bitacora.size).toBe(1);
    const entrada = bitacora.docs[0].data();
    expect(entrada).toMatchObject({
      accion: "cambiar-correo",
      adminUid: "admin-plataforma",
      correoAnterior: VIEJO,
      correoNuevo: NUEVO,
      verificacion: VERIFICACION,
      contrasenaInvalidada: true,
    });
  });
});

describe("sincronizarCopiasDeCorreo", () => {
  it("es idempotente: la segunda vez no cambia nada", async () => {
    const r = await sincronizarCopiasDeCorreo(uid, NUEVO);
    expect(r).toEqual({ membresiasActualizadas: 0, clinicasActualizadas: 0 });
  });

  it("no pisa un correo de contacto escrito a mano", async () => {
    const otraClinica = `${CLINICA}-b`;
    await dbAdmin.collection("clinics").doc(otraClinica).set({ ownerId: uid, nombre: "B", correoContacto: "recepcion@clinica.mx" });
    await dbAdmin
      .collection("clinicMembers")
      .doc(`${otraClinica}_${uid}`)
      .set({ clinicId: otraClinica, uid, nombre: "Dra. Prueba", correo: "anterior@correo.mx", role: "admin", status: "active" });

    const r = await sincronizarCopiasDeCorreo(uid, NUEVO);
    expect(r.membresiasActualizadas).toBe(1);
    expect(r.clinicasActualizadas).toBe(0);
    const clinica = await dbAdmin.collection("clinics").doc(otraClinica).get();
    expect(clinica.get("correoContacto")).toBe("recepcion@clinica.mx");
  });
});
