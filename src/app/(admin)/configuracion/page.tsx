"use client";

import { useState, useEffect } from "react";
import { actualizarRestaurante, guardarConfigFacturacion, validarKipu } from "@/actions/restaurant";

const COLORES = [
  "#E85D04", "#DC2626", "#D97706", "#16A34A",
  "#2563EB", "#7C3AED", "#DB2777", "#0891B2",
];

type Restaurant = {
  nombre: string; ciudad: string | null; whatsapp: string | null;
  color: string | null; notasMenu: string | null; notaCuenta: string | null;
  moneda: string | null; slug: string; plan: "BASICO" | "PRO";
  propinaModo: "AUTOMATICA" | "SUGERIDA" | "INCLUIDA" | "DESACTIVADA" | null;
  porcentajePropina: number | null;
  ivaPorcentaje: string | null;
  propinaAdicionalPermitida: boolean | null;
  // Facturación
  rucPrincipal: string | null;
  razonSocial: string | null;
  codEstablecimiento: string | null;
  codPuntoEmision: string | null;
  ambiente: string | null;
  kipuValidado: boolean | null;
  rucArtesanal: string | null;
  razonSocialArtesanal: string | null;
  codEstablecimientoArtesanal: string | null;
  codPuntoEmisionArtesanal: string | null;
};

