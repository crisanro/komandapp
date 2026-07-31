import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { restaurants, mesas, sesiones, pedidos } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import Link from "next/link";

async function getDashboardData(restaurantId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [mesasData, sesionesHoy, pedidosActivos, ultimasSesiones] = await Promise.all([
    db.query.mesas.findMany({
      where: and(eq(mesas.restaurantId, restaurantId), eq(mesas.activa, true)),
      with: {
        sesiones: {
          where: eq(sesiones.estado, "ACTIVA"),
          with: { pedidos: { with: { items: true } } },
        },
      },
      orderBy: [mesas.orden],
    }),
    db.query.sesiones.findMany({
      where: and(
        eq(sesiones.restaurantId, restaurantId),
        eq(sesiones.estado, "CERRADA"),
        gte(sesiones.cerradaEn!, hoy),
      ),
    }),
    db.query.pedidos.findMany({
      where: and(eq(pedidos.restaurantId, restaurantId), eq(pedidos.estado, "ENVIADO")),
      with: { mesa: true, items: { with: { menuItem: true } } },
      orderBy: [pedidos.creadoEn],
    }),
    db.query.sesiones.findMany({
      where: and(
        eq(sesiones.restaurantId, restaurantId),
        eq(sesiones.estado, "CERRADA"),
        gte(sesiones.abiertaEn, hoy),
      ),
      with: { mesa: true },
      orderBy: [desc(sesiones.cerradaEn)],
      limit: 5,
    }),
  ]);

  const ventasHoy      = sesionesHoy.reduce((acc, s) => acc + parseFloat(s.totalFinal ?? "0"), 0);
  const mesasOcupadas  = mesasData.filter(m => m.sesiones.length > 0).length;
  const mesasLibres    = mesasData.filter(m => m.sesiones.length === 0).length;
  const ticketPromedio = sesionesHoy.length > 0 ? ventasHoy / sesionesHoy.length : 0;

  return {
    mesasData, mesasOcupadas, mesasLibres,
    totalMesas: mesasData.length,
    ventasHoy, cuentasHoy: sesionesHoy.length,
    ticketPromedio, pedidosActivos, ultimasSesiones,
  };
}

export default async function DashboardPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const [data, restaurant] = await Promise.all([
    getDashboardData(session.restaurantId),
    db.query.restaurants.findFirst({ where: eq(restaurants.id, session.restaurantId) }),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          {restaurant?.nombre ?? "Dashboard"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("es-EC", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Ventas hoy"
          value={`$${data.ventasHoy.toFixed(2)}`}
          sub={`${data.cuentasHoy} cuenta${data.cuentasHoy !== 1 ? "s" : ""} cerrada${data.cuentasHoy !== 1 ? "s" : ""}`}
          accentColor="var(--accent)"
        />
        <KpiCard
          label="Ticket promedio"
          value={`$${data.ticketPromedio.toFixed(2)}`}
          sub="por cuenta"
          accentColor="var(--color-info)"
        />
        <KpiCard
          label="Mesas ocupadas"
          value={`${data.mesasOcupadas} / ${data.totalMesas}`}
          sub={`${data.mesasLibres} libre${data.mesasLibres !== 1 ? "s" : ""}`}
          accentColor="var(--color-success)"
        />
        <KpiCard
          label="En cocina ahora"
          value={String(data.pedidosActivos.length)}
          sub={`pedido${data.pedidosActivos.length !== 1 ? "s" : ""} activo${data.pedidosActivos.length !== 1 ? "s" : ""}`}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mesas ahora */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Mesas ahora</h2>
            <Link href="/mesas-admin" className="text-xs" style={{ color: "var(--accent)" }}>
              Gestionar →
            </Link>
          </div>
          {data.mesasData.length === 0 ? (
            <div className="empty-state py-10">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay mesas configuradas.</p>
              <Link href="/mesas-admin" className="text-sm mt-2" style={{ color: "var(--accent)" }}>
                Crear mesas →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {data.mesasData.map((mesa) => {
                const sesionActiva = mesa.sesiones[0];
                const ocupada      = !!sesionActiva;
                const itemsListos  = sesionActiva?.pedidos
                  .flatMap(p => p.items)
                  .filter(i => i.estado === "LISTO").length ?? 0;

                const borderColor = ocupada
                  ? itemsListos > 0 ? "var(--color-warning)" : "var(--accent)"
                  : "var(--border)";
                const bgColor = ocupada
                  ? itemsListos > 0 ? "rgba(245,158,11,0.08)" : "var(--accent-subtle)"
                  : "var(--surface-raised)";
                const dotColor = ocupada
                  ? itemsListos > 0 ? "var(--color-warning)" : "var(--accent)"
                  : "var(--border)";

                return (
                  <div key={mesa.id}
                    className="rounded-xl p-3 text-center"
                    style={{ border: `2px solid ${borderColor}`, background: bgColor }}>
                    <div className="w-2 h-2 rounded-full mx-auto mb-1.5"
                      style={{ background: dotColor }} />
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {mesa.nombre}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: ocupada ? "var(--accent)" : "var(--text-muted)" }}>
                      {ocupada
                        ? itemsListos > 0 ? `${itemsListos} listo${itemsListos !== 1 ? "s" : ""}` : "Ocupada"
                        : "Libre"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimas cuentas */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Últimas cuentas
          </h2>
          {data.ultimasSesiones.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Sin cuentas cerradas hoy.
            </p>
          ) : (
            <div className="space-y-0">
              {data.ultimasSesiones.map((s) => (
                <div key={s.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {s.mesa?.nombre}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.cerradaEn
                        ? new Date(s.cerradaEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    ${parseFloat(s.totalFinal ?? "0").toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pedidos en cocina */}
      {data.pedidosActivos.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            En cocina ahora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.pedidosActivos.map((pedido) => (
              <div key={pedido.id} className="rounded-xl p-4"
                style={{ background: "var(--accent-subtle)", border: "1px solid rgba(232,93,4,0.2)" }}>
                <div className="flex justify-between mb-3">
                  <span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>
                    {pedido.mesa?.nombre}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(pedido.creadoEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <ul className="space-y-1">
                  {pedido.items.map((item) => (
                    <li key={item.id} className="text-sm flex gap-2">
                      <span style={{ color: "var(--text-muted)" }}>{item.cantidad}×</span>
                      <span style={{ color: "var(--text-primary)" }}>{item.menuItem?.nombre}</span>
                      {item.nota && (
                        <span className="text-xs italic" style={{ color: "var(--accent)" }}>
                          ({item.nota})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ label, value, sub, accentColor }: {
  label:       string;
  value:       string;
  sub:         string;
  accentColor: string;
}) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accentColor}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold mb-1" style={{ color: accentColor }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}