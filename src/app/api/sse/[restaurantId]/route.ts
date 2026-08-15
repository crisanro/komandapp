import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { addClient, removeClient, sendPing } from "@/lib/sse";
import { db } from "@/db";
import { users, admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  let authorized = false;

  const token = req.cookies.get("komand_session")?.value ?? "";
  if (token) {
    const session = await verifyToken(token);
    if (session && session.restaurantId === restaurantId) {
      if (session.tipo === "admin") {
        const admin = await db.query.admins.findFirst({
          where: eq(admins.id, session.adminId),
          columns: { activo: true },
        });
        authorized = !!admin?.activo;
      } else if (session.tipo === "operativo") {
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.userId),
          columns: { activo: true },
        });
        authorized = !!user?.activo;
      }
    }
  }

  const sesionToken = req.nextUrl.searchParams.get("sesionToken");
  if (sesionToken) authorized = true;

  console.log("[SSE] Conexión:", {
    restaurantId,
    authorized,
    tieneSesionToken: !!sesionToken,
    tieneToken: !!token,
  });

  if (!authorized) {
    console.log("[SSE] No autorizado para:", restaurantId);
    return new Response("No autorizado", { status: 401 });
  }

  let client: ReturnType<typeof addClient>;

  const stream = new ReadableStream({
    start(controller) {
      client = addClient(restaurantId, controller);
      console.log("[SSE] Cliente conectado a:", restaurantId);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\ndata: {"ok":true}\n\n`));

      const pingInterval = setInterval(() => {
        console.log("[SSE] Ping a:", restaurantId);
        sendPing(controller);
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        console.log("[SSE] Cliente desconectado de:", restaurantId);
        clearInterval(pingInterval);
        removeClient(client);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":               "text/event-stream",
      "Cache-Control":              "no-cache, no-transform",
      "Connection":                 "keep-alive",
      "X-Accel-Buffering":          "no",
      "ngrok-skip-browser-warning": "true",
    },
  });
}