import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { mesas, sesiones, itemsPedido, promociones } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import InicioClient from "./InicioClient";

export default async function InicioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }  = await params;
  const session   = await getOperativoSession();
  if (!session) redirect(`/${slug}/login`);

  const restaurantId = session.restaurantId;

  const [mesasData, pedidosPendientes, itemsSinEstacion, promos] = await Promise.all([
    db.query.mesas.findMany({
      where: and(eq(mesas.restaurantId, restaurantId), eq(mesas.activa, true)),
      with: {
        sesiones: {
          where: eq(sesiones.estado, "ACTIVA"),
          with: { pedidos: { with: { items: true } } },
        },
      },
      orderBy: [mesas.orden],
    }),
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
    db.query.promociones.findMany({
      where: and(eq(promociones.restaurantId, restaurantId), eq(promociones.activa, true)),
      columns: { id: true, titulo: true, emoji: true },
    }),
  ]);

  const itemsEstacion = pedidosPendientes.filter(i =>
    session.estaciones?.includes(i.estacionId ?? "")
  );

  return (
    <InicioClient
      nombre={session.nombre}
      permisos={session.permisos}
      estaciones={session.estaciones ?? []}
      restaurantId={restaurantId}
      restaurantSlug={slug}
      mesasIniciales={mesasData}
      itemsEstacionIniciales={itemsEstacion}
      itemsSinEstacionIniciales={itemsSinEstacion}
      promos={promos}
    />
  );
}