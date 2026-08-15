"use server";
import { db } from "@/db";
import { restaurants, SLUGS_RESERVADOS } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function actualizarRestaurante(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre            = (formData.get("nombre")          as string)?.trim();
  const ciudad            = (formData.get("ciudad")          as string)?.trim();
  const whatsapp          = (formData.get("whatsapp")        as string)?.trim();
  const color             = (formData.get("color")           as string)?.trim();
  const notasMenu         = (formData.get("notasMenu")       as string)?.trim();
  const notaCuenta        = (formData.get("notaCuenta")      as string)?.trim();
  const moneda            = (formData.get("moneda")          as string)?.trim();
  const propinaModo       = formData.get("propinaModo") as "AUTOMATICA" | "SUGERIDA" | "INCLUIDA" | "DESACTIVADA";
  const ivaPorcentaje     = (formData.get("ivaPorcentaje")   as string)?.trim();
  const porcentajePropina = formData.get("porcentajePropina")
    ? parseInt(formData.get("porcentajePropina") as string)
    : 10;

  if (!nombre) return { error: "El nombre es requerido" };

  const ivaNum = parseFloat(ivaPorcentaje);
  if (isNaN(ivaNum) || ivaNum < 0 || ivaNum > 100) {
    return { error: "El porcentaje de IVA debe ser entre 0 y 100" };
  }

  await db.update(restaurants)
    .set({
      nombre,
      ciudad:             ciudad     || null,
      whatsapp:           whatsapp   || null,
      color:              color      || "#E85D04",
      notasMenu:          notasMenu  || null,
      notaCuenta:         notaCuenta || null,
      moneda:             moneda     || "USD",
      propinaModo:        propinaModo || "SUGERIDA",
      porcentajePropina,
      ivaPorcentaje:      ivaNum.toFixed(2),
      actualizadoEn:      new Date(),
    })
    .where(eq(restaurants.id, session.restaurantId));

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cambiarSlug(nuevoSlug: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(nuevoSlug)) return { error: "Solo letras minúsculas, números y guiones" };
  if (nuevoSlug.length < 3 || nuevoSlug.length > 50) return { error: "Entre 3 y 50 caracteres" };

  // Verificar slugs reservados
  if (SLUGS_RESERVADOS.includes(nuevoSlug as any)) {
    return { error: "Ese nombre está reservado y no puede usarse" };
  }

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, session.restaurantId),
  });
  if (!restaurant) return { error: "Restaurante no encontrado" };

  if (restaurant.slugCambiadoEn) {
    const dias = (Date.now() - restaurant.slugCambiadoEn.getTime()) / (1000 * 60 * 60 * 24);
    if (dias < 7) {
      const restantes = Math.ceil(7 - dias);
      return { error: `Puedes cambiar el slug en ${restantes} día${restantes !== 1 ? "s" : ""}` };
    }
  }

  const existe = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, nuevoSlug), ne(restaurants.id, session.restaurantId)),
  });
  if (existe) return { error: "Ese nombre ya está ocupado" };

  await db.update(restaurants)
    .set({ slug: nuevoSlug, slugCambiadoEn: new Date(), actualizadoEn: new Date() })
    .where(eq(restaurants.id, session.restaurantId));

  revalidatePath("/configuracion");
  return { ok: true, slug: nuevoSlug };
}

