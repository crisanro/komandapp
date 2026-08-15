"use server";
import { db } from "@/db";
import { clientes, programasFidelidad, clientePrograma, sesiones, restaurants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── BUSCAR CLIENTE POR CÉDULA ────────────────────────────
export async function buscarClientePorCedula(cedula: string, sesionToken: string) {
  const sesion = await db.query.sesiones.findFirst({
    where: eq(sesiones.token, sesionToken),
    columns: { restaurantId: true },
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  const cliente = await db.query.clientes.findFirst({
    where: and(
      eq(clientes.telefono, cedula),
      eq(clientes.restaurantId, sesion.restaurantId),
    ),
    with: {
      clientePrograma: {
        with: { programa: true },
      },
    },
  });

  // Traer programas activos del restaurante
  const programas = await db.query.programasFidelidad.findMany({
    where: and(
      eq(programasFidelidad.restaurantId, sesion.restaurantId),
      eq(programasFidelidad.activo, true),
    ),
  });

  return {
    ok:       true,
    cliente:  cliente ?? null,
    programas,
    restaurantId: sesion.restaurantId,
  };
}

// ─── REGISTRAR CLIENTE NUEVO ──────────────────────────────
export async function registrarCliente({
  sesionToken, cedula, nombre, email,
}: {
  sesionToken: string;
  cedula:      string;
  nombre:      string;
  email?:      string;
}) {
  const sesion = await db.query.sesiones.findFirst({
    where:   eq(sesiones.token, sesionToken),
    columns: { restaurantId: true },
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  // Verificar si ya existe
  const existe = await db.query.clientes.findFirst({
    where: and(
      eq(clientes.telefono, cedula),
      eq(clientes.restaurantId, sesion.restaurantId),
    ),
  });
  if (existe) return { error: "Ya existe un cliente con esa cédula" };

  const clienteId = createId();
  await db.insert(clientes).values({
    id:           clienteId,
    restaurantId: sesion.restaurantId,
    nombre,
    telefono:     cedula,
    email:        email || null,
  });

  // Inscribir en todos los programas activos
  const programas = await db.query.programasFidelidad.findMany({
    where: and(
      eq(programasFidelidad.restaurantId, sesion.restaurantId),
      eq(programasFidelidad.activo, true),
    ),
  });

  if (programas.length > 0) {
    await db.insert(clientePrograma).values(
      programas.map(p => ({
        id:         createId(),
        clienteId,
        programaId: p.id,
      }))
    );
  }

  return { ok: true, clienteId };
}

// ─── ACUMULAR PUNTOS/SELLOS ───────────────────────────────
export async function acumularFidelidad({
  sesionToken, clienteId, totalPagado,
}: {
  sesionToken:  string;
  clienteId:    string;
  totalPagado:  number;
}) {
  const sesion = await db.query.sesiones.findFirst({
    where:   eq(sesiones.token, sesionToken),
    columns: { restaurantId: true, id: true },
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  const programasCliente = await db.query.clientePrograma.findMany({
    where: eq(clientePrograma.clienteId, clienteId),
    with:  { programa: true },
  });

  for (const cp of programasCliente) {
    const p = cp.programa;
    if (!p.activo) continue;

    let updates: Partial<typeof clientePrograma.$inferInsert> = {
      totalGastado:  String(parseFloat(cp.totalGastado ?? "0") + totalPagado),
      totalVisitas:  (cp.totalVisitas ?? 0) + 1,
      ultimaVisitaEn: new Date(),
    };

    // Puntos
    if (p.tipo === "PUNTOS" || p.tipo === "COMBINADO") {
      const puntosGanados = Math.floor(totalPagado * (p.puntosXDolar ?? 10));
      updates.puntosAcumulados = (cp.puntosAcumulados ?? 0) + puntosGanados;
    }

    // Sellos
    if (p.tipo === "SELLOS" || p.tipo === "COMBINADO") {
      updates.sellosActuales = (cp.sellosActuales ?? 0) + 1;
    }

    // Niveles
    if (p.tipo === "NIVELES" || p.tipo === "COMBINADO") {
      const totalGastadoNuevo = parseFloat(cp.totalGastado ?? "0") + totalPagado;
      updates.nivel =
        totalGastadoNuevo >= parseFloat(p.montoVip   ?? "600") ? "VIP"   :
        totalGastadoNuevo >= parseFloat(p.montoOro   ?? "300") ? "ORO"   :
        totalGastadoNuevo >= parseFloat(p.montoPlata ?? "100") ? "PLATA" : "BRONCE";
    }

    await db.update(clientePrograma)
      .set(updates)
      .where(eq(clientePrograma.id, cp.id));
  }

  // Asociar cliente a la sesión
  await db.update(sesiones)
    .set({ clienteId })
    .where(eq(sesiones.id, sesion.id));

  return { ok: true };
}

// ─── CANJEAR PUNTOS ───────────────────────────────────────
export async function canjearPuntos({
  sesionToken, clienteId, programaId,
}: {
  sesionToken: string;
  clienteId:   string;
  programaId:  string;
}) {
  const cp = await db.query.clientePrograma.findFirst({
    where: and(
      eq(clientePrograma.clienteId, clienteId),
      eq(clientePrograma.programaId, programaId),
    ),
    with: { programa: true },
  });
  if (!cp) return { error: "No encontrado" };

  const puntosNecesarios = cp.programa.puntosParaCanjear ?? 100;
  if ((cp.puntosAcumulados ?? 0) < puntosNecesarios) {
    return { error: "No tienes suficientes puntos" };
  }

  const valorCanje = parseFloat(cp.programa.valorCanje ?? "5");

  await db.update(clientePrograma)
    .set({
      puntosCanjeados:  (cp.puntosCanjeados ?? 0) + puntosNecesarios,
      puntosAcumulados: (cp.puntosAcumulados ?? 0) - puntosNecesarios,
    })
    .where(eq(clientePrograma.id, cp.id));

  return { ok: true, valorCanje };
}

// ─── SOLICITAR CUENTA CON DATOS ──────────────────────────
export async function pedirCuentaConDatos({
  sesionToken, cedula, nombre, email,
  quiereFactura, clienteId,
}: {
  sesionToken:   string;
  cedula?:       string;
  nombre?:       string;
  email?:        string;
  quiereFactura: boolean;
  clienteId?:    string;
}) {
  const sesion = await db.query.sesiones.findFirst({
    where: eq(sesiones.token, sesionToken),
    with:  { mesa: true, restaurant: true },
  });
  if (!sesion) return { error: "Sesión no encontrada" };

  // Importar broadcast
  const { broadcast } = await import("@/lib/sse");
  const { notificarCuentaSolicitada } = await import("@/actions/push");

  const total = 0; // El total real lo calcula el cajero

  broadcast(sesion.restaurantId, "cuenta:solicitada", {
    sesionId:      sesion.id,
    mesaId:        sesion.mesaId,
    mesaNombre:    sesion.mesa?.nombre,
    quiereFactura,
    datosFact: quiereFactura ? { cedula, nombre, email } : null,
    clienteId:     clienteId ?? null,
  });

  await notificarCuentaSolicitada({
    restaurantId: sesion.restaurantId,
    mesaNombre:   sesion.mesa?.nombre ?? "Mesa",
    total:        "—",
  });

  return { ok: true };
}