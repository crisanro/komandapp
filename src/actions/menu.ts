"use server";

import { db } from "@/db";
import { categorias, menuItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Helper — admin o usuario con permisos de menú
async function getMenuSession() {
  const session = await getSession();
  if (!session) return null;
  if (session.tipo === "admin") return session;
  if (
    session.tipo === "operativo" &&
    (session.permisos.puedeGestionarMenu || session.permisos.puedeMarcarAgotados)
  ) return session;
  return null;
}

// ─── CATEGORÍAS ──────────────────────────────

export async function crearCategoria(formData: FormData) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) return { error: "El nombre es requerido" };

  const todas = await db.query.categorias.findMany({
    where: eq(categorias.restaurantId, session.restaurantId),
  });

  await db.insert(categorias).values({
    id: createId(), restaurantId: session.restaurantId,
    nombre, orden: todas.length + 1,
  });

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function editarCategoria(categoriaId: string, formData: FormData) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) return { error: "El nombre es requerido" };

  await db.update(categorias)
    .set({ nombre })
    .where(and(eq(categorias.id, categoriaId), eq(categorias.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function toggleCategoria(categoriaId: string, activa: boolean) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  await db.update(categorias)
    .set({ activa })
    .where(and(eq(categorias.id, categoriaId), eq(categorias.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function eliminarCategoria(categoriaId: string) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  const items = await db.query.menuItems.findMany({
    where: and(eq(menuItems.categoriaId, categoriaId), eq(menuItems.restaurantId, session.restaurantId)),
  });
  if (items.length > 0) return { error: `Mueve o elimina los ${items.length} ítem(s) primero` };

  await db.delete(categorias)
    .where(and(eq(categorias.id, categoriaId), eq(categorias.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

// ─── ÍTEMS ───────────────────────────────────

export async function crearItem(formData: FormData) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const precio      = (formData.get("precio")      as string)?.trim();
  const categoriaId = (formData.get("categoriaId") as string)?.trim();
  const tagsRaw     = (formData.get("tags")        as string)?.trim();

  if (!nombre || !precio || !categoriaId) return { error: "Nombre, precio y categoría son requeridos" };
  if (isNaN(parseFloat(precio))) return { error: "El precio debe ser un número válido" };

  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  const items = await db.query.menuItems.findMany({
    where: and(eq(menuItems.restaurantId, session.restaurantId), eq(menuItems.categoriaId, categoriaId)),
  });

  await db.insert(menuItems).values({
    id: createId(),
    restaurantId: session.restaurantId,
    categoriaId,
    nombre,
    descripcion: descripcion || null,
    precio,
    tags,
    orden: items.length + 1,
  });

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function editarItem(itemId: string, formData: FormData) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const precio      = (formData.get("precio")      as string)?.trim();
  const categoriaId = (formData.get("categoriaId") as string)?.trim();
  const tagsRaw     = (formData.get("tags")        as string)?.trim();

  if (!nombre || !precio || !categoriaId) return { error: "Nombre, precio y categoría son requeridos" };
  if (isNaN(parseFloat(precio))) return { error: "El precio debe ser un número válido" };

  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  await db.update(menuItems)
    .set({ nombre, descripcion: descripcion || null, precio, categoriaId, tags, actualizadoEn: new Date() })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function toggleDisponible(itemId: string, disponible: boolean) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  await db.update(menuItems)
    .set({ disponible, agotado: !disponible, actualizadoEn: new Date() })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function toggleAgotado(itemId: string, agotado: boolean) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  await db.update(menuItems)
    .set({ agotado, actualizadoEn: new Date() })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}

export async function eliminarItem(itemId: string) {
  const session = await getMenuSession();
  if (!session) return { error: "No autorizado" };

  await db.delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)));

  revalidatePath("/menu-admin");
  return { ok: true };
}