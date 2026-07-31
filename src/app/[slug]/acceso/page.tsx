import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import AccesoSlugClient from "./AccesoSlugClient";

export default async function AccesoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.activo, true)),
    columns: { id: true, nombre: true, slug: true, logoUrl: true, color: true },
  });

  if (!restaurant) notFound();

  return (
    <AccesoSlugClient
      slug={restaurant.slug}
      nombreRestaurante={restaurant.nombre}
      color={restaurant.color ?? "#E85D04"}
      logoUrl={restaurant.logoUrl}
    />
  );
}