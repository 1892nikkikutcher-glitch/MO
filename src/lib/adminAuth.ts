import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "./firebaseAdmin";

export type SesionVerificada = { uid: string; email: string | null };

async function decodificarToken(req: NextRequest): Promise<SesionVerificada | null> {
  const header = req.headers.get("authorization");
  const idToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) return null;
  try {
    const decoded = await authAdmin.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

/** Verifica que la petición traiga una sesión válida de Firebase — no exige
 * que sea el administrador de la plataforma. Úsala en endpoints que
 * cualquier clínica puede llamar (ej. POST /api/sugerencias). */
export async function verificarSesion(req: NextRequest): Promise<SesionVerificada | NextResponse> {
  const sesion = await decodificarToken(req);
  if (!sesion) return NextResponse.json({ error: "Sesión inválida o ausente." }, { status: 401 });
  return sesion;
}

/** Verifica que la petición sea de la cuenta configurada como dueño de la
 * plataforma — compara el `uid` DECODIFICADO del token contra ADMIN_UID,
 * nunca algo que mande el cliente. Úsala en todos los endpoints
 * /api/admin/*, que exponen datos cross-clínica (ingresos, contactos de
 * otras clínicas, acciones de suspender/eliminar). */
export async function verificarAdmin(req: NextRequest): Promise<SesionVerificada | NextResponse> {
  const sesion = await decodificarToken(req);
  if (!sesion) return NextResponse.json({ error: "Sesión inválida o ausente." }, { status: 401 });
  const adminUid = process.env.ADMIN_UID;
  if (!adminUid || sesion.uid !== adminUid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  return sesion;
}
