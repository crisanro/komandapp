"use client";
import { useState } from "react";
import { guardarConfigFacturacion, validarKipu } from "@/actions/restaurant";

type Props = {
  esPro: boolean;
  codEstablecimiento: string | null;
  codPuntoEmision: string | null;
  codEstablecimientoArtesanal: string | null;
  codPuntoEmisionArtesanal: string | null;
  tieneApiKey: boolean;
  tieneApiKeyArtesanal: boolean;
  modoEmisionFactura?: "CONSUMO" | "DETALLADO" | null;
};

export default function ConfigFacturacion({
  esPro,
  codEstablecimiento,
  codPuntoEmision,
  codEstablecimientoArtesanal,
  codPuntoEmisionArtesanal,
  tieneApiKey,
  tieneApiKeyArtesanal,
  modoEmisionFactura,
}: Props) {
  const [showArtesanal, setShowArtesanal] = useState(!!codEstablecimientoArtesanal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [validando, setValidando] = useState(false);
  const [validacionMsg, setValidacionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = await guardarConfigFacturacion(new FormData(e.currentTarget));
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setValidacionMsg(null);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleValidar() {
    setValidando(true);
    setValidacionMsg(null);
    const result = await validarKipu();
    setValidando(false);
    if (result?.ok) {
      setValidacionMsg({ ok: true, msg: "✅ Conexión validada con Kipu. Listo para facturar." });
    } else {
      setValidacionMsg({ ok: false, msg: result?.error ?? "Error al validar" });
    }
  }

  if (!esPro) {
    return (
      <div className="card" style={{ borderColor: "var(--accent)", borderStyle: "dashed" }}>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: "var(--accent-subtle)" }}
          >
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
          <span
            className="badge shrink-0"
            style={{ background: "var(--accent)", color: "#fff", fontSize: "0.75rem", padding: "4px 10px" }}
          >
            PRO
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>
          Facturación electrónica SRI
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Configura tus credenciales de Kipu y preferencias para emitir facturas autorizadas.
        </p>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {saved && <div className="alert alert-success"><span>✅ Configuración guardada. Valida la conexión.</span></div>}
      {validacionMsg && (
        <div className={`alert ${validacionMsg.ok ? "alert-success" : "alert-error"}`}>
          <span>{validacionMsg.msg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RUC Principal */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            RUC Principal
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Código establecimiento *</label>
              <input
                name="codEstablecimiento"
                required
                defaultValue={codEstablecimiento ?? "001"}
                placeholder="001"
                className="input"
                maxLength={3}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                3 dígitos — tal como aparece en el SRI
              </p>
            </div>
            <div className="field">
              <label className="label">Código punto de emisión *</label>
              <input
                name="codPuntoEmision"
                required
                defaultValue={codPuntoEmision ?? "001"}
                placeholder="001"
                className="input"
                maxLength={3}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                3 dígitos — tal como aparece en el SRI
              </p>
            </div>
            <div className="field sm:col-span-2">
              <label className="label">
                API Key de Kipu *
                {tieneApiKey && (
                  <span className="ml-2 font-normal text-xs" style={{ color: "var(--color-success)" }}>
                    ✓ configurada
                  </span>
                )}
              </label>
              <input
                name="kipuApiKey"
                type="password"
                required={!tieneApiKey}
                placeholder={tieneApiKey ? "••••••••••••• (dejar vacío para mantener)" : "Ingresa tu API Key de Kipu"}
                className="input font-mono"
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Se guarda cifrada. Encuéntrala en tu panel de Kipu.
              </p>
            </div>
          </div>
        </div>

        {/* Preferencias de emisión */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Preferencias de Emisión
          </p>
          <div className="field">
            <label className="label">Modo de emisión por defecto</label>
            <select
              name="modoEmisionFactura"
              defaultValue={modoEmisionFactura ?? "CONSUMO"}
              className="input"
              style={{ background: "var(--surface-raised)" }}
            >
              <option value="CONSUMO">Consumo — un ítem genérico con el total</option>
              <option value="DETALLADO">Detallado — cada ítem del pedido</option>
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              El cajero puede cambiarlo individualmente al emitir cada factura.
            </p>
          </div>
        </div>

        {/* RUC Artesanal */}
        <div>
          <button
            type="button"
            onClick={() => setShowArtesanal(!showArtesanal)}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: showArtesanal ? "var(--accent)" : "var(--text-muted)" }}
          >
            <span>{showArtesanal ? "▼" : "▶"}</span>
            RUC Artesanal
            <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              — opcional, para actividad artesanal calificada
            </span>
          </button>

          {showArtesanal && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pl-4"
              style={{ borderLeft: "2px solid var(--accent)" }}
            >
              <div className="field">
                <label className="label">Establecimiento artesanal</label>
                <input
                  name="codEstablecimientoArtesanal"
                  defaultValue={codEstablecimientoArtesanal ?? "001"}
                  placeholder="001"
                  className="input"
                  maxLength={3}
                />
              </div>
              <div className="field">
                <label className="label">Punto de emisión artesanal</label>
                <input
                  name="codPuntoEmisionArtesanal"
                  defaultValue={codPuntoEmisionArtesanal ?? "001"}
                  placeholder="001"
                  className="input"
                  maxLength={3}
                />
              </div>
              <div className="field sm:col-span-2">
                <label className="label">
                  API Key artesanal
                  {tieneApiKeyArtesanal && (
                    <span className="ml-2 font-normal text-xs" style={{ color: "var(--color-success)" }}>
                      ✓ configurada
                    </span>
                  )}
                </label>
                <input
                  name="kipuApiKeyArtesanal"
                  type="password"
                  placeholder={
                    tieneApiKeyArtesanal
                      ? "••••••••••••• (dejar vacío para mantener)"
                      : "API Key del RUC artesanal"
                  }
                  className="input font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button type="submit" disabled={saving} className="btn btn-secondary">
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
          <button
            type="button"
            onClick={handleValidar}
            disabled={validando || !tieneApiKey}
            className="btn btn-primary"
          >
            {validando ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} /> Validando...
              </>
            ) : (
              "Validar conexión con Kipu"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}