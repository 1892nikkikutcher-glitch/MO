import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authAdmin, dbAdmin } from "@/lib/firebaseAdmin";
import { verificarAdmin } from "@/lib/adminAuth";
import { contrasenaDescartable, errorDeCambioAdmin, normalizarCorreo } from "@/lib/cambioCorreo";
import { enviarCorreoDeRestablecimiento, sincronizarCopiasDeCorreo } from "@/lib/cuentaCorreo";

type Params = { params: Promise<{ uid: string }> };

/** Soporte: cambiar el correo con el que entra una cuenta cuando su dueño ya
 * no puede hacerlo él mismo (perdió el acceso al correo viejo).
 *
 * Es la herramienta más delicada de la plataforma: quien cambia el correo de
 * una cuenta puede quedarse con el expediente de un consultorio. Por eso:
 *  - solo el administrador de la plataforma (`verificarAdmin`);
 *  - hay que teclear el correo ACTUAL para confirmar que es la cuenta correcta;
 *  - hay que dejar por escrito cómo se verificó la identidad;
 *  - la contraseña anterior se vuelve inútil y se cierran las sesiones abiertas;
 *  - la persona elige su contraseña nueva con un enlace que llega AL CORREO
 *    NUEVO — así, si el administrador se equivoca al teclearlo, nadie ajeno
 *    puede entrar sin que además tenga acceso a ese buzón;
 *  - todo queda en `bitacoraAdmin` (colección cerrada a clientes: sin regla). */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarAdmin(req);
  if (sesion instanceof NextResponse) return sesion;
  const { uid } = await params;

  const body = await req.json().catch(() => ({}));
  const correoNuevo = normalizarCorreo(String(body.correoNuevo ?? ""));
  const verificacion = String(body.verificacion ?? "").trim();
  const confirmacion = String(body.confirmacionCorreoActual ?? "");

  let usuario;
  try {
    usuario = await authAdmin.getUser(uid);
  } catch {
    return NextResponse.json({ error: "No existe esa cuenta." }, { status: 404 });
  }
  const correoAnterior = normalizarCorreo(usuario.email ?? "");

  const errorDeForma = errorDeCambioAdmin({
    correoActual: correoAnterior,
    correoNuevo,
    confirmacionCorreoActual: confirmacion,
    verificacion,
  });
  if (errorDeForma) return NextResponse.json({ error: errorDeForma }, { status: 400 });

  // El correo nuevo no puede ser de otra cuenta.
  try {
    const otra = await authAdmin.getUserByEmail(correoNuevo);
    if (otra.uid !== uid) {
      return NextResponse.json({ error: "Ese correo ya pertenece a otra cuenta de MO." }, { status: 409 });
    }
  } catch (err: unknown) {
    const codigo = (err as { code?: string })?.code;
    if (codigo !== "auth/user-not-found") {
      return NextResponse.json({ error: "No se pudo comprobar si el correo ya existe." }, { status: 500 });
    }
  }

  const invalidarContrasena = body.invalidarContrasena !== false;

  await authAdmin.updateUser(uid, {
    email: correoNuevo,
    emailVerified: false,
    ...(invalidarContrasena ? { password: contrasenaDescartable() } : {}),
  });
  await authAdmin.revokeRefreshTokens(uid);

  const copias = await sincronizarCopiasDeCorreo(uid, correoNuevo);
  const correoEnviado = await enviarCorreoDeRestablecimiento(correoNuevo);

  await dbAdmin.collection("bitacoraAdmin").add({
    accion: "cambiar-correo",
    fecha: FieldValue.serverTimestamp(),
    adminUid: sesion.uid,
    uidAfectado: uid,
    correoAnterior,
    correoNuevo,
    verificacion,
    contrasenaInvalidada: invalidarContrasena,
    correoDeRestablecimientoEnviado: correoEnviado,
    ...copias,
  });

  return NextResponse.json({ ok: true, correoEnviado, ...copias });
}
