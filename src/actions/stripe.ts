"use server";
import { stripe, PLANES } from "@/lib/stripe";
import { db } from "@/db";
import { restaurants, admins } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function crearCheckoutSession(plan: "BASICO" | "PRO"): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, session.restaurantId),
    columns: {
      id: true, nombre: true, stripeCustomerId: true,
      plan: true, planStatus: true,
    },
  });
  if (!restaurant) return; // ← sin { error }

  const admin = await db.query.admins.findFirst({
    where:   eq(admins.id, session.adminId),
    columns: { email: true },
  });

  let customerId = restaurant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    admin?.email,
      name:     restaurant.nombre,
      metadata: { restaurantId: restaurant.id },
    });
    customerId = customer.id;
    await db.update(restaurants)
      .set({ stripeCustomerId: customerId })
      .where(eq(restaurants.id, restaurant.id));
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PLANES[plan].priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { restaurantId: restaurant.id, plan },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?suscripcion=ok`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?suscripcion=cancelada`,
    metadata: { restaurantId: restaurant.id, plan },
  });

  redirect(checkoutSession.url!);
}

export async function abrirPortalCliente(): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, session.restaurantId),
    columns: { stripeCustomerId: true },
  });
  if (!restaurant?.stripeCustomerId) return; // ← sin { error }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   restaurant.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  redirect(portalSession.url);
}