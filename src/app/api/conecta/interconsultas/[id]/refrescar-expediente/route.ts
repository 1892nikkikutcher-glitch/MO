import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { refrescarExpedienteCompartido } from "@/lib/conectaCompartirExpediente";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

/** Pone al día el expediente compartido de un caso (cualquier participante puede pedirlo;
 * el servidor limita cada cuánto se revisa de verdad). */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  try {
    return NextResponse.json(await refrescarExpedienteCompartido(sesion.uid, id));
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
