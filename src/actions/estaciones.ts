"use server";

import { db } from "@/db";
import { estaciones, userEstaciones } from "@/db/schema";
import { getAdminSession, getSession } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function crearEstacion(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre = (formData.get("nombre") as string)?.trim();
  const color  = (formData.get("color")  as string)?.trim() || "#6366F1";
  if (!nombre) return { error: "El nombre es requerido" };

  const todas = await db.query.estaciones.findMany({
    where: eq(estaciones.restaurantId, session.restaurantId),
  });

  await db.insert(estaciones).values({
    id: createId(), restaurantId: session.restaurantId,
    nombre, color, orden: todas.length + 1,
  });

  revalidatePath("/estaciones");
  return { ok: true };
}

export async function editarEstacion(estacionId: string, formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre = (formData.get("nombre") as string)?.trim();
  const color  = (formData.get("color")  as string)?.trim() || "#6366F1";
  if (!nombre) return { error: "El nombre es requerido" };

  await db.update(estaciones)
    .set({ nombre, color })
    .where(and(eq(estaciones.id, estacionId), eq(estaciones.restaurantId, session.restaurantId)));

  revalidatePath("/estaciones");
  return { ok: true };
}

export async function toggleEstacion(estacionId: string, activa: boolean) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(estaciones)
    .set({ activa })
    .where(and(eq(estaciones.id, estacionId), eq(estaciones.restaurantId, session.restaurantId)));

  revalidatePath("/estaciones");
  return { ok: true };
}

export async function eliminarEstacion(estacionId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.delete(estaciones)
    .where(and(eq(estaciones.id, estacionId), eq(estaciones.restaurantId, session.restaurantId)));

  revalidatePath("/estaciones");
  return { ok: true };
}

export async function asignarPersonasEstacion(estacionId: string, userIds: string[]) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const estacion = await db.query.estaciones.findFirst({
    where: and(eq(estaciones.id, estacionId), eq(estaciones.restaurantId, session.restaurantId)),
  });
  if (!estacion) return { error: "Estación no encontrada" };

  await db.delete(userEstaciones).where(eq(userEstaciones.estacionId, estacionId));

  if (userIds.length > 0) {
    await db.insert(userEstaciones).values(
      userIds.map(userId => ({ id: createId(), userId, estacionId }))
    );
  }

  revalidatePath("/estaciones");
  return { ok: true };
}

export async function getEstacionesConPersonas(restaurantId: string) {
  const lista = await db.query.estaciones.findMany({
    where: eq(estaciones.restaurantId, restaurantId),
    with: {
      userEstaciones: {
        with: { user: true },
      },
    },
    orderBy: [estaciones.orden],
  });
  return lista;
}