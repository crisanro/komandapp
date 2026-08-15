"use client";
import { abrirPortalCliente, crearCheckoutSession } from "@/actions/stripe";

type Props = {
  restaurant: {
    plan:               string;
    planStatus:         string | null;
    trialEndsAt:        Date | null;
    currentPeriodEndsAt: Date | null;
  };
};

export default function PlanBanner({ restaurant }: Props) {
  const { plan, planStatus, trialEndsAt } = restaurant;

  // Trial activo
  if (planStatus === "trialing" && trialEndsAt) {
    const diasRestantes = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (diasRestantes <= 0) {
      return (
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: "var(--color-error-subtle)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--color-error)" }}>
              Tu período de prueba ha terminado
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Suscríbete para seguir usando Komand
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <form action={() => crearCheckoutSession("BASICO")}>
              <button type="submit" className="btn btn-sm btn-secondary">
                Básico $39
              </button>
            </form>
            <form action={() => crearCheckoutSession("PRO")}>
              <button type="submit" className="btn btn-sm btn-primary">
                Pro $59
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (diasRestantes <= 5) {
      return (
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: "var(--color-warning-subtle)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--color-warning)" }}>
              Tu prueba vence en {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Suscríbete ahora para no perder el acceso
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <form action={() => crearCheckoutSession("BASICO")}>
              <button type="submit" className="btn btn-sm btn-secondary">
                Básico $39/mes
              </button>
            </form>
            <form action={() => crearCheckoutSession("PRO")}>
              <button type="submit" className="btn btn-sm btn-primary">
                Pro $59/mes
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Trial con más de 5 días — banner sutil
    return (
      <div className="rounded-2xl px-4 py-3 mb-6 flex items-center justify-between gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          🎉 Prueba gratuita · {diasRestantes} días restantes
        </p>
        <form action={() => crearCheckoutSession("PRO")}>
          <button type="submit" className="btn btn-sm btn-ghost"
            style={{ color: "var(--accent)" }}>
            Ver planes →
          </button>
        </form>
      </div>
    );
  }

  // Pago fallido
  if (planStatus === "past_due") {
    return (
      <div className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-4"
        style={{ background: "var(--color-error-subtle)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--color-error)" }}>
            Problema con tu pago
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Actualiza tu método de pago para continuar
          </p>
        </div>
        <form action={abrirPortalCliente}>
          <button type="submit" className="btn btn-sm btn-primary">
            Actualizar pago
          </button>
        </form>
      </div>
    );
  }

  // Cancelado
  if (planStatus === "canceled") {
    return (
      <div className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-4"
        style={{ background: "var(--color-error-subtle)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--color-error)" }}>
            Suscripción cancelada
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Reactiva tu plan para seguir usando Komand
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <form action={() => crearCheckoutSession("BASICO")}>
            <button type="submit" className="btn btn-sm btn-secondary">
              Básico $39
            </button>
          </form>
          <form action={() => crearCheckoutSession("PRO")}>
            <button type="submit" className="btn btn-sm btn-primary">
              Pro $59
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Activo — mostrar plan actual y botón para gestionar
  if (planStatus === "active") {
    return (
      <div className="rounded-2xl px-4 py-3 mb-6 flex items-center justify-between gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Plan <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {plan === "PRO" ? "Pro" : "Básico"}
          </span> · ${ plan === "PRO" ? "59" : "39"}/mes
        </p>
        <form action={abrirPortalCliente}>
          <button type="submit" className="btn btn-sm btn-ghost"
            style={{ color: "var(--accent)" }}>
            Gestionar suscripción →
          </button>
        </form>
      </div>
    );
  }

  return null;
}