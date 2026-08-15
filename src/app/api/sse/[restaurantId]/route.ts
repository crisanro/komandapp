//src/app/api/sse/[restaurantId]/route.ts
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
        // Verificar que el admin existe y está activo
        const admin = await db.query.admins.findFirst({
          where: eq(admins.id, session.adminId),
          columns: { activo: true },
        });
        authorized = !!admin?.activo;
      } else if (session.tipo === "operativo") {
        // Verificar que el usuario operativo existe y está activo
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.userId),
          columns: { activo: true },
        });
        authorized = !!user?.activo;
      }
    }
  }

  // Cliente QR — siempre autorizado con token de sesión de mesa
  const sesionToken = req.nextUrl.searchParams.get("sesionToken");
  if (sesionToken) authorized = true;

  if (!authorized) {
    return new Response("No autorizado", { status: 401 });
  }

  let client: ReturnType<typeof addClient>;

  const stream = new ReadableStream({
    start(controller) {
      client = addClient(restaurantId, controller);
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\ndata: {"ok":true}\n\n`));

      const pingInterval = setInterval(() => sendPing(controller), 30_000);

      req.signal.addEventListener("abort", () => {
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