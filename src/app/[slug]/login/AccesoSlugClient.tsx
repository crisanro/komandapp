"use client";

import { useState } from "react";
import { loginOperativo } from "@/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";

export default function AccesoSlugClient({
  slug, nombreRestaurante, color, logoUrl,
}: {
  slug:              string;
  nombreRestaurante: string;
  color:             string;
  logoUrl:           string | null;
}) {
  const [username, setUsername]       = useState("");
  const [codigo, setCodigo]           = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [turnstileOk, setTurnstileOk] = useState(
    process.env.NODE_ENV !== "production"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileOk) {
      setError("Completa la verificación de seguridad.");
      return;
    }
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("username", username.trim().toLowerCase());
    formData.set("codigo",   codigo.trim().toUpperCase());
    formData.set("slug",     slug);
    const result = await loginOperativo(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      setTurnstileOk(false);
    }
  }

  return (
    <div className="page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo del restaurante */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={nombreRestaurante}
              className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: color, boxShadow: `0 4px 20px ${color}55` }}>
              <span className="text-white text-2xl font-bold">
                {nombreRestaurante[0].toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)", fontSize: "1.25rem" }}>
            {nombreRestaurante}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Acceso al equipo
          </p>
        </div>

        {/* Card */}
        <div className="card-raised">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="field">
              <label className="label">Usuario</label>
              <input type="text" name="username" value={username}
                onChange={e => setUsername(e.target.value)}
                required placeholder="ana"
                autoCapitalize="none" autoCorrect="off" autoComplete="username"
                className="input" />
            </div>

            <div className="field">
              <label className="label">Código de acceso</label>
              <input type="text" name="codigo" value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                required placeholder="X7K2P9"
                autoCapitalize="characters" autoCorrect="off" autoComplete="off"
                maxLength={6} className="input font-mono tracking-widest text-center"
                style={{ letterSpacing: "0.3em", fontSize: "1.25rem" }} />
            </div>

            {/* Turnstile visible — siempre, en dev y producción */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={() => setTurnstileOk(true)}
                  onError={() => setTurnstileOk(false)}
                  onExpire={() => setTurnstileOk(false)}
                  options={{ theme: "auto", size: "normal" }}
                />
              </div>
            )}

            <button type="submit"
              disabled={loading || !username || !codigo}
              className="btn btn-primary w-full mt-2"
              style={color !== "#E85D04" ? { background: color } : {}}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Verificando...</>
              ) : "Ingresar"}
            </button>

          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          ¿Problemas para acceder? Habla con el administrador.
        </p>

      </div>
    </div>
  );
}