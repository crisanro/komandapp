/**
 * SSE Broadcaster — canal de tiempo real de Mesa
 *
 * Un canal por restaurante. Todos los clientes conectados
 * (mesero, cocina, admin, cliente QR) reciben los eventos.
 *
 * Tipos de eventos:
 * - mesa:update      → estado de una mesa cambió
 * - pedido:nuevo     → nuevo pedido llegó a cocina
 * - pedido:update    → estado de pedido cambió
 * - item:update      → estado de ítem cambió (cocina marcó listo)
 * - sesion:cerrada   → cuenta cerrada
 * - cuenta:solicitada → cliente pidió la cuenta
 */

type SSEClient = {
  restaurantId: string;
  controller:   ReadableStreamDefaultController;
};

// Map global de clientes conectados por restaurante
// En producción con múltiples instancias usar Redis Pub/Sub
const clients = new Map<string, Set<SSEClient>>();

export function addClient(restaurantId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(restaurantId)) {
    clients.set(restaurantId, new Set());
  }
  const client: SSEClient = { restaurantId, controller };
  clients.get(restaurantId)!.add(client);
  return client;
}

export function removeClient(client: SSEClient) {
  clients.get(client.restaurantId)?.delete(client);
}

export function broadcast(restaurantId: string, event: string, data: unknown) {
  const restaurantClients = clients.get(restaurantId);
  if (!restaurantClients || restaurantClients.size === 0) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();

  for (const client of restaurantClients) {
    try {
      client.controller.enqueue(encoder.encode(message));
    } catch {
      // Cliente desconectado — limpiar
      restaurantClients.delete(client);
    }
  }
}

// Helper para enviar ping y mantener conexión viva
export function sendPing(controller: ReadableStreamDefaultController) {
  try {
    controller.enqueue(new TextEncoder().encode(": ping\n\n"));
  } catch {
    // ignorar
  }
}