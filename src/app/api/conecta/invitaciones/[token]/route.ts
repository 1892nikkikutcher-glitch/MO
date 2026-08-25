import { NextRequest, NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { obtenerInvitacionPublica } from "@/lib/conectaInvitaciones";
import { hashToken } from "@/lib/tokenHashServer";
import { ConectaError, nowISO } from "@/lib/conectaServer";

type Params = { params: Promise<{ token: string }> };

const AGENTES_VISTA_PREVIA = ["facebookexternalhit", "slackbot", "whatsapp", "telegrambot", "twitterbot", "linkedinbot", "discordbot"];

function esBotDeVistaPrevia(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return AGENTES_VISTA_PREVIA.some((agente) => ua.includes(agente));
}

/** Pública, sin sesión — solo información genérica, NUNCA datos clínicos ni
 * el destinatario completo (§4/§5 del plan). Distingue un bot de vista
 * previa de enlace (WhatsApp/Slack/etc. desplegando la miniatura) de una
 * apertura real, para no inflar la métrica de aperturas. */
export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;

  try {
    const invitacion = await obtenerInvitacionPublica(token);

    const userAgent = req.headers.get("user-agent") ?? "";
    if (esBotDeVistaPrevia(userAgent)) {
      await dbAdmin.collection("eventosCrecimientoConecta").add({
        tipo: "link_preview_detected",
        fecha: nowISO(),
        tokenHash: hashToken(token),
      });
    }

    return NextResponse.json(invitacion);
  } catch (err) {
    if (err instanceof ConectaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
