"use server";
import { db } from "@/db";
import { notificarPedidoListo } from "@/actions/push";
import { pedidos, itemsPedido, menuItems, sesiones } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ItemCarrito = { menuItemId: string; cantidad: number; nota?: string };

export async function crearPedido(sesionId: string, items: ItemCarrito[], notas?: string) {
  const session = await getSession();
  let restaurantId: string;
  let tomadoPorId: string | null = null;

  if (session) {
    restaurantId = session.restaurantId;
    if (session.tipo === "operativo") tomadoPorId = session.userId;
  } else {
    const sesion = await db.query.sesiones.findFirst({ where: eq(sesiones.id, sesionId) });
    if (!sesion) return { error: "Sesión no encontrada" };
    restaurantId = sesion.restaurantId;
  }

  if (!items || items.length === 0) return { error: "El pedido está vacío" };

  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.id, sesionId), eq(sesiones.restaurantId, restaurantId)),
    with: { mesa: true },
  });
  if (!sesion || sesion.estado !== "ACTIVA") return { error: "Sesión no válida" };

  const [{ value: totalPedidos }] = await db
    .select({ value: count() })
    .from(pedidos)
    .where(eq(pedidos.sesionId, sesionId));

  const numeroPedido = totalPedidos + 1;
  const pedidoId = createId();

  await db.insert(pedidos).values({
    id: pedidoId,
    restaurantId,
    sesionId,
    mesaId:          sesion.mesaId,
    tomadoPorId,
    estado:          "ENVIADO",
    numero:          numeroPedido,
    notas:           notas ?? null,
    origenQr:        !session,
    enviadoCocinaEn: new Date(),
  });

  const itemsCreados = [];

  for (const item of items) {
    const menuItem = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, item.menuItemId), eq(menuItems.restaurantId, restaurantId)),
      with: { categoria: true },
    });
    if (!menuItem) continue;
    if (menuItem.agotado) return { error: `"${menuItem.nombre}" está agotado` };

    const estacionId    = menuItem.estacionId ?? menuItem.categoria?.estacionId ?? null;
    // Sin estación = mesero lo despacha directo, nace en LISTO
    const estadoInicial = estacionId ? "EN_COLA" : "LISTO";
    const itemId        = createId();

    await db.insert(itemsPedido).values({
      id:             itemId,
      restaurantId,
      pedidoId,
      menuItemId:     item.menuItemId,
      precioUnitario: menuItem.precio,
      cantidad:       item.cantidad,
      nota:           item.nota ?? null,
      estacionId,
      estado:         estadoInicial,
      rucFacturacion: menuItem.rucFacturacion,
      porcentajeIva:  menuItem.porcentajeIva,
    });

    itemsCreados.push({
      id:         itemId,
      nombre:     menuItem.nombre,
      cantidad:   item.cantidad,
      nota:       item.nota,
      precio:     menuItem.precio,
      estacionId,
      estado:     estadoInicial,
    });

    // Sin estación → broadcast inmediato para /inicio del mesero
    if (!estacionId) {
      broadcast(restaurantId, "item:update", {
        itemId,
        pedidoId,
        sesionId,
        mesaId:     sesion.mesaId,
        mesaNombre: sesion.mesa?.nombre,
        nombreItem: menuItem.nombre,
        estacionId: null,
        cantidad:   item.cantidad,
        estado:     "LISTO",
      });
    }
  }

  broadcast(restaurantId, "pedido:nuevo", {
    pedidoId,
    sesionId,
    mesaId:     sesion.mesaId,
    mesaNombre: sesion.mesa?.nombre,
    numero:     numeroPedido,
    items:      itemsCreados,
    notas,
    creadoEn:   new Date().toISOString(),
  });

  revalidatePath("/mesas");
  revalidatePath("/dashboard");
  return { ok: true, pedidoId };
}

