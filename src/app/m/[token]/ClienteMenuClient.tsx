"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";
import { crearPedido } from "@/actions/pedidos";
import { pedirCuenta } from "@/actions/sesiones";

type MenuItem   = { id: string; nombre: string; precio: string; descripcion: string | null; agotado: boolean; tags: string[] | null; imagenUrl: string | null };
type Categoria  = { id: string; nombre: string; items: MenuItem[] };
type ItemPedido = { id: string; cantidad: number; nota: string | null; estado: string; menuItem: { nombre: string } | null; precioUnitario: string };
type Pedido     = { id: string; numero: number; items: ItemPedido[] };
type Restaurant = { nombre: string; color: string | null; logoUrl: string | null; notasMenu: string | null };
type Mesa       = { nombre: string };
type Sesion     = { id: string; mesa: Mesa | null; restaurant: Restaurant | null; pedidos: Pedido[] };
type CarritoItem = { menuItemId: string; nombre: string; precio: number; cantidad: number; nota: string };

const TAG_LABEL: Record<string, string> = {
  popular: "⭐", nuevo: "🆕", vegano: "🌱",
  vegetariano: "🥦", sin_gluten: "🌾", picante: "🌶",
};

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  PENDIENTE:      { label: "Pendiente",       color: "text-gray-500" },
  EN_PREPARACION: { label: "En preparación",  color: "text-blue-400" },
  LISTO:          { label: "🔔 Listo",         color: "text-green-400" },
  ENTREGADO:      { label: "✓ Entregado",        color: "text-gray-600" },
};

