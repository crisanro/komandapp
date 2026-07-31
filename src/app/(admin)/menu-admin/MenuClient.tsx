"use client";

import { useState } from "react";
import {
  crearCategoria, editarCategoria, eliminarCategoria,
  crearItem, editarItem, toggleAgotado, eliminarItem,
} from "@/actions/menu";
import { uploadImagenMenuItem, eliminarImagenMenuItem } from "@/actions/upload-imagen-menu";
import ImageUploader from "@/components/shared/ImageUploader";

type Estacion = { id: string; nombre: string; color: string | null };
type Item = {
  id: string; nombre: string; descripcion: string | null;
  precio: string; tags: string[] | null; disponible: boolean;
  agotado: boolean; categoriaId: string; estacionId: string | null;
  imagenUrl: string | null;
  rucFacturacion: "PRINCIPAL" | "ARTESANAL";
  porcentajeIva: string;
};
type Categoria = {
  id: string; nombre: string; activa: boolean;
  items: Item[];
};

type ModoIva = "INCLUIDO" | "ADICIONAL" | "EXENTO";

const TAGS = ["popular", "nuevo", "vegano", "vegetariano", "sin_gluten", "picante"];
const TAG_LABEL: Record<string, string> = {
  popular: "⭐ Popular", nuevo: "🆕 Nuevo", vegano: "🌱 Vegano",
  vegetariano: "🥦 Vegetariano", sin_gluten: "🌾 Sin gluten", picante: "🌶 Picante",
};

function getModoIva(porcentajeIva: string): ModoIva {
  const pct = parseFloat(porcentajeIva);
  if (pct === 0) return "EXENTO";
  return "INCLUIDO";
}

function porcentajeDesde(modo: ModoIva, ivaVigente: number): string {
  if (modo === "EXENTO" || modo === "ADICIONAL") return modo === "EXENTO" ? "0" : String(ivaVigente);
  return String(ivaVigente);
}