// ─── GUARDAR CONFIG FACTURACIÓN ──────────────────────────
export async function guardarConfigFacturacion(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, session.restaurantId),
    columns: { plan: true, kipuApiKey: true, kipuApiKeyArtesanal: true },
  });
  if (restaurant?.plan !== "PRO") return { error: "Requiere Plan PRO" };

  const codEstab = (formData.get("codEstablecimiento") as string)?.trim().padStart(3, "0");
  const codPunto = (formData.get("codPuntoEmision")    as string)?.trim().padStart(3, "0");

  if (!codEstab || !codPunto) return { error: "Establecimiento y punto de emisión son requeridos" };

  // API Key principal — solo cifrar si viene nueva, si no mantener la existente
  const kipuApiKeyRaw  = (formData.get("kipuApiKey") as string)?.trim();
  const kipuApiKeyFinal = kipuApiKeyRaw ? encrypt(kipuApiKeyRaw) : restaurant.kipuApiKey;
  if (!kipuApiKeyFinal) return { error: "La API Key de Kipu es requerida" };

  // RUC artesanal — opcional
  const codEstabArt         = (formData.get("codEstablecimientoArtesanal") as string)?.trim().padStart(3, "0") || null;
  const codPuntoArt         = (formData.get("codPuntoEmisionArtesanal")    as string)?.trim().padStart(3, "0") || null;
  const kipuApiKeyArtRaw    = (formData.get("kipuApiKeyArtesanal")         as string)?.trim();
  const kipuApiKeyArtFinal  = kipuApiKeyArtRaw ? encrypt(kipuApiKeyArtRaw) : restaurant.kipuApiKeyArtesanal;

  await db.update(restaurants)
    .set({
      codEstablecimiento:          codEstab,
      codPuntoEmision:             codPunto,
      kipuApiKey:                  kipuApiKeyFinal,
      codEstablecimientoArtesanal: codEstabArt,
      codPuntoEmisionArtesanal:    codPuntoArt,
      kipuApiKeyArtesanal:         kipuApiKeyArtFinal ?? null,
      actualizadoEn:               new Date(),
    })
    .where(eq(restaurants.id, session.restaurantId));

  revalidatePath("/configuracion");
  return { ok: true };
}

// ─── VALIDAR KIPU ────────────────────────────────────────
export async function validarKipu() {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, session.restaurantId),
    columns: {
      plan: true, kipuApiKey: true,
      codEstablecimiento: true, codPuntoEmision: true,
    },
  });

  if (restaurant?.plan !== "PRO")  return { error: "Requiere Plan PRO" };
  if (!restaurant.kipuApiKey)      return { error: "Configura la API Key de Kipu primero" };
  if (!restaurant.codEstablecimiento || !restaurant.codPuntoEmision) {
    return { error: "Configura el establecimiento y punto de emisión primero" };
  }

  const kipuUrl    = process.env.KIPU_URL;
  const internalKey = process.env.KIPU_SECRET_KEY;
  if (!kipuUrl || !internalKey) return { error: "KIPU_URL o KIPU_SECRET_KEY no configurados" };

  const apiKey = decrypt(restaurant.kipuApiKey);
  if (!apiKey) return { error: "Error al leer la API Key" };

  try {
    const res = await fetch(`${kipuUrl}/api/v1/public/integraciones/validate`, {
      method:  "POST",
      headers: {
        "Content-Type":   "application/json",
        "X-Api-Key":      apiKey,
        "X-Internal-Key": internalKey,
      },
      body:   JSON.stringify({
        estab_codigo: restaurant.codEstablecimiento,
        punto_codigo: restaurant.codPuntoEmision,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { error: data?.detail ?? "Establecimiento o punto de emisión no válidos en Kipu" };
    }

    return { ok: true };
  } catch {
    return { error: "No se pudo conectar con Kipu. Verifica la configuración." };
  }
}

// ─── GET API KEY DESCIFRADA (para usar en otras actions) ─
export async function getKipuCredentials(restaurantId: string, tipo: "PRINCIPAL" | "ARTESANAL" = "PRINCIPAL") {
  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, restaurantId),
    columns: {
      kipuApiKey: true, kipuApiKeyArtesanal: true,
      codEstablecimiento: true, codPuntoEmision: true,
      codEstablecimientoArtesanal: true, codPuntoEmisionArtesanal: true,
    },
  });

  if (!restaurant) return null;

  if (tipo === "ARTESANAL") {
    if (!restaurant.kipuApiKeyArtesanal) return null;
    return {
      apiKey:          decrypt(restaurant.kipuApiKeyArtesanal),
      establecimiento: restaurant.codEstablecimientoArtesanal ?? "",
      puntoEmision:    restaurant.codPuntoEmisionArtesanal ?? "",
    };
  }

  if (!restaurant.kipuApiKey) return null;
  return {
    apiKey:          decrypt(restaurant.kipuApiKey),
    establecimiento: restaurant.codEstablecimiento ?? "",
    puntoEmision:    restaurant.codPuntoEmision ?? "",
  };
}