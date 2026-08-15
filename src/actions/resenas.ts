"use server";
import { db } from "@/db";
import { reseñas, sesiones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function dejarResena({
  sesionToken, calificacion, comentario, nombreCliente,
}: {
  sesionToken:   string;
  calificacion:  number;
  comentario?:   string;
  nombreCliente?: string;
}) {
  if (calificacion < 1 || calificacion > 5) return { error: "Calificación inválida" };

  const sesion = await db.query.sesiones.findFirst({
    where: eq(sesiones.token, sesionToken),
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  // Una reseña por sesión
  const existe = await db.query.reseñas.findFirst({
    where: eq(reseñas.sesionId, sesion.id),
  });
  if (existe) return { error: "Ya dejaste una reseña para esta sesión" };

  await db.insert(reseñas).values({
    id:            createId(),
    restaurantId:  sesion.restaurantId,
    sesionId:      sesion.id,
    calificacion,
    comentario:    comentario?.trim() || null,
    nombreCliente: nombreCliente?.trim() || null,
  });

  return { ok: true };
}

export async function getResenasRestaurante(restaurantId: string) {
  return db.query.reseñas.findMany({
    where: eq(reseñas.restaurantId, restaurantId),
    with:  { sesion: { with: { mesa: true } } },
    orderBy: (r, { desc }) => [desc(r.creadoEn)],
  });
}