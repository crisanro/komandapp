import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "@/lib/redis";

// ─── RATE LIMITERS ────────────────────────────────────────
// Diferentes límites según la acción

// Login admin: 5 intentos por IP cada 15 minutos
export const limiterLoginAdmin = new RateLimiterRedis({
  storeClient:  redis,
  keyPrefix:    "rl:login_admin",
  points:       5,
  duration:     60 * 15,
  blockDuration: 60 * 15,
});

// Login operativo: 8 intentos por IP cada 10 minutos
export const limiterLoginOperativo = new RateLimiterRedis({
  storeClient:  redis,
  keyPrefix:    "rl:login_operativo",
  points:       8,
  duration:     60 * 10,
  blockDuration: 60 * 10,
});

// Registro: 3 intentos por IP cada hora
export const limiterRegistro = new RateLimiterRedis({
  storeClient:  redis,
  keyPrefix:    "rl:registro",
  points:       3,
  duration:     60 * 60,
  blockDuration: 60 * 60,
});

// ─── HELPER: consumir un punto ────────────────────────────
export async function consumirLimite(
  limiter: RateLimiterRedis,
  ip: string
): Promise<{ bloqueado: boolean; error?: string }> {
  // En desarrollo no aplicar rate limiting
  if (process.env.NODE_ENV !== "production") return { bloqueado: false };

  try {
    await limiter.consume(ip);
    return { bloqueado: false };
  } catch (e: unknown) {
    const msBeforeNext = (e as { msBeforeNext?: number })?.msBeforeNext ?? 0;
    const segundos = Math.ceil(msBeforeNext / 1000);
    const minutos  = Math.ceil(segundos / 60);
    const tiempo   = minutos > 1 ? `${minutos} minutos` : `${segundos} segundos`;
    return {
      bloqueado: true,
      error: `Demasiados intentos. Intenta en ${tiempo}.`,
    };
  }
}

// ─── VERIFICAR TURNSTILE ──────────────────────────────────

export async function verificarTurnstile(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret:   process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── OBTENER IP DEL REQUEST ───────────────────────────────

export function getIP(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||       // Cloudflare
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}