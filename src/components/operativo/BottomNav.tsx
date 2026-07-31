"use client";

import { usePathname } from "next/navigation";
import { cambiarVista } from "@/actions/auth";
import Link from "next/link";

type Vista = { key: "mesas" | "kds" | "caja"; label: string; icon: string };

export default function BottomNav({
  vistas,
  vistaActiva,
}: {
  vistas:      Vista[];
  vistaActiva: string;
}) {
  const pathname = usePathname();

  // Siempre incluir Inicio
  const nav = [
    { href: "/inicio", label: "Inicio", icon: "🏠" },
    ...vistas.map(v => ({ href: `/${v.key}`, label: v.label, icon: v.icon })),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background:    "var(--surface)",
        borderTop:     "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
      {nav.map(({ href, label, icon }) => {
        const activa = pathname === href || (href !== "/inicio" && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors no-underline"
            style={{ color: activa ? "var(--accent)" : "var(--text-muted)" }}>
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
            {activa && (
              <span className="w-6 h-0.5 rounded-full mt-0.5"
                style={{ background: "var(--accent)", display: "block" }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}