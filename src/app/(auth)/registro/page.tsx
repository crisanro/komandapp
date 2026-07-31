"use client";

import { useState } from "react";
import { registrarRestaurante } from "@/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import Link from "next/link";

export default function RegistroPage() {
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [turnstileOk, setTurnstileOk] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileOk) {
      setError("Completa la verificación de seguridad.");
      return;
    }
    const fd              = new FormData(e.currentTarget);
    const password        = fd.get("password")        as string;
    const passwordConfirm = fd.get("passwordConfirm") as string;
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await registrarRestaurante(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      setTurnstileOk(false);
    }
  }

  return (
    <div className="page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
          >
            <span className="text-white text-2xl font-bold">K</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)", fontSize: "1.25rem" }}>
            Crea tu restaurante
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            30 días gratis — sin tarjeta
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
              <label className="label">Nombre del restaurante</label>
              <input
                name="nombre"
                type="text"
                required
                placeholder="La Terraza"
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Ciudad</label>
              <input
                name="ciudad"
                type="text"
                placeholder="Portoviejo"
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Tu email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@restaurante.com"
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Confirmar contraseña</label>
              <input
                name="passwordConfirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                className="input"
              />
            </div>

            {/* Turnstile invisible */}
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={() => setTurnstileOk(true)}
              onError={() => setTurnstileOk(false)}
              onExpire={() => setTurnstileOk(false)}
              options={{ theme: "dark", size: "invisible" }}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Creando...
                </>
              ) : "Crear mi restaurante"}
            </button>

          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  );
}