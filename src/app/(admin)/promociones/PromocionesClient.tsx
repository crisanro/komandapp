"use client";
import { useState } from "react";
import {
  crearPromocion, editarPromocion, togglePromocion, eliminarPromocion,
} from "@/actions/promociones";

// ── Types ─────────────────────────────────────────────────
type Categoria = { id: string; nombre: string };
type ItemMenu  = { id: string; nombre: string; precio: string; categoriaId: string };
type ComboItem = { id: string; menuItemId: string; cantidad: number; menuItem: { nombre: string; precio: string } | null };

type Promo = {
  id: string; titulo: string; descripcion: string | null;
  emoji: string | null; tipo: string; visibilidad: "CLIENTE" | "EQUIPO" | "AMBOS";
  activa: boolean;
  porcentaje: string | null; montoFijo: string | null;
  precioCombo: string | null; montoMinimo: string | null;
  categoriaId: string | null; menuItemId: string | null;
  fechaInicio: Date | null; fechaFin: Date | null;
  horaInicio: string | null; horaFin: string | null;
  diasSemana: number[] | null;
  itemsCombo: ComboItem[];
  menuItem: { nombre: string } | null;
  categoria: { nombre: string } | null;
};

// ── Constantes ────────────────────────────────────────────
const TIPOS = [
  { value: "PORCENTAJE",           label: "% Descuento en cuenta",      emoji: "💯", desc: "Ej: 15% en toda la cuenta" },
  { value: "PORCENTAJE_CATEGORIA", label: "% Descuento en categoría",   emoji: "🏷️", desc: "Ej: 10% en bebidas" },
  { value: "MONTO_FIJO",          label: "Monto fijo de descuento",     emoji: "💵", desc: "Ej: $5 de descuento" },
  { value: "2X1",                  label: "2x1 en ítem",                emoji: "2️⃣", desc: "Pagas 1, llevas 2" },
  { value: "3X2",                  label: "3x2 en ítem",                emoji: "3️⃣", desc: "Pagas 2, llevas 3" },
  { value: "COMBO",                label: "Combo a precio fijo",         emoji: "🍱", desc: "Grupo de ítems a precio especial" },
  { value: "HAPPY_HOUR",           label: "Happy Hour",                  emoji: "🍺", desc: "% descuento en rango horario" },
  { value: "PRIMERA_VISITA",       label: "Primera visita",              emoji: "👋", desc: "Descuento para clientes nuevos" },
  { value: "CUMPLEANOS",           label: "Cumpleaños",                  emoji: "🎂", desc: "Descuento en el mes del cliente" },
];

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const VISIBILIDAD_LABEL: Record<string, string> = {
  CLIENTE: "👤 Solo clientes",
  EQUIPO:  "👥 Solo equipo",
  AMBOS:   "🌐 Todos",
};

const EMOJIS = ["🎉", "🍺", "🍕", "🔥", "⚡", "🎁", "💡", "⚠️", "📢", "✅", "🎂", "🍱", "💯", "💵", "👋"];

// ── Helpers ───────────────────────────────────────────────
function isVigente(p: Promo): boolean {
  if (!p.activa) return false;
  const ahora = new Date();
  if (p.fechaInicio && new Date(p.fechaInicio) > ahora) return false;
  if (p.fechaFin    && new Date(p.fechaFin)    < ahora) return false;
  return true;
}

function labelTipo(tipo: string): string {
  return TIPOS.find(t => t.value === tipo)?.label ?? tipo;
}

function resumenPromo(p: Promo): string {
  switch (p.tipo) {
    case "PORCENTAJE":           return `${p.porcentaje}% de descuento${p.montoMinimo ? ` (mín. $${p.montoMinimo})` : ""}`;
    case "PORCENTAJE_CATEGORIA": return `${p.porcentaje}% en ${p.categoria?.nombre ?? "categoría"}`;
    case "MONTO_FIJO":           return `$${p.montoFijo} de descuento${p.montoMinimo ? ` (mín. $${p.montoMinimo})` : ""}`;
    case "2X1":                  return `2x1 en ${p.menuItem?.nombre ?? "ítem"}`;
    case "3X2":                  return `3x2 en ${p.menuItem?.nombre ?? "ítem"}`;
    case "COMBO":                return `Combo $${p.precioCombo} — ${p.itemsCombo.length} ítem(s)`;
    case "HAPPY_HOUR":           return `${p.porcentaje}% de ${p.horaInicio} a ${p.horaFin}`;
    case "PRIMERA_VISITA":       return `${p.porcentaje}% primera visita`;
    case "CUMPLEANOS":           return `${p.porcentaje}% en cumpleaños`;
    default:                     return "";
  }
}

