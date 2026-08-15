"use client";
import { useState } from "react";
import { actualizarRestaurante } from "@/actions/restaurant";

const COLORES = [
  "#E85D04", "#DC2626", "#D97706", "#16A34A",
  "#2563EB", "#7C3AED", "#DB2777", "#0891B2",
];

type Props = {
  restaurant: {
    nombre: string; ciudad: string | null; whatsapp: string | null;
    color: string | null; notasMenu: string | null; notaCuenta: string | null;
    moneda: string | null; plan: string;
    propinaModo: string | null; porcentajePropina: number | null;
    propinaAdicionalPermitida: boolean | null; ivaPorcentaje: string | null;
  };
};

export default function ConfigGeneral({ restaurant }: Props) {
  const [color,       setColor]       = useState(restaurant.color ?? "#E85D04");
  const [propinaModo, setPropinaModo] = useState<"AUTOMATICA" | "SUGERIDA" | "INCLUIDA" | "DESACTIVADA">(
    (restaurant.propinaModo as any) ?? "SUGERIDA"
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set("color",       color);
    fd.set("propinaModo", propinaModo);
    const result = await actualizarRestaurante(fd);
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {saved  && <div className="alert alert-success"><span>✅ Cambios guardados</span></div>}

      {/* Info básica */}
      <div className="card space-y-5">
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>Información básica</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">Nombre *</label>
            <input name="nombre" required defaultValue={restaurant.nombre} className="input" />
          </div>
          <div className="field">
            <label className="label">Ciudad</label>
            <input name="ciudad" defaultValue={restaurant.ciudad ?? ""} placeholder="Portoviejo" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field">
            <label className="label">WhatsApp</label>
            <input name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} placeholder="+593999123456" className="input" />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Con código de país</p>
          </div>
          <div className="field">
            <label className="label">Moneda</label>
            <select name="moneda" defaultValue={restaurant.moneda ?? "USD"}
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
              defaultValue={restaurant.ivaPorcentaje ?? "15"}
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
            { value: "SUGERIDA",    label: "Sugerida",         desc: "Se muestra como opción, el cliente decide" },
            { value: "AUTOMATICA",  label: "Automática",        desc: "Se suma al total, el cajero puede quitarla" },
            { value: "INCLUIDA",    label: "Servicio incluido", desc: "Obligatoria en la factura. No se puede quitar." },
            { value: "DESACTIVADA", label: "Desactivada",       desc: "No se muestra ni se cobra" },
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
                defaultValue={restaurant.porcentajePropina ?? 10}
                className="input" style={{ width: "8rem" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[5, 10, 12, 15, 20].map(pct => (
                <button key={pct} type="button"
                  onClick={() => {
                    const input = document.querySelector('input[name="porcentajePropina"]') as HTMLInputElement;
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
              defaultValue={restaurant.propinaAdicionalPermitida ? "true" : "false"}
              className="input" style={{ background: "var(--surface-raised)" }}>
              <option value="true">Sí — el cliente puede agregar más</option>
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
          <textarea name="notasMenu" defaultValue={restaurant.notasMenu ?? ""}
            placeholder="Ej: Precios incluyen IVA" rows={2}
            className="input" style={{ resize: "none" }} />
        </div>
        <div className="field">
          <label className="label">Nota en la cuenta</label>
          <textarea name="notaCuenta" defaultValue={restaurant.notaCuenta ?? ""}
            placeholder="Ej: Gracias por su visita" rows={2}
            className="input" style={{ resize: "none" }} />
        </div>
      </div>

      {/* Color */}
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

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Guardando...</> : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}