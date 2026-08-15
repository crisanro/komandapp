import { MetadataRoute } from "next";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function manifest({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { slug } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.slug, slug),
    columns: { nombre: true, color: true },
  });

  return {
    name:             `${restaurant?.nombre ?? "Komand"} — Operativo`,
    short_name:       restaurant?.nombre ?? "Komand",
    description:      "Panel operativo del restaurante",
    start_url:        `/${slug}/operativo`,
    scope:            `/${slug}/operativo`,
    display:          "standalone",
    background_color: "#0C0C12",
    theme_color:      restaurant?.color ?? "#E85D04",
    orientation:      "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["food", "business", "productivity"],
  };
}