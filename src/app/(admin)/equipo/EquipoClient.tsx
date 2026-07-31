"use client";
import { useState } from "react";
import { crearUsuarioOperativo, toggleUsuario, eliminarAcceso, regenerarCodigo, actualizarPermisos, asignarEstaciones } from "@/actions/auth";
import { PLANTILLAS_PERMISOS, type PlantillaKey } from "@/db/schema";

type Estacion = { id: string; nombre: string; color: string | null };
type UserEstacion = { estacionId: string };
type Usuario = {
  id: string; nombre: string; username: string | null;
  activo: boolean; codigoVisible: string | null;
  userEstaciones: UserEstacion[];
  puedeCrearMesas: boolean; puedeAbrirMesas: boolean; puedeVerTodasLasMesas: boolean;
  puedeTomarPedidos: boolean; puedeVerPedidos: boolean;
  puedeCobrar: boolean; puedeCerrarCuenta: boolean; puedeEmitirFacturas: boolean;
  puedeAplicarDescuentos: boolean; puedeMarcarAgotados: boolean;
  puedeEditarPrecios: boolean; puedeGestionarMenu: boolean;
  puedeCuadrarCaja: boolean; puedeVerReportes: boolean;
};

const PERMISOS_LABELS: { key: keyof Omit<Usuario, "id"|"nombre"|"username"|"activo"|"codigoVisible"|"userEstaciones">; label: string; grupo: string }[] = [
  { key: "puedeCrearMesas",        label: "Crear mesas",        grupo: "Mesas"    },
  { key: "puedeAbrirMesas",        label: "Abrir mesas",        grupo: "Mesas"    },
  { key: "puedeVerTodasLasMesas",  label: "Ver todas",          grupo: "Mesas"    },
  { key: "puedeTomarPedidos",      label: "Tomar pedidos",      grupo: "Pedidos"  },
  { key: "puedeVerPedidos",        label: "Ver pedidos",        grupo: "Pedidos"  },
  { key: "puedeCobrar",            label: "Cobrar",             grupo: "Caja"     },
  { key: "puedeCerrarCuenta",      label: "Cerrar cuenta",      grupo: "Caja"     },
  { key: "puedeEmitirFacturas",    label: "Emitir facturas",    grupo: "Caja"     },
  { key: "puedeAplicarDescuentos", label: "Aplicar descuentos", grupo: "Caja"     },
  { key: "puedeCuadrarCaja",       label: "Cuadrar caja",       grupo: "Caja"     },
  { key: "puedeMarcarAgotados",    label: "Marcar agotados",    grupo: "Menú"     },
  { key: "puedeEditarPrecios",     label: "Editar precios",     grupo: "Menú"     },
  { key: "puedeGestionarMenu",     label: "Gestionar menú",     grupo: "Menú"     },
  { key: "puedeVerReportes",       label: "Ver reportes",       grupo: "Reportes" },
];
const GRUPOS = ["Mesas", "Pedidos", "Caja", "Menú", "Reportes"];

// ── Selector de estaciones reutilizable ──────────────────
function EstacionesSelector({
  estaciones,
  seleccionadas,
  onChange,
}: {
  estaciones: Estacion[];
  seleccionadas: string[];
  onChange: (ids: string[]) => void;
}) {
  if (estaciones.length === 0) return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      No hay estaciones configuradas. Créalas en Configuración → Estaciones.
    </p>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {estaciones.map(e => {
        const activa = seleccionadas.includes(e.id);
        return (
          <button key={e.id} type="button"
            onClick={() => onChange(
              activa ? seleccionadas.filter(id => id !== e.id) : [...seleccionadas, e.id]
            )}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={activa
              ? { background: e.color ?? "var(--accent)", borderColor: e.color ?? "var(--accent)", color: "#fff" }
              : { background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }
            }>
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ background: activa ? "#fff" : (e.color ?? "var(--accent)") }} />
            {e.nombre}
          </button>
        );
      })}
    </div>
  );
}

