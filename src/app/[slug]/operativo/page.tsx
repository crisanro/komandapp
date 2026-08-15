import { getOperativoSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OperativoIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session  = await getOperativoSession();

  if (!session) redirect(`/${slug}/login`);

  const p = session.permisos;

  // Redirigir según permisos
  if (p.puedeAbrirMesas || p.puedeTomarPedidos || p.puedeVerTodasLasMesas) {
    redirect(`/${slug}/operativo/mesas`);
  }
  if (session.estaciones.length > 0) {
    redirect(`/${slug}/operativo/kds`);
  }
  if (p.puedeCobrar || p.puedeCerrarCuenta || p.puedeCuadrarCaja) {
    redirect(`/${slug}/operativo/caja`);
  }

  // Sin permisos suficientes
  redirect(`/${slug}/login`);
}