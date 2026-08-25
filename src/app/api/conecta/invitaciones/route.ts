import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { invitacionCrearSchema } from "@/lib/conectaSchemas";
import { crearInvitacion } from "@/lib/conectaInvitaciones";
import { urlInvitacion } from "@/lib/invitacionesConecta";
import { ConectaError } from "@/lib/conectaServer";

/** Crea una invitación — el token crudo SOLO se regresa en esta respuesta;
 * Firestore solo guarda su hash (§2/§4 del plan). */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = invitacionCrearSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de invitación inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { tokenCrudo, venceEl } = await crearInvitacion(sesion.uid, {
      interconsultaId: parsed.data.interconsultaId,
      destinatarioNombre: parsed.data.destinatarioNombre,
      destinatarioCorreo: parsed.data.destinatarioCorreo,
      canal: parsed.data.canal,
    });
    const origen = req.nextUrl.origin;
    return NextResponse.json({ enlace: urlInvitacion(tokenCrudo, origen), venceEl });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
