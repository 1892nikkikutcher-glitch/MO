import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verificarSesion } from "@/lib/adminAuth";
import { invitarACalendario } from "@/lib/conectaCalendarios";
import { ConectaError } from "@/lib/conectaServer";

const invitarSchema = z
  .object({
    clinicaId: z.string().trim().min(1).max(200),
    recursoId: z.string().trim().min(1).max(200),
    destinatarioNombre: z.string().trim().max(200).optional(),
    destinatarioCorreo: z.string().trim().email().max(200).optional().or(z.literal("")),
  })
  .strict();

export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = invitarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const { calendario, tokenCrudo } = await invitarACalendario(sesion.uid, {
      ...parsed.data,
      destinatarioCorreo: parsed.data.destinatarioCorreo || undefined,
    });
    return NextResponse.json({ calendario, enlace: `${req.nextUrl.origin}/conecta/calendario/${tokenCrudo}` });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
