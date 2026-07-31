"use client";

import { useState, useEffect } from "react";
import { loginOperativo } from "@/actions/auth";

export default function AccesoPage() {
  const [username, setUsername] = useState("");
  const [codigo, setCodigo]     = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [slug, setSlug]         = useState("");

  useEffect(() => {
    // Leer slug del query param o del subdominio
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get("slug");
    if (slugParam) {
      setSlug(slugParam);
    } else {
      const host  = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 3) setSlug(parts[0]);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Leer slug directamente de la URL por si el estado no actualizó
    const params   = new URLSearchParams(window.location.search);
    const slugFinal = params.get("slug") || slug;

    if (!slugFinal) {
      setError("No se pudo identificar el restaurante");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("username", username.trim().toLowerCase());
    formData.append("codigo",   codigo.trim().toUpperCase());
    formData.append("slug",     slugFinal);

    const result = await loginOperativo(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Acceso al equipo</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm text-center py-3 px-4 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="ana"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Código de acceso</label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              required
              placeholder="X7K2P9"
              autoCapitalize="characters"
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !codigo}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors text-sm mt-2"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>

        </form>

        <p className="text-center text-gray-600 text-xs mt-8">
          ¿Problemas para acceder? Habla con el administrador.
        </p>

      </div>
    </div>
  );
}