import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { contrarreferenciaSchema } from "@/lib/conectaSchemas";
import { registrarContrarreferencia } from "@/lib/conectaContrarreferencia";
import { ConectaError, nowISO } from "@/lib/conectaServer";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;
  const { id } = await params;

  const parsed = contrarreferenciaSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de contrarreferencia inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await registrarContrarreferencia(sesion.uid, id, parsed.data);
    if (!parsed.data.esBorrador) {
      await dbAdmin.collection("eventosCrecimientoConecta").add({
        tipo: "counter_referral_sent",
        fecha: nowISO(),
        uid: sesion.uid,
        interconsultaId: id,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
