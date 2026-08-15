import { redis } from "@/lib/redis";
import Redis from "ioredis";

type SSEClient = {
  restaurantId: string;
  controller:   ReadableStreamDefaultController;
};

// Clientes locales de esta instancia
const clients = new Map<string, Set<SSEClient>>();

// Subscriber dedicado — no puede usarse para otros comandos
const subscriber = new Redis(process.env.REDIS_URL!);

subscriber.on("message", (channel: string, message: string) => {
  const restaurantId = channel.replace("sse:", "");
  const restaurantClients = clients.get(restaurantId);
  if (!restaurantClients || restaurantClients.size === 0) return;

  const encoder = new TextEncoder();
  for (const client of restaurantClients) {
    try {
      client.controller.enqueue(encoder.encode(message));
    } catch {
      restaurantClients.delete(client);
    }
  }
});

export function addClient(restaurantId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(restaurantId)) {
    clients.set(restaurantId, new Set());
    // Suscribirse al canal de Redis para este restaurante
    subscriber.subscribe(`sse:${restaurantId}`);
  }
  const client: SSEClient = { restaurantId, controller };
  clients.get(restaurantId)!.add(client);
  return client;
}

export function removeClient(client: SSEClient) {
  const set = clients.get(client.restaurantId);
  if (set) {
    set.delete(client);
    // Si no quedan clientes, desuscribirse
    if (set.size === 0) {
      subscriber.unsubscribe(`sse:${client.restaurantId}`);
      clients.delete(client.restaurantId);
    }
  }
}

export function broadcast(restaurantId: string, event: string, data: unknown) {
  const restaurantClients = clients.get(restaurantId);
  console.log(`[SSE] broadcast ${event} → restaurantId: ${restaurantId}, clientes: ${restaurantClients?.size ?? 0}`);
  
  if (!restaurantClients || restaurantClients.size === 0) return;
  
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  for (const client of restaurantClients) {
    try {
      client.controller.enqueue(encoder.encode(message));
    } catch {
      restaurantClients.delete(client);
    }
  }
}

export function sendPing(controller: ReadableStreamDefaultController) {
  try {
    controller.enqueue(new TextEncoder().encode(": ping\n\n"));
  } catch {}
}