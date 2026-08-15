import { db } from "@/db";
import { sesiones, categorias, programasFidelidad } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClienteMenuClient from "./ClienteMenuClient";

type Props = { params: Promise<{ slug: string; token: string }> };

export default async function ClienteMenuPage({ params }: Props) {
  const { token } = await params;

  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.token, token), eq(sesiones.estado, "ACTIVA")),
    with: {
      mesa: true,
      restaurant: {
        columns: {
          id: true,
          nombre: true,
          color: true,
          logoUrl: true,
          notasMenu: true,
          facturaActiva: true,
          plan: true,
        },
      },
      pedidos: {
        with: { items: { with: { menuItem: true } } },
        orderBy: (p, { asc }) => [asc(p.creadoEn)],
      },
    },
  });

  if (!sesion) return notFound();

  const menu = await db.query.categorias.findMany({
    where: and(
      eq(categorias.restaurantId, sesion.restaurantId),
      eq(categorias.activa, true),
    ),
    with: {
      items: {
        where: (items, { eq }) => eq(items.disponible, true),
        orderBy: (items, { asc }) => [asc(items.orden)],
      },
    },
    orderBy: [categorias.orden],
  });

  const programas = await db.query.programasFidelidad.findMany({
    where: and(
      eq(programasFidelidad.restaurantId, sesion.restaurantId),
      eq(programasFidelidad.activo, true),
    ),
    columns: { id: true },
  });

  const tieneFactura = Boolean(
    sesion.restaurant?.facturaActiva && sesion.restaurant?.plan === "PRO"
  );
  const tieneFidelidad = programas.length > 0;

  return (
    <ClienteMenuClient
      sesion={sesion}
      menu={menu}
      restaurantId={sesion.restaurantId}
      token={token}
      tieneFactura={tieneFactura}
      tieneFidelidad={tieneFidelidad}
    />
  );
}