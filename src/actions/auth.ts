"use server";

import { db } from "@/db";
import {
  admins, restaurants, users, userEstaciones,
  PLANTILLAS_PERMISOS, type PlantillaKey, type PermisosUser
} from "@/db/schema";
import {
  hashPassword, verifyPassword, hashCodigo, verifyCodigo, generarCodigo,
  setSession, clearSession, getSession, getAdminSession, getOperativoSession, // ← agregar
  getVistaInicial, PERMISOS_ADMIN,
} from "@/lib/auth";
import {
  limiterLoginAdmin, limiterLoginOperativo, limiterRegistro,
  consumirLimite, verificarTurnstile, getIP,
} from "@/lib/security";
import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ─── REGISTRO ADMIN ──────────────────────────────────────

export async function registrarRestaurante(formData: FormData) {
  const reqHeaders = await headers();
  const ip = getIP(reqHeaders);

  const limite = await consumirLimite(limiterRegistro, ip);
  if (limite.bloqueado) return { error: limite.error };

  const turnstileToken = formData.get("cf-turnstile-response") as string;
  const turnstileOk = await verificarTurnstile(turnstileToken);
  if (!turnstileOk) return { error: "Verificación de seguridad fallida. Intenta de nuevo." };

  const nombre   = (formData.get("nombre")   as string)?.trim();
  const ciudad   = (formData.get("ciudad")   as string)?.trim();
  const email    = (formData.get("email")    as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string);

  if (!nombre || !email || !password) return { error: "Todos los campos son requeridos" };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

  const existe = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  if (existe) return { error: "Ya existe una cuenta con ese email" };

  const slugBase = nombre.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugBase}-${createId().slice(0, 6)}`;

  const adminId      = createId();
  const restaurantId = createId();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(admins).values({ id: adminId, nombre, email, passwordHash });
    await tx.insert(restaurants).values({
      id: restaurantId, adminId, nombre, slug, ciudad: ciudad || null,
      planStatus:  "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
    });
  });

  await setSession({ tipo: "admin", adminId, restaurantId, restaurantSlug: slug, nombre, email });
  redirect("/dashboard");
}

// ─── LOGIN ADMIN ─────────────────────────────────────────

export async function loginAdmin(formData: FormData) {
  const reqHeaders = await headers();

    // Temporal — diagnóstico
  console.log("IP headers:", {
    cf:        reqHeaders.get("cf-connecting-ip"),
    forwarded: reqHeaders.get("x-forwarded-for"),
    real:      reqHeaders.get("x-real-ip"),
  });
  
  const ip = getIP(reqHeaders);

  const limite = await consumirLimite(limiterLoginAdmin, ip);
  if (limite.bloqueado) return { error: limite.error };

  const turnstileToken = formData.get("cf-turnstile-response") as string;
  const turnstileOk = await verificarTurnstile(turnstileToken);
  if (!turnstileOk) return { error: "Verificación de seguridad fallida. Intenta de nuevo." };

  const email    = (formData.get("email")    as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string);

  if (!email || !password) return { error: "Email y contraseña son requeridos" };

  const admin = await db.query.admins.findFirst({
    where: and(eq(admins.email, email), eq(admins.activo, true)),
  });
  if (!admin) return { error: "Email o contraseña incorrectos" };

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) return { error: "Email o contraseña incorrectos" };

  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.adminId, admin.id), eq(restaurants.activo, true)),
  });
  if (!restaurant) return { error: "No tienes un restaurante configurado" };

  await setSession({
    tipo: "admin",
    adminId: admin.id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    nombre: admin.nombre,
    email: admin.email,
  });
  redirect("/dashboard");
}

// ─── LOGIN OPERATIVO ─────────────────────────────────────

export async function loginOperativo(formData: FormData) {
  const reqHeaders = await headers();
  const ip = getIP(reqHeaders);

  const limite = await consumirLimite(limiterLoginOperativo, ip);
  if (limite.bloqueado) return { error: limite.error };

  const turnstileToken = formData.get("cf-turnstile-response") as string;
  const turnstileOk = await verificarTurnstile(turnstileToken);
  if (!turnstileOk) return { error: "Verificación de seguridad fallida. Intenta de nuevo." };

  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const codigo   = (formData.get("codigo")   as string)?.trim().toUpperCase();
  const slug     = (formData.get("slug")     as string)?.trim();

  if (!username || !codigo) return { error: "Usuario y código son requeridos" };
  if (!slug)                return { error: "Restaurante no identificado" };

  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.activo, true)),
  });
  if (!restaurant) return { error: "Restaurante no encontrado" };

  const user = await db.query.users.findFirst({
    where: and(eq(users.username, username), eq(users.restaurantId, restaurant.id)),
    with: { userEstaciones: true },
  });
  if (!user) return { error: "Usuario o código incorrecto" };

  if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
    const minutos = Math.ceil((user.bloqueadoHasta.getTime() - Date.now()) / 60000);
    return { error: `Acceso bloqueado. Intenta en ${minutos} minuto${minutos !== 1 ? "s" : ""}` };
  }
  if (!user.activo) return { error: "Tu acceso fue desactivado. Habla con el administrador" };

  const codigoOk = await verifyCodigo(codigo, user.codigoHash);
  if (!codigoOk) {
    const intentos       = (user.intentosFallidos ?? 0) + 1;
    const bloqueadoHasta = intentos >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.update(users)
      .set({ intentosFallidos: intentos, bloqueadoHasta })
      .where(eq(users.id, user.id));
    const restantes = 3 - intentos;
    if (restantes <= 0) return { error: "Demasiados intentos. Bloqueado por 15 minutos" };
    return { error: `Código incorrecto. ${restantes} intento${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""}` };
  }

  await db.update(users)
    .set({ intentosFallidos: 0, bloqueadoHasta: null })
    .where(eq(users.id, user.id));

  const permisos: PermisosUser = {
    puedeCrearMesas:        user.puedeCrearMesas,
    puedeAbrirMesas:        user.puedeAbrirMesas,
    puedeVerTodasLasMesas:  user.puedeVerTodasLasMesas,
    puedeTomarPedidos:      user.puedeTomarPedidos,
    puedeVerPedidos:        user.puedeVerPedidos,
    puedeCobrar:            user.puedeCobrar,
    puedeCerrarCuenta:      user.puedeCerrarCuenta,
    puedeEmitirFacturas:    user.puedeEmitirFacturas,
    puedeAplicarDescuentos: user.puedeAplicarDescuentos,
    puedeMarcarAgotados:    user.puedeMarcarAgotados,
    puedeEditarPrecios:     user.puedeEditarPrecios,
    puedeGestionarMenu:     user.puedeGestionarMenu,
    puedeCuadrarCaja:       user.puedeCuadrarCaja,
    puedeVerReportes:       user.puedeVerReportes,
  };

  const estacionIds = (user.userEstaciones ?? []).map((ue: { estacionId: string }) => ue.estacionId);
  const vistaActiva = getVistaInicial(permisos, estacionIds);

  await setSession({
    tipo: "operativo",
    userId: user.id,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    nombre: user.nombre,
    vistaActiva,
    permisos,
    estaciones: estacionIds,
  });

  redirect(`/${restaurant.slug}/operativo`);
}

// ─── CAMBIAR VISTA ───────────────────────────────────────

export async function cambiarVista(vista: "mesas" | "kds" | "caja"): Promise<void> {
  const session = await getSession();
  if (!session || session.tipo !== "operativo") return; // ← sin return { error }

  await setSession({ ...session, vistaActiva: vista });
  redirect(`/${session.restaurantSlug}/operativo/${vista}`);
}

// ─── CREAR USUARIO OPERATIVO ─────────────────────────────

export async function crearUsuarioOperativo(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre    = (formData.get("nombre")   as string)?.trim();
  const username  = (formData.get("username") as string)?.trim().toLowerCase();
  const plantilla = formData.get("plantilla") as PlantillaKey | null;

  if (!nombre || !username) return { error: "Nombre y usuario son requeridos" };

  const existe = await db.query.users.findFirst({
    where: and(eq(users.username, username), eq(users.restaurantId, session.restaurantId)),
  });
  if (existe) return { error: "Ese usuario ya existe en tu restaurante" };

  const permisos: PermisosUser = plantilla && PLANTILLAS_PERMISOS[plantilla]
    ? { ...PLANTILLAS_PERMISOS[plantilla].permisos }
    : {
        puedeCrearMesas:        formData.get("puedeCrearMesas")        === "true",
        puedeAbrirMesas:        formData.get("puedeAbrirMesas")        === "true",
        puedeVerTodasLasMesas:  formData.get("puedeVerTodasLasMesas")  === "true",
        puedeTomarPedidos:      formData.get("puedeTomarPedidos")      === "true",
        puedeVerPedidos:        formData.get("puedeVerPedidos")        === "true",
        puedeCobrar:            formData.get("puedeCobrar")            === "true",
        puedeCerrarCuenta:      formData.get("puedeCerrarCuenta")      === "true",
        puedeEmitirFacturas:    formData.get("puedeEmitirFacturas")    === "true",
        puedeAplicarDescuentos: formData.get("puedeAplicarDescuentos") === "true",
        puedeMarcarAgotados:    formData.get("puedeMarcarAgotados")    === "true",
        puedeEditarPrecios:     formData.get("puedeEditarPrecios")     === "true",
        puedeGestionarMenu:     formData.get("puedeGestionarMenu")     === "true",
        puedeCuadrarCaja:       formData.get("puedeCuadrarCaja")       === "true",
        puedeVerReportes:       formData.get("puedeVerReportes")       === "true",
      };

  const codigo     = generarCodigo();
  const codigoHash = await hashCodigo(codigo);
  const userId     = createId();

  await db.insert(users).values({
    id: userId,
    restaurantId: session.restaurantId,
    nombre,
    username,
    codigoHash,
    codigoVisible: codigo,
    ...permisos,
  });

  // Asignación de estaciones si se envían desde el formulario
  const estacionIdsRaw = formData.get("estacionIds") as string | null;
  if (estacionIdsRaw) {
    const ids = estacionIdsRaw.split(",").filter(Boolean);
    if (ids.length > 0) {
      await db.insert(userEstaciones).values(
        ids.map((estacionId) => ({ id: createId(), userId, estacionId }))
      );
    }
  }

  revalidatePath("/equipo");
  return { ok: true, codigo, username, nombre, userId };
}

// ─── ACTUALIZAR PERMISOS ─────────────────────────────────

export async function actualizarPermisos(userId: string, formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(users)
    .set({
      puedeCrearMesas:        formData.get("puedeCrearMesas")        === "true",
      puedeAbrirMesas:        formData.get("puedeAbrirMesas")        === "true",
      puedeVerTodasLasMesas:  formData.get("puedeVerTodasLasMesas")  === "true",
      puedeTomarPedidos:      formData.get("puedeTomarPedidos")      === "true",
      puedeVerPedidos:        formData.get("puedeVerPedidos")        === "true",
      puedeCobrar:            formData.get("puedeCobrar")            === "true",
      puedeCerrarCuenta:      formData.get("puedeCerrarCuenta")      === "true",
      puedeEmitirFacturas:    formData.get("puedeEmitirFacturas")    === "true",
      puedeAplicarDescuentos: formData.get("puedeAplicarDescuentos") === "true",
      puedeMarcarAgotados:    formData.get("puedeMarcarAgotados")    === "true",
      puedeEditarPrecios:     formData.get("puedeEditarPrecios")     === "true",
      puedeGestionarMenu:     formData.get("puedeGestionarMenu")     === "true",
      puedeCuadrarCaja:       formData.get("puedeCuadrarCaja")       === "true",
      puedeVerReportes:       formData.get("puedeVerReportes")       === "true",
      actualizadoEn:          new Date(),
    })
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.restaurantId)));

  revalidatePath("/equipo");
  return { ok: true };
}

// ─── ASIGNAR ESTACIONES ──────────────────────────────────

export async function asignarEstaciones(userId: string, estacionIds: string[]) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.delete(userEstaciones).where(eq(userEstaciones.userId, userId));
  if (estacionIds.length > 0) {
    await db.insert(userEstaciones).values(
      estacionIds.map((estacionId) => ({ id: createId(), userId, estacionId }))
    );
  }
  revalidatePath("/equipo");
  return { ok: true };
}

// ─── REGENERAR CÓDIGO ────────────────────────────────────

export async function regenerarCodigo(userId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const codigo     = generarCodigo();
  const codigoHash = await hashCodigo(codigo);

  await db.update(users)
    .set({ codigoHash, codigoVisible: codigo, intentosFallidos: 0, bloqueadoHasta: null })
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.restaurantId)));

  revalidatePath("/equipo");
  return { ok: true, codigo };
}

// ─── TOGGLE USUARIO ──────────────────────────────────────

export async function toggleUsuario(userId: string, activo: boolean) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(users)
    .set({ activo, actualizadoEn: new Date() })
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.restaurantId)));

  revalidatePath("/equipo");
  return { ok: true };
}

// ─── ELIMINAR ACCESO ─────────────────────────────────────

export async function eliminarAcceso(userId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  await db.update(users)
    .set({ activo: false, codigoHash: "REVOKED", codigoVisible: "------", actualizadoEn: new Date() })
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.restaurantId)));

  revalidatePath("/equipo");
  return { ok: true };
}

export async function entrarModoOperativo(): Promise<void> {
  const session = await getAdminSession();
  if (!session) return; // ← sin return { error }

  await setSession({
    tipo:           "operativo",
    userId:         session.adminId,
    restaurantId:   session.restaurantId,
    restaurantSlug: session.restaurantSlug,
    nombre:         session.nombre,
    vistaActiva:    "mesas",
    permisos:       PERMISOS_ADMIN,
    estaciones:     [],
    esAdmin:        true,
    adminEmail:     session.email,
  });

  redirect(`/${session.restaurantSlug}/operativo`);
}

export async function volverAlPanel() {
  const session = await getOperativoSession();
  if (!session || !session.esAdmin) return;  // ← sin return { error }

  await setSession({
    tipo:           "admin",
    adminId:        session.userId,
    restaurantId:   session.restaurantId,
    restaurantSlug: session.restaurantSlug,
    nombre:         session.nombre,
    email:          session.adminEmail ?? "",
  });

  redirect("/dashboard");
}


// ─── LOGOUT ──────────────────────────────────────────────

export async function logout() {
  await clearSession();
  redirect("/login");  // ← antes era /login
}