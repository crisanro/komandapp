import { db } from "@/db";
import { restaurants, categorias, promociones } from "@/db/schema";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { notFound } from "next/navigation";
import CartaClient from "./CartaClient";

type Props = { params: Promise<{ slug: string }> };

export default async function CartaSlugPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.activo, true)),
  });
  if (!restaurant) return notFound();

  const ahora = new Date();
  const [menu, promos] = await Promise.all([
    db.query.categorias.findMany({
      where: and(eq(categorias.restaurantId, restaurant.id), eq(categorias.activa, true)),
      with: {
        items: {
          where: (items, { eq }) => eq(items.disponible, true),
          orderBy: (items, { asc }) => [asc(items.orden)],
        },
      },
      orderBy: [categorias.orden],
    }),
    db.query.promociones.findMany({
      where: and(
        eq(promociones.restaurantId, restaurant.id),
        eq(promociones.activa, true),
        or(eq(promociones.tipo, "CLIENTE"), eq(promociones.tipo, "AMBOS")),
        or(isNull(promociones.fechaInicio), lte(promociones.fechaInicio, ahora)),
        or(isNull(promociones.fechaFin),    gte(promociones.fechaFin,    ahora)),
      ),
    }),
  ]);

  return (
    <CartaClient
      restaurant={{
        nombre:    restaurant.nombre,
        ciudad:    restaurant.ciudad,
        color:     restaurant.color ?? "#E85D04",
        logoUrl:   restaurant.logoUrl,
        notasMenu: restaurant.notasMenu,
      }}
      menu={menu}
      promos={promos}
    />
  );
}