export async function actualizarEstadoItem(
  itemId: string,
  estado: "EN_PREPARACION" | "LISTO" | "ENTREGADO"
) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  const item = await db.query.itemsPedido.findFirst({
    where: and(eq(itemsPedido.id, itemId), eq(itemsPedido.restaurantId, session.restaurantId)),
    with: {
      pedido:  { with: { mesa: true } },
      menuItem: { columns: { nombre: true } },
    },
  });
  if (!item) return { error: "Ítem no encontrado" };

  const marcadoPorId = session.tipo === "operativo" ? session.userId : null;
  await db.update(itemsPedido)
    .set({ estado, marcadoPorId, actualizadoEn: new Date() })
    .where(eq(itemsPedido.id, itemId));

  if (estado === "LISTO") {
    const todosItems = await db.query.itemsPedido.findMany({
      where: eq(itemsPedido.pedidoId, item.pedidoId),
      with:  { menuItem: true },
    });
    const todosListos = todosItems.every(i => i.id === itemId || i.estado === "LISTO");
    if (todosListos) {
      await db.update(pedidos)
        .set({ estado: "LISTO", listoEn: new Date(), actualizadoEn: new Date() })
        .where(eq(pedidos.id, item.pedidoId));
      await notificarPedidoListo({
        restaurantId: session.restaurantId,
        mesaNombre:   item.pedido?.mesa?.nombre ?? "Mesa",
        items:        todosItems.map(i => i.menuItem?.nombre ?? "").filter(Boolean),
      });
    }
  }

  broadcast(session.restaurantId, "item:update", {
    itemId,
    pedidoId:   item.pedidoId,
    sesionId:   item.pedido?.sesionId,
    mesaId:     item.pedido?.mesaId,
    mesaNombre: item.pedido?.mesa?.nombre,
    nombreItem: item.menuItem?.nombre,
    estacionId: item.estacionId ?? null,
    estado,
  });

  return { ok: true };
}

export async function marcarPedidoEntregado(pedidoId: string) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  const pedido = await db.query.pedidos.findFirst({
    where: and(eq(pedidos.id, pedidoId), eq(pedidos.restaurantId, session.restaurantId)),
    with:  { mesa: true },
  });
  if (!pedido) return { error: "Pedido no encontrado" };

  await db.update(pedidos)
    .set({ estado: "ENTREGADO", entregadoEn: new Date(), actualizadoEn: new Date() })
    .where(eq(pedidos.id, pedidoId));

  await db.update(itemsPedido)
    .set({ estado: "ENTREGADO", actualizadoEn: new Date() })
    .where(and(eq(itemsPedido.pedidoId, pedidoId), eq(itemsPedido.restaurantId, session.restaurantId)));

  broadcast(session.restaurantId, "pedido:update", {
    pedidoId,
    mesaId:     pedido.mesaId,
    mesaNombre: pedido.mesa?.nombre,
    estado:     "ENTREGADO",
  });

  revalidatePath("/mesas");
  return { ok: true };
}


export async function cancelarItem(itemId: string) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  const item = await db.query.itemsPedido.findFirst({
    where: and(eq(itemsPedido.id, itemId), eq(itemsPedido.restaurantId, session.restaurantId)),
    with: { pedido: { with: { mesa: true } } },
  });
  if (!item) return { error: "Ítem no encontrado" };
  if (item.estado !== "EN_COLA" && !(item.estado === "LISTO" && !item.estacionId)) {
    return { error: "No se puede cancelar este ítem" };
  }
  await db.update(itemsPedido)
    .set({ estado: "CANCELADO", actualizadoEn: new Date() })
    .where(eq(itemsPedido.id, itemId));

  broadcast(session.restaurantId, "item:update", {
    itemId,
    pedidoId:   item.pedidoId,
    sesionId:   item.pedido?.sesionId,
    mesaId:     item.pedido?.mesaId,
    mesaNombre: item.pedido?.mesa?.nombre,
    estacionId: item.estacionId ?? null,
    estado:     "CANCELADO",
  });

  return { ok: true };
}