import Stripe from "stripe";

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-07-29.dahlia",
  });
}

export const PLANES = {
  BASICO: {
    priceId: process.env.STRIPE_PRICE_BASICO!,
    nombre:  "Komand Básico",
    monto:   3900,
  },
  PRO: {
    priceId: process.env.STRIPE_PRICE_PRO!,
    nombre:  "Komand Pro",
    monto:   5900,
  },
} as const;