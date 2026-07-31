import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { estaciones, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import EstacionesClient from "./EstacionesClient";

export default async function EstacionesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const [lista, equipo] = await Promise.all([
    db.query.estaciones.findMany({
      where: eq(estaciones.restaurantId, session.restaurantId),
      with: {
        userEstaciones: { with: { user: true } },
      },
      orderBy: [estaciones.orden],
    }),
    db.query.users.findMany({
      where: eq(users.restaurantId, session.restaurantId),
      columns: { id: true, nombre: true, username: true },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Estaciones
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Define dónde se prepara cada cosa y quién lo ve
        </p>
      </div>
      <EstacionesClient estaciones={lista} equipo={equipo} />
    </div>
  );
}