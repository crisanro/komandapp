import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { categorias, estaciones, restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import MenuAdminClient from "./MenuClient";

export default async function MenuAdminPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const [menu, listaEstaciones, restaurant] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.restaurantId, session.restaurantId),
      with: {
        items: { orderBy: (i, { asc }) => [asc(i.orden)] },
      },
      orderBy: [categorias.orden],
    }),
    db.query.estaciones.findMany({
      where: eq(estaciones.restaurantId, session.restaurantId),
      orderBy: [estaciones.orden],
    }),
    db.query.restaurants.findFirst({
      where: eq(restaurants.id, session.restaurantId),
      columns: { ivaPorcentaje: true, kipuApiKeyArtesanal: true },
    }),
  ]);

  // multiRuc = tiene API key artesanal de KIPU configurada (no depende del plan)
  const multiRuc = !!restaurant?.kipuApiKeyArtesanal;
  const ivaVigente = parseFloat(restaurant?.ivaPorcentaje ?? "15");

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Menú
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Categorías, ítems, precios y dónde se prepara cada cosa
        </p>
      </div>
      <MenuAdminClient
        menu={menu}
        estaciones={listaEstaciones}
        multiRuc={multiRuc}
        ivaVigente={ivaVigente}
      />
    </div>
  );
}