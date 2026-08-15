"use client";
import { useState } from "react";
import { crearMesa, editarMesa, toggleMesa, eliminarMesa } from "@/actions/mesas";
import SesionModal from "@/components/admin/SesionModal";

type Item    = { id: string; estado: string };
type Pedido  = { id: string; items: Item[] };
type Sesion  = { id: string; abiertaEn: Date; nombreCliente: string | null; pedidos: Pedido[] };
type Mesa = {
  id: string; nombre: string; descripcion: string | null;
  capacidad: number | null; activa: boolean; estado: string;
  sesiones: Sesion[];
};

export default function MesasClient({ mesas }: { mesas: Mesa[] }) {
  const [showForm,    setShowForm]    = useState(false);
  const [editando,    setEditando]    = useState<Mesa | null>(null);
  const [loading,     setLoading]     = useState<string | null>(null);
  const [error,       setError]       = useState("");
  const [sesionModal, setSesionModal] = useState<string | null>(null);

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setLoading("crear");
    const result = await crearMesa(new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setError(""); setLoading("editar");
    const result = await editarMesa(editando.id, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditando(null);
  }

  async function handleToggle(mesa: Mesa) {
    setLoading(mesa.id);
    await toggleMesa(mesa.id, !mesa.activa);
    setLoading(null);
  }

  async function handleEliminar(mesa: Mesa) {
    if (!confirm(`¿Eliminar ${mesa.nombre}?`)) return;
    setLoading(mesa.id + "-del");
    const result = await eliminarMesa(mesa.id);
    setLoading(null);
    if (result?.error) setError(result.error);
  }

  return (
    <div>
      <button onClick={() => { setShowForm(true); setEditando(null); setError(""); }}
        className="btn btn-primary mb-6">
        <span className="text-lg leading-none">+</span> Nueva mesa
      </button>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nueva mesa</h3>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="field">
              <label className="label">Nombre *</label>
              <input name="nombre" required placeholder="Mesa 1" className="input" />
            </div>
            <div className="field">
              <label className="label">Descripción</label>
              <input name="descripcion" placeholder="Junto a la ventana" className="input" />
            </div>
            <div className="field">
              <label className="label">Capacidad</label>
              <input name="capacidad" type="number" min="1" placeholder="4" className="input" />
            </div>
            <div className="col-span-1 sm:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button type="submit" disabled={loading === "crear"} className="btn btn-primary btn-sm">
                {loading === "crear" ? "Guardando..." : "Crear mesa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mesas.length === 0 ? (
        <div className="empty-state card">
          <p className="text-4xl">🪑</p>
          <p style={{ color: "var(--text-muted)" }}>No hay mesas aún. Crea la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mesas.map((mesa) => {
            const sesionesActivas = mesa.sesiones;
            const ocupada         = sesionesActivas.length > 0;
            const itemsListos     = sesionesActivas
              .flatMap(s => s.pedidos.flatMap(p => p.items))
              .filter(i => i.estado === "LISTO").length;

            return (
              <div key={mesa.id} className="card"
                style={{
                  opacity:     mesa.activa ? 1 : 0.6,
                  borderColor: ocupada ? "var(--accent)" : "var(--border)",
                }}>

                {editando?.id === mesa.id ? (
                  <form onSubmit={handleEditar} className="space-y-3">
                    <input name="nombre" defaultValue={mesa.nombre} required className="input" />
                    <input name="descripcion" defaultValue={mesa.descripcion ?? ""} placeholder="Descripción" className="input" />
                    <input name="capacidad" type="number" defaultValue={mesa.capacidad ?? ""} placeholder="Capacidad" className="input" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditando(null)} className="btn btn-secondary flex-1 btn-sm">Cancelar</button>
                      <button type="submit" disabled={loading === "editar"} className="btn btn-primary flex-1 btn-sm">
                        {loading === "editar" ? "..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {mesa.nombre}
                        </h3>
                        {mesa.descripcion && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{mesa.descripcion}</p>
                        )}
                        {mesa.capacidad && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{mesa.capacidad} personas</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge"
                          style={
                            ocupada
                              ? { background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid rgba(232,93,4,0.25)" }
                              : mesa.activa
                              ? { background: "var(--color-success-subtle)", color: "var(--color-success)" }
                              : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                          }>
                          {ocupada ? `${sesionesActivas.length} cuenta${sesionesActivas.length > 1 ? "s" : ""}` : mesa.activa ? "Libre" : "Inactiva"}
                        </span>
                        {itemsListos > 0 && (
                          <span className="badge" style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-warning)", border: "1px solid rgba(245,158,11,0.25)" }}>
                            {itemsListos} listo{itemsListos > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subcuentas activas */}
                    {ocupada && (
                      <div className="space-y-1.5 mb-3">
                        {sesionesActivas.map((sesion, idx) => {
                          const totalSesion = sesion.pedidos.reduce((acc, p) =>
                            acc + p.items.reduce((a: number, i) => a, 0), 0);
                          return (
                            <button key={sesion.id}
                              onClick={() => setSesionModal(sesion.id)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left"
                              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                                  style={{ background: "var(--accent)", color: "white" }}>
                                  {idx + 1}
                                </span>
                                <span style={{ color: "var(--text-primary)" }}>
                                  {sesion.nombreCliente ?? `Cuenta ${idx + 1}`}
                                </span>
                              </div>
                              <span className="text-xs" style={{ color: "var(--accent)" }}>
                                Ver →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setEditando(mesa); setError(""); }}
                        className="btn btn-secondary btn-sm flex-1">
                        Editar
                      </button>
                      <button onClick={() => handleToggle(mesa)}
                        disabled={loading === mesa.id || ocupada}
                        className="btn btn-secondary btn-sm flex-1">
                        {loading === mesa.id ? "..." : mesa.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => handleEliminar(mesa)}
                        disabled={!!loading || ocupada}
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: "var(--color-error)" }}>
                        {loading === mesa.id + "-del" ? "..." : "✕"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sesionModal && (
        <SesionModal sesionId={sesionModal} onClose={() => setSesionModal(null)} />
      )}
    </div>
  );
}