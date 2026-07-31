import Redis from "ioredis";

declare global {
  var _redisClient: Redis | undefined;
}

function createRedis() {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on("error", (err) => {
    // No explotar si Redis no está disponible — degradar gracefully
    if (process.env.NODE_ENV === "development") {
      console.warn("[Redis] No disponible:", err.message);
    }
  });

  return client;
}

export const redis = globalThis._redisClient ?? createRedis();
if (process.env.NODE_ENV !== "production") globalThis._redisClient = redis;

// ─── HELPERS DE CACHE ────────────────────────

const TTL = {
  MENU:         300,  // 5 min
  RESTAURANT:   600,  // 10 min
  PROMOCIONES:   60,  // 1 min
  ESTACIONES:   300,  // 5 min
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // ignorar — Redis opcional
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

// ─── KEYS ────────────────────────────────────

export const CacheKeys = {
  menu:        (restaurantId: string) => `menu:${restaurantId}`,
  restaurant:  (restaurantId: string) => `restaurant:${restaurantId}`,
  promociones: (restaurantId: string) => `promociones:${restaurantId}`,
  estaciones:  (restaurantId: string) => `estaciones:${restaurantId}`,
  menuPublico: (slug: string)         => `menu_publico:${slug}`,
};

// ─── INVALIDACIÓN ────────────────────────────

export async function invalidarMenu(restaurantId: string) {
  await Promise.all([
    cacheDel(CacheKeys.menu(restaurantId)),
    cacheDelPattern(`menu_publico:*`),
  ]);
}

export async function invalidarRestaurant(restaurantId: string) {
  await cacheDel(CacheKeys.restaurant(restaurantId));
}

export async function invalidarPromociones(restaurantId: string) {
  await cacheDel(CacheKeys.promociones(restaurantId));
}

export { TTL };