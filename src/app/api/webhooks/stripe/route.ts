import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }

  const data = event.data.object as any;

  switch (event.type) {
    // ── Checkout completado ──────────────────────────────
    case "checkout.session.completed": {
      const restaurantId = data.metadata?.restaurantId;
      const plan         = data.metadata?.plan as "BASICO" | "PRO";
      if (!restaurantId || !plan) break;

      await db.update(restaurants)
        .set({
          plan,
          planStatus:           "active",
          stripeSubscriptionId: data.subscription,
          actualizadoEn:        new Date(),
        })
        .where(eq(restaurants.id, restaurantId));
      break;
    }

    // ── Suscripción actualizada ──────────────────────────
    case "customer.subscription.updated": {
    const sub          = data as Stripe.Subscription;
    const restaurantId = sub.metadata?.restaurantId;
    if (!restaurantId) break;

    const priceId = sub.items.data[0]?.price.id;
    const plan    = priceId === process.env.STRIPE_PRICE_PRO ? "PRO" : "BASICO";

    await db.update(restaurants)
        .set({
        plan,
        planStatus:          sub.status as any,
        currentPeriodEndsAt: new Date((sub as any).current_period_end * 1000),
        actualizadoEn:       new Date(),
        })
        .where(eq(restaurants.id, restaurantId));
    break;
    }


    // ── Suscripción cancelada ────────────────────────────
    case "customer.subscription.deleted": {
      const sub          = data as Stripe.Subscription;
      const restaurantId = sub.metadata?.restaurantId;
      if (!restaurantId) break;

      await db.update(restaurants)
        .set({
          planStatus:    "canceled",
          actualizadoEn: new Date(),
        })
        .where(eq(restaurants.id, restaurantId));
      break;
    }

    // ── Pago exitoso ─────────────────────────────────────
    case "invoice.payment_succeeded": {
    const invoice      = data as Stripe.Invoice;
    const customerId   = invoice.customer as string;
    if (!customerId) break;

    // Buscar restaurante por stripeCustomerId
    const restaurant = await db.query.restaurants.findFirst({
        where:   eq(restaurants.stripeCustomerId, customerId),
        columns: { id: true },
    });
    if (!restaurant) break;

    await db.update(restaurants)
        .set({
        planStatus:    "active",
        actualizadoEn: new Date(),
        })
        .where(eq(restaurants.id, restaurant.id));
    break;
    }

    // ── Pago fallido ──────────────────────────────────────
    case "invoice.payment_failed": {
    const invoice    = data as Stripe.Invoice;
    const customerId = invoice.customer as string;
    if (!customerId) break;

    const restaurant = await db.query.restaurants.findFirst({
        where:   eq(restaurants.stripeCustomerId, customerId),
        columns: { id: true },
    });
    if (!restaurant) break;

    await db.update(restaurants)
        .set({
        planStatus:    "past_due",
        actualizadoEn: new Date(),
        })
        .where(eq(restaurants.id, restaurant.id));
    break;
    }
  }

  return NextResponse.json({ received: true });
}

// Stripe necesita el body raw — deshabilitar el body parser
export const config = { api: { bodyParser: false } };