import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { sesiones, categorias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import MesaDetalleClient from "./MesaDetalleClient";

type Props = { params: Promise<{ sesionId: string }> };

export default async function MesaDetallePage({ params }: Props) {
  const { sesionId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  // Admins también pueden ver detalle de mesa
  const restaurantId = session.restaurantId;

  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.id, sesionId), eq(sesiones.restaurantId, restaurantId)),
    with: {
      mesa: true,
      pedidos: {
        with: { items: { with: { menuItem: true } } },
        orderBy: (p, { asc }) => [asc(p.creadoEn)],
      },
    },
  });

  if (!sesion || sesion.estado !== "ACTIVA") redirect("/mesas");

  const todasSesiones = await db.query.sesiones.findMany({
    where: and(
      eq(sesiones.mesaId, sesion.mesaId),
      eq(sesiones.estado, "ACTIVA"),
      eq(sesiones.restaurantId, restaurantId),
    ),
    with: {
      pedidos: {
        with: { items: { with: { menuItem: true } } },
        orderBy: (p, { asc }) => [asc(p.creadoEn)],
      },
    },
    orderBy: (s, { asc }) => [asc(s.abiertaEn)],
  });

  const menu = await db.query.categorias.findMany({
    where: and(eq(categorias.restaurantId, restaurantId), eq(categorias.activa, true)),
    with: {
      items: {
        where: (items, { eq }) => eq(items.disponible, true),
        orderBy: (items, { asc }) => [asc(items.orden)],
      },
    },
    orderBy: [categorias.orden],
  });

  return (
    <MesaDetalleClient
      sesion={sesion}
      todasSesiones={todasSesiones}
      menu={menu}
      restaurantId={restaurantId}
      mesaId={sesion.mesaId}
    />
  );
}