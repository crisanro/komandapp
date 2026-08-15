"use client";
import { useState } from "react";
import { extenderTrial, cambiarPlan } from "@/actions/superadmin";

export default function ExtenderTrialForm({
  restaurantId, nombre,
}: {
  restaurantId: string;
  nombre:       string;
}) {
  const [meses,   setMeses]   = useState(1);
  const [notas,   setNotas]   = useState("");
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  async function handleExtender() {
    setLoading(true);
    setMsg(null);
    const result = await extenderTrial(restaurantId, meses, notas);
    setLoading(false);
    if (result?.error) { setMsg({ ok: false, text: result.error }); return; }
    setMsg({ ok: true, text: `✅ Trial extendido ${meses} mes${meses !== 1 ? "es" : ""} para ${nombre}` });
  }

  async function handleCambiarPlan(plan: "BASICO" | "PRO") {
    setLoading(true);
    setMsg(null);
    const result = await cambiarPlan(restaurantId, plan);
    setLoading(false);
    if (result?.error) { setMsg({ ok: false, text: result.error }); return; }
    setMsg({ ok: true, text: `✅ Plan cambiado a ${plan}` });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Extender trial */}
      <div className="card space-y-4">
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>
          Extender acceso gratuito
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="field">
            <label className="label">Meses a extender</label>
            <select value={meses} onChange={e => setMeses(Number(e.target.value))}
              className="input" style={{ background: "var(--surface-raised)" }}>
              {[1, 2, 3, 6, 12].map(m => (
                <option key={m} value={m}>{m} mes{m !== 1 ? "es" : ""}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Nota interna</label>
          <input value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Ej: Prueba especial acordada con Cristhian"
            className="input" />
        </div>
        <button onClick={handleExtender} disabled={loading} className="btn btn-primary btn-sm">
          {loading ? "Guardando..." : `Extender ${meses} mes${meses !== 1 ? "es" : ""}`}
        </button>
      </div>

      {/* Cambiar plan */}
      <div className="card space-y-4">
        <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>
          Cambiar plan manualmente
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Para demos, acuerdos especiales o correcciones.
        </p>
        <div className="flex gap-3">
          <button onClick={() => handleCambiarPlan("BASICO")} disabled={loading}
            className="btn btn-secondary btn-sm flex-1">
            → Básico
          </button>
          <button onClick={() => handleCambiarPlan("PRO")} disabled={loading}
            className="btn btn-primary btn-sm flex-1">
            → PRO
          </button>
        </div>
      </div>
    </div>
  );
}