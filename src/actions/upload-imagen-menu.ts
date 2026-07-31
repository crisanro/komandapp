"use server";

import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { subirImagenMenu, eliminarImagen } from "@/lib/r2";
import { revalidatePath } from "next/cache";

const MAX_SIZE_BACKEND_KB = 500;

export async function uploadImagenMenuItem(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const file   = formData.get("imagen") as File | null;
  const itemId = formData.get("itemId") as string;

  if (!file || !itemId) return { error: "Datos incompletos" };

  // Segunda capa de validación — por si alguien bypasea el frontend
  if (file.size > MAX_SIZE_BACKEND_KB * 1024) {
    return { error: `La imagen supera los ${MAX_SIZE_BACKEND_KB}KB permitidos. Optimiza la imagen antes de subir.` };
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
  if (!tiposPermitidos.includes(file.type)) {
    return { error: "Formato no soportado." };
  }

  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)),
    columns: { id: true, imagenUrl: true },
  });
  if (!item) return { error: "Ítem no encontrado" };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Sharp optimiza a WebP ~30-80KB (segunda pasada de optimización)
    const url = await subirImagenMenu(session.restaurantId, itemId, buffer);

    if (item.imagenUrl) {
      await eliminarImagen(item.imagenUrl).catch(() => {});
    }

    await db.update(menuItems)
      .set({ imagenUrl: url, actualizadoEn: new Date() })
      .where(eq(menuItems.id, itemId));

    revalidatePath("/menu-admin");
    return { ok: true, url };

  } catch (err) {
    console.error("Error subiendo imagen:", err);
    return { error: "Error al subir la imagen. Intenta de nuevo." };
  }
}

export async function eliminarImagenMenuItem(itemId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, session.restaurantId)),
    columns: { id: true, imagenUrl: true },
  });
  if (!item?.imagenUrl) return { error: "Ítem no encontrado" };

  try {
    await eliminarImagen(item.imagenUrl);
    await db.update(menuItems)
      .set({ imagenUrl: null, actualizadoEn: new Date() })
      .where(eq(menuItems.id, itemId));

    revalidatePath("/menu-admin");
    return { ok: true };
  } catch {
    return { error: "Error al eliminar la imagen." };
  }
}