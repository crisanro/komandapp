"use server";

import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function actualizarRestaurante(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const nombre          = (formData.get("nombre")           as string)?.trim();
  const ciudad          = (formData.get("ciudad")           as string)?.trim();
  const whatsapp        = (formData.get("whatsapp")         as string)?.trim();
  const color           = (formData.get("color")            as string)?.trim();
  const notasMenu       = (formData.get("notasMenu")        as string)?.trim();
  const notaCuenta      = (formData.get("notaCuenta")       as string)?.trim();
  const moneda          = (formData.get("moneda")           as string)?.trim();
  const propinaModo     = formData.get("propinaModo") as "AUTOMATICA" | "SUGERIDA" | "INCLUIDA" | "DESACTIVADA";
  const ivaPorcentaje   = (formData.get("ivaPorcentaje")    as string)?.trim();
  const porcentajePropina = formData.get("porcentajePropina")
    ? parseInt(formData.get("porcentajePropina") as string)
    : 10;

  if (!nombre) return { error: "El nombre es requerido" };

  // Validar IVA
  const ivaNum = parseFloat(ivaPorcentaje);
  if (isNaN(ivaNum) || ivaNum < 0 || ivaNum > 100) {
    return { error: "El porcentaje de IVA debe ser un número entre 0 y 100" };
  }

  await db.update(restaurants)
    .set({
      nombre,
      ciudad:             ciudad      || null,
      whatsapp:           whatsapp    || null,
      color:              color       || "#E85D04",
      notasMenu:          notasMenu   || null,
      notaCuenta:         notaCuenta  || null,
      moneda:             moneda      || "USD",
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
  if (!slugRegex.test(nuevoSlug)) {
    return { error: "El slug solo puede tener letras minúsculas, números y guiones" };
  }
  if (nuevoSlug.length < 3 || nuevoSlug.length > 50) {
    return { error: "El slug debe tener entre 3 y 50 caracteres" };
  }

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, session.restaurantId),
  });
  if (!restaurant) return { error: "Restaurante no encontrado" };

  if (restaurant.slugCambiadoEn) {
    const diasDesdeUltimoCambio = (Date.now() - restaurant.slugCambiadoEn.getTime()) / (1000 * 60 * 60 * 24);
    if (diasDesdeUltimoCambio < 7) {
      const diasRestantes = Math.ceil(7 - diasDesdeUltimoCambio);
      return { error: `Puedes cambiar el slug en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}` };
    }
  }

  const existe = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, nuevoSlug), ne(restaurants.id, session.restaurantId)),
  });
  if (existe) return { error: "Ese nombre ya está ocupado por otro restaurante" };

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
    where: eq(restaurants.id, session.restaurantId),
    columns: { plan: true },
  });
  if (restaurant?.plan !== "PRO") return { error: "La facturación requiere el Plan PRO" };

  const rucPrincipal   = (formData.get("rucPrincipal")   as string)?.trim();
  const razonSocial    = (formData.get("razonSocial")    as string)?.trim();
  const codEstab       = (formData.get("codEstablecimiento") as string)?.trim().padStart(3, "0");
  const codPunto       = (formData.get("codPuntoEmision")    as string)?.trim().padStart(3, "0");
  const ambiente       = (formData.get("ambiente")       as string)?.trim();

  if (!rucPrincipal || !razonSocial || !codEstab || !codPunto) {
    return { error: "RUC, razón social, establecimiento y punto de emisión son requeridos" };
  }
  if (!/^\d{13}$/.test(rucPrincipal)) {
    return { error: "El RUC debe tener exactamente 13 dígitos" };
  }

  // RUC artesanal — opcional
  const rucArtesanal   = (formData.get("rucArtesanal")   as string)?.trim() || null;
  const razonArtesanal = (formData.get("razonSocialArtesanal")        as string)?.trim() || null;
  const codEstabArt    = (formData.get("codEstablecimientoArtesanal") as string)?.trim().padStart(3, "0") || null;
  const codPuntoArt    = (formData.get("codPuntoEmisionArtesanal")    as string)?.trim().padStart(3, "0") || null;

  if (rucArtesanal && !/^\d{13}$/.test(rucArtesanal)) {
    return { error: "El RUC artesanal debe tener exactamente 13 dígitos" };
  }

  await db.update(restaurants)
    .set({
      rucPrincipal,
      razonSocial,
      codEstablecimiento: codEstab,
      codPuntoEmision:    codPunto,
      ambiente:           ambiente || "2",
      rucArtesanal:              rucArtesanal,
      razonSocialArtesanal:      razonArtesanal,
      codEstablecimientoArtesanal: codEstabArt,
      codPuntoEmisionArtesanal:    codPuntoArt,
      kipuValidado:  false, // hay que revalidar si cambian los datos
      actualizadoEn: new Date(),
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
    where: eq(restaurants.id, session.restaurantId),
    columns: {
      plan: true, rucPrincipal: true,
      codEstablecimiento: true, codPuntoEmision: true,
    },
  });

  if (restaurant?.plan !== "PRO") return { error: "Requiere Plan PRO" };
  if (!restaurant.rucPrincipal) return { error: "Configura el RUC primero" };

  // Llamar al endpoint de validación de Kipu
  const url    = process.env.KIPU_URL;
  const apiKey = process.env.KIPU_API_KEY;

  if (!url || !apiKey) return { error: "KIPU_URL y KIPU_API_KEY no están configurados en el servidor" };

  try {
    const res = await fetch(`${url}/api/v1/public/integraciones/validate`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        estab_codigo: restaurant.codEstablecimiento,
        punto_codigo: restaurant.codPuntoEmision,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      return { error: data?.detail ?? "Establecimiento o punto de emisión no válidos en Kipu" };
    }

    // Marcar como validado
    await db.update(restaurants)
      .set({ kipuValidado: true, actualizadoEn: new Date() })
      .where(eq(restaurants.id, session.restaurantId));

    revalidatePath("/configuracion");
    return { ok: true };

  } catch (err) {
    return { error: "No se pudo conectar con Kipu. Verifica la configuración del servidor." };
  }
}