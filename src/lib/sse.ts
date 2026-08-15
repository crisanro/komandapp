import { redis } from "@/lib/redis";
import Redis from "ioredis";

type SSEClient = {
  restaurantId: string;
  controller:   ReadableStreamDefaultController;
};

const clients = new Map<string, Set<SSEClient>>();

// Subscriber dedicado — conexión separada del cliente principal
const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

subscriber.on("message", (channel: string, message: string) => {
  const restaurantId = channel.replace("sse:", "");
  const restaurantClients = clients.get(restaurantId);
  if (!restaurantClients || restaurantClients.size === 0) return;

  console.log(`[SSE] Redis → ${restaurantId}, clientes: ${restaurantClients.size}`);

  const encoder = new TextEncoder();
  for (const client of restaurantClients) {
    try {
      client.controller.enqueue(encoder.encode(message));
    } catch {
      restaurantClients.delete(client);
    }
  }
});

subscriber.on("error", (err) => {
  console.error("[SSE] Redis subscriber error:", err.message);
});

export function addClient(restaurantId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(restaurantId)) {
    clients.set(restaurantId, new Set());
    subscriber.subscribe(`sse:${restaurantId}`);
    console.log(`[SSE] Suscrito a canal: sse:${restaurantId}`);
  }
  const client: SSEClient = { restaurantId, controller };
  clients.get(restaurantId)!.add(client);
  console.log(`[SSE] Cliente agregado: ${restaurantId}, total: ${clients.get(restaurantId)!.size}`);
  return client;
}

export function removeClient(client: SSEClient) {
  const set = clients.get(client.restaurantId);
  if (set) {
    set.delete(client);
    if (set.size === 0) {
      subscriber.unsubscribe(`sse:${client.restaurantId}`);
      clients.delete(client.restaurantId);
      console.log(`[SSE] Desuscrito de: sse:${client.restaurantId}`);
    }
  }
}

export function broadcast(restaurantId: string, event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`[SSE] broadcast → sse:${restaurantId} | ${event} | Redis status: ${redis.status}`);
  redis.publish(`sse:${restaurantId}`, message).then(count => {
    console.log(`[SSE] publish result: ${count} subscribers recibieron`);
  }).catch(err => {
    console.error(`[SSE] publish error:`, err.message);
  });
}

export function sendPing(controller: ReadableStreamDefaultController) {
  try {
    controller.enqueue(new TextEncoder().encode(": ping\n\n"));
  } catch {}
}