"use server";

import { db } from "@/db";
import { sesiones, mesas } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { notificarCuentaSolicitada } from "@/actions/push";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function abrirMesa(mesaId: string, nombreCliente?: string) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  const mesa = await db.query.mesas.findFirst({
    where: and(eq(mesas.id, mesaId), eq(mesas.restaurantId, session.restaurantId)),
  });
  if (!mesa)        return { error: "Mesa no encontrada" };
  if (!mesa.activa) return { error: "Mesa inactiva" };

  const sesionId = createId();
  const token    = createId();

  // abiertaPorId solo existe para usuarios operativos
  const abiertaPorId = session.tipo === "operativo" ? session.userId : null;

  await db.insert(sesiones).values({
    id:           sesionId,
    restaurantId: session.restaurantId,
    mesaId,
    abiertaPorId,
    token,
    nombreCliente: nombreCliente ?? null,
  });

  await db.update(mesas)
    .set({ estado: "OCUPADA" })
    .where(eq(mesas.id, mesaId));

  broadcast(session.restaurantId, "mesa:update", {
    mesaId, estado: "OCUPADA", sesionId,
  });

  revalidatePath("/mesas");
  revalidatePath("/dashboard");

  return { ok: true, sesionId, token };
}

export async function cerrarSesion(sesionId: string) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.id, sesionId), eq(sesiones.restaurantId, session.restaurantId)),
    with: {
      pedidos: {
        with: { items: { with: { menuItem: true } } },
      },
    },
  });

  if (!sesion) return { error: "Sesión no encontrada" };
  if (sesion.estado === "CERRADA") return { error: "Esta cuenta ya fue cerrada" };

  const subtotal = sesion.pedidos.reduce((acc, p) => {
    return acc + p.items.reduce((a, i) => a + (parseFloat(i.precioUnitario) * i.cantidad), 0);
  }, 0);

  const cerradaPorId = session.tipo === "operativo" ? session.userId : null;

  await db.update(sesiones)
    .set({
      estado:       "CERRADA",
      cerradaPorId,
      cerradaEn:    new Date(),
      subtotal:     subtotal.toFixed(2),
      totalFinal:   subtotal.toFixed(2), // sin descuentos aún, se actualizará al cobrar
    })
    .where(eq(sesiones.id, sesionId));

  const sesionesActivas = await db.query.sesiones.findMany({
    where: and(eq(sesiones.mesaId, sesion.mesaId), eq(sesiones.estado, "ACTIVA")),
  });

  if (sesionesActivas.length === 0) {
    await db.update(mesas)
      .set({ estado: "LIBRE" })
      .where(eq(mesas.id, sesion.mesaId));

    broadcast(session.restaurantId, "mesa:update", {
      mesaId: sesion.mesaId, estado: "LIBRE",
    });
  }

  broadcast(session.restaurantId, "sesion:cerrada", {
    sesionId, mesaId: sesion.mesaId, totalFinal: subtotal.toFixed(2),
  });

  revalidatePath("/mesas");
  revalidatePath("/dashboard");

  return { ok: true, total: subtotal.toFixed(2) };
}

export async function pedirCuenta(sesionToken: string) {
  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.token, sesionToken), eq(sesiones.estado, "ACTIVA")),
    with: {
      mesa: true,
      pedidos: { with: { items: { with: { menuItem: true } } } },
    },
  });

  if (!sesion) return { error: "Sesión no encontrada" };

  const total = sesion.pedidos.reduce((acc, p) => {
    return acc + p.items.reduce((a, i) => a + (parseFloat(i.precioUnitario) * i.cantidad), 0);
  }, 0);

  broadcast(sesion.restaurantId, "cuenta:solicitada", {
    sesionId:   sesion.id,
    mesaId:     sesion.mesaId,
    mesaNombre: sesion.mesa?.nombre,
    total:      total.toFixed(2),
  });

  await notificarCuentaSolicitada({
    restaurantId: sesion.restaurantId,
    mesaNombre:   sesion.mesa?.nombre ?? "Mesa",
    total:        total.toFixed(2),
  });

  return { ok: true, total: total.toFixed(2) };
}

export async function getSesionByToken(token: string) {
  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.token, token), eq(sesiones.estado, "ACTIVA")),
    with: {
      mesa:       true,
      restaurant: true,
      pedidos: {
        with: { items: { with: { menuItem: true } } },
      },
    },
  });

  return sesion ?? null;
}