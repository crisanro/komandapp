"use client";
import { useState } from "react";
import {
  buscarClientePorCedula, registrarCliente,
  acumularFidelidad, canjearPuntos, pedirCuentaConDatos,
} from "@/actions/clientes";

type Programa = {
  id: string; nombre: string; tipo: string;
  puntosParaCanjear: number | null; valorCanje: string | null;
  sellosParaPremio:  number | null; descripcionPremio: string | null;
};

type ClientePrograma = {
  programaId:       string;
  puntosAcumulados: number | null;
  sellosActuales:   number | null;
  nivel:            string | null;
  programa:         Programa;
};

type Cliente = {
  id:     string;
  nombre: string;
  email:  string | null;
  clientePrograma: ClientePrograma[];
};

type Props = {
  sesionToken:    string;
  color:          string;
  totalSesion:    number;
  tieneFactura:   boolean;
  tieneFidelidad: boolean;
  onComplete:     (total: string) => void;
};

type Paso = "cedula" | "fidelidad" | "factura" | "confirmacion";

export default function PedirCuentaFlow({
  sesionToken, color, totalSesion, tieneFactura, tieneFidelidad, onComplete,
}: Props) {
  const [paso,          setPaso]          = useState<Paso>(
    tieneFidelidad || tieneFactura ? "cedula" : "confirmacion"
  );
  const [cedula,        setCedula]        = useState("");
  const [nombre,        setNombre]        = useState("");
  const [email,         setEmail]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [cliente,       setCliente]       = useState<Cliente | null>(null);
  const [programas,     setProgramas]     = useState<Programa[]>([]);
  const [restaurantId,  setRestaurantId]  = useState("");
  const [canjeando,     setCanjeando]     = useState<string | null>(null);
  const [canjesAplicados, setCanjes]      = useState<{ programaId: string; valor: number }[]>([]);
  const [quiereFactura, setQuiereFactura] = useState(false);
  const [esNuevo,       setEsNuevo]       = useState(false);

  function validarCedula(val: string) {
    if (val.length === 10) return /^\d{10}$/.test(val);
    if (val.length === 13) return /^\d{13}$/.test(val);
    return false;
  }

  async function handleBuscarCedula() {
    if (!validarCedula(cedula)) { setError("Ingresa una cédula (10 dígitos) o RUC (13 dígitos) válido"); return; }
    setError("");
    setLoading(true);
    const result = await buscarClientePorCedula(cedula, sesionToken);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }

    setRestaurantId(result.restaurantId ?? "");
    setProgramas(result.programas ?? []);

    if (result.cliente) {
      setCliente(result.cliente);
      setNombre(result.cliente.nombre);
      setEmail(result.cliente.email ?? "");
      setEsNuevo(false);
    } else {
      setCliente(null);
      setEsNuevo(true);
    }

    // Decidir siguiente paso
    if (tieneFidelidad && (result.programas ?? []).length > 0) {
      setPaso("fidelidad");
    } else if (tieneFactura) {
      setPaso("factura");
    } else {
      await enviarSolicitud(result.cliente?.id ?? null, false);
    }
  }

  async function handleRegistrar() {
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    setError("");
    setLoading(true);
    const result = await registrarCliente({ sesionToken, cedula, nombre, email: email || undefined });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }

    if (tieneFactura) {
      setPaso("factura");
    } else {
      await enviarSolicitud(result.clienteId ?? null, false);
    }
  }

  async function handleCanjear(cp: ClientePrograma) {
    setCanjeando(cp.programaId);
    const result = await canjearPuntos({
      sesionToken,
      clienteId:  cliente!.id,
      programaId: cp.programaId,
    });
    setCanjeando(null);
    if (result?.error) { setError(result.error); return; }
    setCanjes(prev => [...prev, { programaId: cp.programaId, valor: result.valorCanje ?? 0 }]);
  }

  async function enviarSolicitud(clienteId: string | null, facturaRequerida: boolean) {
    setLoading(true);

    // Acumular fidelidad si hay cliente
    if (clienteId && totalSesion > 0) {
      await acumularFidelidad({ sesionToken, clienteId, totalPagado: totalSesion });
    }

    await pedirCuentaConDatos({
      sesionToken,
      cedula:        cedula || undefined,
      nombre:        nombre || undefined,
      email:         email  || undefined,
      quiereFactura: facturaRequerida,
      clienteId:     clienteId ?? undefined,
    });

    setLoading(false);
    onComplete(totalSesion.toFixed(2));
  }

  // ── Paso: cédula ──────────────────────────────────────
  if (paso === "cedula") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {tieneFidelidad ? "¿Tienes puntos acumulados?" : "Datos para tu factura"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Ingresa tu cédula o RUC
          </p>
        </div>

        {error && <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>}

        <input
          value={cedula}
          onChange={e => setCedula(e.target.value.replace(/\D/g, ""))}
          placeholder="0912345678"
          className="input text-center font-mono text-lg"
          maxLength={13}
          inputMode="numeric"
        />

        {/* Registro si es nuevo */}
        {esNuevo && cedula.length >= 10 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              No encontramos tu cédula. ¿Quieres registrarte?
            </p>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="input"
            />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com (opcional)"
              type="email"
              className="input"
            />
            <button onClick={handleRegistrar} disabled={loading}
              className="btn btn-primary w-full"
              style={color !== "#E85D04" ? { background: color } : {}}>
              {loading ? "Registrando..." : "Registrarme y continuar"}
            </button>
            <button onClick={() => enviarSolicitud(null, false)}
              className="btn btn-ghost w-full text-sm"
              style={{ color: "var(--text-muted)" }}>
              Continuar sin registrarme
            </button>
          </div>
        )}

        {!esNuevo && (
          <div className="space-y-2">
            <button onClick={handleBuscarCedula} disabled={loading || cedula.length < 10}
              className="btn btn-primary w-full"
              style={color !== "#E85D04" ? { background: color } : {}}>
              {loading ? "Buscando..." : "Continuar"}
            </button>
            <button onClick={() => enviarSolicitud(null, false)}
              className="btn btn-ghost w-full text-sm"
              style={{ color: "var(--text-muted)" }}>
              Saltar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Paso: fidelidad ───────────────────────────────────
  if (paso === "fidelidad") {
    const cpsCliente = cliente?.clientePrograma ?? [];

    return (
      <div className="space-y-4">
        <div className="text-center">
          {cliente ? (
            <>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                ¡Hola, {cliente.nombre.split(" ")[0]}! 👋
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Tus recompensas
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Recompensas disponibles
            </p>
          )}
        </div>

        {error && <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>}

        <div className="space-y-3">
          {programas.map(prog => {
            const cp        = cpsCliente.find(c => c.programaId === prog.id);
            const canjeado  = canjesAplicados.find(c => c.programaId === prog.id);
            const puedeConj = cp && !canjeado && (
              (prog.tipo === "PUNTOS" || prog.tipo === "COMBINADO") &&
              (cp.puntosAcumulados ?? 0) >= (prog.puntosParaCanjear ?? 100)
            ) || (
              (prog.tipo === "SELLOS" || prog.tipo === "COMBINADO") &&
              (cp?.sellosActuales ?? 0) >= (prog.sellosParaPremio ?? 10)
            );

            return (
              <div key={prog.id} className="rounded-xl p-4"
                style={{ background: "var(--surface-raised)", border: `1px solid ${canjeado ? color : "var(--border)"}` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {prog.nombre}
                    </p>
                    {cp ? (
                      <div className="mt-1 space-y-0.5">
                        {(prog.tipo === "PUNTOS" || prog.tipo === "COMBINADO") && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {cp.puntosAcumulados ?? 0} puntos acumulados
                          </p>
                        )}
                        {(prog.tipo === "SELLOS" || prog.tipo === "COMBINADO") && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {cp.sellosActuales ?? 0} / {prog.sellosParaPremio ?? 10} sellos
                          </p>
                        )}
                        {(prog.tipo === "NIVELES" || prog.tipo === "COMBINADO") && (
                          <p className="text-xs font-medium" style={{ color }}>
                            Nivel {cp.nivel ?? "BRONCE"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Primera visita — acumulas hoy
                      </p>
                    )}
                  </div>
                  {canjeado ? (
                    <span className="badge" style={{ background: `${color}20`, color }}>
                      ✓ -${canjeado.valor}
                    </span>
                  ) : puedeConj ? (
                    <button onClick={() => handleCanjear(cp!)}
                      disabled={canjeando === prog.id}
                      className="btn btn-sm"
                      style={{ background: color, color: "#fff", border: "none" }}>
                      {canjeando === prog.id ? "..." : `Canjear $${prog.valorCanje ?? "5"}`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => tieneFactura ? setPaso("factura") : enviarSolicitud(cliente?.id ?? null, false)}
          disabled={loading}
          className="btn btn-primary w-full"
          style={color !== "#E85D04" ? { background: color } : {}}>
          {loading ? "..." : tieneFactura ? "Continuar →" : "Pedir la cuenta"}
        </button>
      </div>
    );
  }

  // ── Paso: factura ─────────────────────────────────────
  if (paso === "factura") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            ¿Quieres factura?
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Tu cédula: <span className="font-mono">{cedula}</span>
          </p>
        </div>

        {error && <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>}

        {/* Toggle factura */}
        <label className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
          style={{
            background: quiereFactura ? `${color}15` : "var(--surface-raised)",
            border:     quiereFactura ? `1.5px solid ${color}` : "1.5px solid var(--border)",
          }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Sí, quiero mi factura
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Se enviará autorizada por el SRI
            </p>
          </div>
          <input type="checkbox" checked={quiereFactura}
            onChange={e => setQuiereFactura(e.target.checked)}
            style={{ accentColor: color, width: 20, height: 20 }} />
        </label>

        {quiereFactura && (
          <div className="space-y-3">
            {/* Nombre — si no tiene nombre aún */}
            {!nombre && (
              <div className="field">
                <label className="label">Tu nombre o razón social *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())}
                  placeholder="JUAN PÉREZ" className="input" />
              </div>
            )}
            {/* Email opcional */}
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <input type="checkbox"
                checked={!!email}
                onChange={e => { if (!e.target.checked) setEmail(""); }}
                style={{ accentColor: color }} />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                Enviar factura a mi correo
              </span>
            </label>
            {email !== "" && (
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                type="email" className="input" />
            )}
          </div>
        )}

        <button
          onClick={() => enviarSolicitud(cliente?.id ?? null, quiereFactura)}
          disabled={loading || (quiereFactura && !nombre)}
          className="btn btn-primary w-full"
          style={color !== "#E85D04" ? { background: color } : {}}>
          {loading ? "Enviando..." : "Pedir la cuenta"}
        </button>

        <button onClick={() => enviarSolicitud(cliente?.id ?? null, false)}
          className="btn btn-ghost w-full text-sm"
          style={{ color: "var(--text-muted)" }}>
          Sin factura
        </button>
      </div>
    );
  }

  // ── Confirmación directa (sin fidelidad ni factura) ───
  return (
    <div className="space-y-3">
      <button
        onClick={() => enviarSolicitud(null, false)}
        disabled={loading}
        className="btn w-full"
        style={{ background: color, color: "#fff", border: "none" }}>
        {loading ? "Solicitando..." : "💳 Pedir la cuenta"}
      </button>
    </div>
  );
}