import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { invitacionReenviarSchema } from "@/lib/conectaSchemas";
import { reenviarInvitacion } from "@/lib/conectaInvitaciones";
import { urlInvitacion } from "@/lib/invitacionesConecta";
import { ConectaError, nowISO } from "@/lib/conectaServer";

/** Reenvía un caso que el colega todavía no acepta: enlace nuevo con los mismos datos del colega; el anterior
 * deja de funcionar. El enlace crudo solo viaja en esta respuesta (Firestore guarda su hash). */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = invitacionReenviarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const { id, tokenCrudo, venceEl, destinatarioNombre, destinatarioCorreo } = await reenviarInvitacion(
      sesion.uid,
      parsed.data.interconsultaId
    );
    await dbAdmin.collection("eventosCrecimientoConecta").add({
      tipo: "invite_created",
      fecha: nowISO(),
      uid: sesion.uid,
      interconsultaId: parsed.data.interconsultaId,
      invitacionId: id,
    });
    return NextResponse.json({
      id,
      enlace: urlInvitacion(tokenCrudo, req.nextUrl.origin),
      venceEl,
      destinatarioNombre,
      destinatarioCorreo,
    });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
