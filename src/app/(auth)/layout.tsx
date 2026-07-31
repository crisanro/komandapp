import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (session) {
    if (session.tipo === "admin") redirect("/dashboard");
    if (session.tipo === "operativo") {
      const p = session.permisos;
      if (p?.puedeAbrirMesas || p?.puedeTomarPedidos) redirect("/mesas");
      if (session.estaciones?.length > 0) redirect("/kds");
      if (p?.puedeCobrar || p?.puedeCerrarCuenta) redirect("/caja");
    }
  }

  return (
    <div className="page min-h-screen">
      {children}
    </div>
  );
}