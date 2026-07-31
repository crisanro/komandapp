"use client";
import { useState, useCallback, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";
import { actualizarEstadoItem } from "@/actions/pedidos";
import { logout } from "@/actions/auth";
import CambiarVista from "@/components/operativo/CambiarVista";
import { notificarNuevoPedido } from "@/lib/notificaciones";
import type { PermisosUser } from "@/lib/auth";

type MenuItem   = { id: string; nombre: string };
type ItemPedido = { id: string; cantidad: number; nota: string | null; estado: string; menuItem: MenuItem | null };
type Mesa       = { id: string; nombre: string };
type Pedido     = {
  id: string; numero: number; estado: string; notas: string | null;
  creadoEn: Date; mesa: Mesa | null; items: ItemPedido[];
};
type NuevoPedidoSSE = {
  pedidoId: string; sesionId: string; mesaId: string; mesaNombre: string;
  numero: number; notas?: string; creadoEn: string;
  items: { id: string; nombre: string; cantidad: number; nota?: string; precio: string; estacionId?: string | null; estado?: string }[];
};

const ITEM_ESTADO_SIGUIENTE: Record<string, "EN_PREPARACION" | "LISTO"> = {
  EN_COLA:        "EN_PREPARACION",
  EN_PREPARACION: "LISTO",
};
const ITEM_ESTADO_LABEL: Record<string, string> = {
  EN_COLA:        "En cola",
  EN_PREPARACION: "En preparación",
  LISTO:          "✓ Listo",
};

function tiempoTranscurrido(fecha: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}
function colorTiempo(fecha: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000 / 60);
  if (diff < 5)  return "var(--color-success)";
  if (diff < 10) return "var(--color-warning)";
  return "var(--color-error)";
}
function itemEstadoStyles(estado: string): { background: string; border: string; color: string } {
  switch (estado) {
    case "EN_PREPARACION":
      return { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.4)", color: "#93C5FD" };
    case "LISTO":
      return { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.4)", color: "#6EE7B7" };
    default: // EN_COLA
      return { background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-secondary)" };
  }
}

