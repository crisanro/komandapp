import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { mesas, sesiones, promociones } from "@/db/schema";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import MesasOperativoClient from "./MesasOperativoClient";

export default async function MesasOperativoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session  = await getSession();
  if (!session) redirect(`/${slug}/login`);

  const esAdmin     = session.tipo === "admin";
  const permisos    = session.tipo === "operativo" ? session.permisos : null;
  const vistaActiva = session.tipo === "operativo" ? session.vistaActiva : "mesas";
  const estaciones  = session.tipo === "operativo" ? (session.estaciones ?? []) : [];
  const userId      = session.tipo === "operativo" ? session.userId : null;

  if (!esAdmin && !permisos?.puedeAbrirMesas && !permisos?.puedeTomarPedidos && !permisos?.puedeVerTodasLasMesas) {
    redirect(`/${slug}/operativo/kds`);
  }

  const ahora = new Date();
  const hora  = `${ahora.getHours().toString().padStart(2, "0")}:${ahora.getMinutes().toString().padStart(2, "0")}`;
  const dia   = ahora.getDay();

  const [mesasData, promosTodas] = await Promise.all([
    db.query.mesas.findMany({
      where: and(eq(mesas.restaurantId, session.restaurantId), eq(mesas.activa, true)),
      with: {
        sesiones: {
          where: eq(sesiones.estado, "ACTIVA"),
          with: {
            pedidos: {
              with: {
                items: {
                  columns: {
                    id:             true,
                    estado:         true,
                    cantidad:       true,
                    precioUnitario: true, // ← agregar
                    estacionId:     true,
                  },
                  with: { menuItem: { columns: { nombre: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: [mesas.orden],
    }),
    db.query.promociones.findMany({
      where: and(
        eq(promociones.restaurantId, session.restaurantId),
        eq(promociones.activa, true),
        or(eq(promociones.visibilidad, "EQUIPO"), eq(promociones.visibilidad, "AMBOS")),
        or(isNull(promociones.fechaInicio), lte(promociones.fechaInicio, ahora)),
        or(isNull(promociones.fechaFin),    gte(promociones.fechaFin,    ahora)),
      ),
    }),
  ]);

  // Filtrar por hora y día
  const promos = promosTodas.filter(p => {
    if (p.horaInicio && p.horaFin) {
      if (hora < p.horaInicio || hora > p.horaFin) return false;
    }
    if (p.diasSemana && (p.diasSemana as number[]).length > 0) {
      if (!(p.diasSemana as number[]).includes(dia)) return false;
    }
    return true;
  });

  return (
    <MesasOperativoClient
      mesasIniciales={mesasData}
      restaurantId={session.restaurantId}
      restaurantSlug={slug}
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