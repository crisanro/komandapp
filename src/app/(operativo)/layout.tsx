import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PushInit from "@/components/operativo/PushInit";
import BottomNav from "@/components/operativo/BottomNav";

export default async function OperativoLayout({ children }: { children: React.ReactNode }) {
  const session = await getOperativoSession();
  if (!session) redirect("/login");

  const p = session.permisos;
  const tieneAcceso = p.puedeAbrirMesas || p.puedeTomarPedidos || p.puedeVerTodasLasMesas
    || p.puedeCobrar || p.puedeCerrarCuenta || p.puedeCuadrarCaja
    || (session.estaciones?.length > 0);

  if (!tieneAcceso) redirect("/login");

  // Calcular vistas disponibles
  const vistas: { key: "mesas" | "kds" | "caja"; label: string; icon: string }[] = [];
  if (p.puedeAbrirMesas || p.puedeTomarPedidos || p.puedeVerTodasLasMesas)
    vistas.push({ key: "mesas", label: "Mesas", icon: "🧑‍🍽️" });
  if (session.estaciones?.length > 0)
    vistas.push({ key: "kds", label: "Cocina", icon: "👨‍🍳" });
  if (p.puedeCobrar || p.puedeCerrarCuenta || p.puedeCuadrarCaja)
    vistas.push({ key: "caja", label: "Caja", icon: "💰" });

  return (
    <>
      <PushInit userId={session.userId} />
      <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: vistas.length > 1 ? "4rem" : 0 }}>
          {children}
        </main>
        {vistas.length > 1 && (
          <BottomNav vistas={vistas} vistaActiva={session.vistaActiva} />
        )}
      </div>
    </>
  );
}