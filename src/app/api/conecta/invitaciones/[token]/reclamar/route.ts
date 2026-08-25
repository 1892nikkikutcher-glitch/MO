import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { reclamarInvitacion } from "@/lib/conectaInvitaciones";
import { ConectaError, nowISO } from "@/lib/conectaServer";

type Params = { params: Promise<{ token: string }> };

/** Reclamar exige sesión (identidad de Firebase Auth) — la comparación de
 * identidad usa exclusivamente `correoVerificado`/`emailVerificado` del
 * token decodificado, nunca algo que mande el cliente (§4 del plan). */
export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { token } = await params;

  try {
    const resultado = await reclamarInvitacion(sesion.uid, sesion.email ?? undefined, sesion.emailVerificado, token);

    await dbAdmin.collection("eventosCrecimientoConecta").add({
      tipo: "invite_claimed",
      fecha: nowISO(),
      uid: sesion.uid,
      interconsultaId: resultado.interconsultaId,
    });
    if (resultado.tipo === "acceso_otorgado") {
      await dbAdmin.collection("eventosCrecimientoConecta").add({
        tipo: "access_granted",
        fecha: nowISO(),
        uid: sesion.uid,
        interconsultaId: resultado.interconsultaId,
      });
    }

    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
