"use client";

import { useEffect, useRef } from "react";

type Props = {
  token:     string;
  mesaNombre: string;
  onCerrar:  () => void;
};

export default function QRSesion({ token, mesaNombre, onCerrar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url       = `${window.location.origin}/m/${token}`;

  useEffect(() => {
    // Generamos el QR con una API pública — sin dependencias extra
    // En producción puedes usar qrcode npm package
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1a1a1a&margin=10`;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 200, 200);
    };
  }, [url]);

  function copiarLink() {
    navigator.clipboard.writeText(url);
  }

  function compartirWhatsApp() {
    const texto = `Hola 👋 Escanea este link para ver el menú y hacer tu pedido:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center">

        <p className="text-xs text-gray-400 mb-1">Cuenta activa en</p>
        <p className="font-semibold text-gray-900 text-lg mb-4">{mesaNombre}</p>

        {/* QR */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-3 inline-block mb-4">
          <canvas ref={canvasRef} width={200} height={200} />
        </div>

        <p className="text-xs text-gray-400 mb-5">
          El cliente escanea el QR con su cámara y puede pedir directamente
        </p>

        {/* Acciones */}
        <div className="space-y-2">
          <button
            onClick={compartirWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            📱 Enviar por WhatsApp
          </button>
          <button
            onClick={copiarLink}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            📋 Copiar link
          </button>
          <button
            onClick={onCerrar}
            className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}