import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import ConfigGeneral     from "./ConfigGeneral";
import ConfigSlug        from "./ConfigSlug";
import ConfigLinks       from "./ConfigLinks";
import ConfigFacturacion from "./ConfigFacturacion";

export default async function ConfiguracionPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, session.restaurantId),
    columns: {
      id: true, nombre: true, ciudad: true, whatsapp: true,
      color: true, notasMenu: true, notaCuenta: true, moneda: true,
      slug: true, slugCambiadoEn: true, plan: true,
      propinaModo: true, porcentajePropina: true,
      propinaAdicionalPermitida: true, ivaPorcentaje: true,
      codEstablecimiento: true, codPuntoEmision: true,
      codEstablecimientoArtesanal: true, codPuntoEmisionArtesanal: true,
      // No traemos kipuApiKey — nunca al frontend
    },
  });

  if (!restaurant) return null;

  const esPro = restaurant.plan === "PRO";

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Ajustes de tu restaurante
        </p>
      </div>

      <ConfigGeneral restaurant={restaurant} />
      <ConfigSlug slug={restaurant.slug} slugCambiadoEn={restaurant.slugCambiadoEn} />
      <ConfigLinks slug={restaurant.slug} />
      <ConfigFacturacion
        esPro={esPro}
        codEstablecimiento={restaurant.codEstablecimiento}
        codPuntoEmision={restaurant.codPuntoEmision}
        codEstablecimientoArtesanal={restaurant.codEstablecimientoArtesanal}
        codPuntoEmisionArtesanal={restaurant.codPuntoEmisionArtesanal}
        tieneApiKey={!!restaurant.codEstablecimiento}
        tieneApiKeyArtesanal={!!restaurant.codEstablecimientoArtesanal}
      />
    </div>
  );
}