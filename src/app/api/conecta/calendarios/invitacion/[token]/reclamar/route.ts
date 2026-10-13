import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { reclamarInvitacionCalendario } from "@/lib/conectaCalendarios";
import { ConectaError } from "@/lib/conectaServer";

/** Exige sesión: la identidad se toma del token decodificado, nunca del cliente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { token } = await params;
  try {
    return NextResponse.json(await reclamarInvitacionCalendario(sesion.uid, sesion.email ?? undefined, sesion.emailVerificado, token));
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
