"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token:      string;
  slug:       string;
  mesaNombre: string;
  onCerrar:   () => void;
};

export default function QRSesion({ token, slug, mesaNombre, onCerrar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router    = useRouter();
  const url       = `${typeof window !== "undefined" ? window.location.origin : "https://menu.komand.app"}/${slug}/mesa/${token}`;

  useEffect(() => {
    const img       = new Image();
    img.crossOrigin = "anonymous";
    img.src         = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 220, 220);
    };
  }, [url]);

  function copiarLink() {
    navigator.clipboard.writeText(url);
  }

  function compartirWhatsApp() {
    const texto = `Hola 👋 Escanea este link para ver el menú:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  function tomarPedido() {
    router.push(`/${slug}/operativo/mesa/${token}`);
    onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cuenta abierta en</p>
          <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{mesaNombre}</p>
        </div>

        {/* QR */}
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl p-3">
            <canvas ref={canvasRef} width={220} height={220} />
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          El cliente escanea el QR para ver el menú y hacer su pedido
        </p>

        {/* Acciones */}
        <div className="space-y-2">
          <button onClick={tomarPedido} className="btn btn-primary w-full">
            🧑‍🍽️ Tomar pedido yo mismo
          </button>
          <button onClick={compartirWhatsApp}
            className="btn w-full"
            style={{ background: "#25D366", color: "#fff", border: "none" }}>
            📱 Enviar por WhatsApp
          </button>
          <button onClick={copiarLink} className="btn btn-secondary w-full">
            📋 Copiar link
          </button>
          <button onClick={onCerrar}
            className="btn btn-ghost w-full text-sm"
            style={{ color: "var(--text-muted)" }}>
            El cliente pide desde su teléfono — cerrar
          </button>
        </div>
      </div>
    </div>
  );
}