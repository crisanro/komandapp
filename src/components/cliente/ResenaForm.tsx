"use client";
import { useState } from "react";
import { dejarResena } from "@/actions/resenas";

export default function ResenaForm({
  sesionToken, color,
}: {
  sesionToken: string;
  color:       string;
}) {
  const [calificacion, setCalificacion] = useState(0);
  const [hover,        setHover]        = useState(0);
  const [comentario,   setComentario]   = useState("");
  const [nombre,       setNombre]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [enviado,      setEnviado]      = useState(false);
  const [error,        setError]        = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (calificacion === 0) { setError("Selecciona una calificación"); return; }
    setLoading(true);
    setError("");
    const result = await dejarResena({
      sesionToken,
      calificacion,
      comentario:    comentario || undefined,
      nombreCliente: nombre    || undefined,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-3xl">🙏</p>
        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          ¡Gracias por tu opinión!
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Tu reseña nos ayuda a mejorar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Estrellas */}
      <div className="text-center">
        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
          ¿Cómo fue tu experiencia?
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setCalificacion(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="text-4xl transition-transform"
              style={{ transform: (hover || calificacion) >= star ? "scale(1.2)" : "scale(1)" }}
            >
              <span style={{
                filter: (hover || calificacion) >= star ? "none" : "grayscale(1) opacity(0.3)",
              }}>
                ⭐
              </span>
            </button>
          ))}
        </div>
        {calificacion > 0 && (
          <p className="text-xs mt-2" style={{ color }}>
            {["", "Muy malo", "Malo", "Regular", "Bueno", "¡Excelente!"][calificacion]}
          </p>
        )}
      </div>

      {/* Comentario */}
      <div className="field">
        <label className="label text-xs">
          Cuéntanos más <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
        </label>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="¿Qué te gustó? ¿Qué podemos mejorar?"
          rows={3}
          className="input resize-none"
          style={{ fontSize: "0.875rem" }}
        />
      </div>

      {/* Nombre */}
      <div className="field">
        <label className="label text-xs">
          Tu nombre <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
        </label>
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ana"
          className="input"
          style={{ fontSize: "0.875rem" }}
        />
      </div>

      {error && (
        <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || calificacion === 0}
        className="btn btn-primary w-full"
        style={color !== "#E85D04" ? { background: color } : {}}
      >
        {loading ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}