"use server";
import { db } from "@/db";
import { facturas, itemsFactura, sesiones, restaurants, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getKipuCredentials } from "@/actions/restaurant";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";

type ClienteFactura = {
  identificacionTipo:   "RUC" | "CEDULA" | "PASAPORTE" | "CONSUMIDOR_FINAL";
  identificacionNumero: string;
  razonSocial:          string;
  email?:               string;
};

type ModoEmision = "CONSUMO" | "DETALLADO";

type RucTipo = "PRINCIPAL" | "ARTESANAL";

export async function emitirFactura({
  sesionId,
  cliente,
  modo,
  rucTipo = "PRINCIPAL",
  propina = 0,
}: {
  sesionId: string;
  cliente:  ClienteFactura;
  modo:     ModoEmision;
  rucTipo?: RucTipo;
  propina?: number;
}) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" };

  // Verificar permiso
  if (session.tipo === "operativo" && !session.permisos.puedeEmitirFacturas) {
    return { error: "No tienes permiso para emitir facturas" };
  }

  // Traer sesión con pedidos
  const sesion = await db.query.sesiones.findFirst({
    where: and(eq(sesiones.id, sesionId), eq(sesiones.restaurantId, session.restaurantId)),
    with: {
      pedidos: {
        with: {
          items: {
            with: { menuItem: true },
          },
        },
      },
    },
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  // Traer restaurant
  const restaurant = await db.query.restaurants.findFirst({
    where:   eq(restaurants.id, session.restaurantId),
    columns: {
      plan: true, facturaActiva: true,
      codEstablecimiento: true, codPuntoEmision: true,
      codEstablecimientoArtesanal: true, codPuntoEmisionArtesanal: true,
      kipuApiKey: true, kipuApiKeyArtesanal: true,
      ivaPorcentaje: true,
    },
  });

  if (restaurant?.plan !== "PRO")     return { error: "Requiere Plan PRO" };
  if (!restaurant.facturaActiva)      return { error: "Facturación no está activa" };

  // Credenciales Kipu según RUC
  const creds = await getKipuCredentials(session.restaurantId, rucTipo);
  if (!creds?.apiKey) return { error: "API Key de Kipu no configurada" };

  const kipuUrl     = process.env.KIPU_URL!;
  const internalKey = process.env.KIPU_SECRET_KEY!;
  const ivaVigente  = parseFloat(restaurant.ivaPorcentaje ?? "15");

  // Construir items según modo
  const todosItems = sesion.pedidos.flatMap(p => p.items);
  const subtotal   = todosItems.reduce((acc, i) =>
    acc + parseFloat(i.precioUnitario) * i.cantidad, 0
  );
  const totalSinImpuesto = subtotal / (1 + ivaVigente / 100);
  const totalIva         = subtotal - totalSinImpuesto;
  const totalFinal       = subtotal + propina;

  let kipuItems: object[];

  if (modo === "CONSUMO") {
    kipuItems = [{
      codigo:          "CONSUMO",
      descripcion:     "Consumo de alimentos y bebidas",
      cantidad:        1,
      precio_unitario: parseFloat(totalSinImpuesto.toFixed(2)),
      descuento:       0,
      tipo_iva:        ivaVigente,
      unidad_medida:   "SERVICIO",
    }];
  } else {
    // DETALLADO — agrupar por menuItemId
    const agrupado = new Map<string, { nombre: string; cantidad: number; precio: number; iva: number }>();
    for (const item of todosItems) {
      const key = item.menuItemId;
      const ex  = agrupado.get(key);
      const iva = parseFloat(item.porcentajeIva ?? String(ivaVigente));
      if (ex) {
        ex.cantidad += item.cantidad;
      } else {
        agrupado.set(key, {
          nombre:   item.menuItem?.nombre ?? "Ítem",
          cantidad: item.cantidad,
          precio:   parseFloat(item.precioUnitario) / (1 + iva / 100),
          iva,
        });
      }
    }
    kipuItems = Array.from(agrupado.values()).map(i => ({
      codigo:          "ITEM",
      descripcion:     i.nombre,
      cantidad:        i.cantidad,
      precio_unitario: parseFloat(i.precio.toFixed(4)),
      descuento:       0,
      tipo_iva:        i.iva,
      unidad_medida:   "UNIDAD",
    }));
  }

  // Agregar propina si aplica
  if (propina > 0) {
    kipuItems.push({
      codigo:          "PROPINA",
      descripcion:     "Propina",
      cantidad:        1,
      precio_unitario: parseFloat(propina.toFixed(2)),
      descuento:       0,
      tipo_iva:        0,
      unidad_medida:   "SERVICIO",
    });
  }

  const idempotencyKey = createId();

  try {
    const res = await fetch(`${kipuUrl}/api/v1/public/integraciones/invoice`, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-Api-Key":         creds.apiKey,
        "X-Internal-Key":    internalKey,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        establecimiento: creds.establecimiento,
        punto_emision:   creds.puntoEmision,
        cliente_id:      cliente.identificacionNumero,
        items:           kipuItems,
        pagos: [{
          formaPago:    "01",
          total:        parseFloat(totalFinal.toFixed(2)),
          plazo:        0,
          unidadTiempo: "dias",
        }],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data?.detail ?? "Error al emitir factura en Kipu" };
    }

    // Guardar factura en DB
    const facturaId = createId();
    const emisorId  = session.tipo === "operativo" ? session.userId : session.adminId;

    await db.insert(facturas).values({
      id:           facturaId,
      restaurantId: session.restaurantId,
      sesionId,
      emitidaPorId: emisorId,
      rucTipo,
      rucEmisor:         data.ruc_emisor         ?? "",
      razonSocialEmisor: data.razon_social_emisor ?? "",
      establecimiento:   creds.establecimiento,
      puntoEmision:      creds.puntoEmision,
      secuencial:        data.secuencial          ?? "",
      numeroCompleto:    data.numero_completo     ?? "",
      identificacionTipo:   cliente.identificacionTipo,
      identificacionNumero: cliente.identificacionNumero,
      razonSocialCliente:   cliente.razonSocial,
      emailCliente:         cliente.email ?? null,
      subtotal:        subtotal.toFixed(2),
      totalDescuento:  "0",
      totalSinImpuesto: totalSinImpuesto.toFixed(2),
      totalIva:        totalIva.toFixed(2),
      propina:         propina.toFixed(2),
      total:           totalFinal.toFixed(2),
      estado:          data.estado ?? "AUTORIZADA",
      kipuFacturaId:   data.id ?? null,
      claveAcceso:     data.clave_acceso ?? null,
      ambiente:        data.ambiente ?? "2",
      errorMensaje:    null,
    });

    // Guardar items factura
    if (modo === "DETALLADO") {
      await db.insert(itemsFactura).values(
        kipuItems.map((i: any) => ({
          id:             createId(),
          facturaId,
          nombre:         i.descripcion,
          cantidad:       i.cantidad,
          precioUnitario: i.precio_unitario.toFixed(2),
          descuento:      "0",
          porcentajeIva:  i.tipo_iva.toFixed(2),
          subtotal:       (i.precio_unitario * i.cantidad).toFixed(2),
          totalIva:       (i.precio_unitario * i.cantidad * i.tipo_iva / 100).toFixed(2),
          total:          (i.precio_unitario * i.cantidad * (1 + i.tipo_iva / 100)).toFixed(2),
        }))
      );
    }

    revalidatePath("/reportes");
    return {
      ok:            true,
      facturaId,
      numeroCompleto: data.numero_completo,
      claveAcceso:   data.clave_acceso,
    };

  } catch (err) {
    return { error: "No se pudo conectar con Kipu. Verifica tu conexión." };
  }
}