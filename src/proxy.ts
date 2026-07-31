import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC = [
  "/login", "/registro", "/acceso", "/seleccionar-vista",
  "/m/", "/carta/", "/api/sse/", "/api/auth/", "/api/me",
];

function esPublicaConSlug(pathname: string): boolean {
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length >= 2) {
    const seccion = partes[1];
    if (["carta", "acceso"].includes(seccion)) return true;
    if (partes[1] === "m" && partes.length >= 3) return true;
  }
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bloquear credenciales en URL
  if ((pathname === "/login" || pathname === "/registro") && req.nextUrl.search) {
    return NextResponse.redirect(new URL(pathname, req.url));
  }

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (PUBLIC.some((p) => pathname.startsWith(p)) || esPublicaConSlug(pathname)) {
    return NextResponse.next();
  }

  // ── Cookie actualizada a komand_session ──────────────────
  const token = req.cookies.get("komand_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const session = await verifyToken(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("komand_session");
    return res;
  }

  // ── Redirecciones desde / ────────────────────────────────
  if (pathname === "/") {
    if (session.tipo === "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (session.tipo === "operativo") {
      const p = session.permisos;
      if (p?.puedeAbrirMesas || p?.puedeTomarPedidos || p?.puedeVerTodasLasMesas)
        return NextResponse.redirect(new URL("/mesas", req.url));
      if (session.estaciones?.length > 0)
        return NextResponse.redirect(new URL("/kds", req.url));
      if (p?.puedeCobrar || p?.puedeCerrarCuenta)
        return NextResponse.redirect(new URL("/caja", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Headers para server components ──────────────────────
  const headers = new Headers(req.headers);
  headers.set("x-restaurant-id", session.restaurantId);
  headers.set("x-user-nombre",   session.nombre);

  if (session.tipo === "admin") {
    headers.set("x-admin-id",   session.adminId);
    headers.set("x-session-tipo", "admin");
  } else if (session.tipo === "operativo") {
    headers.set("x-user-id",      session.userId);
    headers.set("x-session-tipo", "operativo");
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};