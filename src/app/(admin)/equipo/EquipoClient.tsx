"use client";
import { useState } from "react";
import {
  crearUsuarioOperativo, toggleUsuario, eliminarAcceso,
  regenerarCodigo, actualizarPermisos, asignarEstaciones,
} from "@/actions/auth";
import { PLANTILLAS_PERMISOS, type PlantillaKey } from "@/db/schema";

// ── Types ─────────────────────────────────────────────────
type Estacion    = { id: string; nombre: string; color: string | null };
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

const PERMISOS_LABELS: {
  key: keyof Omit<Usuario, "id"|"nombre"|"username"|"activo"|"codigoVisible"|"userEstaciones">;
  label: string; grupo: string;
}[] = [
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

// ── Helpers ───────────────────────────────────────────────
function iniciales(nombre: string) {
  return nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function resumenPermisos(u: Usuario) {
  const activos = PERMISOS_LABELS.filter(p => u[p.key]).map(p => p.label);
  if (activos.length === 0) return [];
  return activos;
}

// ── Estaciones selector ───────────────────────────────────
function EstacionesSelector({
  estaciones, seleccionadas, onChange,
}: {
  estaciones:   Estacion[];
  seleccionadas: string[];
  onChange:     (ids: string[]) => void;
}) {
  if (estaciones.length === 0) return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      No hay estaciones configuradas.
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

// ── Panel de permisos ─────────────────────────────────────
function PermisosPanel({
  usuario, onSubmit, onCancel, loading,
}: {
  usuario:  Usuario;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  loading:  boolean;
}) {
  const [permisos, setPermisos] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISOS_LABELS.map(p => [p.key, !!usuario[p.key]]))
  );

  function aplicarPlantilla(key: PlantillaKey) {
    setPermisos({ ...PLANTILLAS_PERMISOS[key].permisos });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Plantillas rápidas */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}>Aplicar plantilla</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PLANTILLAS_PERMISOS) as PlantillaKey[]).map(key => (
            <button key={key} type="button" onClick={() => aplicarPlantilla(key)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              {PLANTILLAS_PERMISOS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Permisos por grupo */}
      {GRUPOS.map(grupo => {
        const items = PERMISOS_LABELS.filter(p => p.grupo === grupo);
        return (
          <div key={grupo}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1.5"
              style={{ color: "var(--text-muted)" }}>{grupo}</p>
            <div className="grid grid-cols-2 gap-1">
              {items.map(({ key, label }) => (
                <label key={key}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors"
                  style={{
                    background: permisos[key] ? "var(--accent-subtle)" : "transparent",
                    color: permisos[key] ? "var(--accent)" : "var(--text-secondary)",
                  }}>
                  <input type="checkbox" name={key} value="true"
                    checked={!!permisos[key]}
                    onChange={e => setPermisos(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ accentColor: "var(--accent)" }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm flex-1">
          {loading ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>
    </form>
  );
}

// ── Modal código ──────────────────────────────────────────
function ModalCodigo({
  data, onClose,
}: {
  data: { nombre: string; username: string; codigo: string };
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  function copiarCodigo() {
    navigator.clipboard.writeText(data.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function copiarWhatsApp() {
    const texto = `Hola ${data.nombre} 👋\n\nTu acceso a Komand está listo:\n\n👤 Usuario: *${data.username}*\n🔐 Código: *${data.codigo}*\n\nGuárdalo bien — lo necesitas para ingresar.`;
    navigator.clipboard.writeText(texto);
    alert("Texto copiado. Pégalo en WhatsApp.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--color-success-subtle)" }}>
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            Acceso listo para {data.nombre}
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Comparte estas credenciales con tu colaborador
          </p>
        </div>

        {/* Credenciales */}
        <div className="rounded-xl p-4 mb-5 space-y-3"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Usuario</span>
            <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {data.username}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Código</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold tracking-widest" style={{ color: "var(--accent)" }}>
                {data.codigo}
              </span>
              <button onClick={copiarCodigo}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{
                  background: copiado ? "var(--color-success-subtle)" : "var(--border)",
                  color: copiado ? "var(--color-success)" : "var(--text-muted)",
                }}>
                {copiado ? "✓" : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-2">
          <button onClick={copiarWhatsApp}
            className="btn w-full"
            style={{ background: "#25D366", color: "#fff", border: "none" }}>
            📱 Copiar mensaje para WhatsApp
          </button>
          <button onClick={onClose} className="btn btn-secondary w-full">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card usuario (mobile) ─────────────────────────────────
function UsuarioCard({
  u, estaciones, loading,
  onEditarPermisos, onRegenerar, onToggle, onEliminar,
}: {
  u:               Usuario;
  estaciones:      Estacion[];
  loading:         string | null;
  onEditarPermisos: () => void;
  onRegenerar:     () => void;
  onToggle:        () => void;
  onEliminar:      () => void;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const permisos   = resumenPermisos(u);
  const estacionIds = u.userEstaciones.map(ue => ue.estacionId);
  const misEstaciones = estaciones.filter(e => estacionIds.includes(e.id));

  return (
    <div className="card" style={{ opacity: u.activo ? 1 : 0.55 }}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
          {iniciales(u.nombre)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              {u.nombre}
            </span>
            <span className="badge"
              style={u.activo
                ? { background: "var(--color-success-subtle)", color: "var(--color-success)", fontSize: "0.65rem" }
                : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: "0.65rem" }
              }>
              {u.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            @{u.username}
          </p>

          {/* Estaciones */}
          {misEstaciones.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {misEstaciones.map(e => (
                <span key={e.id}
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ background: e.color ?? "var(--accent)" }}>
                  {e.nombre}
                </span>
              ))}
            </div>
          )}

          {/* Permisos chips */}
          {permisos.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {permisos.slice(0, 4).map(p => (
                <span key={p} className="badge badge-gray" style={{ fontSize: "0.6rem" }}>{p}</span>
              ))}
              {permisos.length > 4 && (
                <span className="badge badge-gray" style={{ fontSize: "0.6rem" }}>
                  +{permisos.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Menú acciones */}
        <div className="relative shrink-0">
          <button onClick={() => setMenuAbierto(!menuAbierto)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
            ⋮
          </button>
          {menuAbierto && (
            <div
              className="absolute right-0 top-10 rounded-xl shadow-lg z-10 overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "160px" }}
              onBlur={() => setMenuAbierto(false)}>
              {[
                { label: "Editar permisos", onClick: () => { onEditarPermisos(); setMenuAbierto(false); } },
                { label: "🔑 Nuevo código",  onClick: () => { onRegenerar(); setMenuAbierto(false); } },
                { label: u.activo ? "Desactivar" : "Activar", onClick: () => { onToggle(); setMenuAbierto(false); } },
                { label: "Eliminar acceso", onClick: () => { onEliminar(); setMenuAbierto(false); }, danger: true },
              ].map(item => (
                <button key={item.label}
                  onClick={item.onClick}
                  disabled={!!loading}
                  className="w-full text-left px-4 py-3 text-sm transition-colors"
                  style={{
                    color: item.danger ? "var(--color-error)" : "var(--text-primary)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function EquipoClient({
  equipo, estaciones,
}: {
  equipo:     Usuario[];
  estaciones: Estacion[];
}) {
  const [showForm,     setShowForm]     = useState(false);
  const [editando,     setEditando]     = useState<Usuario | null>(null);
  const [loading,      setLoading]      = useState<string | null>(null);
  const [error,        setError]        = useState("");
  const [codigoNuevo,  setCodigoNuevo]  = useState<{ nombre: string; username: string; codigo: string } | null>(null);

  // Form crear
  const [plantillaSel,  setPlantilla]   = useState<PlantillaKey | "">("");
  const [permisosForm,  setPermisosForm] = useState<Record<string, boolean>>({});
  const [estacionesForm, setEstacionesForm] = useState<string[]>([]);

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
    if (plantillaSel) fd.set("plantilla", plantillaSel);
    fd.set("estacionIds", estacionesForm.join(","));
    const result = await crearUsuarioOperativo(fd);
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    if (result.ok) {
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

  async function handleActualizarPermisos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setLoading(editando.id + "-permisos");
    const result = await actualizarPermisos(editando.id, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditando(null);
  }

  async function handleRegenerar(u: Usuario) {
    if (!confirm("¿Regenerar el código? El anterior dejará de funcionar.")) return;
    setLoading(u.id + "-regen");
    const result = await regenerarCodigo(u.id);
    setLoading(null);
    if (result?.ok && result.codigo) {
      setCodigoNuevo({ nombre: u.nombre, username: u.username ?? "", codigo: result.codigo });
    }
  }

  async function handleToggle(u: Usuario) {
    setLoading(u.id);
    await toggleUsuario(u.id, !u.activo);
    setLoading(null);
  }

  async function handleEliminar(u: Usuario) {
    if (!confirm(`¿Eliminar acceso de ${u.nombre}?`)) return;
    setLoading(u.id + "-del");
    await eliminarAcceso(u.id);
    setLoading(null);
  }

  return (
    <div>
      {/* Modal código */}
      {codigoNuevo && (
        <ModalCodigo data={codigoNuevo} onClose={() => setCodigoNuevo(null)} />
      )}

      {/* Modal editar permisos */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditando(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Permisos de {editando.nombre}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  @{editando.username}
                </p>
              </div>
              <button onClick={() => setEditando(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                ✕
              </button>
            </div>
            <PermisosPanel
              usuario={editando}
              onSubmit={handleActualizarPermisos}
              onCancel={() => setEditando(null)}
              loading={loading === editando.id + "-permisos"}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => { setShowForm(true); setError(""); setPlantilla(""); setPermisosForm({}); setEstacionesForm([]); }}
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
                    style={plantillaSel === key
                      ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                      : { background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }
                    }>
                    <p className="font-medium">{PLANTILLAS_PERMISOS[key].label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{PLANTILLAS_PERMISOS[key].descripcion}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Permisos */}
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
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors"
                            style={{
                              background: permisosForm[key] ? "var(--accent-subtle)" : "transparent",
                              color: permisosForm[key] ? "var(--accent)" : "var(--text-secondary)",
                            }}>
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
                Define qué estaciones ve en el KDS.
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
        <>
          {/* Mobile — cards */}
          <div className="sm:hidden space-y-3">
            {equipo.map(u => (
              <UsuarioCard
                key={u.id} u={u} estaciones={estaciones} loading={loading}
                onEditarPermisos={() => setEditando(u)}
                onRegenerar={() => handleRegenerar(u)}
                onToggle={() => handleToggle(u)}
                onEliminar={() => handleEliminar(u)}
              />
            ))}
          </div>

          {/* Desktop — tabla */}
          <div className="hidden sm:block card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Persona", "Estaciones", "Permisos", "Estado", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-wide px-5 py-3"
                      style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipo.map(u => {
                  const permisos     = resumenPermisos(u);
                  const estacionIds  = u.userEstaciones.map(ue => ue.estacionId);
                  const misEstaciones = estaciones.filter(e => estacionIds.includes(e.id));
                  return (
                    <tr key={u.id} style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      opacity: u.activo ? 1 : 0.5,
                    }}>
                      {/* Persona */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                            {iniciales(u.nombre)}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {u.nombre}
                            </p>
                            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Estaciones */}
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {misEstaciones.length === 0 ? (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                          ) : misEstaciones.map(e => (
                            <span key={e.id}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ background: e.color ?? "var(--accent)" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                              {e.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Permisos */}
                      <td className="px-5 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {permisos.slice(0, 3).map(p => (
                            <span key={p} className="badge badge-gray" style={{ fontSize: "0.65rem" }}>{p}</span>
                          ))}
                          {permisos.length > 3 && (
                            <span className="badge badge-gray" style={{ fontSize: "0.65rem" }}>
                              +{permisos.length - 3}
                            </span>
                          )}
                          {permisos.length === 0 && (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sin permisos</span>
                          )}
                        </div>
                      </td>
                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span className="badge"
                          style={u.activo
                            ? { background: "var(--color-success-subtle)", color: "var(--color-success)" }
                            : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                          }>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditando(u)} disabled={!!loading}
                            className="btn btn-ghost btn-sm">Permisos</button>
                          <button onClick={() => handleRegenerar(u)} disabled={!!loading}
                            className="btn btn-ghost btn-sm">
                            {loading === u.id + "-regen" ? "..." : "🔑"}
                          </button>
                          <button onClick={() => handleToggle(u)} disabled={!!loading}
                            className="btn btn-ghost btn-sm">
                            {loading === u.id ? "..." : u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={() => handleEliminar(u)} disabled={!!loading}
                            className="btn btn-ghost btn-sm" style={{ color: "var(--color-error)" }}>
                            {loading === u.id + "-del" ? "..." : "✕"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}