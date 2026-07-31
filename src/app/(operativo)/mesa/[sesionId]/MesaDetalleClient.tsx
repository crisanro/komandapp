"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { crearPedido, actualizarEstadoItem, cancelarItem } from "@/actions/pedidos";
import { cerrarSesion, abrirMesa } from "@/actions/sesiones";
import QRSesion from "@/components/mesero/QRSesion";

type MenuItem    = { id: string; nombre: string; precio: string; descripcion: string | null; agotado: boolean; tags: string[] | null; imagenUrl: string | null };
type Categoria   = { id: string; nombre: string; items: MenuItem[] };
type ItemPedido  = { id: string; cantidad: number; nota: string | null; estado: string; precioUnitario: string; menuItem?: { nombre: string } | null };
type Pedido      = { id: string; estado: string; numero: number; items: ItemPedido[]; creadoEn: Date };
type Sesion      = { id: string; token: string; mesa?: { id: string; nombre: string } | null; pedidos: Pedido[] };
type CarritoItem = { menuItemId: string; nombre: string; precio: number; cantidad: number; nota: string };

const ESTADO_STYLES: Record<string, { color: string; label: string }> = {
  EN_COLA:        { color: "var(--text-muted)",    label: "En cola"        },
  EN_PREPARACION: { color: "var(--color-info)",    label: "En preparación" },
  LISTO:          { color: "var(--color-warning)", label: "🔔 Listo"       },
  ENTREGADO:      { color: "var(--text-muted)",    label: "✓ Entregado"    },
  CANCELADO:      { color: "var(--color-error)",   label: "✕ Cancelado"    },
};

