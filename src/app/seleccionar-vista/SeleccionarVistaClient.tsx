"use client";

import { cambiarVista } from "@/actions/auth";

type Vista = {
  key:   "mesas" | "kds" | "caja";
  label: string;
  icon:  string;
  desc:  string;
};

export default function SeleccionarVistaClient({
  vistas, nombre, vistaActiva,
}: {
  vistas:      Vista[];
  nombre:      string;
  vistaActiva: string;
}) {
  return (
    <div className="page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}>
            <span className="text-white text-xl font-bold">K</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)", fontSize: "1.25rem" }}>
            Hola, {nombre}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            ¿Con qué rol entras hoy?
          </p>
        </div>

        <div className="space-y-3">
          {vistas.map(({ key, label, icon, desc }) => {
            const esActiva = key === vistaActiva;
            return (
              <button
                key={key}
                type="button"
                onClick={() => cambiarVista(key)}
                className="w-full text-left rounded-2xl p-4 transition-all"
                style={{
                  background:   esActiva ? "var(--accent-subtle)" : "var(--surface)",
                  border:       esActiva ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                }}
                onMouseEnter={e => {
                  if (!esActiva) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.background  = "var(--accent-subtle)";
                  }
                }}
                onMouseLeave={e => {
                  if (!esActiva) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.background  = "var(--surface)";
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                      {esActiva && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                  </div>
                  <span style={{ color: "var(--text-muted)" }}>→</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}