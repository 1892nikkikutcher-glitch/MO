import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { revocarAccesoSchema } from "@/lib/conectaSchemas";
import { revocarAccesoInterconsulta } from "@/lib/conectaAcceso";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

/** Saca a un participante de un caso en curso sin cancelarlo para los
 * demás — el remitente del caso nunca puede ser el objetivo (ver §8 de la
 * revisión de seguridad). El efecto es inmediato: la siguiente lectura o
 * descarga de ese uid ya no encuentra su acceso vigente. */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = revocarAccesoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  try {
    await revocarAccesoInterconsulta(sesion.uid, id, parsed.data.uidARevocar, parsed.data.motivo);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
