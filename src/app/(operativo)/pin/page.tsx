"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PinPage() {
  const [pin, setPin]           = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [restaurantId, setRestaurantId] = useState("");
  const router = useRouter();

  // El restaurantId viene de la URL si el mesero entra por el link del restaurante
  // O lo detectamos por el subdominio (en producción)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("r");
    if (rid) setRestaurantId(rid);
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const submitPin = async (pinValue: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pin", pinValue);
      formData.append("restaurantId", restaurantId);

      const res = await fetch("/api/auth/pin", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setPin("");
        setLoading(false);
        return;
      }

      // Redirigir según rol
      router.push(data.redirect);
    } catch {
      setError("Error al conectar. Intenta de nuevo.");
      setPin("");
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Ingresa tu PIN</h1>
          <p className="text-gray-400 text-sm mt-1">4 dígitos</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? "bg-orange-500 scale-110"
                  : "bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm text-center py-2.5 px-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit, i) => {
            if (digit === "") return <div key={i} />;

            const isDelete = digit === "⌫";

            return (
              <button
                key={i}
                onClick={() => isDelete ? handleDelete() : handleDigit(digit)}
                disabled={loading}
                className={`
                  h-16 rounded-2xl text-xl font-medium transition-all duration-100 active:scale-95
                  ${isDelete
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-800 text-white hover:bg-gray-700 active:bg-orange-500"
                  }
                  disabled:opacity-50
                `}
              >
                {loading && !isDelete ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </span>
                ) : digit}
              </button>
            );
          })}
        </div>

        {/* Volver al login admin */}
        <div className="text-center mt-8">
          <a href="/login" className="text-gray-500 text-sm hover:text-gray-400">
            ← Volver al login
          </a>
        </div>

      </div>
    </div>
  );
}