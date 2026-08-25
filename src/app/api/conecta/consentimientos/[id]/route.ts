import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { consentimientoRevocarSchema } from "@/lib/conectaSchemas";
import { revocarConsentimiento } from "@/lib/conectaConsentimientos";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = consentimientoRevocarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  try {
    await revocarConsentimiento(sesion.uid, id, parsed.data.motivo);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
