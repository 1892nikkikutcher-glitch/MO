import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { afiliacionSolicitarSchema } from "@/lib/conectaSchemas";
import { solicitarAfiliacion } from "@/lib/conectaAfiliaciones";
import { ConectaError } from "@/lib/conectaServer";

export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = afiliacionSolicitarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  try {
    const afiliacion = await solicitarAfiliacion(sesion.uid, parsed.data.clinicaId);
    return NextResponse.json({ afiliacion });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