export default function ConfiguracionPage() {
  const [restaurant, setRestaurant]     = useState<Restaurant | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState("");
  const [color, setColor]               = useState("#E85D04");
  const [propinaModo, setPropinaModo]   = useState<"AUTOMATICA" | "SUGERIDA" | "INCLUIDA" | "DESACTIVADA">("SUGERIDA");
  const [showArtesanal, setShowArtesanal] = useState(false);
  const [validando, setValidando]       = useState(false);
  const [validacionMsg, setValidacionMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingFact, setSavingFact]     = useState(false);
  const [savedFact, setSavedFact]       = useState(false);
  const [errorFact, setErrorFact]       = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(data => {
        const r = data.restaurant;
        setRestaurant(r);
        setColor(r?.color ?? "#E85D04");
        setPropinaModo(r?.propinaModo ?? "SUGERIDA");
        setShowArtesanal(!!r?.rucArtesanal);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    formData.set("color",       color);
    formData.set("propinaModo", propinaModo);
    const result = await actualizarRestaurante(formData);
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleValidarKipu() {
    setValidando(true);
    setValidacionMsg(null);
    const result = await validarKipu();
    setValidando(false);
    if (result?.ok) {
      setValidacionMsg({ ok: true, msg: "✅ Conexión validada con Kipu. Listo para facturar." });
      setRestaurant(prev => prev ? { ...prev, kipuValidado: true } : prev);
    } else {
      setValidacionMsg({ ok: false, msg: result?.error ?? "Error al validar" });
    }
  }

  async function handleGuardarFacturacion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorFact("");
    setSavingFact(true);
    const result = await guardarConfigFacturacion(new FormData(e.currentTarget));
    setSavingFact(false);
    if (result?.error) { setErrorFact(result.error); return; }
    setSavedFact(true);
    setRestaurant(prev => prev ? { ...prev, kipuValidado: false } : prev);
    setValidacionMsg(null);
    setTimeout(() => setSavedFact(false), 3000);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl">
        <div className="space-y-4" style={{ opacity: 0.4 }}>
          <div className="h-8 rounded-xl" style={{ background: "var(--border)", width: "12rem" }} />
          <div className="h-64 rounded-2xl" style={{ background: "var(--surface)" }} />
        </div>
      </div>
    );
  }

  const esPro = restaurant?.plan === "PRO";

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Ajustes de tu restaurante
        </p>
      </div>

      {error && <div className="alert alert-error mb-6"><span>{error}</span></div>}
      {saved && <div className="alert alert-success mb-6"><span>✅ Cambios guardados</span></div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Info básica */}
        <div className="card space-y-5">
          <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Información básica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Nombre *</label>
              <input name="nombre" required defaultValue={restaurant?.nombre} className="input" />
            </div>
            <div className="field">
              <label className="label">Ciudad</label>
              <input name="ciudad" defaultValue={restaurant?.ciudad ?? ""} placeholder="Portoviejo" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field">
              <label className="label">WhatsApp</label>
              <input name="whatsapp" defaultValue={restaurant?.whatsapp ?? ""} placeholder="+593999123456" className="input" />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Con código de país</p>
            </div>
            <div className="field">
              <label className="label">Moneda</label>
              <select name="moneda" defaultValue={restaurant?.moneda ?? "USD"}
                className="input" style={{ background: "var(--surface-raised)" }}>
                <option value="USD">USD — Dólar</option>
                <option value="COP">COP — Peso colombiano</option>
                <option value="PEN">PEN — Sol peruano</option>
                <option value="MXN">MXN — Peso mexicano</option>
              </select>
            </div>
          </div>
        </div>

        {/* IVA */}
        <div className="card space-y-4">
          <div>
            <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>IVA</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Se aplica automáticamente a todos los ítems del menú.
            </p>
          </div>
          <div className="field">
            <label className="label">Porcentaje de IVA vigente</label>
            <div className="flex items-center gap-3">
              <input name="ivaPorcentaje" type="number" step="0.01" min="0" max="100"
                defaultValue={restaurant?.ivaPorcentaje ?? "15"}
                className="input" style={{ width: "8rem" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Ecuador: 15% estándar · Puede variar en feriados
            </p>
          </div>
        </div>

        {/* Propina */}
        <div className="card space-y-4">
          <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Propina</h2>
          <div className="space-y-2">
            {([
              { value: "SUGERIDA",    label: "Sugerida",          desc: "Se muestra como opción, el cliente decide" },
              { value: "AUTOMATICA",  label: "Automática",         desc: "Se suma al total, el cajero puede quitarla" },
              { value: "INCLUIDA",    label: "Servicio incluido",  desc: "Obligatoria en la factura. No se puede quitar." },
              { value: "DESACTIVADA", label: "Desactivada",        desc: "No se muestra ni se cobra" },
            ] as const).map(opt => (
              <label key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: propinaModo === opt.value ? "var(--accent-subtle)" : "var(--surface-raised)",
                  border:     propinaModo === opt.value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                }}>
                <input type="radio" name="propinaModoRadio" value={opt.value}
                  checked={propinaModo === opt.value}
                  onChange={() => setPropinaModo(opt.value)}
                  className="mt-0.5 shrink-0"
                  style={{ accentColor: "var(--accent)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {propinaModo !== "DESACTIVADA" && (
            <div className="field">
              <label className="label">Porcentaje</label>
              <div className="flex items-center gap-3">
                <input name="porcentajePropina" type="number" step="1" min="0" max="30"
                  defaultValue={restaurant?.porcentajePropina ?? 10}
                  className="input" style={{ width: "8rem" }} />
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[5, 10, 12, 15, 20].map(pct => (
                  <button key={pct} type="button"
                    onClick={e => {
                      const input = (e.currentTarget.closest(".field") as HTMLElement)?.querySelector("input") as HTMLInputElement;
                      if (input) input.value = String(pct);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                    style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}
          {propinaModo === "INCLUIDA" && (
            <div className="field">
              <label className="label">¿Permitir propina adicional voluntaria?</label>
              <select name="propinaAdicionalPermitida"
                defaultValue={restaurant?.propinaAdicionalPermitida ? "true" : "false"}
                className="input" style={{ background: "var(--surface-raised)" }}>
                <option value="true">Sí — el cliente puede agregar más si desea</option>
                <option value="false">No — solo el servicio incluido</option>
              </select>
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="card space-y-5">
          <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Notas y avisos</h2>
          <div className="field">
            <label className="label">Nota en el menú</label>
            <textarea name="notasMenu" defaultValue={restaurant?.notasMenu ?? ""}
              placeholder="Ej: Precios incluyen IVA" rows={2}
              className="input" style={{ resize: "none" }} />
          </div>
          <div className="field">
            <label className="label">Nota en la cuenta</label>
            <textarea name="notaCuenta" defaultValue={restaurant?.notaCuenta ?? ""}
              placeholder="Ej: Gracias por su visita" rows={2}
              className="input" style={{ resize: "none" }} />
          </div>
        </div>

        {/* Color de marca */}
        <div className="card">
          <h2 className="font-medium mb-4" style={{ color: "var(--text-primary)" }}>Color de marca</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {COLORES.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-10 h-10 rounded-xl transition-all"
                style={{
                  backgroundColor: c,
                  transform:        color === c ? "scale(1.15)" : "scale(1)",
                  outline:          color === c ? "2px solid var(--text-muted)" : "none",
                  outlineOffset:    "2px",
                }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer"
              style={{ border: "1px solid var(--border)" }} />
          </div>
        </div>

        {/* Links */}
        <div className="card">
          <h2 className="font-medium mb-4" style={{ color: "var(--text-primary)" }}>Links de tu restaurante</h2>
          <div className="space-y-3">
            {[
              { label: "Carta pública (QR de mesa)", url: `${typeof window !== "undefined" ? window.location.origin : ""}/carta/${restaurant?.slug}` },
              { label: "Acceso del equipo",          url: `${typeof window !== "undefined" ? window.location.origin : ""}/${restaurant?.slug}/acceso` },
            ].map(({ label, url }) => (
              <div key={label}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                  <span className="text-sm truncate flex-1" style={{ color: "var(--text-secondary)" }}>{url}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(url)}
                    className="text-xs font-medium shrink-0" style={{ color: "var(--accent)" }}>
                    Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Guardando...</> : "Guardar cambios"}
          </button>
        </div>
      </form>

      {/* ── FACTURACIÓN — sección separada, solo Plan PRO ── */}
      <div className="mt-8">
        {!esPro ? (
          <div className="card" style={{ borderColor: "var(--accent)", borderStyle: "dashed" }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "var(--accent-subtle)" }}>
                🧾
              </div>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Facturación electrónica SRI
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Emite facturas autorizadas directamente desde Komand. Disponible en el Plan PRO.
                </p>
              </div>
              <span className="badge shrink-0"
                style={{ background: "var(--accent)", color: "#fff", fontSize: "0.75rem", padding: "4px 10px" }}>
                PRO
              </span>
            </div>
          </div>
        ) : (
          <div className="card space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>
                  Facturación electrónica SRI
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Configura tus datos del SRI. Valida la conexión antes de emitir.
                </p>
              </div>
              {restaurant?.kipuValidado && (
                <span className="badge"
                  style={{ background: "var(--color-success-subtle)", color: "var(--color-success)" }}>
                  ✓ Validado
                </span>
              )}
            </div>

            {errorFact && <div className="alert alert-error"><span>{errorFact}</span></div>}
            {savedFact && <div className="alert alert-success"><span>✅ Datos de facturación guardados. Valida la conexión.</span></div>}
            {validacionMsg && (
              <div className={`alert ${validacionMsg.ok ? "alert-success" : "alert-error"}`}>
                <span>{validacionMsg.msg}</span>
              </div>
            )}

            <form onSubmit={handleGuardarFacturacion} className="space-y-6">

              {/* RUC Principal */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
                  RUC Principal
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="field">
                    <label className="label">RUC *</label>
                    <input name="rucPrincipal" required
                      defaultValue={restaurant?.rucPrincipal ?? ""}
                      placeholder="1312838392001" className="input" maxLength={13} />
                  </div>
                  <div className="field">
                    <label className="label">Razón social *</label>
                    <input name="razonSocial" required
                      defaultValue={restaurant?.razonSocial ?? ""}
                      placeholder="JUAN PÉREZ S.A." className="input" />
                  </div>
                  <div className="field">
                    <label className="label">Código establecimiento *</label>
                    <input name="codEstablecimiento" required
                      defaultValue={restaurant?.codEstablecimiento ?? "001"}
                      placeholder="001" className="input" maxLength={3} />
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      3 dígitos — tal como aparece en el SRI
                    </p>
                  </div>
                  <div className="field">
                    <label className="label">Código punto de emisión *</label>
                    <input name="codPuntoEmision" required
                      defaultValue={restaurant?.codPuntoEmision ?? "001"}
                      placeholder="001" className="input" maxLength={3} />
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      3 dígitos — tal como aparece en el SRI
                    </p>
                  </div>
                  <div className="field">
                    <label className="label">Ambiente</label>
                    <select name="ambiente"
                      defaultValue={restaurant?.ambiente ?? "2"}
                      className="input" style={{ background: "var(--surface-raised)" }}>
                      <option value="2">Producción</option>
                      <option value="1">Pruebas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RUC Artesanal */}
              <div>
                <button type="button"
                  onClick={() => setShowArtesanal(!showArtesanal)}
                  className="flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: showArtesanal ? "var(--accent)" : "var(--text-muted)" }}>
                  <span>{showArtesanal ? "▼" : "▶"}</span>
                  RUC Artesanal
                  <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    — opcional, para actividad artesanal calificada
                  </span>
                </button>

                {showArtesanal && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pl-4"
                    style={{ borderLeft: "2px solid var(--accent)" }}>
                    <div className="field">
                      <label className="label">RUC Artesanal</label>
                      <input name="rucArtesanal"
                        defaultValue={restaurant?.rucArtesanal ?? ""}
                        placeholder="1312838392001" className="input" maxLength={13} />
                    </div>
                    <div className="field">
                      <label className="label">Razón social artesanal</label>
                      <input name="razonSocialArtesanal"
                        defaultValue={restaurant?.razonSocialArtesanal ?? ""}
                        placeholder="JUAN PÉREZ ARTESANO" className="input" />
                    </div>
                    <div className="field">
                      <label className="label">Establecimiento artesanal</label>
                      <input name="codEstablecimientoArtesanal"
                        defaultValue={restaurant?.codEstablecimientoArtesanal ?? "001"}
                        placeholder="001" className="input" maxLength={3} />
                    </div>
                    <div className="field">
                      <label className="label">Punto de emisión artesanal</label>
                      <input name="codPuntoEmisionArtesanal"
                        defaultValue={restaurant?.codPuntoEmisionArtesanal ?? "001"}
                        placeholder="001" className="input" maxLength={3} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={savingFact} className="btn btn-secondary">
                  {savingFact ? "Guardando..." : "Guardar datos SRI"}
                </button>
                <button type="button" onClick={handleValidarKipu}
                  disabled={validando || !restaurant?.rucPrincipal}
                  className="btn btn-primary">
                  {validando ? (
                    <><span className="spinner" style={{ width: 16, height: 16 }} /> Validando...</>
                  ) : "Validar conexión con Kipu"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}