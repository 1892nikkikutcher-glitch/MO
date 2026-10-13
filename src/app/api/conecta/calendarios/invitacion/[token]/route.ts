import { NextRequest, NextResponse } from "next/server";
import { obtenerInvitacionCalendarioPublica } from "@/lib/conectaCalendarios";
import { ConectaError } from "@/lib/conectaServer";

/** Pública, sin sesión — solo datos genéricos (quién comparte y qué calendario). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    return NextResponse.json(await obtenerInvitacionCalendarioPublica(token));
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
