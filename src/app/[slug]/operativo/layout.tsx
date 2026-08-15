import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { volverAlPanel } from "@/actions/auth";
import PushInit from "@/components/operativo/PushInit";
import BottomNav from "@/components/operativo/BottomNav";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    manifest: `/${slug}/operativo/manifest.webmanifest`,
  };
}

export default async function OperativoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session  = await getOperativoSession();
  if (!session) redirect(`/${slug}/login`);
  if (session.restaurantSlug !== slug) redirect(`/${slug}/login`);

  const p = session.permisos;
  const tieneAcceso =
    p.puedeAbrirMesas || p.puedeTomarPedidos || p.puedeVerTodasLasMesas ||
    p.puedeCobrar || p.puedeCerrarCuenta || p.puedeCuadrarCaja ||
    (session.estaciones?.length > 0);
  if (!tieneAcceso) redirect(`/${slug}/login`);

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
      {session.esAdmin && (
        <form action={volverAlPanel}
          style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 50 }}>
          <button type="submit" className="btn btn-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            ← Panel admin
          </button>
        </form>
      )}

      <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
        {vistas.length > 1 && (
          <BottomNav vistas={vistas} vistaActiva={session.vistaActiva} slug={slug} />
        )}
      </div>
    </>
  );
}