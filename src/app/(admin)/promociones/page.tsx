import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { promociones, categorias, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import PromocionesClient from "./PromocionesClient";

export default async function PromocionesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const [promos, listaCategorias, listaItems] = await Promise.all([
    db.query.promociones.findMany({
      where:   eq(promociones.restaurantId, session.restaurantId),
      with:    { itemsCombo: { with: { menuItem: true } }, menuItem: true, categoria: true },
      orderBy: (p, { desc }) => [desc(p.creadoEn)],
    }),
    db.query.categorias.findMany({
      where:   eq(categorias.restaurantId, session.restaurantId),
      columns: { id: true, nombre: true },
    }),
    db.query.menuItems.findMany({
      where:   eq(menuItems.restaurantId, session.restaurantId),
      columns: { id: true, nombre: true, precio: true, categoriaId: true },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Promociones
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Descuentos, combos y ofertas para clientes y equipo
        </p>
      </div>
      <PromocionesClient
        promos={promos}
        categorias={listaCategorias}
        menuItems={listaItems}
      />
    </div>
  );
}