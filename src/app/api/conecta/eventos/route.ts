import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { eventoCrecimientoSchema } from "@/lib/conectaSchemas";
import { eventoTieneCamposClinicos } from "@/lib/moConecta";
import { nowISO, sinIndefinidos } from "@/lib/conectaServer";

/** Único punto por el que el cliente puede registrar un evento de
 * crecimiento — lista blanca de tipos (Zod enum) más un filtro defensivo
 * adicional de campos clínicos prohibidos, aunque el esquema ya no los deja
 * pasar. Todo lo demás (referral_accepted, invite_claimed, etc.) lo escriben
 * las propias rutas de servidor al procesar la acción real. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = eventoCrecimientoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Evento no reconocido." }, { status: 400 });

  const evento = sinIndefinidos({
    tipo: parsed.data.tipo,
    fecha: nowISO(),
    uid: sesion.uid,
    interconsultaId: parsed.data.interconsultaId,
    invitacionId: parsed.data.invitacionId,
    fuenteAdquisicion: parsed.data.fuenteAdquisicion,
  });
  if (eventoTieneCamposClinicos(evento)) {
    return NextResponse.json({ error: "Evento rechazado." }, { status: 400 });
  }

  await dbAdmin.collection("eventosCrecimientoConecta").add(evento);
  return NextResponse.json({ ok: true });
}
