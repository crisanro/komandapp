"use client";

import { useState } from "react";
import { crearEstacion, editarEstacion, toggleEstacion, eliminarEstacion, asignarPersonasEstacion } from "@/actions/estaciones";

type Persona  = { id: string; nombre: string; username: string | null };
type Estacion = {
  id: string; nombre: string; color: string | null; activa: boolean; orden: number | null;
  userEstaciones: { user: Persona }[];
};

const COLORES = [
  "#E85D04", "#6366F1", "#10B981", "#3B82F6",
  "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4",
  "#EC4899", "#84CC16",
];

export default function EstacionesClient({
  estaciones, equipo,
}: {
  estaciones: Estacion[];
  equipo:     Persona[];
}) {
  const [showForm, setShowForm]   = useState(false);
  const [editando, setEditando]   = useState<Estacion | null>(null);
  const [asignando, setAsignando] = useState<Estacion | null>(null);
  const [loading, setLoading]     = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [colorForm, setColorForm] = useState("#E85D04");
  const [personasSeleccionadas, setPersonasSeleccionadas] = useState<string[]>([]);

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("crear");
    const fd = new FormData(e.currentTarget);
    fd.set("color", colorForm);
    const result = await crearEstacion(fd);
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setShowForm(false);
    setColorForm("#E85D04");
    (e.target as HTMLFormElement).reset();
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setLoading("editar");
    const fd = new FormData(e.currentTarget);
    fd.set("color", colorForm);
    const result = await editarEstacion(editando.id, fd);
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditando(null);
  }

  async function handleToggle(est: Estacion) {
    setLoading(est.id);
    await toggleEstacion(est.id, !est.activa);
    setLoading(null);
  }

  async function handleEliminar(est: Estacion) {
    if (!confirm(`¿Eliminar estación "${est.nombre}"?`)) return;
    setLoading(est.id + "-del");
    await eliminarEstacion(est.id);
    setLoading(null);
  }

  async function handleAsignar() {
    if (!asignando) return;
    setLoading("asignar");
    await asignarPersonasEstacion(asignando.id, personasSeleccionadas);
    setLoading(null);
    setAsignando(null);
  }

  function abrirAsignar(est: Estacion) {
    setAsignando(est);
    setPersonasSeleccionadas(est.userEstaciones.map(ue => ue.user.id));
  }

  return (
    <div>

      {/* Modal asignar personas */}
      {asignando && (
        <div className="modal-overlay" onClick={() => setAsignando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Asignar personas
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              ¿Quién ve los pedidos de{" "}
              <span className="font-medium" style={{ color: asignando.color ?? "var(--accent)" }}>
                {asignando.nombre}
              </span>?
            </p>

            {equipo.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                No hay equipo operativo aún. Créalos en Equipo primero.
              </p>
            ) : (
              <div className="space-y-2 mb-6">
                {equipo.map(p => (
                  <label key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                    style={{ background: "var(--surface)" }}>
                    <input
                      type="checkbox"
                      checked={personasSeleccionadas.includes(p.id)}
                      onChange={e => {
                        setPersonasSeleccionadas(prev =>
                          e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                        );
                      }}
                      className="w-4 h-4"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {p.nombre}
                      </p>
                      {p.username && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          @{p.username}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setAsignando(null)} className="btn btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={handleAsignar} disabled={loading === "asignar"} className="btn btn-primary flex-1">
                {loading === "asignar" ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón nueva estación */}
      <button
        onClick={() => { setShowForm(true); setEditando(null); setError(""); setColorForm("#E85D04"); }}
        className="btn btn-primary mb-6"
      >
        <span className="text-lg leading-none">+</span> Nueva estación
      </button>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Formulario crear/editar */}
      {(showForm || editando) && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {editando ? `Editar "${editando.nombre}"` : "Nueva estación"}
          </h3>
          <form onSubmit={editando ? handleEditar : handleCrear} className="space-y-4">
            <div className="field">
              <label className="label">Nombre *</label>
              <input
                name="nombre"
                required
                defaultValue={editando?.nombre}
                placeholder="Cocina caliente, Bar, Pastelería..."
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORES.map(c => (
                  <button key={c} type="button" onClick={() => setColorForm(c)}
                    className="w-8 h-8 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      transform: colorForm === c ? "scale(1.25)" : "scale(1)",
                      outline: colorForm === c ? `2px solid var(--text-muted)` : "none",
                      outlineOffset: "2px",
                    }} />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: colorForm }} />
                <input
                  type="text"
                  value={colorForm}
                  onChange={e => setColorForm(e.target.value)}
                  className="input font-mono"
                  style={{ width: "8rem" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>o escribe un HEX</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditando(null); }}
                className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button type="submit" disabled={!!loading} className="btn btn-primary btn-sm">
                {loading ? "Guardando..." : editando ? "Guardar cambios" : "Crear estación"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de estaciones */}
      {estaciones.length === 0 && !showForm ? (
        <div className="empty-state card">
          <p className="text-4xl">🏪</p>
          <p style={{ color: "var(--text-muted)" }}>Sin estaciones aún.</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Crea estaciones como "Cocina", "Bar", "Pastelería"...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {estaciones.map(est => (
            <div key={est.id} className="card" style={{ opacity: est.activa ? 1 : 0.5 }}>
              <div className="flex items-start gap-4">

                {/* Color badge */}
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: est.color ?? "var(--accent)" }}
                >
                  {est.nombre[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {est.nombre}
                    </p>
                    {!est.activa && (
                      <span className="badge badge-gray">Inactiva</span>
                    )}
                  </div>

                  {/* Personas asignadas */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {est.userEstaciones.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Sin personas asignadas
                      </span>
                    ) : (
                      est.userEstaciones.map(ue => (
                        <span key={ue.user.id}
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: est.color ?? "var(--accent)" }}>
                          {ue.user.nombre}
                        </span>
                      ))
                    )}
                    <button onClick={() => abrirAsignar(est)}
                      className="text-xs underline" style={{ color: "var(--text-muted)" }}>
                      {est.userEstaciones.length === 0 ? "Asignar personas" : "Editar"}
                    </button>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditando(est); setShowForm(false); setColorForm(est.color ?? "#E85D04"); }}
                    disabled={!!loading}
                    className="btn btn-ghost btn-sm"
                  >
                    Editar
                  </button>

                  {/* Toggle */}
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={est.activa}
                      onChange={() => handleToggle(est)}
                      disabled={!!loading}
                    />
                    <span className="toggle-slider" />
                  </label>

                  <button onClick={() => handleEliminar(est)} disabled={!!loading}
                    className="btn btn-ghost btn-sm" style={{ color: "var(--color-error)" }}>
                    {loading === est.id + "-del" ? "..." : "✕"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}