import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { afiliacionResolverSchema } from "@/lib/conectaSchemas";
import { resolverAfiliacion } from "@/lib/conectaAfiliaciones";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

/** Aceptar/rechazar/revocar una afiliación — solo el admin de la clínica
 * involucrada (verificado contra `clinicMembers`, nunca contra algo que
 * mande el cliente). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = afiliacionResolverSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  try {
    await resolverAfiliacion(sesion.uid, id, parsed.data.accion);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
