"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { abrirMesa } from "@/actions/sesiones";
import { logout } from "@/actions/auth";
import CambiarVista from "@/components/operativo/CambiarVista";
import BannerPromociones from "@/components/shared/BannerPromociones";
import type { PermisosUser } from "@/lib/auth";

type Promo  = { id: string; titulo: string; descripcion: string | null; emoji: string | null };
type Item   = { id: string; estado: string; menuItem?: { nombre: string } | null };
type Pedido = { id: string; estado: string; items: Item[] };
type Sesion = { id: string; token: string; estado: string; pedidos: Pedido[] };
type Mesa   = {
  id: string; nombre: string; descripcion: string | null;
  capacidad: number | null; estado: string; sesiones: Sesion[];
};
type Pendiente = {
  tipo:        "listo" | "cuenta" | "preparacion";
  mesaId:      string;
  mesaNombre:  string;
  sesionToken: string;
  detalle:     string;
};

export default function MesasOperativoClient({
  mesasIniciales, restaurantId, restaurantSlug, userId, nombreMesero,
  permisos, esAdmin, vistaActiva, estaciones, promos,
}: {
  mesasIniciales: Mesa[];
  restaurantId:   string;
  restaurantSlug: string;
  userId:         string | null;
  nombreMesero:   string;
  permisos:       PermisosUser | null;
  esAdmin:        boolean;
  vistaActiva:    "mesas" | "kds" | "caja";
  estaciones:     string[];
  promos:         Promo[];
}) {
  const [mesas,   setMesas]   = useState<Mesa[]>(mesasIniciales);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [cuentasSolicitadas, setCuentas] = useState<Set<string>>(new Set());
  const router = useRouter();

  // ── SSE handlers ──────────────────────────────────────
  const handleMesaUpdate = useCallback((data: unknown) => {
    const { mesaId, estado, sesionId, token } = data as {
      mesaId: string; estado: string; sesionId?: string; token?: string;
    };
    setMesas(prev => prev.map(m => {
      if (m.id !== mesaId) return m;
      if (estado === "LIBRE") return { ...m, estado, sesiones: [] };
      if (estado === "OCUPADA" && sesionId && token) {
        return {
          ...m, estado,
          sesiones: [...m.sesiones, { id: sesionId, token, estado: "ACTIVA", pedidos: [] }],
        };
      }
      return { ...m, estado };
    }));
  }, []);

  const handleItemUpdate = useCallback((data: unknown) => {
    const { mesaId, sesionId, pedidoId, itemId, estado, nombreItem } = data as {
      mesaId: string; sesionId: string; pedidoId: string;
      itemId: string; estado: string; nombreItem?: string;
    };
    setMesas(prev => prev.map(m =>
      m.id !== mesaId ? m : {
        ...m,
        sesiones: m.sesiones.map(s =>
          s.id !== sesionId ? s : {
            ...s,
            pedidos: s.pedidos.map(p =>
              p.id !== pedidoId ? p : {
                ...p,
                items: p.items.map(i =>
                  i.id === itemId ? { ...i, estado } : i
                ),
              }
            ),
          }
        ),
      }
    ));
  }, []);

  const handlePedidoNuevo = useCallback((data: unknown) => {
    const { mesaId, sesionId, pedidoId, items } = data as {
      mesaId: string; sesionId: string; pedidoId: string;
      items: { id: string; estado: string; menuItem?: { nombre: string } }[];
    };
    setMesas(prev => prev.map(m =>
      m.id !== mesaId ? m : {
        ...m,
        sesiones: m.sesiones.map(s =>
          s.id !== sesionId ? s : {
            ...s,
            pedidos: [...s.pedidos, { id: pedidoId, estado: "ENVIADO", items }],
          }
        ),
      }
    ));
  }, []);

  const handleCuentaSolicitada = useCallback((data: unknown) => {
    const { sesionId } = data as { sesionId: string };
    setCuentas(prev => new Set([...prev, sesionId]));
  }, []);

  const handleSesionCerrada = useCallback((data: unknown) => {
    const { mesaId, sesionId } = data as { mesaId: string; sesionId: string };
    setMesas(prev => prev.map(m =>
      m.id !== mesaId ? m : {
        ...m,
        sesiones: m.sesiones.filter(s => s.id !== sesionId),
      }
    ));
  }, []);

  useSSE(restaurantId, {
    "mesa:update":       handleMesaUpdate,
    "item:update":       handleItemUpdate,
    "pedido:nuevo":      handlePedidoNuevo,
    "cuenta:solicitada": handleCuentaSolicitada,
    "sesion:cerrada":    handleSesionCerrada,
  });

  // ── Pendientes ─────────────────────────────────────────
  function getPendientes(): Pendiente[] {
    const lista: Pendiente[] = [];
    for (const mesa of mesas) {
      for (const sesion of mesa.sesiones) {
        if (cuentasSolicitadas.has(sesion.id)) {
          lista.push({
            tipo: "cuenta", mesaId: mesa.id, mesaNombre: mesa.nombre,
            sesionToken: sesion.token, detalle: "Pide la cuenta",
          });
          continue;
        }
        const todosItems = sesion.pedidos.flatMap(p => p.items);
        const listos     = todosItems.filter(i => i.estado === "LISTO");
        const enPrep     = todosItems.filter(i => i.estado === "EN_PREPARACION");
        if (listos.length > 0) {
          lista.push({
            tipo: "listo", mesaId: mesa.id, mesaNombre: mesa.nombre,
            sesionToken: sesion.token,
            detalle: listos.length === 1
              ? `${listos[0].menuItem?.nombre ?? "1 ítem"} listo`
              : `${listos.length} ítems listos para llevar`,
          });
        } else if (enPrep.length > 0) {
          lista.push({
            tipo: "preparacion", mesaId: mesa.id, mesaNombre: mesa.nombre,
            sesionToken: sesion.token,
            detalle: `${enPrep.length} ítem${enPrep.length !== 1 ? "s" : ""} en preparación`,
          });
        }
      }
    }
    const orden = { cuenta: 0, listo: 1, preparacion: 2 };
    return lista.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  }

  function getPendienteStyle(tipo: string) {
    switch (tipo) {
      case "cuenta":      return { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",  icon: "💳", color: "#93C5FD" };
      case "listo":       return { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",  icon: "🔔", color: "#FCD34D" };
      case "preparacion": return { background: "var(--surface)",        border: "1px solid var(--border)",         icon: "⏳", color: "var(--text-muted)" };
      default:            return { background: "var(--surface)",        border: "1px solid var(--border)",         icon: "⏳", color: "var(--text-muted)" };
    }
  }

  // ── Mesas ──────────────────────────────────────────────
  async function handleAbrirMesa(mesaId: string) {
    setAbriendo(mesaId);
    const result = await abrirMesa(mesaId);
    setAbriendo(null);
    if (result?.error) { alert(result.error); return; }
    if (result?.ok && result.token) {
      router.push(`/${restaurantSlug}/operativo/mesa/${result.token}`);
    }
  }

  function getMesaStyle(mesa: Mesa) {
    const ocupada     = mesa.sesiones.length > 0;
    const tieneListos = mesa.sesiones.some(s => s.pedidos.some(p => p.items.some(i => i.estado === "LISTO")));
    const tieneCuenta = mesa.sesiones.some(s => cuentasSolicitadas.has(s.id));
    if (!ocupada)    return { borderColor: "var(--border)",        dotColor: "var(--border)",        label: "Libre",     dotPulse: false };
    if (tieneCuenta) return { borderColor: "var(--color-info)",    dotColor: "var(--color-info)",    label: "💳 Cuenta", dotPulse: true  };
    if (tieneListos) return { borderColor: "var(--color-warning)", dotColor: "var(--color-warning)", label: "🔔 Listo",  dotPulse: true  };
    return             { borderColor: "var(--accent)",             dotColor: "var(--accent)",        label: `${mesa.sesiones.length} cuenta${mesa.sesiones.length > 1 ? "s" : ""}`, dotPulse: false };
  }

  const pendientes = getPendientes();
  const ocupadas   = mesas.filter(m => m.sesiones.length > 0).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)" }}>
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
              {nombreMesero}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {ocupadas} mesa{ocupadas !== 1 ? "s" : ""} ocupada{ocupadas !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CambiarVista
            vistaActiva={vistaActiva} permisos={permisos}
            esAdmin={esAdmin} estaciones={estaciones}
            slug={restaurantSlug}
          />
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">Salir</button>
          </form>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Pendientes */}
        {pendientes.length > 0 && (
          <section className="p-3 pb-0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
              style={{ color: "var(--text-muted)" }}>
              Pendientes · {pendientes.length}
            </p>
            <div className="space-y-2">
              {pendientes.map((p, i) => {
                const style = getPendienteStyle(p.tipo);
                return (
                  <button key={i}
                    onClick={() => router.push(`/${restaurantSlug}/operativo/mesa/${p.sesionToken}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{ background: style.background, border: style.border }}>
                    <span className="text-xl shrink-0">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: style.color }}>{p.mesaNombre}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{p.detalle}</p>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>→</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Promociones */}
        {promos.length > 0 && (
          <div className="px-3 pt-3">
            <BannerPromociones promos={promos} />
          </div>
        )}

        {/* Mesas */}
        <section className="p-3">
          {pendientes.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
              style={{ color: "var(--text-muted)" }}>
              Mesas
            </p>
          )}
          {mesas.length === 0 ? (
            <div className="empty-state py-20">
              <p className="text-5xl">🪑</p>
              <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
                Sin mesas configuradas
              </p>
            </div>
          ) : (
            <div className="grid-mesas">
              {mesas.map(mesa => {
                const ocupada  = mesa.sesiones.length > 0;
                const style    = getMesaStyle(mesa);
                const cargando = abriendo === mesa.id;
                return (
                  <button key={mesa.id}
                    onClick={() => {
                      if (ocupada && mesa.sesiones.length === 1) {
                        router.push(`/${restaurantSlug}/operativo/mesa/${mesa.sesiones[0].token}`);
                      } else if (!ocupada) {
                        handleAbrirMesa(mesa.id);
                      }
                      // Si tiene múltiples sesiones no hacemos nada — el mesero elige desde pendientes
                    }}
                    disabled={cargando}
                    className="mesa-card relative"
                    style={{
                      borderColor: style.borderColor,
                      background:  ocupada ? `${style.borderColor}15` : "var(--surface)",
                    }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: style.dotColor,
                        animation:  style.dotPulse ? "pulse-orange 2s ease infinite" : "none",
                      }} />
                    <p className="text-xs font-bold leading-tight text-center"
                      style={{ color: "var(--text-primary)" }}>
                      {mesa.nombre}
                    </p>
                    <p className="text-xs font-medium leading-tight text-center"
                      style={{ color: ocupada ? "var(--accent)" : "var(--text-muted)" }}>
                      {cargando ? "..." : style.label}
                    </p>
                    {mesa.sesiones.length > 1 && (
                      <div className="absolute top-1.5 right-1.5 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold"
                        style={{ background: "var(--accent)" }}>
                        {mesa.sesiones.length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}