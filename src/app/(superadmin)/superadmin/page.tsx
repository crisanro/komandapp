import { db } from "@/db";
import { restaurants, admins } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function SuperAdminPage() {
  const lista = await db.query.restaurants.findMany({
    with: { admin: { columns: { email: true, nombre: true } } },
    orderBy: [desc(restaurants.creadoEn)],
  });

  const stats = {
    total:     lista.length,
    activos:   lista.filter(r => r.activo).length,
    trialing:  lista.filter(r => r.planStatus === "trialing").length,
    active:    lista.filter(r => r.planStatus === "active").length,
    pro:       lista.filter(r => r.plan === "PRO").length,
    pastDue:   lista.filter(r => r.planStatus === "past_due").length,
    canceled:  lista.filter(r => r.planStatus === "canceled").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700 }}>
          Restaurantes
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {stats.total} registrados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total",      value: stats.total,    color: "var(--text-primary)"   },
          { label: "Activos",    value: stats.activos,  color: "var(--color-success)"  },
          { label: "Trial",      value: stats.trialing, color: "var(--color-info)"     },
          { label: "Pagando",    value: stats.active,   color: "var(--accent)"         },
          { label: "PRO",        value: stats.pro,      color: "var(--color-warning)"  },
          { label: "Vencidos",   value: stats.pastDue,  color: "var(--color-error)"    },
          { label: "Cancelados", value: stats.canceled, color: "var(--text-muted)"     },
        ].map(s => (
          <div key={s.label} className="card text-center" style={{ padding: "0.75rem" }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Restaurante", "Admin", "Plan", "Estado", "Trial vence", "Creado", ""].map(h => (
                <th key={h} className="text-left text-xs font-medium uppercase tracking-wide px-5 py-3"
                  style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(r => {
              const diasTrial = r.trialEndsAt
                ? Math.ceil((new Date(r.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {r.nombre}
                    </p>
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {r.slug}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {r.admin?.nombre}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {r.admin?.email}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge"
                      style={r.plan === "PRO"
                        ? { background: "var(--accent-subtle)", color: "var(--accent)" }
                        : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                      }>
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge"
                      style={{
                        background: r.planStatus === "active"   ? "var(--color-success-subtle)" :
                                    r.planStatus === "trialing" ? "var(--color-info-subtle)"    :
                                    r.planStatus === "past_due" ? "var(--color-error-subtle)"   :
                                    "var(--surface-raised)",
                        color:      r.planStatus === "active"   ? "var(--color-success)" :
                                    r.planStatus === "trialing" ? "var(--color-info)"    :
                                    r.planStatus === "past_due" ? "var(--color-error)"   :
                                    "var(--text-muted)",
                      }}>
                      {r.planStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {diasTrial !== null
                      ? diasTrial > 0
                        ? `${diasTrial}d restantes`
                        : "Vencido"
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {new Date(r.creadoEn).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/superadmin/${r.id}`}
                      className="btn btn-ghost btn-sm">
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}