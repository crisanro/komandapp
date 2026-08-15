import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { mesas, sesiones } from "@/db/schema";
import { eq } from "drizzle-orm";
import MesasClient from "./MesasClient";

export default async function MesasAdminPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const mesasData = await db.query.mesas.findMany({
    where: eq(mesas.restaurantId, session.restaurantId),
    with: {
      sesiones: {
        where: eq(sesiones.estado, "ACTIVA"),
        with: {
          pedidos: {
            with: { items: true },
          },
        },
      },
    },
    orderBy: [mesas.orden],
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Mesas
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {mesasData.length} mesa{mesasData.length !== 1 ? "s" : ""} configurada{mesasData.length !== 1 ? "s" : ""}
        </p>
      </div>
      <MesasClient mesas={mesasData} />
    </div>
  );
}