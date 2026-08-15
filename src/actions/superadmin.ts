"use server";
import { db } from "@/db";
import { restaurants, admins } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function verificarSuperAdmin() {
  const session = await getAdminSession();
  if (!session) return null;

  const admin = await db.query.admins.findFirst({
    where:   eq(admins.id, session.adminId),
    columns: { esSuperAdmin: true },
  });

  if (!admin?.esSuperAdmin) return null;
  return session;
}

export async function extenderTrial(
  restaurantId: string,
  meses:        number,
  notas?:       string,
) {
  const session = await verificarSuperAdmin();
  if (!session) return { error: "No autorizado" };

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, restaurantId),
    columns: { trialEndsAt: true, planStatus: true },
  });
  if (!restaurant) return { error: "Restaurante no encontrado" };

  // Si el trial ya venció, extender desde hoy
  const base = restaurant.trialEndsAt && new Date(restaurant.trialEndsAt) > new Date()
    ? new Date(restaurant.trialEndsAt)
    : new Date();

  const nuevaFecha = new Date(base);
  nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);

  await db.update(restaurants)
    .set({
      trialEndsAt:      nuevaFecha,
      planStatus:       "trialing",
      trialExtendedBy:  session.adminId,
      trialExtendedAt:  new Date(),
      trialNotes:       notas ?? null,
      actualizadoEn:    new Date(),
    })
    .where(eq(restaurants.id, restaurantId));

  revalidatePath(`/superadmin/${restaurantId}`);
  revalidatePath("/superadmin");
  return { ok: true };
}

export async function cambiarPlan(
  restaurantId: string,
  plan:         "BASICO" | "PRO",
) {
  const session = await verificarSuperAdmin();
  if (!session) return { error: "No autorizado" };

  await db.update(restaurants)
    .set({
      plan,
      planStatus:    "active",
      actualizadoEn: new Date(),
    })
    .where(eq(restaurants.id, restaurantId));

  revalidatePath(`/superadmin/${restaurantId}`);
  revalidatePath("/superadmin");
  return { ok: true };
}