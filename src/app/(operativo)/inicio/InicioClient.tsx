"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { logout } from "@/actions/auth";
import type { PermisosUser } from "@/db/schema";

// ── Tipos ─────────────────────────────────────────────────
type ItemPedido = {
  id: string; estado: string; cantidad: number; precioUnitario: string;
  menuItem?: { nombre: string } | null;
};
type Pedido = {
  id: string; estado: string; numero: number;
  items: ItemPedido[];
};
type Sesion = {
  id: string; token: string; estado: string;
  pedidos: Pedido[];
};
type Mesa = {
  id: string; nombre: string; estado: string;
  sesiones: Sesion[];
};
type ItemEstacion = {
  id: string; estado: string; cantidad: number;
  menuItem: { nombre: string } | null;
  pedido: { mesa: { nombre: string } | null } | null;
};
type ItemSinEstacion = {
  id: string; estado: string; cantidad: number;
  menuItem: { nombre: string } | null;
  pedido: {
    mesa:   { nombre: string } | null;
    sesion: { id: string } | null;
  } | null;
};
type Promo = { id: string; titulo: string; emoji: string | null };
type Alerta = {
  id:         string;
  tipo:       "listo" | "cuenta" | "nuevo_pedido";
  mesaId:     string;
  mesaNombre: string;
  sesionId:   string;
  texto:      string;
  ts:         number;
};

// ── Helpers ───────────────────────────────────────────────
function calcularTotal(sesion: Sesion) {
  return sesion.pedidos.reduce((acc, p) =>
    acc + p.items.reduce((a, i) => a + parseFloat(i.precioUnitario) * i.cantidad, 0), 0
  );
}
function countListos(sesion: Sesion) {
  return sesion.pedidos.flatMap(p => p.items).filter(i => i.estado === "LISTO").length;
}

