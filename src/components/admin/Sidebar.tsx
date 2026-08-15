"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, entrarModoOperativo } from "@/actions/auth";

const NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: "⊞" },
  { href: "/mesas-admin",   label: "Mesas",         icon: "▦" },
  { href: "/menu-admin",    label: "Menú",          icon: "≡" },
  { href: "/estaciones",    label: "Estaciones",    icon: "🏪" },
  { href: "/promociones",   label: "Promociones",   icon: "🎉" },
  { href: "/equipo",        label: "Equipo",        icon: "👥" },
  { href: "/reportes",      label: "Reportes",      icon: "↗" },
  { href: "/configuracion", label: "Configuración", icon: "⚙" },
];

export default function Sidebar({ nombre, slug }: { nombre: string; slug: string }) {
  const pathname = usePathname();
  const [theme, setTheme]           = useState<"dark" | "light">("dark");
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("komand-theme") as "dark" | "light" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial === "light" ? "light" : "");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("komand-theme", next);
    document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
  }

  return (
    <>
      {/* Modal confirmación logout */}
      {confirmarLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirmarLogout(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                ¿Cerrar sesión?
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Tendrás que volver a ingresar tus credenciales.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmarLogout(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
              >
                Cancelar
              </button>
              <form action={logout} className="flex-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--color-error)", color: "white" }}
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <aside
        className="flex flex-col h-full shrink-0"
        style={{
          width: "220px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
            >
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Komand
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
                style={{
                  background: active ? "var(--accent-subtle)" : "transparent",
                  color:      active ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 shrink-0 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: "var(--text-muted)", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="text-base">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          </button>

          <div className="px-3 py-2">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Administrador</p>
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {nombre}
            </p>
          </div>

          <form action={entrarModoOperativo}>
            <button
              type="submit"
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              style={{ color: "var(--text-muted)", background: "transparent" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color      = "var(--color-info)";
                (e.currentTarget as HTMLElement).style.background = "var(--color-info-subtle)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color      = "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span className="text-base">⚡</span>
              Modo operativo
            </button>
          </form>

          <button
            onClick={() => setConfirmarLogout(true)}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: "var(--text-muted)", background: "transparent" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color      = "var(--color-error)";
              (e.currentTarget as HTMLElement).style.background = "var(--color-error-subtle)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color      = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <span className="text-base">→</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}