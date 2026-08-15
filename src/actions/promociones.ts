"use server";
import { db } from "@/db";
import { promociones, comboItems } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type TipoPromo  = "PORCENTAJE" | "PORCENTAJE_CATEGORIA" | "MONTO_FIJO" | "2X1" | "3X2" | "COMBO" | "HAPPY_HOUR" | "PRIMERA_VISITA" | "CUMPLEANOS";
type Visibilidad = "CLIENTE" | "EQUIPO" | "AMBOS";

function parsearDias(raw: string | null): number[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function crearPromocion(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const titulo      = (formData.get("titulo")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const emoji       = (formData.get("emoji")       as string)?.trim() || "🎉";
  const tipo        = formData.get("tipo")         as TipoPromo;
  const visibilidad = (formData.get("visibilidad") as Visibilidad) ?? "AMBOS";
  const porcentaje  = formData.get("porcentaje")   as string;
  const montoFijo   = formData.get("montoFijo")    as string;
  const precioCombo = formData.get("precioCombo")  as string;
  const montoMinimo = formData.get("montoMinimo")  as string;
  const categoriaId = formData.get("categoriaId")  as string;
  const menuItemId  = formData.get("menuItemId")   as string;
  const fechaInicio = formData.get("fechaInicio")  as string;
  const fechaFin    = formData.get("fechaFin")     as string;
  const horaInicio  = formData.get("horaInicio")   as string;
  const horaFin     = formData.get("horaFin")      as string;
  const diasRaw     = formData.get("diasSemana")   as string;
  const comboRaw    = formData.get("comboItems")   as string;

  if (!titulo) return { error: "El título es requerido" };
  if (!tipo)   return { error: "El tipo es requerido" };

  const promoId = createId();

  await db.insert(promociones).values({
    id:           promoId,
    restaurantId: session.restaurantId,
    titulo,
    descripcion:  descripcion || null,
    emoji,
    tipo,
    visibilidad,
    porcentaje:   porcentaje  || null,
    montoFijo:    montoFijo   || null,
    precioCombo:  precioCombo || null,
    montoMinimo:  montoMinimo || null,
    categoriaId:  categoriaId || null,
    menuItemId:   menuItemId  || null,
    fechaInicio:  fechaInicio ? new Date(fechaInicio) : null,
    fechaFin:     fechaFin    ? new Date(fechaFin)    : null,
    horaInicio:   horaInicio  || null,
    horaFin:      horaFin     || null,
    diasSemana:   parsearDias(diasRaw),
  });

  // Insertar items del combo en tabla separada
  if (tipo === "COMBO" && comboRaw) {
    try {
      const items = JSON.parse(comboRaw) as { menuItemId: string; cantidad: number }[];
      if (items.length > 0) {
        await db.insert(comboItems).values(
          items.map(i => ({
            id:          createId(),
            promocionId: promoId,
            menuItemId:  i.menuItemId,
            cantidad:    i.cantidad,
          }))
        );
      }
    } catch {}
  }

  revalidatePath("/promociones");
  return { ok: true };
}

export async function editarPromocion(promoId: string, formData: FormData) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };

  const titulo      = (formData.get("titulo")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim();
  const emoji       = (formData.get("emoji")       as string)?.trim() || "🎉";
  const tipo        = formData.get("tipo")         as TipoPromo;
  const visibilidad = (formData.get("visibilidad") as Visibilidad) ?? "AMBOS";
  const porcentaje  = formData.get("porcentaje")   as string;
  const montoFijo   = formData.get("montoFijo")    as string;
  const precioCombo = formData.get("precioCombo")  as string;
  const montoMinimo = formData.get("montoMinimo")  as string;
  const categoriaId = formData.get("categoriaId")  as string;
  const menuItemId  = formData.get("menuItemId")   as string;
  const fechaInicio = formData.get("fechaInicio")  as string;
  const fechaFin    = formData.get("fechaFin")     as string;
  const horaInicio  = formData.get("horaInicio")   as string;
  const horaFin     = formData.get("horaFin")      as string;
  const diasRaw     = formData.get("diasSemana")   as string;
  const comboRaw    = formData.get("comboItems")   as string;

  if (!titulo) return { error: "El título es requerido" };

  await db.update(promociones)
    .set({
      titulo,
      descripcion:  descripcion || null,
      emoji,
      tipo,
      visibilidad,
      porcentaje:   porcentaje  || null,
      montoFijo:    montoFijo   || null,
      precioCombo:  precioCombo || null,
      montoMinimo:  montoMinimo || null,
      categoriaId:  categoriaId || null,
      menuItemId:   menuItemId  || null,
      fechaInicio:  fechaInicio ? new Date(fechaInicio) : null,
      fechaFin:     fechaFin    ? new Date(fechaFin)    : null,
      horaInicio:   horaInicio  || null,
      horaFin:      horaFin     || null,
      diasSemana:   parsearDias(diasRaw),
      actualizadoEn: new Date(),
    })
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));

  // Reemplazar combo items
  if (tipo === "COMBO") {
    await db.delete(comboItems).where(eq(comboItems.promocionId, promoId));
    if (comboRaw) {
      try {
        const items = JSON.parse(comboRaw) as { menuItemId: string; cantidad: number }[];
        if (items.length > 0) {
          await db.insert(comboItems).values(
            items.map(i => ({
              id:          createId(),
              promocionId: promoId,
              menuItemId:  i.menuItemId,
              cantidad:    i.cantidad,
            }))
          );
        }
      } catch {}
    }
  }

  revalidatePath("/promociones");
  return { ok: true };
}

export async function togglePromocion(promoId: string, activa: boolean) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };
  await db.update(promociones)
    .set({ activa, actualizadoEn: new Date() })
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));
  revalidatePath("/promociones");
  return { ok: true };
}

export async function eliminarPromocion(promoId: string) {
  const session = await getAdminSession();
  if (!session) return { error: "No autorizado" };
  await db.delete(promociones)
    .where(and(eq(promociones.id, promoId), eq(promociones.restaurantId, session.restaurantId)));
  revalidatePath("/promociones");
  return { ok: true };
}

export async function getPromocionesActivas(restaurantId: string, visibilidad: "CLIENTE" | "EQUIPO") {
  const ahora = new Date();
  const hora  = `${ahora.getHours().toString().padStart(2, "0")}:${ahora.getMinutes().toString().padStart(2, "0")}`;
  const dia   = ahora.getDay();

  const promos = await db.query.promociones.findMany({
    where: and(
      eq(promociones.restaurantId, restaurantId),
      eq(promociones.activa, true),
      or(eq(promociones.visibilidad, visibilidad), eq(promociones.visibilidad, "AMBOS")),
      or(isNull(promociones.fechaInicio), lte(promociones.fechaInicio, ahora)),
      or(isNull(promociones.fechaFin),    gte(promociones.fechaFin,    ahora)),
    ),
    with: {
      itemsCombo: { with: { menuItem: true } },
      menuItem:   true,
      categoria:  true,
    },
  });

  // Filtrar por hora y día en JS
  return promos.filter(p => {
    if (p.horaInicio && p.horaFin) {
      if (hora < p.horaInicio || hora > p.horaFin) return false;
    }
    if (p.diasSemana && (p.diasSemana as number[]).length > 0) {
      if (!(p.diasSemana as number[]).includes(dia)) return false;
    }
    return true;
  });
}