import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verificarSesion } from "@/lib/adminAuth";
import { compartirCalendario, listarCalendarios } from "@/lib/conectaCalendarios";
import { ConectaError } from "@/lib/conectaServer";

const compartirSchema = z
  .object({
    clinicaId: z.string().trim().min(1).max(200),
    recursoId: z.string().trim().min(1).max(200),
    destinatarioUid: z.string().trim().min(1).max(200),
  })
  .strict();

export async function GET(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  return NextResponse.json(await listarCalendarios(sesion.uid));
}

export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = compartirSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }
  try {
    return NextResponse.json({ calendario: await compartirCalendario(sesion.uid, parsed.data) });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
