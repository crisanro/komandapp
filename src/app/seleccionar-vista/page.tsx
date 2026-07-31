import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SeleccionarVistaClient from "./SeleccionarVistaClient";

export default async function SeleccionarVistaPage() {
  const session = await getOperativoSession();
  if (!session) redirect("/login");

  const p = session.permisos;
  const estaciones = session.estaciones ?? [];

  // Calcular vistas disponibles según permisos
  const vistas: { key: "mesas" | "kds" | "caja"; label: string; icon: string; desc: string }[] = [];

  if (p.puedeAbrirMesas || p.puedeTomarPedidos || p.puedeVerTodasLasMesas) {
    vistas.push({ key: "mesas", label: "Mesero", icon: "🧑‍🍽️", desc: "Ver mesas, abrir cuentas, tomar pedidos" });
  }
  if (estaciones.length > 0) {
    vistas.push({ key: "kds", label: "Cocina", icon: "👨‍🍳", desc: "Ver pedidos en tiempo real, marcar listos" });
  }
  if (p.puedeCobrar || p.puedeCerrarCuenta || p.puedeCuadrarCaja) {
    vistas.push({ key: "caja", label: "Cajero", icon: "💰", desc: "Ver cuentas activas, cobrar, cerrar mesas" });
  }

  // Si solo hay una vista disponible, redirigir directo
  if (vistas.length === 1) redirect(`/${vistas[0].key}`);

  // Si no hay vistas, no tiene permisos suficientes
  if (vistas.length === 0) redirect("/login");

  return (
    <SeleccionarVistaClient
      vistas={vistas}
      nombre={session.nombre}
      vistaActiva={session.vistaActiva}
    />
  );
}