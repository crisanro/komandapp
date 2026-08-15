import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sesiones, restaurants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import CajaClient from "./CajaClient";

export default async function CajaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session  = await getSession();
  if (!session) redirect(`/${slug}/login`);

  if (session.tipo === "operativo") {
    const p = session.permisos;
    if (!p?.puedeCobrar && !p?.puedeCerrarCuenta && !p?.puedeCuadrarCaja) {
      redirect(`/${slug}/operativo/mesas`);
    }
  }

  const restaurantId = session.restaurantId;

  const [sesionesActivas, restaurant] = await Promise.all([
    db.query.sesiones.findMany({
      where: and(eq(sesiones.restaurantId, restaurantId), eq(sesiones.estado, "ACTIVA")),
      with: {
        mesa:       true,
        abiertaPor: true,
        pedidos: {
          with: { items: { with: { menuItem: true } } },
          orderBy: (p, { asc }) => [asc(p.creadoEn)],
        },
      },
      orderBy: (s, { asc }) => [asc(s.abiertaEn)],
    }),
    db.query.restaurants.findFirst({
      where:   eq(restaurants.id, restaurantId),
      columns: {
        nombre: true, notaCuenta: true, propinaModo: true,
        porcentajePropina: true, moneda: true,
        facturaActiva: true, plan: true,  // ← agregar
      },
    }),
  ]);

  const esAdmin     = session.tipo === "admin";
  const permisos    = session.tipo === "operativo" ? session.permisos : null;
  const vistaActiva = session.tipo === "operativo" ? session.vistaActiva : "caja";
  const estaciones  = session.tipo === "operativo" ? (session.estaciones ?? []) : [];

  return (
    <CajaClient
      sesionesIniciales={sesionesActivas}
      restaurant={restaurant!}
      restaurantId={restaurantId}
      restaurantSlug={slug}
      nombre={session.nombre}
      permisos={permisos}
      esAdmin={esAdmin}
      vistaActiva={vistaActiva}
      estaciones={estaciones}
    />
  );
}