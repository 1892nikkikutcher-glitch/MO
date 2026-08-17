import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook no configurado (falta STRIPE_WEBHOOK_SECRET)" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Firma inválida: ${(err as Error).message}` }, { status: 400 });
  }

  let dbAdmin;
  try {
    ({ dbAdmin } = await import("@/lib/firebaseAdmin"));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Firebase Admin no está configurado." },
      { status: 500 }
    );
  }

  const actualizarSuscripcion = (clinicUid: string, datos: Record<string, unknown>) =>
    dbAdmin
      .collection("users")
      .doc(clinicUid)
      .collection("config")
      .doc("suscripcion")
      .set({ ...datos, origenSuscripcion: "stripe" }, { merge: true });

  /** Traduce el status crudo de Stripe al estado normalizado que usa el
   * Panel de administrador para decidir MRR/"clínicas pagando" — el status
   * crudo se sigue guardando aparte en stripeStatus, sin traducir. */
  const estadoSuscripcionDe = (stripeStatus: string): "activa" | "atrasada" | "cancelada" => {
    if (stripeStatus === "active" || stripeStatus === "trialing") return "activa";
    if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "atrasada";
    return "cancelada";
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clinicUid = session.client_reference_id ?? session.metadata?.clinicUid;
      const plan = session.metadata?.plan;
      if (clinicUid && plan) {
        await actualizarSuscripcion(clinicUid, {
          planActivo: plan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          stripeStatus: "active",
          estadoSuscripcion: "activa",
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const clinicUid = subscription.metadata?.clinicUid;
      if (clinicUid) {
        await actualizarSuscripcion(clinicUid, {
          stripeStatus: subscription.status,
          estadoSuscripcion: estadoSuscripcionDe(subscription.status),
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const clinicUid = subscription.metadata?.clinicUid;
      if (clinicUid) {
        await actualizarSuscripcion(clinicUid, {
          planActivo: "prueba",
          stripeStatus: "canceled",
          estadoSuscripcion: "cancelada",
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
