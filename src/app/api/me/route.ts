import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, session.restaurantId),
    columns: {
      id:                true,
      nombre:            true,
      slug:              true,
      logoUrl:           true,
      color:             true,
      whatsapp:          true,
      ciudad:            true,
      moneda:            true,
      notasMenu:         true,
      notaCuenta:        true,
      propinaModo:       true,
      porcentajePropina: true,
      propinaAdicionalPermitida: true,
      ivaPorcentaje:     true,
      plan:              true,
      activo:            true,
      // Facturación
      rucPrincipal:                true,
      razonSocial:                 true,
      codEstablecimiento:          true,
      codPuntoEmision:             true,
      ambiente:                    true,
      kipuValidado:                true,
      rucArtesanal:                true,
      razonSocialArtesanal:        true,
      codEstablecimientoArtesanal: true,
      codPuntoEmisionArtesanal:    true,
    },
  });

  return NextResponse.json({ restaurant, session });
}