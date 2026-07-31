// src/lib/kipu.ts
// Integración Komand → Kipu via Bearer API Key
// Kipu usa verify_api_key — la API key está asociada al emisor en Kipu

// ─── TIPOS ──────────────────────────────────────────────

export type TipoId = "04" | "05" | "06" | "07";
// 04 = RUC | 05 = Cédula | 06 = Pasaporte | 07 = Consumidor Final

export type ItemKipu = {
  codigoPrincipal?: string;
  descripcion:      string;
  cantidad:         number;
  precioUnitario:   number;  // precio SIN IVA — Kipu calcula el IVA
  descuento?:       number;
  porcentajeIva:    number;  // 0 o 15 (o el vigente)
};

export type PagoKipu = {
  formaPago:    string;  // "01" efectivo | "19" tarjeta | "20" transferencia
  total:        string;  // decimal como string: "10.50"
  plazo?:       string;
  unidadTiempo?: string;
};

export type ClienteKipu = {
  identificacion: string;
  tipoId:         TipoId;
  razonSocial:    string;
  email?:         string;
  direccion?:     string;
  telefono?:      string;
};

export type FacturaKipuPayload = {
  establecimiento: string;  // "001"
  punto_emision:   string;  // "001"
  cliente:         ClienteKipu;
  items:           ItemKipu[];
  pagos:           PagoKipu[];
  propina?:        number;  // monto en USD — va en infoFactura.propina del XML SRI
};

export type KipuResponse =
  | { ok: true;  id: number; claveAcceso: string; estado: string; mensaje: string }
  | { ok: false; error: string; detail?: string };

// ─── EMITIR FACTURA ─────────────────────────────────────

export async function emitirFacturaKipu(
  payload:         FacturaKipuPayload,
  idempotencyKey?: string,
): Promise<KipuResponse> {
  const url    = process.env.KIPU_URL;
  const apiKey = process.env.KIPU_API_KEY;

  if (!url || !apiKey) {
    return { ok: false, error: "Integración con Kipu no configurada. Verifica KIPU_URL y KIPU_API_KEY." };
  }

  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "X-Source":      "komand",
  };

  // Idempotency key — si el cajero presiona dos veces "Emitir",
  // Kipu devuelve la misma factura sin duplicar
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  try {
    const res = await fetch(`${url}/api/v1/public/integraciones/invoice`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(30_000), // SRI puede tardar
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok:     false,
        error:  data?.detail ?? `Error HTTP ${res.status}`,
        detail: typeof data === "object" ? JSON.stringify(data) : String(data),
      };
    }

    return data as KipuResponse;

  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Kipu no respondió en 30 segundos. El SRI puede estar lento — revisa el estado de la factura." };
    }
    console.error("[Kipu] Error de conexión:", err);
    return { ok: false, error: "No se pudo conectar con el sistema de facturación." };
  }
}

// ─── PING ────────────────────────────────────────────────

export async function pingKipu(): Promise<{ ok: boolean; latencia?: number }> {
  const url    = process.env.KIPU_URL;
  const apiKey = process.env.KIPU_API_KEY;
  if (!url || !apiKey) return { ok: false };

  const inicio = Date.now();
  try {
    const res = await fetch(`${url}/api/v1/public/integraciones/status`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      signal:  AbortSignal.timeout(5_000),
    });
    return { ok: res.ok, latencia: Date.now() - inicio };
  } catch {
    return { ok: false };
  }
}

// ─── HELPERS DE CONVERSIÓN ───────────────────────────────

// El precio en carta INCLUYE IVA → Kipu espera precio SIN IVA
// Fórmula: precioSinIva = precioConIva / (1 + porcentaje/100)
export function precioSinIva(precioConIva: number, porcentajeIva: number): number {
  if (porcentajeIva === 0) return precioConIva;
  return parseFloat((precioConIva / (1 + porcentajeIva / 100)).toFixed(6));
}

// Método de pago Komand → código forma de pago SRI
export function metodoPagoSRI(metodo: string): string {
  const map: Record<string, string> = {
    EFECTIVO:      "01",
    TARJETA:       "19",
    TRANSFERENCIA: "20",
    QR:            "20",
    PUNTOS:        "01",
  };
  return map[metodo] ?? "01";
}

// Tipo de identificación Komand → código SRI
export function tipoIdSRI(tipo: string): TipoId {
  const map: Record<string, TipoId> = {
    RUC:              "04",
    CEDULA:           "05",
    PASAPORTE:        "06",
    CONSUMIDOR_FINAL: "07",
  };
  return map[tipo] ?? "05";
}

// Calcular totales para mostrar en UI antes de emitir
// (Kipu hace el cálculo real — esto es solo para preview)
export function calcularTotalesPreview(
  items: { precioConIva: number; cantidad: number; porcentajeIva: number; descuento?: number }[],
  propina = 0,
) {
  let subtotal         = 0;
  let totalSinImpuesto = 0;
  let totalIva         = 0;

  for (const item of items) {
    const totalItem  = item.precioConIva * item.cantidad - (item.descuento ?? 0);
    const pct        = item.porcentajeIva / 100;
    const sinIva     = pct > 0 ? totalItem / (1 + pct) : totalItem;
    const iva        = totalItem - sinIva;

    subtotal         += totalItem;
    totalSinImpuesto += sinIva;
    totalIva         += iva;
  }

  return {
    subtotal:         parseFloat(subtotal.toFixed(2)),
    totalSinImpuesto: parseFloat(totalSinImpuesto.toFixed(2)),
    totalIva:         parseFloat(totalIva.toFixed(2)),
    propina:          parseFloat(propina.toFixed(2)),
    total:            parseFloat((subtotal + propina).toFixed(2)),
  };
}