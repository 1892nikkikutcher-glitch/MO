import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe todavía no está configurado en el servidor (falta STRIPE_SECRET_KEY)." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const clinicUid: unknown = body.clinicUid;
    const plan: unknown = body.plan;
    const email: unknown = body.email;

    if (typeof clinicUid !== "string" || (plan !== "consultorio" && plan !== "clinicas")) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `No hay un precio de Stripe configurado para el plan "${plan}".` },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clinicUid,
      customer_email: typeof email === "string" && email ? email : undefined,
      metadata: { clinicUid, plan },
      subscription_data: { metadata: { clinicUid, plan } },
      success_url: `${origin}/?stripe=exito`,
      cancel_url: `${origin}/?stripe=cancelado`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo crear la sesión de pago." },
      { status: 500 }
    );
  }
}