// ── Componente ────────────────────────────────────────────
export default function InicioClient({
  nombre, permisos, estaciones, restaurantId,
  mesasIniciales, itemsEstacionIniciales, itemsSinEstacionIniciales, promos,
}: {
  nombre:                      string;
  permisos:                    PermisosUser;
  estaciones:                  string[];
  restaurantId:                string;
  mesasIniciales:              Mesa[];
  itemsEstacionIniciales:      ItemEstacion[];
  itemsSinEstacionIniciales:   ItemSinEstacion[];
  promos:                      Promo[];
}) {
  const router = useRouter();
  const [mesas, setMesas]                   = useState<Mesa[]>(mesasIniciales);
  const [alertas, setAlertas]               = useState<Alerta[]>([]);
  const [itemsKds, setItemsKds]             = useState<ItemEstacion[]>(itemsEstacionIniciales);
  const [itemsDespacho, setItemsDespacho]   = useState<ItemSinEstacion[]>(itemsSinEstacionIniciales);

  const puedeMesas = permisos.puedeAbrirMesas || permisos.puedeTomarPedidos || permisos.puedeVerTodasLasMesas;
  const puedeKds   = estaciones.length > 0;
  const puedeCaja  = permisos.puedeCobrar || permisos.puedeCerrarCuenta;

  // ── Alertas ───────────────────────────────────────────
  function addAlerta(alerta: Alerta) {
    setAlertas(prev => {
      const sin = prev.filter(a => a.id !== alerta.id);
      return [alerta, ...sin].slice(0, 10);
    });
  }
  function removeAlerta(id: string) {
    setAlertas(prev => prev.filter(a => a.id !== id));
  }

  // ── SSE handlers ──────────────────────────────────────
  const handleItemUpdate = useCallback((data: unknown) => {
    const { itemId, pedidoId, sesionId, mesaId, mesaNombre, estado, nombreItem, estacionId } = data as {
      itemId: string; pedidoId: string; sesionId: string;
      mesaId: string; mesaNombre?: string; estado: string;
      nombreItem?: string; estacionId?: string | null;
    };

    // Actualizar estado en mesas
    setMesas(prev => prev.map(m =>
      m.id === mesaId
        ? {
            ...m,
            sesiones: m.sesiones.map(s =>
              s.id === sesionId
                ? { ...s, pedidos: s.pedidos.map(p =>
                    p.id === pedidoId
                      ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado } : i) }
                      : p
                  )}
                : s
            ),
          }
        : m
    ));

    // Ítem LISTO sin estación → agregar a sección de despacho
    if (estado === "LISTO" && !estacionId && puedeMesas) {
      setItemsDespacho(prev => {
        if (prev.some(i => i.id === itemId)) return prev;
        const nuevo: ItemSinEstacion = {
          id: itemId,
          estado: "LISTO",
          cantidad: 1, // el broadcast no trae cantidad; se actualiza con el dato real si se necesita
          menuItem: nombreItem ? { nombre: nombreItem } : null,
          pedido: {
            mesa:   mesaNombre ? { nombre: mesaNombre } : null,
            sesion: { id: sesionId },
          },
        };
        return [nuevo, ...prev];
      });
    }

    // Ítem ENTREGADO → quitar de despacho
    if (estado === "ENTREGADO") {
      setItemsDespacho(prev => prev.filter(i => i.id !== itemId));
    }

    // Alerta si el ítem está listo (con estación) y el usuario es mesero
    if (estado === "LISTO" && estacionId && puedeMesas) {
      addAlerta({
        id:         `listo-${itemId}`,
        tipo:       "listo",
        mesaId,
        mesaNombre: mesaNombre ?? "Mesa",
        sesionId,
        texto:      `${mesaNombre ?? "Mesa"} — ${nombreItem ?? "Ítem"} listo`,
        ts:         Date.now(),
      });
    }
  }, [puedeMesas]);

  const handlePedidoNuevo = useCallback((data: unknown) => {
    const { sesionId, mesaId, mesaNombre } = data as {
      sesionId: string; mesaId: string; mesaNombre?: string;
    };
    if (puedeKds) {
      addAlerta({
        id:         `pedido-${sesionId}-${Date.now()}`,
        tipo:       "nuevo_pedido",
        mesaId,
        mesaNombre: mesaNombre ?? "Mesa",
        sesionId,
        texto:      `${mesaNombre ?? "Mesa"} — nuevo pedido`,
        ts:         Date.now(),
      });
    }
  }, [puedeKds]);

  const handleCuentaSolicitada = useCallback((data: unknown) => {
    const { sesionId, mesaId, mesaNombre } = data as {
      sesionId: string; mesaId: string; mesaNombre?: string;
    };
    if (puedeMesas || puedeCaja) {
      addAlerta({
        id:         `cuenta-${sesionId}`,
        tipo:       "cuenta",
        mesaId,
        mesaNombre: mesaNombre ?? "Mesa",
        sesionId,
        texto:      `${mesaNombre ?? "Mesa"} — pide la cuenta`,
        ts:         Date.now(),
      });
    }
  }, [puedeMesas, puedeCaja]);

  const handleMesaUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleSesionCerrada = useCallback((data: unknown) => {
    const { mesaId, sesionId } = data as { mesaId: string; sesionId: string };
    setMesas(prev => prev.map(m =>
      m.id === mesaId
        ? { ...m, sesiones: m.sesiones.filter(s => s.id !== sesionId), estado: "LIBRE" }
        : m
    ));
    removeAlerta(`cuenta-${sesionId}`);
    // Limpiar ítems de despacho de esa sesión
    setItemsDespacho(prev => prev.filter(i => i.pedido?.sesion?.id !== sesionId));
  }, []);

  useSSE(restaurantId, {
    "item:update":        handleItemUpdate,
    "pedido:nuevo":       handlePedidoNuevo,
    "cuenta:solicitada":  handleCuentaSolicitada,
    "mesa:update":        handleMesaUpdate,
    "sesion:cerrada":     handleSesionCerrada,
  });

  // ── Datos derivados ───────────────────────────────────
  const mesasOcupadas = mesas.filter(m => m.sesiones.length > 0);
  const mesasLibres   = mesas.filter(m => m.sesiones.length === 0);

  const TIPO_CONFIG = {
    listo:        { icon: "✓",  color: "var(--color-success)", bg: "var(--color-success-subtle)" },
    cuenta:       { icon: "💳", color: "var(--color-info)",    bg: "var(--color-info-subtle)"    },
    nuevo_pedido: { icon: "🆕", color: "var(--accent)",        bg: "var(--accent-subtle)"        },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Header ── */}
      <div className="px-4 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Komand</p>
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Hola, {nombre} 👋
          </p>
        </div>
        <button onClick={() => logout()}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "transparent" }}>
          Salir
        </button>
      </div>

      <div className="p-4 space-y-5 pb-28">
        {/* ── Alertas activas ── */}
        {alertas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              🔔 Alertas activas
            </p>
            {alertas.map(a => {
              const cfg = TIPO_CONFIG[a.tipo];
              return (
                <div key={a.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                  <span className="text-lg shrink-0">{cfg.icon}</span>
                  <p className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {a.texto}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.sesionId && (
                      <button onClick={() => router.push(`/mesa/${a.sesionId}`)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: cfg.color, color: "#fff" }}>
                        Ver
                      </button>
                    )}
                    <button onClick={() => removeAlerta(a.id)}
                      className="text-xs" style={{ color: "var(--text-muted)" }}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Despacho sin estación ── */}
        {puedeMesas && itemsDespacho.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              🛎 Para llevar a mesa
            </p>
            <div className="space-y-2">
              {itemsDespacho.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{
                    background: "var(--color-warning-subtle)",
                    border: "1px solid var(--color-warning)",
                  }}>
                  <span className="text-lg shrink-0">🍽</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {item.menuItem?.nombre ?? "Ítem"}
                      {item.cantidad > 1 && (
                        <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                          ×{item.cantidad}
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.pedido?.mesa?.nombre ?? "Mesa"}
                    </p>
                  </div>
                  {item.pedido?.sesion?.id && (
                    <button
                      onClick={() => router.push(`/mesa/${item.pedido!.sesion!.id}`)}
                      className="text-xs px-2 py-1 rounded-lg shrink-0"
                      style={{ background: "var(--color-warning)", color: "#fff" }}>
                      Ver
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Promos ── */}
        {promos.length > 0 && (
          <div className="space-y-2">
            {promos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--accent-subtle)", border: "1px solid rgba(232,93,4,0.2)" }}>
                <span className="text-xl">{p.emoji ?? "🎉"}</span>
                <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>{p.titulo}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Mis mesas ── */}
        {puedeMesas && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Mesas activas
              </p>
              <button onClick={() => router.push("/mesas")}
                className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                Ver todas →
              </button>
            </div>
            {mesasOcupadas.length === 0 ? (
              <div className="rounded-xl p-6 text-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-3xl mb-2">🍽</p>
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                  No hay mesas ocupadas
                </p>
                {permisos.puedeAbrirMesas && (
                  <button onClick={() => router.push("/mesas")} className="btn btn-primary btn-sm">
                    Abrir mesa
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mesasOcupadas.map(m => {
                  const sesion      = m.sesiones[0];
                  const total       = calcularTotal(sesion);
                  const listos      = countListos(sesion);
                  const pidesCuenta = alertas.some(a => a.mesaId === m.id && a.tipo === "cuenta");
                  const tieneAlerta = listos > 0 || pidesCuenta;
                  return (
                    <button key={m.id}
                      onClick={() => router.push(`/mesa/${sesion.id}`)}
                      className="text-left rounded-xl p-3 transition-all"
                      style={{
                        background: pidesCuenta
                          ? "var(--color-info-subtle)"
                          : tieneAlerta
                            ? "var(--color-warning-subtle)"
                            : "var(--surface)",
                        border: pidesCuenta
                          ? "1px solid var(--color-info)"
                          : tieneAlerta
                            ? "1px solid var(--color-warning)"
                            : "1px solid var(--border)",
                      }}>
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {m.nombre}
                        </span>
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{
                          background: pidesCuenta
                            ? "var(--color-info)"
                            : tieneAlerta
                              ? "var(--color-warning)"
                              : "var(--color-success)",
                          display: "inline-block",
                        }} />
                      </div>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        {sesion.pedidos.length} pedido{sesion.pedidos.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        ${total.toFixed(2)}
                      </p>
                      {pidesCuenta && (
                        <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-info)" }}>
                          💳 Pide la cuenta
                        </p>
                      )}
                      {!pidesCuenta && listos > 0 && (
                        <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-warning)" }}>
                          🔔 {listos} listo{listos !== 1 ? "s" : ""}
                        </p>
                      )}
                    </button>
                  );
                })}
                {mesasLibres.length > 0 && permisos.puedeAbrirMesas && (
                  <button onClick={() => router.push("/mesas")}
                    className="rounded-xl p-3 flex flex-col items-center justify-center gap-1"
                    style={{ background: "transparent", border: "1px dashed var(--border)", minHeight: "90px" }}>
                    <span className="text-2xl" style={{ color: "var(--text-muted)" }}>+</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {mesasLibres.length} libre{mesasLibres.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Estación / KDS ── */}
        {puedeKds && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Mi estación
            </p>
            <button onClick={() => router.push("/kds")}
              className="w-full rounded-xl p-4 flex items-center justify-between transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">👨‍🍳</span>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Cocina / Estación
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {itemsKds.length > 0
                      ? `${itemsKds.length} ítem${itemsKds.length !== 1 ? "s" : ""} pendiente${itemsKds.length !== 1 ? "s" : ""}`
                      : "Sin pedidos pendientes"}
                  </p>
                </div>
              </div>
              {itemsKds.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: "var(--accent)" }}>
                  {itemsKds.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Acceso rápido ── */}
        {(puedeMesas || puedeCaja) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Acceso rápido
            </p>
            <div className="grid grid-cols-2 gap-3">
              {puedeMesas && (
                <button onClick={() => router.push("/mesas")}
                  className="rounded-xl p-4 text-left"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-2xl block mb-2">🧑‍🍽️</span>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Mesas</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {mesasOcupadas.length} ocupada{mesasOcupadas.length !== 1 ? "s" : ""}
                  </p>
                </button>
              )}
              {puedeCaja && (
                <button onClick={() => router.push("/caja")}
                  className="rounded-xl p-4 text-left"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-2xl block mb-2">💰</span>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Caja</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Cobros del día
                  </p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}