export default function EquipoClient({
  equipo, estaciones,
}: {
  equipo:     Usuario[];
  estaciones: Estacion[];
}) {
  const [showForm, setShowForm]       = useState(false);
  const [editando, setEditando]       = useState<Usuario | null>(null);
  const [loading, setLoading]         = useState<string | null>(null);
  const [error, setError]             = useState("");
  const [codigoNuevo, setCodigoNuevo] = useState<{ nombre: string; username: string; codigo: string } | null>(null);

  // Form crear
  const [plantillaSeleccionada, setPlantilla] = useState<PlantillaKey | "">("");
  const [permisosForm, setPermisosForm]       = useState<Record<string, boolean>>({});
  const [estacionesForm, setEstacionesForm]   = useState<string[]>([]);

  // Editar estaciones inline
  const [editandoEstaciones, setEditandoEstaciones] = useState<string | null>(null);
  const [estacionesEdit, setEstacionesEdit]         = useState<string[]>([]);

  function aplicarPlantilla(key: PlantillaKey) {
    setPlantilla(key);
    setPermisosForm({ ...PLANTILLAS_PERMISOS[key].permisos });
  }

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading("crear");
    const fd = new FormData(e.currentTarget);
    Object.entries(permisosForm).forEach(([k, v]) => fd.set(k, String(v)));
    if (plantillaSeleccionada) fd.set("plantilla", plantillaSeleccionada);
    // Estaciones las guardamos después de crear el usuario
    fd.set("estacionIds", estacionesForm.join(","));
    const result = await crearUsuarioOperativo(fd);
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    if (result.ok) {
      // Asignar estaciones si se seleccionaron
      if (estacionesForm.length > 0 && result.userId) {
        await asignarEstaciones(result.userId, estacionesForm);
      }
      setCodigoNuevo({ nombre: result.nombre!, username: result.username!, codigo: result.codigo! });
      setShowForm(false);
      setPlantilla("");
      setPermisosForm({});
      setEstacionesForm([]);
      (e.target as HTMLFormElement).reset();
    }
  }

  async function handleActualizarPermisos(e: React.FormEvent<HTMLFormElement>, userId: string) {
    e.preventDefault();
    setLoading(userId + "-permisos");
    const result = await actualizarPermisos(userId, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditando(null);
  }

  async function handleGuardarEstaciones(userId: string) {
    setLoading(userId + "-estaciones");
    await asignarEstaciones(userId, estacionesEdit);
    setLoading(null);
    setEditandoEstaciones(null);
  }

  async function handleToggle(userId: string, activo: boolean) {
    setLoading(userId);
    await toggleUsuario(userId, !activo);
    setLoading(null);
  }

  async function handleEliminar(userId: string, nombre: string) {
    if (!confirm(`¿Eliminar acceso de ${nombre}?`)) return;
    setLoading(userId + "-del");
    await eliminarAcceso(userId);
    setLoading(null);
  }

  async function handleRegenerar(userId: string) {
    if (!confirm("¿Regenerar el código? El anterior dejará de funcionar.")) return;
    setLoading(userId + "-regen");
    const result = await regenerarCodigo(userId);
    setLoading(null);
    if (result?.ok && result.codigo) {
      const user = equipo.find(u => u.id === userId);
      setCodigoNuevo({ nombre: user?.nombre ?? "", username: user?.username ?? "", codigo: result.codigo });
    }
  }

  function copiarWhatsApp(nombre: string, username: string, codigo: string) {
    const texto = `Hola ${nombre} 👋\n\nTu acceso a Komand está listo:\n\n👤 Usuario: *${username}*\n🔐 Código: *${codigo}*\n\nGuárdalo bien — lo necesitas para ingresar.`;
    navigator.clipboard.writeText(texto);
    alert("Texto copiado. Pégalo en WhatsApp.");
  }

  function resumenPermisos(u: Usuario) {
    const activos = PERMISOS_LABELS.filter(p => u[p.key]).map(p => p.label);
    if (activos.length === 0) return "Sin permisos";
    if (activos.length > 3) return `${activos.slice(0, 3).join(", ")} +${activos.length - 3}`;
    return activos.join(", ");
  }

  function resumenEstaciones(u: Usuario) {
    const ids = u.userEstaciones.map(ue => ue.estacionId);
    if (ids.length === 0) return null;
    return ids.map(id => estaciones.find(e => e.id === id)?.nombre).filter(Boolean).join(", ");
  }

  return (
    <div>
      {/* Modal código nuevo */}
      {codigoNuevo && (
        <div className="modal-overlay">
          <div className="modal text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-success-subtle)" }}>
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
              Acceso listo para {codigoNuevo.nombre}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              El código solo se muestra una vez.
            </p>
            <div className="rounded-xl p-4 mb-6 space-y-2 text-left"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Usuario</span>
                <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                  {codigoNuevo.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Código</span>
                <span className="text-xl font-mono font-bold tracking-widest" style={{ color: "var(--accent)" }}>
                  {codigoNuevo.codigo}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => copiarWhatsApp(codigoNuevo.nombre, codigoNuevo.username, codigoNuevo.codigo)}
                className="btn flex-1"
                style={{ background: "#25D366", color: "#fff", border: "none" }}>
                📱 Copiar para WhatsApp
              </button>
              <button onClick={() => setCodigoNuevo(null)} className="btn btn-secondary flex-1">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { setShowForm(true); setError(""); setPlantilla(""); setPermisosForm({}); setEstacionesForm([]); }}
        className="btn btn-primary mb-6">
        <span className="text-lg leading-none">+</span> Agregar persona
      </button>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      {/* Formulario crear */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Agregar al equipo
          </h3>
          <form onSubmit={handleCrear} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Nombre *</label>
                <input name="nombre" required placeholder="Ana Torres" className="input" />
              </div>
              <div className="field">
                <label className="label">Usuario *</label>
                <input name="username" required placeholder="ana" autoCapitalize="none" className="input" />
              </div>
            </div>

            {/* Plantillas */}
            <div className="field">
              <label className="label">Partir de una plantilla</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(PLANTILLAS_PERMISOS) as PlantillaKey[]).map(key => (
                  <button key={key} type="button" onClick={() => aplicarPlantilla(key)}
                    className="text-xs px-3 py-2.5 rounded-xl border text-left transition-colors"
                    style={plantillaSeleccionada === key
                      ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                      : { background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }
                    }>
                    <p className="font-medium">{PLANTILLAS_PERMISOS[key].label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{PLANTILLAS_PERMISOS[key].descripcion}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Permisos granulares */}
            <div className="field">
              <label className="label">Permisos</label>
              <div className="space-y-3">
                {GRUPOS.map(grupo => {
                  const items = PERMISOS_LABELS.filter(p => p.grupo === grupo);
                  return (
                    <div key={grupo}>
                      <p className="text-xs font-medium uppercase tracking-wide mb-1.5"
                        style={{ color: "var(--text-muted)" }}>{grupo}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {items.map(({ key, label }) => (
                          <label key={key}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm"
                            style={{ color: "var(--text-secondary)" }}>
                            <input type="checkbox" name={key} value="true"
                              checked={!!permisosForm[key]}
                              onChange={e => setPermisosForm(prev => ({ ...prev, [key]: e.target.checked }))}
                              style={{ accentColor: "var(--accent)" }} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estaciones */}
            <div className="field">
              <label className="label">Estaciones asignadas</label>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                Define qué estaciones ve en el KDS. Sin estación = solo despacha ítems directos.
              </p>
              <EstacionesSelector
                estaciones={estaciones}
                seleccionadas={estacionesForm}
                onChange={setEstacionesForm}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button type="submit" disabled={loading === "crear"} className="btn btn-primary btn-sm">
                {loading === "crear" ? "Creando..." : "Crear acceso"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {equipo.length === 0 ? (
        <div className="empty-state card">
          <p className="text-4xl">👥</p>
          <p style={{ color: "var(--text-muted)" }}>Sin equipo aún.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nombre", "Usuario", "Estaciones", "Permisos", "Estado", ""].map(h => (
                  <th key={h} className="text-left text-xs font-medium uppercase tracking-wide px-5 py-3"
                    style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipo.map(u => (
                <tr key={u.id} style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  opacity: u.activo ? 1 : 0.5,
                }}>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {u.nombre}
                  </td>
                  <td className="px-5 py-4 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {u.username ?? "—"}
                  </td>

                  {/* Estaciones */}
                  <td className="px-5 py-4">
                    {editandoEstaciones === u.id ? (
                      <div className="space-y-2">
                        <EstacionesSelector
                          estaciones={estaciones}
                          seleccionadas={estacionesEdit}
                          onChange={setEstacionesEdit}
                        />
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => setEditandoEstaciones(null)}
                            className="btn btn-ghost btn-sm">Cancelar</button>
                          <button type="button"
                            onClick={() => handleGuardarEstaciones(u.id)}
                            disabled={loading === u.id + "-estaciones"}
                            className="btn btn-primary btn-sm">
                            {loading === u.id + "-estaciones" ? "..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoEstaciones(u.id);
                          setEstacionesEdit(u.userEstaciones.map(ue => ue.estacionId));
                        }}
                        className="text-xs text-left"
                        style={{ color: "var(--text-muted)" }}>
                        {resumenEstaciones(u) ?? (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            Sin estación
                          </span>
                        )}
                        <span className="ml-1" style={{ color: "var(--accent)" }}>✎</span>
                      </button>
                    )}
                  </td>

                  {/* Permisos */}
                  <td className="px-5 py-4">
                    {editando?.id === u.id ? (
                      <form onSubmit={e => handleActualizarPermisos(e, u.id)} className="space-y-2">
                        {GRUPOS.map(grupo => {
                          const items = PERMISOS_LABELS.filter(p => p.grupo === grupo);
                          return (
                            <div key={grupo}>
                              <p className="text-xs font-medium uppercase tracking-wide mb-1"
                                style={{ color: "var(--text-muted)" }}>{grupo}</p>
                              <div className="grid grid-cols-2 gap-0.5">
                                {items.map(({ key, label }) => (
                                  <label key={key}
                                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                                    style={{ color: "var(--text-secondary)" }}>
                                    <input type="checkbox" name={key} value="true"
                                      defaultChecked={!!u[key]}
                                      style={{ accentColor: "var(--accent)" }} />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => setEditando(null)}
                            className="btn btn-ghost btn-sm">Cancelar</button>
                          <button type="submit" disabled={loading === u.id + "-permisos"}
                            className="btn btn-primary btn-sm">
                            {loading === u.id + "-permisos" ? "..." : "Guardar"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {resumenPermisos(u)}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className="badge"
                      style={u.activo
                        ? { background: "var(--color-success-subtle)", color: "var(--color-success)" }
                        : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                      }>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditando(u); setError(""); }} disabled={!!loading}
                        className="btn btn-ghost btn-sm">Permisos</button>
                      <button onClick={() => handleRegenerar(u.id)} disabled={!!loading}
                        className="btn btn-ghost btn-sm">
                        {loading === u.id + "-regen" ? "..." : "🔑 Código"}
                      </button>
                      <button onClick={() => handleToggle(u.id, u.activo)} disabled={!!loading}
                        className="btn btn-ghost btn-sm">
                        {loading === u.id ? "..." : u.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => handleEliminar(u.id, u.nombre)} disabled={!!loading}
                        className="btn btn-ghost btn-sm" style={{ color: "var(--color-error)" }}>
                        {loading === u.id + "-del" ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}