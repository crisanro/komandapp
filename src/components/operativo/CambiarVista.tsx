"use client";

import { cambiarVista } from "@/actions/auth";
import type { PermisosUser } from "@/lib/auth";

type Vista = "mesas" | "kds" | "caja";

const VISTA_INFO: Record<Vista, { label: string; icon: string }> = {
  mesas: { label: "Mesas",  icon: "🧑‍🍽️" },
  kds:   { label: "Cocina", icon: "👨‍🍳" },
  caja:  { label: "Caja",   icon: "💰" },
};

export default function CambiarVista({
  vistaActiva, permisos, esAdmin, estaciones,
}: {
  vistaActiva: Vista;
  permisos:    PermisosUser | null;
  esAdmin:     boolean;
  estaciones:  string[];
}) {
  const vistasDisponibles: Vista[] = [];

  if (esAdmin || permisos?.puedeAbrirMesas || permisos?.puedeTomarPedidos || permisos?.puedeVerTodasLasMesas)
    vistasDisponibles.push("mesas");
  if (esAdmin || estaciones.length > 0)
    vistasDisponibles.push("kds");
  if (esAdmin || permisos?.puedeCobrar || permisos?.puedeCerrarCuenta)
    vistasDisponibles.push("caja");

  const otras = vistasDisponibles.filter(v => v !== vistaActiva);
  if (otras.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {otras.map(vista => (
        <button
          key={vista}
          type="button"
          onClick={() => cambiarVista(vista)}
          title={`Cambiar a ${VISTA_INFO[vista].label}`}
          className="btn btn-ghost btn-sm flex items-center gap-1.5"
        >
          <span>{VISTA_INFO[vista].icon}</span>
          <span className="hidden sm:inline">{VISTA_INFO[vista].label}</span>
        </button>
      ))}
    </div>
  );
}