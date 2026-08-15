"use client";
import { useEffect, useState } from "react";
import { getSesionDetalle } from "@/actions/sesiones";
import TiempoTranscurrido from "./TiempoTranscurrido";

type Props = {
  sesionId: string;
  onClose:  () => void;
};

type Item = {
  id: string; cantidad: number; precioUnitario: string;
  nota: string | null; estado: string;
  menuItem: { nombre: string } | null;
};

type Pedido = {
  id: string; numero: number; creadoEn: Date; estado: string;
  items: Item[];
};

type Sesion = {
  id: string; abiertaEn: Date; nombreCliente: string | null;
  mesa: { nombre: string } | null;
  abiertaPor: { nombre: string } | null;
  pedidos: Pedido[];
  pagos: { id: string; metodo: string; monto: string }[];
  descuentos: { id: string; montoAplicado: string; motivo: string | null }[];
};

const ESTADO_ITEM: Record<string, { label: string; color: string }> = {
  EN_COLA:        { label: "En cola",       color: "var(--text-muted)" },
  EN_PREPARACION: { label: "Preparando",    color: "var(--color-info)" },
  LISTO:          { label: "✓ Listo",       color: "var(--color-success)" },
  ENTREGADO:      { label: "Entregado",     color: "var(--text-muted)" },
  CANCELADO:      { label: "Cancelado",     color: "var(--color-error)" },
};

export default function SesionModal({ sesionId, onClose }: Props) {
  const [sesion,  setSesion]  = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSesionDetalle(sesionId).then((data) => {
      setSesion(data as Sesion | null);
      setLoading(false);
    });
  }, [sesionId]);

  // Calcular totales
  const subtotal = sesion?.pedidos.reduce((acc, p) =>
    acc + p.items.reduce((a, i) =>
      a + parseFloat(i.precioUnitario) * i.cantidad, 0), 0) ?? 0;

  const totalDescuentos = sesion?.descuentos.reduce((acc, d) =>
    acc + parseFloat(d.montoAplicado), 0) ?? 0;

  const totalPagado = sesion?.pagos.reduce((acc, p) =>
    acc + parseFloat(p.monto), 0) ?? 0;

  const totalFinal = subtotal - totalDescuentos;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {sesion?.mesa?.nombre ?? "Mesa"}
            </h2>
            {sesion && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Abierta hace <TiempoTranscurrido fecha={sesion.abiertaEn} /> ·{" "}
                {sesion.abiertaPor ? `por ${sesion.abiertaPor.nombre}` : ""}
                {sesion.nombreCliente ? ` · ${sesion.nombreCliente}` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 space-y-5">
          {loading ? (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              Cargando...
            </div>
          ) : !sesion ? (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              No se encontró la sesión.
            </div>
          ) : sesion.pedidos.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
              Sin pedidos aún.
            </div>
          ) : (
            <>
              {/* Pedidos */}
              {sesion.pedidos.map((pedido) => (
                <div key={pedido.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}>
                      Pedido #{pedido.numero}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      · <TiempoTranscurrido fecha={pedido.creadoEn} />
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}>
                    {pedido.items.map((item, idx) => (
                      <div key={item.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{
                          borderBottom: idx < pedido.items.length - 1
                            ? "1px solid var(--border-subtle)" : "none"
                        }}>
                        <span className="text-sm w-6 text-center"
                          style={{ color: "var(--text-muted)" }}>
                          {item.cantidad}×
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                            {item.menuItem?.nombre ?? "Item eliminado"}
                          </p>
                          {item.nota && (
                            <p className="text-xs italic mt-0.5" style={{ color: "var(--accent)" }}>
                              {item.nota}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            color: ESTADO_ITEM[item.estado]?.color ?? "var(--text-muted)",
                            background: "var(--surface-raised)",
                          }}>
                          {ESTADO_ITEM[item.estado]?.label ?? item.estado}
                        </span>
                        <span className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}>
                          ${(parseFloat(item.precioUnitario) * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Totales */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                  <span style={{ color: "var(--text-primary)" }}>${subtotal.toFixed(2)}</span>
                </div>
                {totalDescuentos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--color-success)" }}>Descuentos</span>
                    <span style={{ color: "var(--color-success)" }}>-${totalDescuentos.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2"
                  style={{ borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-primary)" }}>Total</span>
                  <span style={{ color: "var(--accent)" }}>${totalFinal.toFixed(2)}</span>
                </div>
                {totalPagado > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Pagado</span>
                    <span style={{ color: "var(--color-success)" }}>${totalPagado.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}