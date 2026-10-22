import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { hashToken } from "@/lib/tokenHashServer";
import { enlaceVigente, tokenReciboValido, type ReciboPublico } from "@/lib/recibosCompartidos";

type Params = { params: Promise<{ token: string }> };

/** Pública, sin sesión: quien tiene la liga ve ese recibo y nada más. No regresa de qué clínica es ni quién lo creó. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const noEncontrado = NextResponse.json({ error: "Este enlace no existe o ya no está disponible." }, { status: 404 });
  if (!tokenReciboValido(token)) return noEncontrado;

  const snap = await dbAdmin.collection("recibosCompartidos").doc(hashToken(token)).get();
  if (!snap.exists) return noEncontrado;
  const datos = snap.data() as { venceEl?: string; recibo?: ReciboPublico };
  if (!datos.recibo) return noEncontrado;
  if (!enlaceVigente(datos.venceEl, new Date())) {
    return NextResponse.json({ error: "Este enlace venció. Pide a la clínica que te envíe uno nuevo." }, { status: 410 });
  }
  return NextResponse.json(datos.recibo, { headers: { "Cache-Control": "no-store" } });
}
