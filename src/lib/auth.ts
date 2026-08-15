import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { PermisosUser } from "@/db/schema";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "komand_session";

// ─── SESSION PAYLOAD ─────────────────────────
// Dos tipos de sesión: admin (dueño) y operativo (mesero, cajero, etc.)

export type SessionAdmin = {
  tipo:         "admin";
  adminId:      string;
  restaurantId: string;
  restaurantSlug: string;
  nombre:       string;
  email:        string;
};

export type SessionOperativo = {
  tipo:         "operativo";
  userId:       string;
  restaurantId: string;
  restaurantSlug: string; 
  nombre:       string;
  vistaActiva:  "mesas" | "kds" | "caja";
  permisos:     PermisosUser;
  estaciones:   string[]; 
  esAdmin?:       boolean;
  adminEmail?:  string;
};

export type SessionPayload = SessionAdmin | SessionOperativo;

// ─── JWT ─────────────────────────────────────

export async function signToken(payload: SessionPayload, expiresIn = "30d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── COOKIES ─────────────────────────────────

export async function setSession(payload: SessionPayload) {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || !session.tipo) return null;
  return session;
}

export async function getAdminSession(): Promise<SessionAdmin | null> {
  const session = await getSession();
  if (!session || session.tipo !== "admin") return null;
  return session;
}

export async function getOperativoSession(): Promise<SessionOperativo | null> {
  const session = await getSession();
  if (!session || session.tipo !== "operativo") return null;
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── HELPERS DE VISTAS ───────────────────────

export function getVistaInicial(permisos: PermisosUser, estaciones: string[]): "mesas" | "kds" | "caja" {
  if (permisos.puedeAbrirMesas || permisos.puedeTomarPedidos) return "mesas";
  if (estaciones.length > 0) return "kds";
  if (permisos.puedeCobrar || permisos.puedeCerrarCuenta) return "caja";
  return "mesas";
}

export function getVistasDisponibles(permisos: PermisosUser, estaciones: string[]): ("mesas" | "kds" | "caja")[] {
  const vistas: ("mesas" | "kds" | "caja")[] = [];
  if (permisos.puedeAbrirMesas || permisos.puedeTomarPedidos || permisos.puedeVerTodasLasMesas) vistas.push("mesas");
  if (estaciones.length > 0) vistas.push("kds");
  if (permisos.puedeCobrar || permisos.puedeCerrarCuenta || permisos.puedeCuadrarCaja) vistas.push("caja");
  return vistas;
}

// ─── PASSWORD ────────────────────────────────

export async function hashPassword(password: string) { return bcrypt.hash(password, 10); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }

// ─── CÓDIGO OPERATIVO ────────────────────────

export function generarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function hashCodigo(codigo: string) { return bcrypt.hash(codigo, 10); }
export async function verifyCodigo(codigo: string, hash: string) { return bcrypt.compare(codigo.toUpperCase(), hash); }

// ─── PERMISOS COMPLETOS PARA ADMIN ───────────

export const PERMISOS_ADMIN: PermisosUser = {
  puedeCrearMesas:        true,
  puedeAbrirMesas:        true,
  puedeVerTodasLasMesas:  true,
  puedeTomarPedidos:      true,
  puedeVerPedidos:        true,
  puedeCobrar:            true,
  puedeCerrarCuenta:      true,
  puedeEmitirFacturas:    true,
  puedeAplicarDescuentos: true,
  puedeMarcarAgotados:    true,
  puedeEditarPrecios:     true,
  puedeGestionarMenu:     true,
  puedeCuadrarCaja:       true,
  puedeVerReportes:       true,
};

export type { PermisosUser };