export default function KDSClient({
  pedidosIniciales, restaurantId, nombre, permisos, esAdmin, vistaActiva, estaciones,
}: {
  pedidosIniciales: Pedido[];
  restaurantId:     string;
  nombre:           string;
  permisos:         PermisosUser | null;
  esAdmin:          boolean;
  vistaActiva:      "mesas" | "kds" | "caja";
  estaciones:       string[];
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [loading, setLoading] = useState<string | null>(null);
  const [, setTick]           = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handlePedidoNuevo = useCallback((data: unknown) => {
    const d = data as NuevoPedidoSSE;
    setPedidos(prev => {
      if (prev.find(p => p.id === d.pedidoId)) return prev;
      // Solo mostrar ítems con estación (los sin estación van al mesero)
      const itemsFiltrados = d.items.filter(i =>
        i.estacionId && (esAdmin || estaciones.length === 0 || estaciones.includes(i.estacionId))
      );
      if (itemsFiltrados.length === 0) return prev;
      const nuevoPedido: Pedido = {
        id:       d.pedidoId,
        numero:   d.numero,
        estado:   "ENVIADO",
        notas:    d.notas ?? null,
        creadoEn: new Date(d.creadoEn),
        mesa:     { id: d.mesaId, nombre: d.mesaNombre },
        items:    itemsFiltrados.map(i => ({
          id:       i.id,
          cantidad: i.cantidad,
          nota:     i.nota ?? null,
          estado:   i.estado ?? "EN_COLA",
          menuItem: { id: i.id, nombre: i.nombre },
        })),
      };
      notificarNuevoPedido();
      return [nuevoPedido, ...prev];
    });
  }, [esAdmin, estaciones]);

  const handleItemUpdate = useCallback((data: unknown) => {
    const { itemId, pedidoId, estado } = data as { itemId: string; pedidoId: string; estado: string };
    setPedidos(prev => prev.map(p =>
      p.id === pedidoId
        ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado } : i) }
        : p
    ));
  }, []);

  const handlePedidoUpdate = useCallback((data: unknown) => {
    const { pedidoId, estado } = data as { pedidoId: string; estado: string };
    if (estado === "ENTREGADO") setPedidos(prev => prev.filter(p => p.id !== pedidoId));
  }, []);

  useSSE(restaurantId, {
    "pedido:nuevo":  handlePedidoNuevo,
    "item:update":   handleItemUpdate,
    "pedido:update": handlePedidoUpdate,
  });

  async function handleToggleItem(itemId: string, estadoActual: string, pedidoId: string) {
    const siguiente = ITEM_ESTADO_SIGUIENTE[estadoActual];
    if (!siguiente) return;
    setLoading(itemId);
    setPedidos(prev => prev.map(p =>
      p.id === pedidoId
        ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: siguiente } : i) }
        : p
    ));
    const result = await actualizarEstadoItem(itemId, siguiente);
    setLoading(null);
    if (result?.error) {
      setPedidos(prev => prev.map(p =>
        p.id === pedidoId
          ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: estadoActual } : i) }
          : p
      ));
    }
  }

  const pedidosTodos  = pedidos.length;
  const pedidosListos = pedidos.filter(p => p.items.every(i => i.estado === "LISTO")).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <div className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Pantalla de cocina</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{pedidosTodos}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>{pedidosListos}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Listos</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>En vivo</span>
          </div>
          <CambiarVista vistaActiva={vistaActiva} permisos={permisos} esAdmin={esAdmin} estaciones={estaciones} />
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">Salir</button>
          </form>
        </div>
      </div>
      <div className="p-6 flex-1">
        {pedidos.length === 0 ? (
          <div className="empty-state" style={{ height: "70vh" }}>
            <p className="text-6xl">👨‍🍳</p>
            <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>Sin pedidos activos</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Los pedidos aparecerán aquí en tiempo real</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {pedidos.map((pedido) => {
              const todosListos = pedido.items.every(i => i.estado === "LISTO");
              const enPrep      = pedido.items.some(i => i.estado === "EN_PREPARACION");
              return (
                <div key={pedido.id} className="kds-card"
                  style={{
                    borderColor: todosListos ? "var(--color-success)" : enPrep ? "var(--color-info)" : "var(--border)",
                  }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{
                      background:   todosListos ? "rgba(16,185,129,0.1)" : enPrep ? "rgba(59,130,246,0.08)" : "var(--surface-raised)",
                      borderBottom: "1px solid var(--border)",
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{pedido.mesa?.nombre}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>#{pedido.numero}</span>
                    </div>
                    <span className="text-sm font-mono font-bold" suppressHydrationWarning
                      style={{ color: colorTiempo(pedido.creadoEn) }}>
                      {tiempoTranscurrido(pedido.creadoEn)}
                    </span>
                  </div>
                  {pedido.notas && (
                    <div className="px-4 py-2"
                      style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
                      <p className="text-xs" style={{ color: "var(--color-warning)" }}>📝 {pedido.notas}</p>
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    {pedido.items.map((item) => {
                      const puedeAvanzar = !!ITEM_ESTADO_SIGUIENTE[item.estado];
                      const estilos      = itemEstadoStyles(item.estado);
                      return (
                        <button key={item.id}
                          onClick={() => puedeAvanzar && handleToggleItem(item.id, item.estado, pedido.id)}
                          disabled={loading === item.id || !puedeAvanzar}
                          className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                          style={{ background: estilos.background, border: estilos.border, color: estilos.color, cursor: puedeAvanzar ? "pointer" : "default" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{item.cantidad}×</span>
                                <span className="text-sm font-medium truncate">{item.menuItem?.nombre}</span>
                              </div>
                              {item.nota && (
                                <p className="text-xs mt-1 ml-5" style={{ color: "var(--accent)" }}>⚑ {item.nota}</p>
                              )}
                            </div>
                            <span className={`text-xs shrink-0 ${loading === item.id ? "animate-pulse" : ""}`}>
                              {loading === item.id ? "..." : ITEM_ESTADO_LABEL[item.estado]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {todosListos && (
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => setPedidos(prev => prev.filter(p => p.id !== pedido.id))}
                        className="btn btn-sm w-full"
                        style={{ background: "var(--color-success)", color: "#fff", border: "none" }}>
                        ✓ Pedido entregado — archivar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}