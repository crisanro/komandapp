import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { promociones } from "@/db/schema";
import { eq } from "drizzle-orm";
import PromocionesClient from "./PromocionesClient";

export default async function PromocionesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const promos = await db.query.promociones.findMany({
    where:     eq(promociones.restaurantId, session.restaurantId),
    orderBy:   (p, { desc }) => [desc(p.creadoEn)],
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Promociones
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Avisos para clientes y para tu equipo
        </p>
      </div>
      <PromocionesClient promos={promos} />
    </div>
  );
}