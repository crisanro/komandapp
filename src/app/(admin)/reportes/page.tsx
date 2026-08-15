import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { sesiones, itemsPedido, pedidos, reseñas } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import Link from "next/link";

async function getReporteData(restaurantId: string, desde: Date, hasta: Date) {
  const [sesionesData, itemsData, pedidosData, resenasData] = await Promise.all([
    db.query.sesiones.findMany({
      where: and(
        eq(sesiones.restaurantId, restaurantId),
        eq(sesiones.estado, "CERRADA"),
        gte(sesiones.cerradaEn!, desde),
        lte(sesiones.cerradaEn!, hasta),
      ),
      with: { mesa: true, abiertaPor: true },
      orderBy: [desc(sesiones.cerradaEn)],
    }),
    db.query.itemsPedido.findMany({
      where: and(
        eq(itemsPedido.restaurantId, restaurantId),
        gte(itemsPedido.creadoEn, desde),
        lte(itemsPedido.creadoEn, hasta),
      ),
      with: { menuItem: true },
    }),
    db.query.pedidos.findMany({
      where: and(
        eq(pedidos.restaurantId, restaurantId),
        gte(pedidos.creadoEn, desde),
        lte(pedidos.creadoEn, hasta),
        eq(pedidos.estado, "ENTREGADO"),
      ),
    }),
    db.query.reseñas.findMany({
      where: and(
        eq(reseñas.restaurantId, restaurantId),
        gte(reseñas.creadoEn, desde),
        lte(reseñas.creadoEn, hasta),
      ),
    }),
  ]);

  const ventaTotal     = sesionesData.reduce((acc, s) => acc + parseFloat(s.totalFinal ?? "0"), 0);
  const ticketPromedio = sesionesData.length > 0 ? ventaTotal / sesionesData.length : 0;

  const promedioResenas = resenasData.length > 0
    ? resenasData.reduce((acc, r) => acc + r.calificacion, 0) / resenasData.length
    : 0;

  // Ranking platos
  const rankingMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
  for (const item of itemsData) {
    if (!item.menuItem) continue;
    const ex = rankingMap.get(item.menuItemId);
    if (ex) {
      ex.cantidad += item.cantidad;
      ex.total    += parseFloat(item.precioUnitario) * item.cantidad;
    } else {
      rankingMap.set(item.menuItemId, {
        nombre:   item.menuItem.nombre,
        cantidad: item.cantidad,
        total:    parseFloat(item.precioUnitario) * item.cantidad,
      });
    }
  }
  const rankingPlatos = Array.from(rankingMap.values())
    .sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

  // Hora pico
  const horaPico = Array.from({ length: 24 }, (_, h) => ({
    hora:    h,
    pedidos: pedidosData.filter(p => new Date(p.creadoEn).getHours() === h).length,
  })).filter(h => h.pedidos > 0).sort((a, b) => b.pedidos - a.pedidos).slice(0, 5);

  // Ventas por día
  const ventasPorDia = new Map<string, number>();
  for (const s of sesionesData) {
    if (!s.cerradaEn) continue;
    const dia = new Date(s.cerradaEn).toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
    ventasPorDia.set(dia, (ventasPorDia.get(dia) ?? 0) + parseFloat(s.totalFinal ?? "0"));
  }

  return {
    ventaTotal,
    ticketPromedio,
    promedioResenas,
    totalCuentas:    sesionesData.length,
    totalItems:      itemsData.reduce((acc, i) => acc + i.cantidad, 0),
    rankingPlatos,
    horaPico,
    ultimasSesiones: sesionesData.slice(0, 20),
  };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;

  const { rango = "7" } = await searchParams;
  const dias  = parseInt(rango);
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  desde.setHours(0, 0, 0, 0);

  const data = await getReporteData(session.restaurantId, desde, hasta);

  const RANGOS = [
    { label: "Hoy",     value: "1"  },
    { label: "7 días",  value: "7"  },
    { label: "30 días", value: "30" },
    { label: "90 días", value: "90" },
  ];

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Reportes
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Últimos {dias} día{dias !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Selector rango */}
        <div className="flex gap-2">
          {RANGOS.map(({ label, value }) => (
            <Link key={value} href={`/reportes?rango=${value}`}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={rango === value
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
              }>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Ventas totales"   value={`$${data.ventaTotal.toFixed(2)}`}                    accentColor="var(--accent)"        />
        <KpiCard label="Cuentas cerradas" value={String(data.totalCuentas)}                           accentColor="var(--color-info)"     />
        <KpiCard label="Ticket promedio"  value={`$${data.ticketPromedio.toFixed(2)}`}                  accentColor="var(--color-success)"  />
        <KpiCard label="Ítems vendidos"   value={String(data.totalItems)}                             accentColor="var(--color-warning)"  />
        <KpiCard label="Satisfacción"     value={data.promedioResenas > 0 ? `${data.promedioResenas.toFixed(1)} ⭐` : "Sin datos"} accentColor="var(--color-warning)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Platos más pedidos */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Platos más pedidos
          </h2>
          {data.rankingPlatos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {data.rankingPlatos.map((plato, i) => {
                const max = data.rankingPlatos[0].cantidad;
                const pct = Math.round((plato.cantidad / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-4 shrink-0 text-right font-mono"
                      style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {plato.nombre}
                        </span>
                        <span className="text-xs ml-2 shrink-0" style={{ color: "var(--text-muted)" }}>
                          {plato.cantidad} · ${plato.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: i === 0 ? "var(--accent)" : "var(--text-muted)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hora pico */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Hora pico</h2>
          {data.horaPico.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {data.horaPico.map(({ hora, pedidos: cnt }, i) => (
                <div key={hora} className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2 py-1 rounded-lg shrink-0"
                    style={i === 0
                      ? { background: "var(--accent-subtle)", color: "var(--accent)" }
                      : { background: "var(--surface-raised)", color: "var(--text-muted)" }
                    }>
                    {String(hora).padStart(2, "0")}:00
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full"
                        style={{
                          width:      `${Math.round((cnt / data.horaPico[0].pedidos) * 100)}%`,
                          background: i === 0 ? "var(--accent)" : "var(--text-muted)",
                        }} />
                    </div>
                  </div>
                  <span className="text-xs w-6 text-right shrink-0" style={{ color: "var(--text-muted)" }}>
                    {cnt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de cuentas */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Historial de cuentas</h2>
        </div>
        {data.ultimasSesiones.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Sin cuentas en este período.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Mesa", "Abierta por", "Fecha", "Hora", "Total"].map((h, i) => (
                  <th key={h}
                    className={`text-xs font-medium uppercase tracking-wide px-6 py-3 ${i === 4 ? "text-right" : "text-left"}`}
                    style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ultimasSesiones.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-6 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {s.mesa?.nombre}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {s.abiertaPor?.nombre ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {s.cerradaEn ? new Date(s.cerradaEn).toLocaleDateString("es-EC", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {s.cerradaEn ? new Date(s.cerradaEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-right" style={{ color: "var(--accent)" }}>
                    ${parseFloat(s.totalFinal ?? "0").toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

function KpiCard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accentColor}` }}>
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: accentColor }}>{value}</p>
    </div>
  );
}