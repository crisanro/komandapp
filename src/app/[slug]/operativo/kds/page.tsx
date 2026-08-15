import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { pedidos } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import KDSClient from "./KDSClient";

export default async function KDSPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session  = await getSession();
  if (!session) redirect(`/${slug}/login`);

  const esAdmin     = session.tipo === "admin";
  const estaciones  = session.tipo === "operativo" ? (session.estaciones ?? []) : [];
  const vistaActiva = session.tipo === "operativo" ? session.vistaActiva : "kds";
  const permisos    = session.tipo === "operativo" ? session.permisos : null;

  if (!esAdmin && estaciones.length === 0) redirect(`/${slug}/operativo/mesas`);

  const pedidosActivos = await db.query.pedidos.findMany({
    where: and(
      eq(pedidos.restaurantId, session.restaurantId),
      inArray(pedidos.estado, ["ENVIADO", "EN_PROCESO"]),
    ),
    with: {
      mesa:  true,
      items: { with: { menuItem: true, estacion: true } },
    },
    orderBy: (p, { asc }) => [asc(p.creadoEn)],
  });

  const pedidosFiltrados = esAdmin
    ? pedidosActivos
    : pedidosActivos
        .map(p => ({
          ...p,
          items: p.items.filter(i => !i.estacionId || estaciones.includes(i.estacionId)),
        }))
        .filter(p => p.items.length > 0);

  return (
    <KDSClient
      pedidosIniciales={pedidosFiltrados}
      restaurantId={session.restaurantId}
      restaurantSlug={slug}
      nombre={session.nombre}
      permisos={permisos}
      esAdmin={esAdmin}
      vistaActiva={vistaActiva}
      estaciones={estaciones}
    />
  );
}