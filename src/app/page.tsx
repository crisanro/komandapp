import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.tipo === "admin") redirect("/dashboard");

  if (session.tipo === "operativo") {
    const p = session.permisos;
    if (p?.puedeAbrirMesas || p?.puedeTomarPedidos || p?.puedeVerTodasLasMesas) redirect("/mesas");
    if (session.estaciones?.length > 0) redirect("/kds");
    if (p?.puedeCobrar || p?.puedeCerrarCuenta) redirect("/caja");
  }

  redirect("/login");
}