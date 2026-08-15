"use client";

import { useState, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { cerrarSesion } from "@/actions/sesiones";
import { logout } from "@/actions/auth";
import { emitirFactura } from "@/actions/facturacion";
import CambiarVista from "@/components/operativo/CambiarVista";
import type { PermisosUser } from "@/lib/auth";

type MenuItem   = { nombre: string };
type ItemPedido = { id: string; cantidad: number; nota: string | null; estado: string; precioUnitario: string; menuItem: MenuItem | null };
type Pedido     = { id: string; numero: number; items: ItemPedido[] };
type Mesa       = { nombre: string };
type User       = { nombre: string };
type Sesion     = { id: string; mesa: Mesa | null; abiertaPor: User | null; abiertaEn: Date; pedidos: Pedido[] } & { _pideCuenta?: boolean };

type Restaurant = {
  nombre: string;
  notaCuenta: string | null;
  propinaModo: string | null;
  porcentajePropina: number | null;
  moneda: string | null;
  facturaActiva?: boolean | null;
  plan?: string | null;
};

type FacturaCliente = {
  identificacionTipo:   "RUC" | "CEDULA" | "PASAPORTE" | "CONSUMIDOR_FINAL";
  identificacionNumero: string;
  razonSocial:          string;
  email:                string;
};

export default function CajaClient({
  sesionesIniciales, restaurant, restaurantId, restaurantSlug, nombre,
  permisos, esAdmin, vistaActiva, estaciones,
}: {
  sesionesIniciales: Sesion[];
  restaurant:        Restaurant;
  restaurantId:      string;
  restaurantSlug:    string; 
  nombre:            string;
  permisos:          PermisosUser | null;
  esAdmin:           boolean;
  vistaActiva:       "mesas" | "kds" | "caja";
  estaciones:        string[];
}) {
  const [sesiones, setSesiones]         = useState<Sesion[]>(sesionesIniciales);
  const [seleccionada, setSeleccionada] = useState<Sesion | null>(null);
  const [cerrando, setCerrando]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showDetalle, setShowDetalle]   = useState(false);
  const moneda = restaurant.moneda ?? "USD";

  // Estados de Facturación
  const [showFactura, setShowFactura]   = useState(false);
  const [emitiendo, setEmitiendo]       = useState(false);
  const [facturaOk, setFacturaOk]       = useState<{ numero: string; clave: string } | null>(null);
  const [facturaError, setFacturaError] = useState("");
  const [modoEmision, setModoEmision]   = useState<"CONSUMO" | "DETALLADO">("CONSUMO");
  const [rucTipo, setRucTipo]           = useState<"PRINCIPAL" | "ARTESANAL">("PRINCIPAL");
  const [clienteFact, setClienteFact]   = useState<FacturaCliente>({
    identificacionTipo:   "CONSUMIDOR_FINAL",
    identificacionNumero: "9999999999999",
    razonSocial:          "CONSUMIDOR FINAL",
    email:                "",
  });

  const puedeFacturar = Boolean(
    (esAdmin || permisos?.puedeEmitirFacturas) &&
    restaurant.facturaActiva &&
    restaurant.plan === "PRO"
  );

  const handleSesionCerrada = useCallback((data: unknown) => {
    const { sesionId } = data as { sesionId: string };
    setSesiones(prev => prev.filter(s => s.id !== sesionId));
    if (seleccionada?.id === sesionId) { setSeleccionada(null); setShowDetalle(false); }
  }, [seleccionada]);

  const handleCuentaSolicitada = useCallback((data: unknown) => {
    const { sesionId } = data as { sesionId: string };
    setSesiones(prev => prev.map(s => s.id === sesionId ? { ...s, _pideCuenta: true } : s));
  }, []);

  useSSE(restaurantId, {
    "sesion:cerrada":    handleSesionCerrada,
    "cuenta:solicitada": handleCuentaSolicitada,
  });

  function getTotal(sesion: Sesion) {
    return sesion.pedidos.reduce((acc, p) =>
      acc + p.items.reduce((a, i) => a + parseFloat(i.precioUnitario) * i.cantidad, 0), 0
    );
  }

  function getPropina(total: number) {
    if (restaurant.propinaModo === "DESACTIVADA" || !restaurant.porcentajePropina) return 0;
    return total * (restaurant.porcentajePropina / 100);
  }

  async function handleCerrar() {
    if (!seleccionada) return;
    setCerrando(true);
    const result = await cerrarSesion(seleccionada.id);
    setCerrando(false);
    if (result?.error) { alert(result.error); return; }
    setShowConfirm(false);

    if (puedeFacturar) {
      setShowFactura(true);
      setFacturaOk(null);
      setFacturaError("");
    } else {
      setSeleccionada(null);
      setShowDetalle(false);
    }
  }

  async function handleEmitirFactura() {
    if (!seleccionada) return;
    setEmitiendo(true);
    setFacturaError("");
    const result = await emitirFactura({
      sesionId: seleccionada.id,
      cliente:  clienteFact,
      modo:     modoEmision,
      rucTipo,
      propina:  getPropina(getTotal(seleccionada)),
    });
    setEmitiendo(false);
    if (result?.error) { setFacturaError(result.error); return; }
    setFacturaOk({
      numero: result.numeroCompleto ?? "",
      clave:  result.claveAcceso   ?? "",
    });
  }

  function cerrarModalFactura() {
    setShowFactura(false);
    setSeleccionada(null);
    setShowDetalle(false);
    setFacturaOk(null);
    setClienteFact({
      identificacionTipo:   "CONSUMIDOR_FINAL",
      identificacionNumero: "9999999999999",
      razonSocial:          "CONSUMIDOR FINAL",
      email:                "",
    });
  }

  function seleccionar(s: Sesion) {
    setSeleccionada(s);
    setShowDetalle(true);
  }

  const totalActivo = sesiones.reduce((acc, s) => acc + getTotal(s), 0);

  // ── Panel lista ──────────────────────────────────────────

  const Lista = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {sesiones.length} cuenta{sesiones.length !== 1 ? "s" : ""} activa{sesiones.length !== 1 ? "s" : ""}
        </p>
        <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
          {moneda} {totalActivo.toFixed(2)}
        </p>
      </div>

      {sesiones.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-4xl mb-3">💤</p>
          <p className="text-sm">Sin cuentas activas</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ borderTop: "none" }}>
          {sesiones.map(s => {
            const total  = getTotal(s);
            const activa = seleccionada?.id === s.id;
            return (
              <button key={s.id} onClick={() => seleccionar(s)}
                className="w-full text-left px-4 py-4 transition-colors"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background:   activa ? "var(--accent-subtle)" : "transparent",
                  borderLeft:   activa ? "3px solid var(--accent)" : "3px solid transparent",
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {s.mesa?.nombre}
                  </span>
                  <div className="flex items-center gap-2">
                    {s._pideCuenta && (
                      <span className="badge badge-blue">💳</span>
                    )}
                    <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                      {moneda} {total.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.abiertaPor?.nombre ?? "—"} · {s.pedidos.length} pedido{s.pedidos.length !== 1 ? "s" : ""} ·{" "}
                  {new Date(s.abiertaEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Panel detalle ────────────────────────────────────────

  const Detalle = () => {
    if (!seleccionada) return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <p className="text-4xl mb-3">👆</p>
        <p className="text-sm">Selecciona una cuenta</p>
      </div>
    );

    const subtotal = getTotal(seleccionada);
    const propina  = getPropina(subtotal);

    return (
      <div className="flex flex-col h-full">
        {/* Header detalle */}
        <div className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setShowDetalle(false)}
            className="md:hidden btn btn-ghost btn-icon">
            ←
          </button>
          <div className="flex-1">
            <p className="font-bold" style={{ color: "var(--text-primary)" }}>
              {seleccionada.mesa?.nombre}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {seleccionada.abiertaPor?.nombre ?? "—"} ·{" "}
              {new Date(seleccionada.abiertaEn).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <button onClick={() => setShowConfirm(true)} className="btn btn-primary btn-sm">
            Cobrar
          </button>
        </div>

        {/* Pedidos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {seleccionada.pedidos.map(pedido => (
            <div key={pedido.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Pedido #{pedido.numero}
                </span>
              </div>
              {pedido.items.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm w-6 shrink-0" style={{ color: "var(--text-muted)" }}>
                    {item.cantidad}×
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {item.menuItem?.nombre}
                    </p>
                    {item.nota && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>
                        {item.nota}
                      </p>
                    )}
                  </div>
                  <span className="text-sm shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {moneda} {(parseFloat(item.precioUnitario) * item.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Resumen total */}
        <div className="p-4 space-y-2.5 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
            <span style={{ color: "var(--text-primary)" }}>{moneda} {subtotal.toFixed(2)}</span>
          </div>
          {restaurant.propinaModo !== "DESACTIVADA" && propina > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>
                Propina sugerida ({restaurant.porcentajePropina}%)
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{moneda} {propina.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
            <span className="font-bold text-xl" style={{ color: "var(--accent)" }}>
              {moneda} {subtotal.toFixed(2)}
            </span>
          </div>
          {restaurant.notaCuenta && (
            <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
              {restaurant.notaCuenta}
            </p>
          )}
          <button onClick={() => setShowConfirm(true)} className="btn btn-primary w-full btn-lg mt-1">
            Cobrar — {moneda} {subtotal.toFixed(2)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)" }}>
            <span className="text-white text-sm font-bold">$</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{nombre}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>En vivo</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CambiarVista
            vistaActiva={vistaActiva}
            permisos={permisos}
            esAdmin={esAdmin}
            estaciones={estaciones}
            slug={restaurantSlug}
          />
          <form action={logout}>
            <button type="submit" className="btn btn-ghost btn-sm">Salir</button>
          </form>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden flex">

        {/* Mobile */}
        <div className="md:hidden flex-1 overflow-hidden">
          {showDetalle && seleccionada ? <Detalle /> : <Lista />}
        </div>

        {/* Desktop/Tablet — split view */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-72 lg:w-80 overflow-hidden flex flex-col shrink-0"
            style={{ borderRight: "1px solid var(--border)" }}>
            <Lista />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <Detalle />
          </div>
        </div>
      </main>

      {/* Modal confirmar cobro */}
      {showConfirm && seleccionada && (() => {
        const total   = getTotal(seleccionada);
        const propina = getPropina(total);
        return (
          <div className="modal-overlay">
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                Confirmar cobro
              </h3>
              <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                {seleccionada.mesa?.nombre}
              </p>

              <div className="card mb-6 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                  <span style={{ color: "var(--text-primary)" }}>{moneda} {total.toFixed(2)}</span>
                </div>
                {restaurant.propinaModo !== "DESACTIVADA" && propina > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>
                      Propina ({restaurant.porcentajePropina}%)
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{moneda} {propina.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                  <span className="font-bold text-2xl" style={{ color: "var(--accent)" }}>
                    {moneda} {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleCerrar} disabled={cerrando} className="btn btn-primary w-full btn-lg">
                  {cerrando ? "Cerrando..." : `✓ Cobrar ${moneda} ${total.toFixed(2)}`}
                </button>
                <button onClick={() => setShowConfirm(false)} className="btn btn-secondary w-full">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal facturación */}
      {showFactura && seleccionada && (
        <div className="modal-overlay" onClick={facturaOk ? cerrarModalFactura : undefined}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* Factura emitida OK */}
            {facturaOk ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "var(--color-success-subtle)" }}>
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                    Factura emitida
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {facturaOk.numero}
                  </p>
                </div>
                {facturaOk.clave && (
                  <div className="rounded-xl p-3"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Clave de acceso</p>
                    <p className="text-xs font-mono break-all" style={{ color: "var(--text-primary)" }}>
                      {facturaOk.clave}
                    </p>
                  </div>
                )}
                <button onClick={cerrarModalFactura} className="btn btn-primary w-full">
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                  Emitir factura
                </h3>
                <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                  {seleccionada.mesa?.nombre} · {moneda} {getTotal(seleccionada).toFixed(2)}
                </p>

                {facturaError && (
                  <div className="alert alert-error mb-4"><span>{facturaError}</span></div>
                )}

                <div className="space-y-4">
                  {/* Tipo identificación */}
                  <div className="field">
                    <label className="label">Tipo de identificación</label>
                    <select
                      value={clienteFact.identificacionTipo}
                      onChange={e => {
                        const tipo = e.target.value as FacturaCliente["identificacionTipo"];
                        setClienteFact(prev => ({
                          ...prev,
                          identificacionTipo:   tipo,
                          identificacionNumero: tipo === "CONSUMIDOR_FINAL" ? "9999999999999" : "",
                          razonSocial:          tipo === "CONSUMIDOR_FINAL" ? "CONSUMIDOR FINAL" : "",
                        }));
                      }}
                      className="input" style={{ background: "var(--surface-raised)" }}>
                      <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                      <option value="CEDULA">Cédula</option>
                      <option value="RUC">RUC</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>

                  {/* Datos cliente — solo si no es consumidor final */}
                  {clienteFact.identificacionTipo !== "CONSUMIDOR_FINAL" && (
                    <>
                      <div className="field">
                        <label className="label">
                          {clienteFact.identificacionTipo === "RUC" ? "RUC" :
                           clienteFact.identificacionTipo === "CEDULA" ? "Cédula" : "Pasaporte"} *
                        </label>
                        <input
                          value={clienteFact.identificacionNumero}
                          onChange={e => setClienteFact(prev => ({ ...prev, identificacionNumero: e.target.value }))}
                          placeholder={clienteFact.identificacionTipo === "RUC" ? "1312838392001" : "1312838392"}
                          className="input font-mono"
                          maxLength={clienteFact.identificacionTipo === "RUC" ? 13 : 10}
                        />
                      </div>
                      <div className="field">
                        <label className="label">
                          {clienteFact.identificacionTipo === "RUC" ? "Razón social" : "Nombre"} *
                        </label>
                        <input
                          value={clienteFact.razonSocial}
                          onChange={e => setClienteFact(prev => ({ ...prev, razonSocial: e.target.value.toUpperCase() }))}
                          placeholder={clienteFact.identificacionTipo === "RUC" ? "EMPRESA S.A." : "JUAN PÉREZ"}
                          className="input"
                        />
                      </div>
                      <div className="field">
                        <label className="label">
                          Email <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
                        </label>
                        <input
                          value={clienteFact.email}
                          onChange={e => setClienteFact(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="cliente@email.com"
                          type="email"
                          className="input"
                        />
                      </div>
                    </>
                  )}

                  {/* Modo emisión */}
                  <div className="field">
                    <label className="label">Modo de emisión</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "CONSUMO",   label: "Consumo",   desc: "Un ítem genérico" },
                        { value: "DETALLADO", label: "Detallado", desc: "Cada ítem del pedido" },
                      ] as const).map(opt => (
                        <label key={opt.value}
                          className="flex items-start gap-2 p-3 rounded-xl cursor-pointer"
                          style={{
                            background: modoEmision === opt.value ? "var(--accent-subtle)" : "var(--surface-raised)",
                            border:     modoEmision === opt.value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                          }}>
                          <input type="radio" value={opt.value}
                            checked={modoEmision === opt.value}
                            onChange={() => setModoEmision(opt.value)}
                            style={{ accentColor: "var(--accent)", marginTop: "2px" }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RUC tipo — solo si tiene artesanal */}
                  {restaurant.plan === "PRO" && (
                    <div className="field">
                      <label className="label">Emitir desde</label>
                      <select value={rucTipo} onChange={e => setRucTipo(e.target.value as "PRINCIPAL" | "ARTESANAL")}
                        className="input" style={{ background: "var(--surface-raised)" }}>
                        <option value="PRINCIPAL">RUC Principal</option>
                        <option value="ARTESANAL">RUC Artesanal</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={cerrarModalFactura} className="btn btn-secondary flex-1">
                    Omitir
                  </button>
                  <button onClick={handleEmitirFactura} disabled={emitiendo} className="btn btn-primary flex-1">
                    {emitiendo
                      ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Emitiendo...</>
                      : "Emitir factura"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}