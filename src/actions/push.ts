"use server";

import { db } from "@/db";
import { pushTokens, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { sendPushToMany } from "@/lib/firebase-admin";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";

export async function guardarPushToken(token: string) {
  const session = await getSession();
  if (!session || session.tipo !== "operativo") return;

  const existente = await db.query.pushTokens.findFirst({
    where: eq(pushTokens.token, token),
  });

  if (!existente) {
    await db.insert(pushTokens).values({
      id:           createId(),
      userId:       session.userId,
      restaurantId: session.restaurantId,
      token,
      dispositivo:  "web",
    });
  }
}

export async function eliminarPushToken(token: string) {
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}

export async function getTokensRestaurante(restaurantId: string): Promise<string[]> {
  const tokens = await db.query.pushTokens.findMany({
    where: eq(pushTokens.restaurantId, restaurantId),
  });
  return tokens.map(t => t.token);
}

export async function getTokensMeseros(restaurantId: string): Promise<string[]> {
  const meseros = await db.query.users.findMany({
    where: and(
      eq(users.restaurantId, restaurantId),
      eq(users.puedeAbrirMesas, true),
      eq(users.activo, true),
    ),
  });

  const userIds = meseros.map(u => u.id);
  if (userIds.length === 0) return [];

  const tokens = await db.query.pushTokens.findMany({
    where: eq(pushTokens.restaurantId, restaurantId),
  });

  return tokens.filter(t => userIds.includes(t.userId)).map(t => t.token);
}

export async function getTokensCajeros(restaurantId: string): Promise<string[]> {
  const cajeros = await db.query.users.findMany({
    where: and(
      eq(users.restaurantId, restaurantId),
      eq(users.puedeCerrarCuenta, true),
      eq(users.activo, true),
    ),
  });

  const userIds = cajeros.map(u => u.id);
  if (userIds.length === 0) return [];

  const tokens = await db.query.pushTokens.findMany({
    where: eq(pushTokens.restaurantId, restaurantId),
  });

  return tokens.filter(t => userIds.includes(t.userId)).map(t => t.token);
}

export async function notificarPedidoListo({
  restaurantId, mesaNombre, items,
}: {
  restaurantId: string;
  mesaNombre:   string;
  items:        string[];
}) {
  const tokens = await getTokensMeseros(restaurantId);
  if (tokens.length === 0) return;

  const itemsTexto = items.slice(0, 3).join(", ");
  const mas = items.length > 3 ? ` y ${items.length - 3} más` : "";

  await sendPushToMany({
    tokens,
    title: `🔔 Pedido listo — ${mesaNombre}`,
    body:  `${itemsTexto}${mas}`,
    data:  { tipo: "pedido_listo", restaurantId },
  });
}

export async function notificarCuentaSolicitada({
  restaurantId, mesaNombre, total,
}: {
  restaurantId: string;
  mesaNombre:   string;
  total:        string;
}) {
  const [tokensMeseros, tokensCajeros] = await Promise.all([
    getTokensMeseros(restaurantId),
    getTokensCajeros(restaurantId),
  ]);

  const tokens = [...new Set([...tokensMeseros, ...tokensCajeros])];
  if (tokens.length === 0) return;

  await sendPushToMany({
    tokens,
    title: `💳 Cuenta solicitada — ${mesaNombre}`,
    body:  `Total: $${total}`,
    data:  { tipo: "cuenta_solicitada", restaurantId },
  });
}