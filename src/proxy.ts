import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_EXACTAS = [
  "/login",
  "/registro",
];

function esPublica(pathname: string): boolean {
  if (pathname.startsWith("/_next") || pathname.includes(".")) return true;
  if (PUBLIC_EXACTAS.includes(pathname)) return true;

  const partes = pathname.split("/").filter(Boolean);
  if (partes.length >= 2) {
    const seccion = partes[1];
    if (seccion === "menu" || seccion === "login") return true;
  }

  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/sse/"))  return true;
  if (pathname.startsWith("/api/menu/")) return true;

  return false;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (esPublica(pathname)) return NextResponse.next();

  const token = req.cookies.get("komand_session")?.value;
  if (!token) return redirectLogin(req, pathname);

  const session = await verifyToken(token);
  if (!session) {
    const res = redirectLogin(req, pathname);
    res.cookies.delete("komand_session");
    return res;
  }

  // ── Proteger rutas admin ───────────────────────────────
  const rutasAdmin = ["/dashboard", "/equipo", "/mesas-admin", "/menu-admin", "/configuracion", "/estaciones", "/reportes", "/promociones"];
  if (rutasAdmin.some(r => pathname.startsWith(r))) {
    if (session.tipo !== "admin") return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Proteger /[slug]/operativo ─────────────────────────
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length >= 2 && partes[1] === "operativo") {
    if (session.tipo !== "operativo") {
      return NextResponse.redirect(new URL(`/${partes[0]}/login`, req.url));
    }
    if (session.restaurantSlug !== partes[0]) {
      return NextResponse.redirect(new URL(`/${partes[0]}/login`, req.url));
    }
  }

  // ── Redirect desde raíz ────────────────────────────────
  if (pathname === "/") {
    if (session.tipo === "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (session.tipo === "operativo") {
      return NextResponse.redirect(new URL(`/${session.restaurantSlug}/operativo`, req.url));
    }
  }

  // ── Headers para Server Components ────────────────────
  const headers = new Headers(req.headers);
  headers.set("x-restaurant-id",   session.restaurantId);
  headers.set("x-restaurant-slug", session.restaurantSlug);
  headers.set("x-user-nombre",     session.nombre);
  headers.set("x-session-tipo",    session.tipo);

  if (session.tipo === "admin") {
    headers.set("x-admin-id", session.adminId);
  } else if (session.tipo === "operativo") {
    headers.set("x-user-id", session.userId);
  }

  return NextResponse.next({ request: { headers } });
}

function redirectLogin(req: NextRequest, pathname: string): NextResponse {
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length >= 2 && partes[1] === "operativo") {
    return NextResponse.redirect(new URL(`/${partes[0]}/login`, req.url));
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};