import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mesas, sesiones, promociones } from "@/db/schema";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import MesasOperativoClient from "./MesasOperativoClient";

export default async function MesasOperativoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const esAdmin     = session.tipo === "admin";
  const permisos    = session.tipo === "operativo" ? session.permisos : null;
  const vistaActiva = session.tipo === "operativo" ? session.vistaActiva : "mesas";
  const estaciones  = session.tipo === "operativo" ? (session.estaciones ?? []) : [];
  const userId      = session.tipo === "operativo" ? session.userId : null;

  // Operativos sin permisos de mesas → redirigir a KDS
  if (!esAdmin && !permisos?.puedeAbrirMesas && !permisos?.puedeTomarPedidos && !permisos?.puedeVerTodasLasMesas) {
    redirect("/kds");
  }

  const ahora = new Date();
  const [mesasData, promos] = await Promise.all([
    db.query.mesas.findMany({
      where: and(eq(mesas.restaurantId, session.restaurantId), eq(mesas.activa, true)),
      with: {
        sesiones: {
          where: eq(sesiones.estado, "ACTIVA"),
          with: { pedidos: { with: { items: true } } },
        },
      },
      orderBy: [mesas.orden],
    }),
    db.query.promociones.findMany({
      where: and(
        eq(promociones.restaurantId, session.restaurantId),
        eq(promociones.activa, true),
        or(eq(promociones.tipo, "EQUIPO"), eq(promociones.tipo, "AMBOS")),
        or(isNull(promociones.fechaInicio), lte(promociones.fechaInicio, ahora)),
        or(isNull(promociones.fechaFin),    gte(promociones.fechaFin,    ahora)),
      ),
    }),
  ]);

  return (
    <MesasOperativoClient
      mesasIniciales={mesasData}
      restaurantId={session.restaurantId}
      userId={userId}
      nombreMesero={session.nombre}
      permisos={permisos}
      esAdmin={esAdmin}
      vistaActiva={vistaActiva}
      estaciones={estaciones}
      promos={promos}
    />
  );
}