export default function ClienteMenuClient({
  sesion, menu, restaurantId, token,
}: {
  sesion:       Sesion;
  menu:         Categoria[];
  restaurantId: string;
  token:        string;
}) {
  const color   = sesion.restaurant?.color ?? "#E85D04";
  const [tab, setTab]               = useState<"menu" | "pedidos">("menu");
  const [catActiva, setCatActiva]   = useState(menu[0]?.id ?? "");
  const [carrito, setCarrito]       = useState<CarritoItem[]>([]);
  const [enviando, setEnviando]     = useState(false);
  const [pedidoOk, setPedidoOk]     = useState(false);
  const [pedidosState, setPedidos]  = useState<Pedido[]>(sesion.pedidos);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [totalCuenta, setTotalCuenta] = useState<string | null>(null);
  const [notaItem, setNotaItem]     = useState<{ idx: number; valor: string } | null>(null);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll spy para tabs
  useEffect(() => {
    if (tab !== "menu") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCatActiva(entry.target.id.replace("mcat-", ""));
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    Object.values(catRefs.current).forEach(ref => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [menu, tab]);

  // SSE
  const handleItemUpdate = useCallback((data: unknown) => {
    const { itemId, pedidoId, estado } = data as { itemId: string; pedidoId: string; estado: string };
    setPedidos(prev => prev.map(p =>
      p.id === pedidoId
        ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, estado } : i) }
        : p
    ));
  }, []);
  useSSE(restaurantId, { "item:update": handleItemUpdate }, { sesionToken: token });

  // ── Carrito ──────────────────────────────────

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
      const idx = prev.findLastIndex(c => c.menuItemId === menuItemId && !c.nota);
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

  const totalCarrito = carrito.reduce((acc, c) => acc + c.precio * c.cantidad, 0);
  const totalSesion  = pedidosState.reduce((acc, p) =>
    acc + p.items.reduce((a, i) => a + parseFloat(i.precioUnitario) * i.cantidad, 0), 0
  );

  // ── Enviar ───────────────────────────────────

  async function handleEnviar() {
    if (carrito.length === 0) return;
    setEnviando(true);
    const result = await crearPedido(
      sesion.id,
      carrito.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad, nota: c.nota || undefined })),
    );
    setEnviando(false);
    if (result?.error) { alert(result.error); return; }
    setCarrito([]);
    setPedidoOk(true);
    setTab("pedidos");
    setTimeout(() => setPedidoOk(false), 4000);
  }

  async function handlePedirCuenta() {
    setSolicitando(true);
    const result = await pedirCuenta(token);
    setSolicitando(false);
    if (result?.ok) {
      setCuentaSolicitada(true);
      setTotalCuenta(result.total ?? null);
    }
  }

  function scrollToCat(catId: string) {
    const el = catRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setCatActiva(catId);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative px-5 pt-10 pb-8 flex items-end gap-4">
          {sesion.restaurant?.logoUrl ? (
            <img src={sesion.restaurant.logoUrl} alt=""
              className="w-14 h-14 rounded-xl object-cover border-2 border-white/20 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 border-white/20 shrink-0"
              style={{ backgroundColor: color }}>
              {sesion.restaurant?.nombre[0]}
            </div>
          )}
          <div>
            <p className="text-xs text-white/60 mb-0.5">{sesion.mesa?.nombre}</p>
            <h1 className="text-xl font-bold text-white">{sesion.restaurant?.nombre}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-gray-950 border-b border-gray-800">
        <div className="flex">
          {(["menu", "pedidos"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                tab === t ? "text-white border-b-2" : "text-gray-500"
              }`}
              style={tab === t ? { borderColor: color } : {}}>
              {t === "menu" ? "Menú" : `Mis pedidos${pedidosState.length > 0 ? ` (${pedidosState.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Tabs de categorías — solo en tab menú */}
        {tab === "menu" && menu.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-2 scrollbar-hide">
            {menu.map(cat => (
              <button key={cat.id} onClick={() => scrollToCat(cat.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  catActiva === cat.id ? "text-white" : "bg-gray-800 text-gray-400"
                }`}
                style={catActiva === cat.id ? { backgroundColor: color } : {}}>
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notificación pedido enviado */}
      {pedidoOk && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl text-sm text-center font-medium"
          style={{ backgroundColor: color + "20", border: `1px solid ${color}40`, color }}>
          ✅ Pedido enviado a cocina
        </div>
      )}

      {/* Contenido */}
      <div className="pb-40">

        {/* ── MENÚ ── */}
        {tab === "menu" && (
          <div className="px-4">
            {menu.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <p className="text-4xl mb-3">🍽</p>
                <p className="text-sm">El menú no está disponible</p>
              </div>
            ) : (
              menu.map(cat => (
                <div key={cat.id} id={`mcat-${cat.id}`}
                  ref={el => { catRefs.current[cat.id] = el; }}
                  className="mb-8 scroll-mt-32">
                  <h2 className="text-base font-bold text-white pt-4 mb-3">{cat.nombre}</h2>
                  <div className="space-y-3">
                    {cat.items.map(item => {
                      const qty = cantidadEnCarrito(item.id);
                      return (
                        <div key={item.id}
                          className={`bg-gray-900 border rounded-2xl p-4 flex gap-3 ${
                            item.agotado ? "opacity-40 border-gray-800" : "border-gray-800"
                          }`}>

                          {/* Imagen */}
                          {item.imagenUrl ? (
                            <img src={item.imagenUrl} alt={item.nombre}
                              className="w-20 h-20 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center text-3xl shrink-0">
                              🍽
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-white">{item.nombre}</p>
                              <p className="text-sm font-bold shrink-0" style={{ color }}>
                                ${parseFloat(item.precio).toFixed(2)}
                              </p>
                            </div>

                            {item.descripcion && (
                              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-2">
                                {item.descripcion}
                              </p>
                            )}

                            {(item.tags ?? []).length > 0 && (
                              <div className="flex gap-1 flex-wrap mb-2">
                                {(item.tags ?? []).map(tag => (
                                  <span key={tag} className="text-xs">{TAG_LABEL[tag]}</span>
                                ))}
                              </div>
                            )}

                            {item.agotado ? (
                              <span className="text-xs text-red-400">Agotado</span>
                            ) : (
                              <div className="flex items-center justify-between">
                                {/* Nota */}
                                {qty > 0 && (
                                  <button
                                    onClick={() => setNotaItem(
                                      notaItem?.idx === carrito.findLastIndex(c => c.menuItemId === item.id)
                                        ? null
                                        : { idx: carrito.findLastIndex(c => c.menuItemId === item.id), valor: carrito.findLast(c => c.menuItemId === item.id)?.nota ?? "" }
                                    )}
                                    className="text-xs text-gray-500 hover:text-gray-300">
                                    + nota
                                  </button>
                                )}
                                {qty === 0 && <div />}

                                {/* Controles cantidad */}
                                <div className="flex items-center gap-2">
                                  {qty > 0 && (
                                    <>
                                      <button onClick={() => quitarItem(item.id)}
                                        className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-lg hover:bg-gray-700">
                                        −
                                      </button>
                                      <span className="text-sm font-semibold text-white w-4 text-center">{qty}</span>
                                    </>
                                  )}
                                  <button onClick={() => agregarItem(item)}
                                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-lg"
                                    style={{ backgroundColor: color }}>
                                    +
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Campo nota */}
                            {notaItem && carrito[notaItem.idx]?.menuItemId === item.id && (
                              <input
                                autoFocus
                                value={notaItem.valor}
                                onChange={e => setNotaItem({ ...notaItem, valor: e.target.value })}
                                onBlur={() => {
                                  setCarrito(prev => prev.map((c, i) =>
                                    i === notaItem.idx ? { ...c, nota: notaItem.valor } : c
                                  ));
                                  setNotaItem(null);
                                }}
                                placeholder="Ej: sin cebolla, término medio..."
                                className="mt-2 w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="px-4 pt-4 space-y-4">
            {pedidosState.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <p className="text-3xl mb-2">🛒</p>
                <p className="text-sm">Aún no has pedido nada</p>
                <button onClick={() => setTab("menu")} className="mt-3 text-sm font-medium" style={{ color }}>
                  Ver el menú →
                </button>
              </div>
            ) : (
              <>
                {pedidosState.map(pedido => (
                  <div key={pedido.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-800">
                      <span className="text-xs text-gray-500 font-medium">Pedido #{pedido.numero}</span>
                    </div>
                    {pedido.items.map(item => (
                      <div key={item.id} className="px-4 py-3 flex items-center gap-3 border-b border-gray-800 last:border-0">
                        <span className="text-sm text-gray-500">{item.cantidad}×</span>
                        <div className="flex-1">
                          <p className="text-sm text-white">{item.menuItem?.nombre}</p>
                          {item.nota && <p className="text-xs mt-0.5" style={{ color }}>{item.nota}</p>}
                        </div>
                        <span className={`text-xs font-medium ${ESTADO_LABEL[item.estado]?.color ?? "text-gray-500"}`}>
                          {ESTADO_LABEL[item.estado]?.label ?? item.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Total */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3.5 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total acumulado</span>
                  <span className="font-bold text-white">${totalSesion.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER FIJO ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 space-y-2 bg-gray-950 border-t border-gray-800">

        {/* Botón pedir */}
        {tab === "menu" && carrito.length > 0 && (
          <button onClick={handleEnviar} disabled={enviando}
            className="w-full text-white font-semibold py-4 rounded-2xl flex items-center justify-between px-5 disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: color }}>
            <span className="w-7 h-7 bg-black/20 rounded-full text-sm flex items-center justify-center font-bold">
              {carrito.reduce((a, c) => a + c.cantidad, 0)}
            </span>
            <span>{enviando ? "Enviando..." : "Pedir ahora"}</span>
            <span className="font-bold">${totalCarrito.toFixed(2)}</span>
          </button>
        )}

        {/* Botón pedir cuenta */}
        {pedidosState.length > 0 && !cuentaSolicitada && (
          <button onClick={handlePedirCuenta} disabled={solicitando}
            className="w-full bg-gray-800 border border-gray-700 text-white font-medium py-3.5 rounded-2xl text-sm disabled:opacity-60">
            {solicitando ? "Solicitando..." : "💳 Pedir la cuenta"}
          </button>
        )}

        {/* Cuenta solicitada */}
        {cuentaSolicitada && (
          <div className="w-full py-3.5 rounded-2xl text-sm text-center font-medium border"
            style={{ backgroundColor: color + "15", borderColor: color + "30", color }}>
            ✅ El mesero viene en un momento
            {totalCuenta && <span className="block text-lg font-bold mt-0.5">${parseFloat(totalCuenta).toFixed(2)}</span>}
          </div>
        )}

      </div>

    </div>
  );
}