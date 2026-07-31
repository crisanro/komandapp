"use client";

import { useState, useEffect, useRef } from "react";

type MenuItem  = {
  id: string; nombre: string; descripcion: string | null;
  precio: string; imagenUrl: string | null; tags: string[] | null;
  agotado: boolean;
};
type Categoria = { id: string; nombre: string; items: MenuItem[] };
type Promo     = { id: string; titulo: string; descripcion: string | null; emoji: string | null };
type Restaurant = {
  nombre: string; ciudad: string | null; color: string;
  logoUrl: string | null; notasMenu: string | null;
};

const TAG_LABEL: Record<string, string> = {
  popular: "⭐ Popular", nuevo: "🆕 Nuevo", vegano: "🌱 Vegano",
  vegetariano: "🥦 Veggie", sin_gluten: "🌾 Sin gluten", picante: "🌶 Picante",
};

export default function CartaClient({ restaurant, menu, promos }: {
  restaurant: Restaurant;
  menu:       Categoria[];
  promos:     Promo[];
}) {
  const [catActiva, setCatActiva] = useState(menu[0]?.id ?? "");
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const color = restaurant.color;

  // Observer para actualizar la categoría activa al hacer scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCatActiva(entry.target.id.replace("cat-", ""));
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    Object.values(catRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [menu]);

  function scrollTocat(catId: string) {
    const el = catRefs.current[catId];
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setCatActiva(catId);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative px-5 pt-12 pb-8">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt={restaurant.nombre}
              className="w-16 h-16 rounded-2xl mb-4 object-cover shadow-xl border-2 border-white/20" />
          ) : (
            <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-2xl font-bold border-2 border-white/20"
              style={{ backgroundColor: color }}>
              {restaurant.nombre[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{restaurant.nombre}</h1>
          {restaurant.ciudad && (
            <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1">
              <span>📍</span>{restaurant.ciudad}
            </p>
          )}
        </div>
      </div>

      {/* Card "pide al mesero" */}
      <div className="mx-4 -mt-5 relative z-10">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-xl">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: color + "33", border: `1px solid ${color}44` }}>
            👋
          </div>
          <div>
            <p className="text-sm font-semibold text-white">¿Quieres pedir?</p>
            <p className="text-xs text-gray-400">Pide al mesero que abra tu cuenta</p>
          </div>
        </div>
      </div>

      {/* Promociones */}
      {promos.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {promos.map(promo => (
            <div key={promo.id}
              className="rounded-xl px-4 py-3 flex items-start gap-3 border"
              style={{ backgroundColor: color + "15", borderColor: color + "30" }}>
              <span className="text-xl shrink-0">{promo.emoji ?? "🎉"}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color }}>{promo.titulo}</p>
                {promo.descripcion && (
                  <p className="text-xs text-gray-400 mt-0.5">{promo.descripcion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Layout principal */}
      <div className="flex mt-6">

        {/* Sidebar categorías — desktop */}
        <aside className="hidden md:block w-48 shrink-0 sticky top-4 self-start ml-4 space-y-1">
          {menu.map(cat => (
            <button key={cat.id} onClick={() => scrollTocat(cat.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                catActiva === cat.id
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              style={catActiva === cat.id ? { backgroundColor: color, color: "white" } : {}}>
              {cat.nombre}
            </button>
          ))}
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0">

          {/* Tabs categorías — mobile */}
          <div className="md:hidden sticky top-0 z-20 bg-gray-950 border-b border-gray-800 px-4 pb-0 pt-2">
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {menu.map(cat => (
                <button key={cat.id} onClick={() => scrollTocat(cat.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    catActiva === cat.id ? "text-white" : "bg-gray-800 text-gray-400"
                  }`}
                  style={catActiva === cat.id ? { backgroundColor: color } : {}}>
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Ítems por categoría */}
          <div className="px-4 pb-20">
            {menu.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <p className="text-4xl mb-3">🍽</p>
                <p className="text-sm">El menú no está disponible aún</p>
              </div>
            ) : (
              menu.map(cat => (
                <div
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  ref={el => { catRefs.current[cat.id] = el; }}
                  className="mb-8 scroll-mt-20"
                >
                  <h2 className="text-lg font-bold text-white mb-4 pt-4">{cat.nombre}</h2>
                  <div className="space-y-3">
                    {cat.items.map(item => (
                      <div key={item.id}
                        className={`bg-gray-900 border rounded-2xl overflow-hidden flex gap-3 p-4 transition-opacity ${
                          item.agotado ? "opacity-40 border-gray-800" : "border-gray-800 hover:border-gray-600"
                        }`}>

                        {/* Imagen */}
                        {item.imagenUrl ? (
                          <img src={item.imagenUrl} alt={item.nombre}
                            className="w-20 h-20 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-3xl bg-gray-800">
                            🍽
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white leading-tight">{item.nombre}</p>
                            <span className="text-sm font-bold shrink-0" style={{ color }}>
                              ${parseFloat(item.precio).toFixed(2)}
                            </span>
                          </div>

                          {item.descripcion && (
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                              {item.descripcion}
                            </p>
                          )}

                          {/* Tags */}
                          {(item.tags ?? []).length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {(item.tags ?? []).map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                                  {TAG_LABEL[tag] ?? tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.agotado && (
                            <span className="inline-block mt-2 text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">
                              Agotado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Nota al pie */}
            {restaurant.notasMenu && (
              <p className="text-xs text-gray-600 text-center pt-4 pb-8">{restaurant.notasMenu}</p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}