export default function MenuAdminClient({
  menu, estaciones, multiRuc, ivaVigente,
}: {
  menu:       Categoria[];
  estaciones: Estacion[];
  multiRuc:   boolean;
  ivaVigente: number;
}) {
  const [activeCat, setActiveCat]       = useState<string | null>(menu[0]?.id ?? null);
  const [showCatForm, setShowCatForm]   = useState(false);
  const [editandoCat, setEditandoCat]   = useState<Categoria | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editandoItem, setEditandoItem] = useState<Item | null>(null);
  const [loading, setLoading]           = useState<string | null>(null);
  const [error, setError]               = useState("");

  const catActual = menu.find(c => c.id === activeCat);

  async function handleCrearCat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("cat-crear");
    const result = await crearCategoria(new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setShowCatForm(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleEditarCat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editandoCat) return;
    setLoading("cat-editar");
    const result = await editarCategoria(editandoCat.id, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditandoCat(null);
  }

  async function handleEliminarCat(cat: Categoria) {
    if (!confirm(`¿Eliminar categoría "${cat.nombre}"?`)) return;
    setLoading(cat.id + "-del");
    const result = await eliminarCategoria(cat.id);
    setLoading(null);
    if (result?.error) setError(result.error);
  }

  async function handleCrearItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("item-crear");
    const formData = new FormData(e.currentTarget);
    if (activeCat) formData.set("categoriaId", activeCat);
    const result = await crearItem(formData);
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setShowItemForm(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleEditarItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editandoItem) return;
    setLoading("item-editar");
    const result = await editarItem(editandoItem.id, new FormData(e.currentTarget));
    setLoading(null);
    if (result?.error) { setError(result.error); return; }
    setEditandoItem(null);
  }

  return (
    <div className="flex gap-6">

      {/* ── Panel izquierdo — categorías ── */}
      <div className="w-60 shrink-0 space-y-4">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Categorías
            </span>
            <button onClick={() => setShowCatForm(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
              style={{ background: "var(--accent)" }}>+</button>
          </div>

          {showCatForm && (
            <form onSubmit={handleCrearCat} className="p-3 space-y-2"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <input name="nombre" required placeholder="Ej: Bebidas" autoFocus className="input" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCatForm(false)}
                  className="btn btn-secondary btn-sm flex-1">Cancelar</button>
                <button type="submit" disabled={loading === "cat-crear"}
                  className="btn btn-primary btn-sm flex-1">
                  {loading === "cat-crear" ? "..." : "Crear"}
                </button>
              </div>
            </form>
          )}

          <ul>
            {menu.length === 0 && (
              <li className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Sin categorías aún
              </li>
            )}
            {menu.map(cat => (
              <li key={cat.id}>
                {editandoCat?.id === cat.id ? (
                  <form onSubmit={handleEditarCat} className="p-3 space-y-2"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <input name="nombre" defaultValue={cat.nombre} required autoFocus className="input" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditandoCat(null)}
                        className="btn btn-secondary btn-sm flex-1">Cancelar</button>
                      <button type="submit" disabled={loading === "cat-editar"}
                        className="btn btn-primary btn-sm flex-1">
                        {loading === "cat-editar" ? "..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => { setActiveCat(cat.id); setShowItemForm(false); setEditandoItem(null); }}
                    className="w-full text-left px-4 py-3 text-sm flex items-center justify-between group transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background:   activeCat === cat.id ? "var(--accent-subtle)" : "transparent",
                      color:        activeCat === cat.id ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight:   activeCat === cat.id ? 600 : 400,
                      borderLeft:   activeCat === cat.id ? "3px solid var(--accent)" : "3px solid transparent",
                    }}>
                    <span style={{ opacity: cat.activa ? 1 : 0.4 }}>{cat.nombre}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <span onClick={e => { e.stopPropagation(); setEditandoCat(cat); }}
                        className="text-xs px-1" style={{ color: "var(--text-muted)" }}>✎</span>
                      <span onClick={e => { e.stopPropagation(); handleEliminarCat(cat); }}
                        className="text-xs px-1" style={{ color: "var(--color-error)" }}>✕</span>
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Info IVA */}
        <div className="card" style={{ background: "var(--accent-subtle)", borderColor: "rgba(232,93,4,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>IVA configurado</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--accent)" }}>{ivaVigente}%</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Se aplica automáticamente. Cámbialo en Configuración.
          </p>
        </div>

        {/* Leyenda estaciones */}
        {estaciones.length > 0 && (
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              Estaciones
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>🧑‍🍽️ Mesero</span>
              </div>
              {estaciones.map(e => (
                <div key={e.id} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color ?? "var(--accent)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{e.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Panel derecho — ítems ── */}
      <div className="flex-1 min-w-0">
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-xs">✕</button>
          </div>
        )}

        {!catActual ? (
          <div className="empty-state card">
            <p className="text-4xl">🍽</p>
            <p style={{ color: "var(--text-muted)" }}>Crea una categoría primero</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {catActual.nombre}
                <span className="text-sm font-normal ml-2" style={{ color: "var(--text-muted)" }}>
                  {catActual.items.length} ítem{catActual.items.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <button onClick={() => { setShowItemForm(true); setEditandoItem(null); setError(""); }}
                className="btn btn-primary btn-sm">
                <span>+</span> Agregar ítem
              </button>
            </div>

            {showItemForm && (
              <ItemForm
                estaciones={estaciones}
                defaultCategoriaId={activeCat!}
                onSubmit={handleCrearItem}
                onCancel={() => setShowItemForm(false)}
                loading={loading === "item-crear"}
                submitLabel="Crear ítem"
                multiRuc={multiRuc}
                ivaVigente={ivaVigente}
              />
            )}

            {catActual.items.length === 0 && !showItemForm ? (
              <div className="empty-state card">
                <p className="text-3xl">🍴</p>
                <p style={{ color: "var(--text-muted)" }}>Sin ítems en esta categoría</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catActual.items.map(item => (
                  <div key={item.id}>
                    {editandoItem?.id === item.id ? (
                      <ItemForm
                        estaciones={estaciones}
                        defaultCategoriaId={item.categoriaId}
                        defaultValues={item}
                        onSubmit={handleEditarItem}
                        onCancel={() => setEditandoItem(null)}
                        loading={loading === "item-editar"}
                        submitLabel="Guardar cambios"
                        multiRuc={multiRuc}
                        ivaVigente={ivaVigente}
                      />
                    ) : (
                      <ItemRow
                        item={item}
                        estaciones={estaciones}
                        multiRuc={multiRuc}
                        ivaVigente={ivaVigente}
                        onEditar={() => { setEditandoItem(item); setShowItemForm(false); setError(""); }}
                        onEliminar={async () => {
                          if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
                          setLoading(item.id + "-del");
                          await eliminarItem(item.id);
                          setLoading(null);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Fila de ítem ─────────────────────────────────────────

function ItemRow({ item, estaciones, multiRuc, ivaVigente, onEditar, onEliminar }: {
  item:       Item;
  estaciones: Estacion[];
  multiRuc:   boolean;
  ivaVigente: number;
  onEditar:   () => void;
  onEliminar: () => void;
}) {
  const modoIva = getModoIva(item.porcentajeIva);
  const precio  = parseFloat(item.precio);
  const estacion = estaciones.find(e => e.id === item.estacionId);

  return (
    <div className="card" style={{
      opacity:     item.disponible ? 1 : 0.5,
      borderColor: item.agotado ? "var(--color-error)" : "var(--border)",
    }}>
      <div className="flex items-center gap-4">

        {/* Imagen */}
        <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          {item.imagenUrl ? (
            <img src={item.imagenUrl} alt={item.nombre}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              🍽
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              {item.nombre}
            </span>
            {(item.tags ?? []).map(tag => (
              <span key={tag} className="badge badge-gray" style={{ fontSize: "0.65rem" }}>
                {TAG_LABEL[tag] ?? tag}
              </span>
            ))}
            {item.agotado && <span className="badge badge-red">Agotado</span>}
            {modoIva === "EXENTO" && (
              <span className="badge badge-gray" style={{ fontSize: "0.65rem" }}>Sin IVA</span>
            )}
            {multiRuc && item.rucFacturacion === "ARTESANAL" && (
              <span className="badge badge-orange" style={{ fontSize: "0.65rem" }}>Artesanal</span>
            )}
          </div>
          {item.descripcion && (
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {item.descripcion}
            </p>
          )}
          {/* Estación */}
          <div className="flex items-center gap-1 mt-0.5">
            {estacion ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: estacion.color ?? "var(--accent)" }} />
                <span className="text-xs" style={{ color: estacion.color ?? "var(--accent)" }}>
                  {estacion.nombre}
                </span>
              </>
            ) : (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                🧑‍🍽️ Mesero
              </span>
            )}
          </div>
        </div>

        {/* Precio */}
        <div className="text-right shrink-0">
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            ${precio.toFixed(2)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {modoIva === "EXENTO" ? "Sin IVA" : `IVA ${ivaVigente}% incl.`}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => toggleAgotado(item.id, !item.agotado)}
            className="btn btn-secondary btn-sm"
            style={item.agotado ? { color: "var(--color-error)" } : {}}>
            {item.agotado ? "↺ Reponer" : "Agotado"}
          </button>
          <button onClick={onEditar} className="btn btn-secondary btn-sm">Editar</button>
          <button onClick={onEliminar} className="btn btn-ghost btn-sm btn-icon"
            style={{ color: "var(--color-error)" }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Formulario ítem ──────────────────────────────────────

function ItemForm({
  estaciones, defaultCategoriaId, defaultValues,
  onSubmit, onCancel, loading, submitLabel, multiRuc, ivaVigente,
}: {
  estaciones:         Estacion[];
  defaultCategoriaId: string;
  defaultValues?:     Partial<Item>;
  onSubmit:           (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel:           () => void;
  loading:            boolean;
  submitLabel:        string;
  multiRuc:           boolean;
  ivaVigente:         number;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultValues?.tags ?? []);
  const [modoIva, setModoIva]           = useState<ModoIva>(
    defaultValues?.porcentajeIva ? getModoIva(defaultValues.porcentajeIva) : "INCLUIDO"
  );

  const MODO_IVA_OPTIONS: { value: ModoIva; label: string; desc: string }[] = [
    {
      value: "INCLUIDO",
      label: `El precio ya incluye IVA (${ivaVigente}%)`,
      desc:  "El cliente paga exactamente el precio que ves. El sistema extrae el IVA para la factura.",
    },
    {
      value: "ADICIONAL",
      label: `El precio no incluye IVA — se suma ${ivaVigente}%`,
      desc:  "Útil si manejas precios de carta sin IVA. El total al cliente será mayor.",
    },
    {
      value: "EXENTO",
      label: "Sin IVA (0%)",
      desc:  "Para artesanos calificados o productos exentos por ley.",
    },
  ];

  return (
    <div className="card mb-4" style={{ borderColor: "var(--accent)", borderWidth: "1.5px" }}>
      <form onSubmit={onSubmit} className="space-y-5">
        <input type="hidden" name="tags"          value={selectedTags.join(",")} />
        <input type="hidden" name="categoriaId"   value={defaultCategoriaId} />
        <input type="hidden" name="porcentajeIva" value={porcentajeDesde(modoIva, ivaVigente)} />

        {/* Imagen */}
        {defaultValues?.id ? (
          <ImageUploader
            itemId={defaultValues.id}
            imagenActual={defaultValues.imagenUrl ?? null}
            onUpload={uploadImagenMenuItem}
            onEliminar={async () => { await eliminarImagenMenuItem(defaultValues.id!); }}
          />
        ) : (
          <div className="alert" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              💡 Podrás agregar una imagen después de crear el ítem.
            </span>
          </div>
        )}

        {/* Nombre y precio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">Nombre *</label>
            <input name="nombre" required defaultValue={defaultValues?.nombre}
              placeholder="Ceviche de camarón" className="input" />
          </div>
          <div className="field">
            <label className="label">Precio en carta *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--text-muted)" }}>$</span>
              <input name="precio" required type="number" step="0.01" min="0"
                defaultValue={defaultValues?.precio} placeholder="8.50"
                className="input" style={{ paddingLeft: "1.75rem" }} />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="field">
          <label className="label">Descripción</label>
          <input name="descripcion" defaultValue={defaultValues?.descripcion ?? ""}
            placeholder="Descripción breve del plato" className="input" />
        </div>

        {/* IVA */}
        <div className="field">
          <label className="label">¿Cómo va el IVA en este precio?</label>
          <div className="space-y-2">
            {MODO_IVA_OPTIONS.map(opt => (
              <label key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: modoIva === opt.value ? "var(--accent-subtle)" : "var(--surface-raised)",
                  border:     modoIva === opt.value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                }}>
                <input type="radio" name="modoIva" value={opt.value}
                  checked={modoIva === opt.value}
                  onChange={() => setModoIva(opt.value)}
                  className="mt-0.5 shrink-0"
                  style={{ accentColor: "var(--accent)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {opt.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Estación — por ítem, no por categoría */}
        <div className="field">
          <label className="label">¿Quién despacha este producto?</label>
          <select name="estacionId"
            defaultValue={defaultValues?.estacionId ?? ""}
            className="input" style={{ background: "var(--surface-raised)" }}>
            <option value="">🧑‍🍽️ Mesero lo despacha</option>
            {estaciones.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Ej: las cervezas pueden ir al Bar aunque la categoría sea "Bebidas".
          </p>
        </div>

        {/* RUC — solo Plan Pro+ */}
        {multiRuc && (
          <div className="field">
            <label className="label">¿A qué RUC se factura?</label>
            <select name="rucFacturacion"
              defaultValue={defaultValues?.rucFacturacion ?? "PRINCIPAL"}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="PRINCIPAL">RUC Principal — facturación estándar</option>
              <option value="ARTESANAL">RUC Artesanal — mano de obra exenta</option>
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Por defecto va al RUC principal. Cambia solo si este ítem corresponde a tu actividad artesanal.
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="field">
          <label className="label">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button key={tag} type="button"
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={selectedTags.includes(tag)
                  ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }
                }>
                {TAG_LABEL[tag]}
              </button>
            ))}
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