"use client";

import { useEffect, useState } from "react";

interface TiempoTranscurridoProps {
  fecha: Date | string | number;
}

export default function TiempoTranscurrido({ fecha }: TiempoTranscurridoProps) {
  const [texto, setTexto] = useState<string>("");
  const [color, setColor] = useState<string>("var(--color-success)");

  useEffect(() => {
    function calcular() {
      const tiempoFecha = new Date(fecha).getTime();
      const diffSegundos = Math.floor((Date.now() - tiempoFecha) / 1000);
      const diffMinutos = Math.floor(diffSegundos / 60);

      // Asignación de color según el tiempo en minutos
      if (diffMinutos < 10) {
        setColor("var(--color-success)");
      } else if (diffMinutos < 20) {
        setColor("var(--color-warning)");
      } else {
        setColor("var(--color-error)");
      }

      // Formateo del texto de salida
      if (diffSegundos < 60) {
        return `${Math.max(0, diffSegundos)}s`;
      }
      if (diffMinutos < 60) {
        return `${diffMinutos}min`;
      }
      const hrs = Math.floor(diffMinutos / 60);
      const minRestantes = diffMinutos % 60;
      return `${hrs}h ${minRestantes}min`;
    }

    // Cálculo inicial en el cliente
    setTexto(calcular());

    // Actualización cada 30 segundos
    const interval = setInterval(() => {
      setTexto(calcular());
    }, 30000);

    return () => clearInterval(interval);
  }, [fecha]);

  // Si aún no se ha montado en el cliente, evitamos parpadeos o desincronización
  if (!texto) return null;

  return <span style={{ color, fontWeight: 600 }}>{texto}</span>;
}