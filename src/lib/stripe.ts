import Stripe from "stripe";

/** Cliente de Stripe para uso exclusivamente en servidor (API routes) —
 * nunca importar este archivo desde un componente de cliente. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_no_configurada", {
  apiVersion: "2026-07-29.dahlia",
});

export const STRIPE_PRICE_IDS: Record<"consultorio" | "clinicas", string | undefined> = {
  consultorio: process.env.STRIPE_PRICE_ID_CONSULTORIO,
  clinicas: process.env.STRIPE_PRICE_ID_CLINICAS,
};
