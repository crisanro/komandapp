import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { mesas, sesiones, itemsPedido, promociones } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import InicioClient from "./InicioClient";

export default async function InicioPage() {
  const session = await getOperativoSession();
  if (!session) redirect("/login");

  const restaurantId = session.restaurantId;

  const [mesasData, pedidosPendientes, itemsSinEstacion, promos] = await Promise.all([
    // Mesas con sesiones activas y pedidos
    db.query.mesas.findMany({
      where: and(eq(mesas.restaurantId, restaurantId), eq(mesas.activa, true)),
      with: {
        sesiones: {
          where: eq(sesiones.estado, "ACTIVA"),
          with: {
            pedidos: {
              with: {
                items: true,
              },
            },
          },
        },
      },
      orderBy: [mesas.orden],
    }),

    // Ítems pendientes de las estaciones del usuario
    session.estaciones?.length > 0
      ? db.query.itemsPedido.findMany({
          where: and(
            eq(itemsPedido.restaurantId, restaurantId),
            eq(itemsPedido.estado, "EN_COLA"),
          ),
          with: {
            menuItem: { columns: { nombre: true } },
            pedido:   { with: { mesa: { columns: { nombre: true } } } },
          },
        })
      : Promise.resolve([]),

    // Ítems SIN estación en estado LISTO (mesero los despacha)
    db.query.itemsPedido.findMany({
      where: and(
        eq(itemsPedido.restaurantId, restaurantId),
        eq(itemsPedido.estado, "LISTO"),
        isNull(itemsPedido.estacionId),
      ),
      with: {
        menuItem: { columns: { nombre: true } },
        pedido: {
          with: {
            sesion: { columns: { id: true } },
            mesa:   { columns: { nombre: true } },
          },
        },
      },
    }),

    // Promociones activas
    db.query.promociones.findMany({
      where: and(eq(promociones.restaurantId, restaurantId), eq(promociones.activa, true)),
      columns: { id: true, titulo: true, emoji: true },
    }),
  ]);

  // Filtrar solo ítems de las estaciones del usuario
  const itemsEstacion = pedidosPendientes.filter(i =>
    session.estaciones?.includes(i.estacionId ?? "")
  );

  return (
    <InicioClient
      nombre={session.nombre}
      permisos={session.permisos}
      estaciones={session.estaciones ?? []}
      restaurantId={restaurantId}
      mesasIniciales={mesasData}
      itemsEstacionIniciales={itemsEstacion}
      itemsSinEstacionIniciales={itemsSinEstacion}
      promos={promos}
    />
  );
}