export default function MesaDetalleClient({
  sesion, todasSesiones, menu, restaurantId, mesaId,
}: {
  sesion:        Sesion;
  todasSesiones: Sesion[];
  menu:          Categoria[];
  restaurantId:  string;
  mesaId:        string;
}) {
  const [sesionActiva, setSesionActiva]    = useState<Sesion>(sesion);
  const [sesiones]                          = useState<Sesion[]>(todasSesiones);
  const [modo, setModo]                    = useState<"resumen" | "anotar">("resumen");
  const [carrito, setCarrito]              = useState<CarritoItem[]>([]);
  const [enviando, setEnviando]            = useState(false);
  const [cerrando, setCerrando]            = useState<string | null>(null);
  const [agregandoSubcuenta, setAgregando] = useState(false);
  const [showConfirm, setShowConfirm]      = useState<string | null>(null);
  const [showQR, setShowQR]                = useState<string | null>(null);
  const [entregando, setEntregando]        = useState<string | null>(null);
  const [cancelando, setCancelando]        = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel]  = useState<ItemPedido & { sesionId: string; pedidoId: string } | null>(null);
  const [pedidosState, setPedidos]         = useState<Record<string, Pedido[]>>(
    Object.fromEntries(todasSesiones.map(s => [s.id, s.pedidos]))
  );

  const router = useRouter();

  const handleItemUpdate = useCallback((data: unknown) => {
    const { itemId, pedidoId, sesionId, estado } = data as {
      itemId: string; pedidoId: string; sesionId: string; estado: string;
    };
    setPedidos(prev => ({
      ...prev,
      [sesionId]: (prev[sesionId] ?? []).map(p =>
        p.id === pedidoId
          ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado } : i) }
          : p
      ),
    }));
  }, []);

  useSSE(restaurantId, { "item:update": handleItemUpdate });

  async function handleEntregarItem(itemId: string, sesionId: string, pedidoId: string) {
    setEntregando(itemId);
    setPedidos(prev => ({
      ...prev,
      [sesionId]: (prev[sesionId] ?? []).map(p =>
        p.id === pedidoId
          ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: "ENTREGADO" } : i) }
          : p
      ),
    }));
    const result = await actualizarEstadoItem(itemId, "ENTREGADO");
    setEntregando(null);
    if (result?.error) {
      setPedidos(prev => ({
        ...prev,
        [sesionId]: (prev[sesionId] ?? []).map(p =>
          p.id === pedidoId
            ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: "LISTO" } : i) }
            : p
        ),
      }));
    }
  }

  async function handleCancelarItem(itemId: string, sesionId: string, pedidoId: string) {
    setCancelando(itemId);
    setPedidos(prev => ({
      ...prev,
      [sesionId]: (prev[sesionId] ?? []).map(p =>
        p.id === pedidoId
          ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: "CANCELADO" } : i) }
          : p
      ),
    }));
    const result = await cancelarItem(itemId);
    setCancelando(null);
    setConfirmCancel(null);
    if (result?.error) {
      setPedidos(prev => ({
        ...prev,
        [sesionId]: (prev[sesionId] ?? []).map(p =>
          p.id === pedidoId
            ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado: "EN_COLA" } : i) }
            : p
        ),
      }));
      alert(result.error);
    }
  }

  async function handleAgregarSubcuenta() {
    setAgregando(true);
    const result = await abrirMesa(mesaId);
    setAgregando(false);
    if (result?.error) { alert(result.error); return; }
    router.refresh();
  }

  function agregarItem(item: MenuItem) {
    const existe = carrito.find(c => c.menuItemId === item.id && !c.nota);
    if (existe) {
      setCarrito(prev => prev.map(c =>
        c.menuItemId === item.id && !c.nota ? { ...c, cantidad: c.cantidad + 1 } : c
      ));
    } else {
      setCarrito(prev => [...prev, {
        menuItemId: item.id, nombre: item.nombre,
        precio: parseFloat(item.precio), cantidad: 1, nota: "",
      }]);
    }
  }

  function quitarItem(menuItemId: string) {
    setCarrito(prev => {
      const idx = prev.findLastIndex(c => c.menuItemId === menuItemId);
      if (idx === -1) return prev;
      const nuevo = [...prev];
      if (nuevo[idx].cantidad > 1) nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad - 1 };
      else nuevo.splice(idx, 1);
      return nuevo;
    });
  }

  function cantidadEnCarrito(menuItemId: string) {
    return carrito.filter(c => c.menuItemId === menuItemId).reduce((a, c) => a + c.cantidad, 0);
  }

  async function handleEnviarPedido() {
    if (carrito.length === 0) return;
    setEnviando(true);
    const result = await crearPedido(
      sesionActiva.id,
      carrito.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad, nota: c.nota || undefined })),
    );
    setEnviando(false);
    if (result?.error) { alert(result.error); return; }
    setCarrito([]);
    setModo("resumen");
    router.refresh();
  }

  async function handleCerrarSesion(sesionId: string) {
    setCerrando(sesionId);
    const result = await cerrarSesion(sesionId);
    setCerrando(null);
    setShowConfirm(null);
    if (result?.error) { alert(result.error); return; }
    if (sesiones.length <= 1) router.push("/mesas");
    else router.refresh();
  }

  function getTotalSesion(sesionId: string) {
    return (pedidosState[sesionId] ?? []).reduce((acc, p) =>
      acc + p.items
        .filter(i => i.estado !== "CANCELADO")
        .reduce((a, i) => a + parseFloat(i.precioUnitario) * i.cantidad, 0), 0
    );
  }

  function getItemsListos(sesionId: string) {
    return (pedidosState[sesionId] ?? [])
      .flatMap(p => p.items)
      .filter(i => i.estado === "LISTO").length;
  }

  const totalCarrito = carrito.reduce((acc, c) => acc + c.precio * c.cantidad, 0);

  // ── Render sesión ─────────────────────────────────────
  function renderSesion(s: Sesion, idx: number) {
    const pedidosSesion = pedidosState[s.id] ?? [];
    const total         = getTotalSesion(s.id);
    const listosCount   = getItemsListos(s.id);

    return (
      <div key={s.id} className="card" style={{
        padding: 0, overflow: "hidden",
        borderColor: listosCount > 0 ? "var(--color-warning)" : "var(--border)",
      }}>
        {/* Header sesión */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-raised)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Cuenta {idx + 1}
            </span>
            {listosCount > 0 && (
              <span className="badge badge-yellow">
                🔔 {listosCount} listo{listosCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            ${total.toFixed(2)}
          </span>
        </div>

        {/* Sin pedidos */}
        {pedidosSesion.length === 0 && (
          <div className="px-4 py-5 text-center">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Sin pedidos aún</p>
            <button onClick={() => setShowQR(s.token)} className="btn btn-primary btn-sm w-full">
              📲 Mostrar QR al cliente
            </button>
          </div>
        )}

        {/* Con pedidos */}
        {pedidosSesion.length > 0 && (
          <div>
            {pedidosSesion.map(pedido => (
              <div key={pedido.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="px-4 py-2">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Pedido #{pedido.numero}
                  </span>
                </div>
                {pedido.items.map(item => {
                  const cancelado = item.estado === "CANCELADO";
                  return (
                    <div key={item.id} className="px-4 py-2 flex items-center gap-3"
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: item.estado === "LISTO"
                          ? "rgba(245,158,11,0.06)"
                          : cancelado
                            ? "rgba(239,68,68,0.04)"
                            : "transparent",
                        opacity: cancelado ? 0.5 : 1,
                      }}>
                      <span className="text-xs w-5 shrink-0"
                        style={{
                          color: cancelado ? "var(--color-error)" : "var(--text-muted)",
                          textDecoration: cancelado ? "line-through" : "none",
                        }}>
                        {item.cantidad}×
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm"
                          style={{
                            color: "var(--text-primary)",
                            textDecoration: cancelado ? "line-through" : "none",
                          }}>
                          {item.menuItem?.nombre}
                        </p>
                        {item.nota && (
                          <p className="text-xs" style={{ color: "var(--accent)" }}>{item.nota}</p>
                        )}
                      </div>

                      {/* Acciones por estado */}
                      {item.estado === "LISTO" ? (
                        <button
                          onClick={() => handleEntregarItem(item.id, s.id, pedido.id)}
                          disabled={entregando === item.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0"
                          style={{ background: "var(--color-warning)", color: "#000" }}>
                          {entregando === item.id ? "..." : "✓ Entregué"}
                        </button>
                      ) : item.estado === "EN_COLA" ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>En cola</span>
                          <button
                            onClick={() => setConfirmCancel({ ...item, sesionId: s.id, pedidoId: pedido.id })}
                            className="text-xs w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                            style={{ color: "var(--color-error)", background: "rgba(239,68,68,0.1)" }}
                            title="Cancelar ítem">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs shrink-0"
                          style={{ color: ESTADO_STYLES[item.estado]?.color ?? "var(--text-muted)" }}>
                          {ESTADO_STYLES[item.estado]?.label ?? item.estado}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Acciones */}
            <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setShowQR(s.token)} className="btn btn-secondary btn-sm flex-1">
                📲 QR
              </button>
              <button onClick={() => { setSesionActiva(s); setModo("anotar"); }}
                className="btn btn-secondary btn-sm flex-1">
                ✏️ Anotar
              </button>
              <button onClick={() => setShowConfirm(s.id)} className="btn btn-danger btn-sm flex-1">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Confirm cierre */}
        {showConfirm === s.id && (
          <div className="px-4 py-4" style={{
            background: "var(--color-error-subtle)",
            borderTop: "1px solid rgba(239,68,68,0.2)",
          }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              ¿Cerrar Cuenta {idx + 1}?
            </p>
            <p className="text-xl font-bold mb-3" style={{ color: "var(--color-error)" }}>
              Total: ${total.toFixed(2)}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(null)} className="btn btn-secondary flex-1 btn-sm">
                Cancelar
              </button>
              <button onClick={() => handleCerrarSesion(s.id)} disabled={cerrando === s.id}
                className="btn btn-danger flex-1 btn-sm">
                {cerrando === s.id ? "Cerrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Modal confirmar cancelación */}
      {confirmCancel && (
        <div className="modal-overlay" onClick={() => setConfirmCancel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              ¿Cancelar ítem?
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {confirmCancel.cantidad}× {confirmCancel.menuItem?.nombre}
            </p>
            <p className="text-xs mb-5 p-3 rounded-xl"
              style={{ background: "var(--color-warning-subtle)", color: "var(--color-warning)" }}>
              ⚠️ Solo puedes cancelar ítems que aún no han sido tomados por cocina.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)} className="btn btn-secondary flex-1">
                No, mantener
              </button>
              <button
                onClick={() => handleCancelarItem(confirmCancel.id, confirmCancel.sesionId, confirmCancel.pedidoId)}
                disabled={cancelando === confirmCancel.id}
                className="btn flex-1"
                style={{ background: "var(--color-error)", color: "#fff", border: "none" }}>
                {cancelando === confirmCancel.id ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/mesas")} className="btn btn-ghost btn-icon">←</button>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {sesion.mesa?.nombre}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {sesiones.length} cuenta{sesiones.length !== 1 ? "s" : ""} activa{sesiones.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={handleAgregarSubcuenta} disabled={agregandoSubcuenta} className="btn btn-secondary btn-sm">
          {agregandoSubcuenta ? "..." : "+ Subcuenta"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["resumen", "anotar"] as const).map(m => (
          <button key={m} onClick={() => setModo(m)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color:        modo === m ? "var(--accent)" : "var(--text-muted)",
              borderBottom: modo === m ? "2px solid var(--accent)" : "2px solid transparent",
            }}>
            {m === "resumen"
              ? "Cuentas"
              : `Anotar pedido${carrito.length > 0 ? ` (${carrito.reduce((a, c) => a + c.cantidad, 0)})` : ""}`
            }
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {modo === "resumen" && (
          <div className="p-4 space-y-4">
            {sesiones.map((s, idx) => renderSesion(s, idx))}
          </div>
        )}

        {modo === "anotar" && (
          <div className="pb-32">
            {sesiones.length > 1 && (
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Anotar en:</p>
                <div className="flex gap-2">
                  {sesiones.map((s, idx) => (
                    <button key={s.id} onClick={() => setSesionActiva(s)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={sesionActiva.id === s.id
                        ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                        : { background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }
                      }>
                      Cuenta {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {menu.map(cat => (
              <div key={cat.id}>
                <div className="px-4 py-2 sticky top-0" style={{ background: "var(--surface)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    {cat.nombre}
                  </p>
                </div>
                {cat.items.map(item => {
                  const qty = cantidadEnCarrito(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: "1px solid var(--border-subtle)", opacity: item.agotado ? 0.4 : 1 }}>
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.nombre} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl"
                          style={{ background: "var(--surface-raised)" }}>🍽</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{item.nombre}</p>
                        {item.descripcion && (
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{item.descripcion}</p>
                        )}
                        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--accent)" }}>
                          ${parseFloat(item.precio).toFixed(2)}
                        </p>
                      </div>
                      {item.agotado ? (
                        <span className="text-xs shrink-0" style={{ color: "var(--color-error)" }}>Agotado</span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          {qty > 0 && (
                            <button onClick={() => quitarItem(item.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                              style={{ background: "var(--surface-raised)", color: "var(--text-primary)" }}>
                              −
                            </button>
                          )}
                          {qty > 0 && (
                            <span className="text-sm font-semibold w-4 text-center" style={{ color: "var(--text-primary)" }}>
                              {qty}
                            </span>
                          )}
                          <button onClick={() => agregarItem(item)}
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center text-lg"
                            style={{ background: "var(--accent)" }}>
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal QR */}
      {showQR && (
        <QRSesion
          token={showQR}
          mesaNombre={sesion.mesa?.nombre ?? "Mesa"}
          onCerrar={() => setShowQR(null)}
        />
      )}

      {/* Footer carrito */}
      {modo === "anotar" && carrito.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <p className="text-xs text-center mb-2" style={{ color: "var(--text-muted)" }}>
            Anotando en Cuenta {sesiones.findIndex(s => s.id === sesionActiva.id) + 1}
          </p>
          <button onClick={handleEnviarPedido} disabled={enviando}
            className="btn btn-primary w-full btn-lg flex items-center justify-between px-5">
            <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: "rgba(0,0,0,0.2)" }}>
              {carrito.reduce((a, c) => a + c.cantidad, 0)}
            </span>
            <span>{enviando ? "Enviando a cocina..." : "Enviar a cocina"}</span>
            <span className="font-bold">${totalCarrito.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}