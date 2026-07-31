"use server";

import { db } from "@/db";
import { mesas, sesiones } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function crearMesa(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const capacidad   = formData.get("capacidad") ? parseInt(formData.get("capacidad") as string) : null;

  if (!nombre) return { error: "El nombre es requerido" };

  const existe = await db.query.mesas.findFirst({
    where: and(eq(mesas.nombre, nombre), eq(mesas.restaurantId, session.restaurantId)),
  });
  if (existe) return { error: "Ya existe una mesa con ese nombre" };

  const todasMesas = await db.query.mesas.findMany({
    where: eq(mesas.restaurantId, session.restaurantId),
  });

  await db.insert(mesas).values({
    id: createId(),
    restaurantId: session.restaurantId,
    nombre,
    descripcion: descripcion || null,
    capacidad,
    orden: todasMesas.length + 1,
  });

  revalidatePath("/mesas-admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function editarMesa(mesaId: string, formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const capacidad   = formData.get("capacidad") ? parseInt(formData.get("capacidad") as string) : null;

  if (!nombre) return { error: "El nombre es requerido" };

  await db.update(mesas)
    .set({ nombre, descripcion: descripcion || null, capacidad })
    .where(and(eq(mesas.id, mesaId), eq(mesas.restaurantId, session.restaurantId)));

  revalidatePath("/mesas-admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleMesa(mesaId: string, activa: boolean) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(mesas)
    .set({ activa, estado: activa ? "LIBRE" : "INACTIVA" })
    .where(and(eq(mesas.id, mesaId), eq(mesas.restaurantId, session.restaurantId)));

  revalidatePath("/mesas-admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function eliminarMesa(mesaId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const mesa = await db.query.mesas.findFirst({
    where: and(eq(mesas.id, mesaId), eq(mesas.restaurantId, session.restaurantId)),
    with: { sesiones: { where: eq(sesiones.estado, "ACTIVA") } },
  });

  if (!mesa) return { error: "Mesa no encontrada" };
  if (mesa.sesiones.length > 0) return { error: "No puedes eliminar una mesa con sesiones activas" };

  await db.delete(mesas)
    .where(and(eq(mesas.id, mesaId), eq(mesas.restaurantId, session.restaurantId)));

  revalidatePath("/mesas-admin");
  revalidatePath("/dashboard");
  return { ok: true };
}