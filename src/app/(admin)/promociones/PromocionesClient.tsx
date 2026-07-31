"use client";

import { useState } from "react";
import { crearPromocion, editarPromocion, togglePromocion, eliminarPromocion } from "@/actions/promociones";

type Promo = {
  id: string; titulo: string; descripcion: string | null;
  emoji: string | null; tipo: "CLIENTE" | "EQUIPO" | "AMBOS";
  activa: boolean; fechaInicio: Date | null; fechaFin: Date | null;
};

const TIPO_LABEL = {
  CLIENTE: "👤 Solo clientes",
  EQUIPO:  "👥 Solo equipo",
  AMBOS:   "🌐 Todos",
};

const TIPO_BADGE: Record<string, { background: string; color: string }> = {
  CLIENTE: { background: "rgba(59,130,246,0.1)",  color: "var(--color-info)"    },
  EQUIPO:  { background: "rgba(139,92,246,0.1)",  color: "#8B5CF6"              },
  AMBOS:   { background: "var(--accent-subtle)",  color: "var(--accent)"        },
};

const EMOJIS = ["🎉", "🍺", "🍕", "🔥", "⚡", "🎁", "💡", "⚠️", "📢", "✅"];

function PromoForm({
  defaultValues, onSubmit, onCancel, loading, submitLabel,
}: {
  defaultValues?: Partial<Promo>;
  onSubmit:    (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel:    () => void;
  loading:     boolean;
  submitLabel: string;
}) {
  const [emoji, setEmoji] = useState(defaultValues?.emoji ?? "🎉");

  return (
    <div className="card mb-6" style={{ borderColor: "var(--accent)", borderWidth: "1.5px" }}>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="emoji" value={emoji} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">Título *</label>
            <input name="titulo" required defaultValue={defaultValues?.titulo}
              placeholder="2x1 en cervezas hoy" className="input" />
          </div>
          <div className="field">
            <label className="label">¿Para quién?</label>
            <select name="tipo" defaultValue={defaultValues?.tipo ?? "AMBOS"}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="AMBOS">🌐 Clientes y equipo</option>
              <option value="CLIENTE">👤 Solo clientes</option>
              <option value="EQUIPO">👥 Solo equipo interno</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">Descripción</label>
          <input name="descripcion" defaultValue={defaultValues?.descripcion ?? ""}
            placeholder="Válido hasta las 7pm · Solo bebidas de barril" className="input" />
        </div>

        <div className="field">
          <label className="label">Emoji</label>
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl text-xl transition-all"
                style={{
                  background:  emoji === e ? "var(--accent-subtle)" : "var(--surface-raised)",
                  outline:     emoji === e ? "2px solid var(--accent)" : "none",
                  outlineOffset: "1px",
                  transform:   emoji === e ? "scale(1.1)" : "scale(1)",
                }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">
              Inicio <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <input name="fechaInicio" type="datetime-local"
              defaultValue={defaultValues?.fechaInicio
                ? new Date(defaultValues.fechaInicio).toISOString().slice(0, 16) : ""}
              className="input" />
          </div>
          <div className="field">
            <label className="label">
              Fin <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <input name="fechaFin" type="datetime-local"
              defaultValue={defaultValues?.fechaFin
                ? new Date(defaultValues.fechaFin).toISOString().slice(0, 16) : ""}
              className="input" />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancelar</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            {loading ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PromocionesClient({ promos }: { promos: Promo[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Promo | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState("");

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("crear");
    const result = await crearPromocion(new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setLoading("editar");
    const result = await editarPromocion(editando.id, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditando(null);
  }

  async function handleToggle(promo: Promo) {
    setLoading(promo.id);
    await togglePromocion(promo.id, !promo.activa);
    setLoading(null);
  }

  async function handleEliminar(promo: Promo) {
    if (!confirm(`¿Eliminar "${promo.titulo}"?`)) return;
    setLoading(promo.id + "-del");
    await eliminarPromocion(promo.id);
    setLoading(null);
  }

  const ahora = new Date();
  const isVigente = (p: Promo) => {
    if (!p.activa) return false;
    if (p.fechaInicio && new Date(p.fechaInicio) > ahora) return false;
    if (p.fechaFin    && new Date(p.fechaFin)    < ahora) return false;
    return true;
  };

  return (
    <div>
      <button
        onClick={() => { setShowForm(true); setEditando(null); setError(""); }}
        className="btn btn-primary mb-6">
        <span className="text-lg leading-none">+</span> Nueva promoción
      </button>

      {error && (
        <div className="alert alert-error mb-4"><span>{error}</span></div>
      )}

      {showForm && (
        <PromoForm
          onSubmit={handleCrear}
          onCancel={() => setShowForm(false)}
          loading={loading === "crear"}
          submitLabel="Crear promoción"
        />
      )}

      {promos.length === 0 && !showForm ? (
        <div className="empty-state card">
          <p className="text-4xl">🎉</p>
          <p style={{ color: "var(--text-muted)" }}>Sin promociones aún.</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Crea avisos para tus clientes o tu equipo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(promo => (
            <div key={promo.id}>
              {editando?.id === promo.id ? (
                <PromoForm
                  defaultValues={promo}
                  onSubmit={handleEditar}
                  onCancel={() => setEditando(null)}
                  loading={loading === "editar"}
                  submitLabel="Guardar cambios"
                />
              ) : (
                <div className="card flex items-center gap-4"
                  style={{ opacity: isVigente(promo) ? 1 : 0.55 }}>
                  <span className="text-3xl shrink-0">{promo.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {promo.titulo}
                      </span>
                      <span className="badge text-xs"
                        style={TIPO_BADGE[promo.tipo]}>
                        {TIPO_LABEL[promo.tipo]}
                      </span>
                      {isVigente(promo) && (
                        <span className="badge"
                          style={{ background: "var(--color-success-subtle)", color: "var(--color-success)" }}>
                          Activa ahora
                        </span>
                      )}
                      {promo.fechaFin && new Date(promo.fechaFin) < ahora && (
                        <span className="badge badge-gray">Vencida</span>
                      )}
                    </div>
                    {promo.descripcion && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {promo.descripcion}
                      </p>
                    )}
                    {(promo.fechaInicio || promo.fechaFin) && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {promo.fechaInicio && `Desde ${new Date(promo.fechaInicio).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}`}
                        {promo.fechaInicio && promo.fechaFin && " · "}
                        {promo.fechaFin && `Hasta ${new Date(promo.fechaFin).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="toggle">
                      <input type="checkbox" checked={promo.activa}
                        onChange={() => handleToggle(promo)} disabled={!!loading} />
                      <span className="toggle-slider" />
                    </label>
                    <button onClick={() => { setEditando(promo); setShowForm(false); }}
                      disabled={!!loading} className="btn btn-ghost btn-sm">
                      Editar
                    </button>
                    <button onClick={() => handleEliminar(promo)} disabled={!!loading}
                      className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--color-error)" }}>
                      {loading === promo.id + "-del" ? "..." : "✕"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}