// ── Formulario ────────────────────────────────────────────
function PromoForm({
  defaultValues, categorias, menuItems: items,
  onSubmit, onCancel, loading, submitLabel,
}: {
  defaultValues?: Promo;
  categorias:  Categoria[];
  menuItems:   ItemMenu[];
  onSubmit:    (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel:    () => void;
  loading:     boolean;
  submitLabel: string;
}) {
  const [emoji,      setEmoji]      = useState(defaultValues?.emoji ?? "🎉");
  const [tipo,       setTipo]       = useState(defaultValues?.tipo ?? "PORCENTAJE");
  const [diasSel,    setDiasSel]    = useState<number[]>(defaultValues?.diasSemana ?? []);
  const [comboSel,   setComboSel]   = useState<{ menuItemId: string; cantidad: number }[]>(
    defaultValues?.itemsCombo.map(i => ({ menuItemId: i.menuItemId, cantidad: i.cantidad })) ?? []
  );

  const necesitaPorcentaje  = ["PORCENTAJE", "PORCENTAJE_CATEGORIA", "HAPPY_HOUR", "PRIMERA_VISITA", "CUMPLEANOS"].includes(tipo);
  const necesitaCategoria   = tipo === "PORCENTAJE_CATEGORIA";
  const necesitaItem        = ["2X1", "3X2"].includes(tipo);
  const necesitaCombo       = tipo === "COMBO";
  const necesitaMontoFijo   = tipo === "MONTO_FIJO";
  const necesitaHora        = ["HAPPY_HOUR"].includes(tipo);
  const necesitaMontoMinimo = ["PORCENTAJE", "MONTO_FIJO"].includes(tipo);

  function toggleDia(dia: number) {
    setDiasSel(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  function agregarComboItem(menuItemId: string) {
    if (!menuItemId) return;
    const existe = comboSel.find(c => c.menuItemId === menuItemId);
    if (existe) {
      setComboSel(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setComboSel(prev => [...prev, { menuItemId, cantidad: 1 }]);
    }
  }

  function quitarComboItem(menuItemId: string) {
    setComboSel(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }

  return (
    <div className="card mb-6" style={{ borderColor: "var(--accent)", borderWidth: "1.5px" }}>
      <form onSubmit={onSubmit} className="space-y-5">
        <input type="hidden" name="emoji"      value={emoji} />
        <input type="hidden" name="diasSemana" value={JSON.stringify(diasSel)} />
        <input type="hidden" name="comboItems" value={JSON.stringify(comboSel)} />

        {/* Tipo */}
        <div className="field">
          <label className="label">Tipo de promoción *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <label key={t.value}
                className="flex items-start gap-2 p-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: tipo === t.value ? "var(--accent-subtle)" : "var(--surface-raised)",
                  border:     tipo === t.value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                }}>
                <input type="radio" name="tipo" value={t.value}
                  checked={tipo === t.value} onChange={() => setTipo(t.value)}
                  className="mt-0.5 shrink-0" style={{ accentColor: "var(--accent)" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t.emoji} {t.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Título y visibilidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">Título *</label>
            <input name="titulo" required defaultValue={defaultValues?.titulo}
              placeholder="Happy Hour — 2x1 en cervezas" className="input" />
          </div>
          <div className="field">
            <label className="label">¿Para quién?</label>
            <select name="visibilidad" defaultValue={defaultValues?.visibilidad ?? "AMBOS"}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="AMBOS">🌐 Clientes y equipo</option>
              <option value="CLIENTE">👤 Solo clientes</option>
              <option value="EQUIPO">👥 Solo equipo</option>
            </select>
          </div>
        </div>

        {/* Descripción */}
        <div className="field">
          <label className="label">Descripción</label>
          <input name="descripcion" defaultValue={defaultValues?.descripcion ?? ""}
            placeholder="Válido de lunes a viernes · Solo bebidas de barril" className="input" />
        </div>

        {/* Emoji */}
        <div className="field">
          <label className="label">Emoji</label>
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl text-xl transition-all"
                style={{
                  background:    emoji === e ? "var(--accent-subtle)" : "var(--surface-raised)",
                  outline:       emoji === e ? "2px solid var(--accent)" : "none",
                  outlineOffset: "1px",
                  transform:     emoji === e ? "scale(1.1)" : "scale(1)",
                }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Porcentaje */}
        {necesitaPorcentaje && (
          <div className="field">
            <label className="label">Porcentaje de descuento *</label>
            <div className="relative">
              <input name="porcentaje" type="number" step="0.01" min="0" max="100" required
                defaultValue={defaultValues?.porcentaje ?? ""}
                placeholder="15" className="input" style={{ paddingRight: "2.5rem" }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
        )}

        {/* Monto fijo */}
        {necesitaMontoFijo && (
          <div className="field">
            <label className="label">Monto de descuento *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--text-muted)" }}>$</span>
              <input name="montoFijo" type="number" step="0.01" min="0" required
                defaultValue={defaultValues?.montoFijo ?? ""}
                placeholder="5.00" className="input" style={{ paddingLeft: "1.75rem" }} />
            </div>
          </div>
        )}

        {/* Monto mínimo */}
        {necesitaMontoMinimo && (
          <div className="field">
            <label className="label">
              Monto mínimo <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--text-muted)" }}>$</span>
              <input name="montoMinimo" type="number" step="0.01" min="0"
                defaultValue={defaultValues?.montoMinimo ?? ""}
                placeholder="20.00" className="input" style={{ paddingLeft: "1.75rem" }} />
            </div>
          </div>
        )}

        {/* Categoría */}
        {necesitaCategoria && (
          <div className="field">
            <label className="label">Categoría *</label>
            <select name="categoriaId" required
              defaultValue={defaultValues?.categoriaId ?? ""}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Item específico */}
        {necesitaItem && (
          <div className="field">
            <label className="label">Ítem *</label>
            <select name="menuItemId" required
              defaultValue={defaultValues?.menuItemId ?? ""}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="">Selecciona un ítem</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.nombre} — ${parseFloat(i.precio).toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Combo */}
        {necesitaCombo && (
          <div className="space-y-3">
            <div className="field">
              <label className="label">Precio del combo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--text-muted)" }}>$</span>
                <input name="precioCombo" type="number" step="0.01" min="0" required
                  defaultValue={defaultValues?.precioCombo ?? ""}
                  placeholder="9.99" className="input" style={{ paddingLeft: "1.75rem" }} />
              </div>
            </div>
            <div className="field">
              <label className="label">Ítems del combo</label>
              <select onChange={e => { agregarComboItem(e.target.value); e.target.value = ""; }}
                className="input" style={{ background: "var(--surface-raised)" }}>
                <option value="">+ Agregar ítem al combo</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre} — ${parseFloat(i.precio).toFixed(2)}</option>
                ))}
              </select>
              {comboSel.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {comboSel.map(c => {
                    const item = items.find(i => i.id === c.menuItemId);
                    return (
                      <div key={c.menuItemId}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                        <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                          {item?.nombre}
                        </span>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setComboSel(prev => prev.map(p =>
                              p.menuItemId === c.menuItemId ? { ...p, cantidad: Math.max(1, p.cantidad - 1) } : p
                            ))}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ background: "var(--border)", color: "var(--text-primary)" }}>−</button>
                          <span className="text-sm w-4 text-center" style={{ color: "var(--text-primary)" }}>
                            {c.cantidad}
                          </span>
                          <button type="button"
                            onClick={() => setComboSel(prev => prev.map(p =>
                              p.menuItemId === c.menuItemId ? { ...p, cantidad: p.cantidad + 1 } : p
                            ))}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ background: "var(--border)", color: "var(--text-primary)" }}>+</button>
                        </div>
                        <button type="button" onClick={() => quitarComboItem(c.menuItemId)}
                          className="text-xs" style={{ color: "var(--color-error)" }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hora — Happy Hour */}
        {necesitaHora && (
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Hora inicio *</label>
              <input name="horaInicio" type="time" required
                defaultValue={defaultValues?.horaInicio ?? ""}
                className="input" />
            </div>
            <div className="field">
              <label className="label">Hora fin *</label>
              <input name="horaFin" type="time" required
                defaultValue={defaultValues?.horaFin ?? ""}
                className="input" />
            </div>
          </div>
        )}

        {/* Días de la semana */}
        <div className="field">
          <label className="label">
            Días activos <span className="font-normal" style={{ color: "var(--text-muted)" }}>(vacío = todos los días)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map((dia, idx) => (
              <button key={idx} type="button" onClick={() => toggleDia(idx)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={diasSel.includes(idx)
                  ? { background: "var(--accent)", color: "white" }
                  : { background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }>
                {dia}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">
              Fecha inicio <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <input name="fechaInicio" type="datetime-local"
              defaultValue={defaultValues?.fechaInicio
                ? new Date(defaultValues.fechaInicio).toISOString().slice(0, 16) : ""}
              className="input" />
          </div>
          <div className="field">
            <label className="label">
              Fecha fin <span className="font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
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

// ── Lista ─────────────────────────────────────────────────
export default function PromocionesClient({
  promos, categorias, menuItems: items,
}: {
  promos:     Promo[];
  categorias: Categoria[];
  menuItems:  ItemMenu[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Promo | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [error,    setError]    = useState("");

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

  return (
    <div>
      <button
        onClick={() => { setShowForm(true); setEditando(null); setError(""); }}
        className="btn btn-primary mb-6">
        <span className="text-lg leading-none">+</span> Nueva promoción
      </button>

      {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

      {showForm && (
        <PromoForm
          categorias={categorias} menuItems={items}
          onSubmit={handleCrear} onCancel={() => setShowForm(false)}
          loading={loading === "crear"} submitLabel="Crear promoción"
        />
      )}

      {promos.length === 0 && !showForm ? (
        <div className="empty-state card">
          <p className="text-4xl">🎉</p>
          <p style={{ color: "var(--text-muted)" }}>Sin promociones aún.</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Crea descuentos, combos y ofertas para tus clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(promo => (
            <div key={promo.id}>
              {editando?.id === promo.id ? (
                <PromoForm
                  defaultValues={promo} categorias={categorias} menuItems={items}
                  onSubmit={handleEditar} onCancel={() => setEditando(null)}
                  loading={loading === "editar"} submitLabel="Guardar cambios"
                />
              ) : (
                <div className="card flex items-center gap-4"
                  style={{ opacity: isVigente(promo) ? 1 : 0.55 }}>
                  <span className="text-3xl shrink-0">{promo.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {promo.titulo}
                      </span>
                      <span className="badge badge-gray" style={{ fontSize: "0.65rem" }}>
                        {labelTipo(promo.tipo)}
                      </span>
                      <span className="badge badge-gray" style={{ fontSize: "0.65rem" }}>
                        {VISIBILIDAD_LABEL[promo.visibilidad]}
                      </span>
                      {isVigente(promo) && (
                        <span className="badge"
                          style={{ background: "var(--color-success-subtle)", color: "var(--color-success)" }}>
                          ✓ Activa
                        </span>
                      )}
                      {promo.fechaFin && new Date(promo.fechaFin) < new Date() && (
                        <span className="badge badge-gray">Vencida</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--accent)" }}>
                      {resumenPromo(promo)}
                    </p>
                    {promo.descripcion && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {promo.descripcion}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {(promo.diasSemana ?? []).length > 0 && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          📅 {(promo.diasSemana as number[]).map(d => DIAS[d]).join(", ")}
                        </p>
                      )}
                      {promo.horaInicio && promo.horaFin && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          🕐 {promo.horaInicio} – {promo.horaFin}
                        </p>
                      )}
                      {promo.fechaInicio && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Desde {new Date(promo.fechaInicio).toLocaleDateString("es-EC")}
                        </p>
                      )}
                      {promo.fechaFin && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Hasta {new Date(promo.fechaFin).toLocaleDateString("es-EC")}
                        </p>
                      )}
                    </div>
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