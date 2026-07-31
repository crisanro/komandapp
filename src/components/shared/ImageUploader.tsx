"use client";

import { useRef, useState } from "react";

// ─── Optimizar imagen en el browser con Canvas API ───────
// Redimensiona a máx 800x800 y convierte a JPEG calidad 0.8
// Resultado: ~100-300KB antes de enviar al servidor

async function optimizarEnBrowser(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX = 800;
      let { width, height } = img;

      // Redimensionar manteniendo proporción
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width  = MAX;
        } else {
          width  = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error("Error al procesar imagen")); return; }
          resolve(blob);
        },
        "image/jpeg",
        0.82  // calidad 82% → buen balance tamaño/calidad
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagen inválida"));
    };

    img.src = url;
  });
}

const MAX_SIZE_FRONTEND_MB = 15;  // límite antes de optimizar
const MAX_SIZE_BACKEND_KB  = 500; // límite después de optimizar en browser
const TIPOS_PERMITIDOS     = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"];

export default function ImageUploader({
  itemId,
  imagenActual,
  onUpload,
  onEliminar,
}: {
  itemId:       string;
  imagenActual: string | null;
  onUpload:     (formData: FormData) => Promise<{ ok?: boolean; url?: string; error?: string } | undefined>;
  onEliminar:   () => Promise<void>;
}) {
  const [preview, setPreview]   = useState<string | null>(imagenActual);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sizeInfo, setSizeInfo] = useState<string | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSizeInfo(null);

    // Validar tipo
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }

    // Validar tamaño original
    if (file.size > MAX_SIZE_FRONTEND_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_SIZE_FRONTEND_MB}MB.`);
      return;
    }

    setLoading(true);

    try {
      // 1. Optimizar en browser
      const optimizada = await optimizarEnBrowser(file);
      const sizeKB     = Math.round(optimizada.size / 1024);

      setSizeInfo(`${sizeKB}KB después de optimizar`);

      // 2. Verificar que no supere el límite backend
      if (optimizada.size > MAX_SIZE_BACKEND_KB * 1024) {
        setError(`La imagen optimizada pesa ${sizeKB}KB. Intenta con una imagen más simple.`);
        setLoading(false);
        return;
      }

      // 3. Preview inmediato
      const previewUrl = URL.createObjectURL(optimizada);
      setPreview(previewUrl);

      // 4. Subir al servidor
      const optimizedFile = new File([optimizada], "imagen.jpg", { type: "image/jpeg" });
      const fd = new FormData();
      fd.set("imagen", optimizedFile);
      fd.set("itemId", itemId);

      const result = await onUpload(fd);

      if (result?.error) {
        setError(result.error);
        setPreview(imagenActual);
      } else if (result?.url) {
        URL.revokeObjectURL(previewUrl);
        setPreview(result.url);
      }

    } catch (err) {
      setError("Error al procesar la imagen. Intenta de nuevo.");
      setPreview(imagenActual);
    } finally {
      setLoading(false);
      // Reset input para permitir subir la misma imagen de nuevo
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleEliminar() {
    setLoading(true);
    await onEliminar();
    setPreview(null);
    setSizeInfo(null);
    setLoading(false);
  }

  return (
    <div className="field">
      <label className="label">Imagen del producto</label>
      <div className="flex items-start gap-4">

        {/* Preview */}
        <div
          className="w-20 h-20 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          {loading ? (
            <div className="spinner" />
          ) : preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🍽</span>
          )}
        </div>

        {/* Controles */}
        <div className="space-y-2 flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
            className="hidden"
            onChange={handleChange}
            disabled={loading}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="btn btn-secondary btn-sm"
            >
              {loading ? "Procesando..." : preview ? "Cambiar imagen" : "Subir imagen"}
            </button>

            {preview && !loading && (
              <button
                type="button"
                onClick={handleEliminar}
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--color-error)" }}
              >
                Eliminar
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              JPG, PNG o WebP · Máx {MAX_SIZE_FRONTEND_MB}MB · Se optimiza automáticamente en tu dispositivo antes de subir
            </p>
            {sizeInfo && (
              <p className="text-xs" style={{ color: "var(--color-success)" }}>
                ✓ {sizeInfo}
              </p>
            )}
            {error && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}