"use client";
import { useState } from "react";
import { loginAdmin } from "@/actions/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import Link from "next/link";

export default function LoginAdminPage() {
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [turnstileOk, setTurnstileOk] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileOk) { setError("Completa la verificación de seguridad."); return; }
    setError("");
    setLoading(true);
    const result = await loginAdmin(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      setTurnstileOk(false);
    }
  }

  return (
    <div className="page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
          >
            <span className="text-white text-2xl font-bold">K</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Bienvenido de vuelta
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Panel de administración
          </p>
        </div>

        <div className="card-raised">
          <form onSubmit={handleSubmit} method="POST" autoComplete="on" className="space-y-4">
            {error && <div className="alert alert-error"><span>{error}</span></div>}
            <div className="field">
              <label className="label">Email</label>
              <input name="email" type="email" required autoComplete="email"
                placeholder="tu@restaurante.com" className="input" />
            </div>
            <div className="field">
              <label className="label">Contraseña</label>
              <input name="password" type="password" required autoComplete="current-password"
                placeholder="••••••••" className="input" />
            </div>
            <p style={{color:"red"}}>{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "VACÍO O UNDEFINED"}</p>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={() => setTurnstileOk(true)}
              onError={() => setTurnstileOk(false)}
              onExpire={() => setTurnstileOk(false)}
              options={{ theme: "auto", size: "normal" }}
            />
            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
              {loading ? (<><span className="spinner" style={{ width: 16, height: 16 }} />Ingresando...</>) : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium" style={{ color: "var(--accent)" }}>
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}