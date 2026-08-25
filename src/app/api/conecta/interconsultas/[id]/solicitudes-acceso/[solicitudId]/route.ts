import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { solicitudAccesoResolverSchema } from "@/lib/conectaSchemas";
import { resolverSolicitudAcceso } from "@/lib/conectaInvitaciones";
import { ConectaError } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string; solicitudId: string }> };

/** Aprobar/rechazar una solicitud de acceso creada cuando el correo
 * verificado de quien reclamó una invitación no coincidía con el
 * destinatario declarado — solo un participante actual del caso resuelve. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id, solicitudId } = await params;

  const parsed = solicitudAccesoResolverSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  try {
    await resolverSolicitudAcceso(sesion.uid, id, solicitudId, parsed.data.accion);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
