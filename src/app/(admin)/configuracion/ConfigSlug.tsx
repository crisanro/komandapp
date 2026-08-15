"use client";
import { useState } from "react";
import { cambiarSlug } from "@/actions/restaurant";

export default function ConfigSlug({
  slug, slugCambiadoEn,
}: {
  slug:           string;
  slugCambiadoEn: Date | null;
}) {
  const [nuevoSlug, setNuevoSlug] = useState(slug);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [saved,     setSaved]     = useState(false);

  const diasRestantes = slugCambiadoEn
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(slugCambiadoEn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const puedeCambiar = diasRestantes === 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (nuevoSlug === slug) return;
    setError("");
    setLoading(true);
    const result = await cambiarSlug(nuevoSlug);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>URL de tu restaurante</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          El slug define la URL pública de tu carta y el acceso del equipo.
          {!puedeCambiar && ` Próximo cambio disponible en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {saved  && <div className="alert alert-success"><span>✅ URL actualizada</span></div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="field">
          <label className="label">Slug</label>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>
              menu.komand.app/
            </span>
            <input
              value={nuevoSlug}
              onChange={e => setNuevoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              disabled={!puedeCambiar}
              className="flex-1 bg-transparent outline-none text-sm font-mono"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
        {puedeCambiar && nuevoSlug !== slug && (
          <button type="submit" disabled={loading} className="btn btn-secondary btn-sm">
            {loading ? "Guardando..." : "Cambiar URL"}
          </button>
        )}
      </form>
    </div>
  );
}