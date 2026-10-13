import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { compartirExpedienteSchema } from "@/lib/conectaSchemas";
import { configurarCompartirExpediente } from "@/lib/conectaCompartirExpediente";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

/** Activa o desactiva compartir el expediente del paciente con el colega de este caso. */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = compartirExpedienteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  try {
    await configurarCompartirExpediente(sesion.uid, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
