"use client";
import { useState, useEffect } from "react";

export default function ConfigLinks({ slug }: { slug: string }) {
  const [base, setBase] = useState("https://menu.komand.app");

  useEffect(() => {
    // En dev usamos localhost, en prod el dominio real
    if (window.location.hostname === "localhost") {
      setBase(window.location.origin);
    }
  }, []);

  const links = [
    { label: "Carta pública",     url: `${base}/${slug}` },
    { label: "Acceso del equipo", url: `${base}/${slug}/login` },
  ];

  function copiar(url: string) {
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Links de tu restaurante</h2>
      {links.map(({ label, url }) => (
        <div key={label}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            <span className="text-sm truncate flex-1" style={{ color: "var(--text-secondary)" }}>{url}</span>
            <button type="button" onClick={() => copiar(url)}
              className="text-xs font-medium shrink-0" style={{ color: "var(--accent)" }}>
              Copiar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}