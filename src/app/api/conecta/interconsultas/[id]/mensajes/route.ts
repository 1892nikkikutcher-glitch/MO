import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { mensajeCrearSchema } from "@/lib/conectaSchemas";
import { crearMensaje } from "@/lib/conectaMensajes";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = mensajeCrearSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido." }, { status: 400 });

  try {
    const mensaje = await crearMensaje(sesion.uid, id, parsed.data.contenido);
    return NextResponse.json({ mensaje });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
