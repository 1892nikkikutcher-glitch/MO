import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "@/lib/adminAuth";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { esAdminDeClinica } from "@/lib/conectaServer";
import { hashToken } from "@/lib/tokenHashServer";
import { fechaDeVencimiento, reciboCompartidoSchema, urlRecibo } from "@/lib/recibosCompartidos";

/** Crea la liga para descargar un recibo. Solo el administrador de la clínica (los pagos son suyos); el token
 * crudo solo se regresa en esta respuesta, en la base queda su hash. */
export async function POST(req: NextRequest) {
  const sesion = await verificarSesion(req);
  if (sesion instanceof NextResponse) return sesion;

  const parsed = reciboCompartidoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos del recibo inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
  }
  const { clinicaId, ...recibo } = parsed.data;
  if (!(await esAdminDeClinica(sesion.uid, clinicaId))) {
    return NextResponse.json({ error: "Solo el administrador de la clínica puede compartir recibos." }, { status: 403 });
  }

  const tokenCrudo = randomBytes(24).toString("hex");
  const ahora = new Date();
  const venceEl = fechaDeVencimiento(ahora);
  await dbAdmin.collection("recibosCompartidos").doc(hashToken(tokenCrudo)).set({
    clinicaId,
    creadoPorUid: sesion.uid,
    creadoEn: ahora.toISOString(),
    venceEl,
    recibo,
  });
  return NextResponse.json({ enlace: urlRecibo(tokenCrudo, req.nextUrl.origin), venceEl });
}
