import { db } from "@/db";
import { restaurants, admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ExtenderTrialForm from "./ExtenderTrialForm";

export default async function SuperAdminRestaurantePage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    with:  { admin: true },
  });
  if (!restaurant) return notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700 }}>
          {restaurant.nombre}
        </h1>
        <p className="text-sm mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
          {restaurant.slug}
        </p>
      </div>

      {/* Info */}
      <div className="card space-y-3">
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Información</h2>
        {[
          { label: "Admin",      value: `${restaurant.admin?.nombre} — ${restaurant.admin?.email}` },
          { label: "Plan",       value: restaurant.plan },
          { label: "Estado",     value: restaurant.planStatus ?? "—" },
          { label: "Stripe ID",  value: restaurant.stripeCustomerId ?? "Sin suscripción" },
          { label: "Trial ends", value: restaurant.trialEndsAt ? new Date(restaurant.trialEndsAt).toLocaleDateString("es-EC") : "—" },
          { label: "Ciudad",     value: restaurant.ciudad ?? "—" },
          { label: "Creado",     value: new Date(restaurant.creadoEn).toLocaleDateString("es-EC") },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-1"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Extender trial */}
      <ExtenderTrialForm restaurantId={restaurantId} nombre={restaurant.nombre} />
    </div>
  );
}
