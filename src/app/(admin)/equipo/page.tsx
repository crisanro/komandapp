import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { users, estaciones } from "@/db/schema";
import { eq } from "drizzle-orm";
import EquipoClient from "./EquipoClient";

export default async function EquipoPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const [equipo, listaEstaciones] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.restaurantId, session.restaurantId),
      with: { userEstaciones: true },
      orderBy: [users.creadoEn],
    }),
    db.query.estaciones.findMany({
      where: eq(estaciones.restaurantId, session.restaurantId),
      orderBy: [estaciones.orden],
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Equipo
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Gestiona el acceso de tu equipo operativo
        </p>
      </div>
      <EquipoClient equipo={equipo} estaciones={listaEstaciones} />
    </div>
  );
}