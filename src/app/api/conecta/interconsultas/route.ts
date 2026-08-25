import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { interconsultaCrearSchema } from "@/lib/conectaSchemas";
import { crearInterconsulta } from "@/lib/conectaInterconsultas";
import { ConectaError } from "@/lib/conectaServer";

export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = interconsultaCrearSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de interconsulta inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const interconsulta = await crearInterconsulta(sesion.uid, parsed.data);
    return NextResponse.json({ interconsulta });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
