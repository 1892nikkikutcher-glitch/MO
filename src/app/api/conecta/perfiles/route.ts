import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { crearPerfilSchema } from "@/lib/conectaSchemas";
import { crearPerfilProfesional } from "@/lib/conectaPerfiles";
import { ConectaError } from "@/lib/conectaServer";

/** Crea el perfil profesional (público + privado + admin vacío) de la
 * sesión actual — nunca el de otro uid, nunca escrito directo por el
 * cliente (ver §1/§3 del plan). */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = crearPerfilSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de perfil inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const perfil = await crearPerfilProfesional(sesion.uid, sesion.email, parsed.data);
    return NextResponse.json({ perfil });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
