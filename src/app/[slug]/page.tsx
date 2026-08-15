import { db } from "@/db";
import { restaurants, categorias, promociones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import CartaClient from "./CartaClient";

type Props = { params: Promise<{ slug: string }> };

export default async function MenuSlugPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.activo, true)),
  });
  if (!restaurant) return notFound();

  const ahora    = new Date();
  const hora     = `${ahora.getHours().toString().padStart(2, "0")}:${ahora.getMinutes().toString().padStart(2, "0")}`;
  const dia      = ahora.getDay();

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
      ),
      with: {
        itemsCombo: { with: { menuItem: true } },
        menuItem:   true,
        categoria:  true,
      },
    }),
  ]);

  // Filtrar promociones visibles al cliente y vigentes
  const promosActivas = promos.filter(p => {
    if (p.visibilidad === "EQUIPO") return false;
    if (p.fechaInicio && new Date(p.fechaInicio) > ahora) return false;
    if (p.fechaFin    && new Date(p.fechaFin)    < ahora) return false;
    if (p.horaInicio  && p.horaFin) {
      if (hora < p.horaInicio || hora > p.horaFin) return false;
    }
    if (p.diasSemana && (p.diasSemana as number[]).length > 0) {
      if (!(p.diasSemana as number[]).includes(dia)) return false;
    }
    return true;
  });

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
      promos={promosActivas}
    />
  );
}