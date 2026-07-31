"use server";

import { db } from "@/db";
import { promociones } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function crearPromocion(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const titulo      = (formData.get("titulo")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const emoji       = (formData.get("emoji")       as string)?.trim() || "🎉";
  const tipo        = formData.get("tipo") as "CLIENTE" | "EQUIPO" | "AMBOS";
  const fechaInicio = formData.get("fechaInicio") as string;
  const fechaFin    = formData.get("fechaFin")    as string;

  if (!titulo) return { error: "El título es requerido" };
  if (!tipo)   return { error: "El tipo es requerido" };

  await db.insert(promociones).values({
    id: createId(),
    restaurantId: session.restaurantId,
    titulo,
    descripcion:  descripcion || null,
    emoji,
    tipo,
    fechaInicio:  fechaInicio ? new Date(fechaInicio) : null,
    fechaFin:     fechaFin    ? new Date(fechaFin)    : null,
  });

  revalidatePath("/promociones");
  return { ok: true };
}

export async function editarPromocion(promoId: string, formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const titulo      = (formData.get("titulo")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const emoji       = (formData.get("emoji")       as string)?.trim() || "🎉";
  const tipo        = formData.get("tipo") as "CLIENTE" | "EQUIPO" | "AMBOS";
  const fechaInicio = formData.get("fechaInicio") as string;
  const fechaFin    = formData.get("fechaFin")    as string;

  if (!titulo) return { error: "El título es requerido" };

  await db.update(promociones)
    .set({
      titulo, descripcion: descripcion || null, emoji, tipo,
      fechaInicio:  fechaInicio ? new Date(fechaInicio) : null,
      fechaFin:     fechaFin    ? new Date(fechaFin)    : null,
      actualizadoEn: new Date(),
    })
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));

  revalidatePath("/promociones");
  return { ok: true };
}

export async function togglePromocion(promoId: string, activa: boolean) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(promociones)
    .set({ activa, actualizadoEn: new Date() })
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));

  revalidatePath("/promociones");
  return { ok: true };
}

export async function eliminarPromocion(promoId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.delete(promociones)
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));

  revalidatePath("/promociones");
  return { ok: true };
}

export async function getPromocionesActivas(restaurantId: string, tipo: "CLIENTE" | "EQUIPO") {
  const ahora = new Date();
  return db.query.promociones.findMany({
    where: and(
      eq(promociones.restaurantId, restaurantId),
      eq(promociones.activa, true),
      or(eq(promociones.tipo, tipo), eq(promociones.tipo, "AMBOS")),
      or(isNull(promociones.fechaInicio), lte(promociones.fechaInicio, ahora)),
      or(isNull(promociones.fechaFin),    gte(promociones.fechaFin,    ahora)),
    ),
    orderBy: [promociones.creadoEn],
  });
}