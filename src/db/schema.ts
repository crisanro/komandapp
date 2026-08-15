import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, decimal, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ═══════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════

export const mesaEstadoEnum         = pgEnum("mesa_estado",         ["LIBRE", "OCUPADA", "INACTIVA"]);
export const sesionEstadoEnum       = pgEnum("sesion_estado",       ["ACTIVA", "CERRADA"]);
export const pedidoEstadoEnum       = pgEnum("pedido_estado",       ["BORRADOR", "ENVIADO", "EN_PROCESO", "LISTO", "ENTREGADO", "CANCELADO"]);
export const itemEstadoEnum         = pgEnum("item_estado",         ["EN_COLA", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"]);
export const promocionVisibilidadEnum = pgEnum("promocion_visibilidad", [
  "CLIENTE", "EQUIPO", "AMBOS"
]);
export const promocionTipoEnum = pgEnum("promocion_tipo_detalle", [
  "PORCENTAJE",            // % descuento en toda la cuenta
  "PORCENTAJE_CATEGORIA",  // % descuento en categoría específica
  "MONTO_FIJO",            // $X de descuento
  "2X1",                   // paga 1 lleva 2
  "3X2",                   // paga 2 lleva 3
  "COMBO",                 // grupo de items a precio fijo
  "HAPPY_HOUR",            // % en rango horario
  "PRIMERA_VISITA",        // descuento cliente nuevo
  "CUMPLEANOS",            // descuento mes cumpleaños
]);

export const rucTipoEnum            = pgEnum("ruc_tipo",            ["PRINCIPAL", "ARTESANAL"]);
export const facturaEstadoEnum      = pgEnum("factura_estado",      ["PENDIENTE", "AUTORIZADA", "DEVUELTA", "ANULADA", "ERROR"]);
export const identificacionTipoEnum = pgEnum("identificacion_tipo", ["RUC", "CEDULA", "PASAPORTE", "CONSUMIDOR_FINAL"]);
export const metodoPagoEnum         = pgEnum("metodo_pago",         ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR", "PUNTOS"]);
export const descuentoTipoEnum      = pgEnum("descuento_tipo",      ["PORCENTAJE", "MONTO_FIJO", "CORTESIA_ITEM"]);
export const descuentoCondicionEnum = pgEnum("descuento_condicion", ["MANUAL", "MONTO_MINIMO", "CANTIDAD_ITEMS"]);
export const fidelidadTipoEnum      = pgEnum("fidelidad_tipo",      ["PUNTOS", "SELLOS", "NIVELES", "COMBINADO"]);
export const nivelFidelidadEnum     = pgEnum("nivel_fidelidad",     ["BRONCE", "PLATA", "ORO", "VIP"]);
export const planEnum               = pgEnum("plan",                ["BASICO", "PRO"]);
export const confirmacionPedidoEnum = pgEnum("confirmacion_pedido", ["AUTOMATICA", "REQUIERE_MESERO"]);
export const propinaModoEnum        = pgEnum("propina_modo",        ["AUTOMATICA", "SUGERIDA", "INCLUIDA", "DESACTIVADA"]);
export const impresoraTipoEnum      = pgEnum("impresora_tipo",      ["COCINA", "CAJA", "BARRA"]);

// ═══════════════════════════════════════════════════════════
// ADMINS
// ═══════════════════════════════════════════════════════════

export const admins = pgTable("admins", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  nombre:        text("nombre").notNull(),
  email:         text("email").notNull(),
  passwordHash:  text("password_hash").notNull(),
  activo:        boolean("activo").default(true).notNull(),
  creadoEn:      timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
  esSuperAdmin: boolean("es_super_admin").default(false).notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("admins_email_idx").on(t.email),
}));

// ═══════════════════════════════════════════════════════════
// RESTAURANTS
// Modelo A: un restaurante = un local = una licencia
// Datos de facturación SRI directo aquí
// ═══════════════════════════════════════════════════════════

export const restaurants = pgTable("restaurants", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  adminId:       text("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),

  // Info básica
  nombre:        text("nombre").notNull(),
  slug:          text("slug").notNull(),
  slugCambiadoEn: timestamp("slug_cambiado_en"),
  logoUrl:       text("logo_url"),
  color:         text("color").default("#E85D04"),
  whatsapp:      text("whatsapp"),
  ciudad:        text("ciudad"),
  moneda:        text("moneda").default("USD"),
  notasMenu:     text("notas_menu"),
  notaCuenta:    text("nota_cuenta"),
  facturaActiva:      boolean("factura_activa").default(false).notNull(),

  // Plan y operación
  plan:                planEnum("plan").default("BASICO").notNull(),
  confirmacionPedidos: confirmacionPedidoEnum("confirmacion_pedidos").default("AUTOMATICA").notNull(),
  activo:              boolean("activo").default(true).notNull(),

  // IVA y propina
  ivaPorcentaje:            decimal("iva_porcentaje", { precision: 5, scale: 2 }).default("15").notNull(),
  propinaModo:              propinaModoEnum("propina_modo").default("SUGERIDA").notNull(),
  porcentajePropina:        integer("porcentaje_propina").default(10),
  propinaAdicionalPermitida: boolean("propina_adicional_permitida").default(true).notNull(),

  // Facturación SRI — Plan PRO
  // Facturación SRI — Plan PRO
  codEstablecimiento:          text("cod_establecimiento"),
  codPuntoEmision:             text("cod_punto_emision"),
  kipuApiKey:                  text("kipu_api_key"),    
  // RUC artesanal — opcional
  codEstablecimientoArtesanal: text("cod_establecimiento_artesanal"),
  codPuntoEmisionArtesanal:    text("cod_punto_emision_artesanal"),
  kipuApiKeyArtesanal:         text("kipu_api_key_artesanal"), 

  stripeCustomerId:      text("stripe_customer_id"),
  stripeSubscriptionId:  text("stripe_subscription_id"),
  planStatus:            text("plan_status").default("trialing"), 
  // trialing | active | past_due | canceled | paused
  trialEndsAt:           timestamp("trial_ends_at"),
  currentPeriodEndsAt:   timestamp("current_period_ends_at"),
  trialExtendedBy:  text("trial_extended_by"),  
  trialExtendedAt:  timestamp("trial_extended_at"),
  trialNotes:       text("trial_notes"), 

  creadoEn:      timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  slugIdx:  uniqueIndex("restaurants_slug_idx").on(t.slug),
  adminIdx: index("restaurants_admin_idx").on(t.adminId),
}));

// ═══════════════════════════════════════════════════════════
// ESTACIONES
// ═══════════════════════════════════════════════════════════

export const estaciones = pgTable("estaciones", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:       text("nombre").notNull(),
  color:        text("color").default("#6366F1"),
  activa:       boolean("activa").default(true).notNull(),
  orden:        integer("orden").default(0),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("estaciones_restaurant_idx").on(t.restaurantId),
}));

// ═══════════════════════════════════════════════════════════
// IMPRESORAS — schema listo, implementación después
// ═══════════════════════════════════════════════════════════

export const impresoras = pgTable("impresoras", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  estacionId:   text("estacion_id").references(() => estaciones.id, { onDelete: "set null" }),
  nombre:       text("nombre").notNull(),
  tipo:         impresoraTipoEnum("tipo").notNull(),
  ipAddress:    text("ip_address"),
  conexion:     text("conexion"),
  activa:       boolean("activa").default(true).notNull(),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("impresoras_restaurant_idx").on(t.restaurantId),
}));

// ═══════════════════════════════════════════════════════════
// USERS — operativos
// ═══════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId:  text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:        text("nombre").notNull(),
  username:      text("username").notNull(),
  codigoHash:    text("codigo_hash").notNull(),
  codigoVisible: text("codigo_visible").notNull(),
  puedeCrearMesas:        boolean("puede_crear_mesas").default(false).notNull(),
  puedeAbrirMesas:        boolean("puede_abrir_mesas").default(false).notNull(),
  puedeVerTodasLasMesas:  boolean("puede_ver_todas_mesas").default(false).notNull(),
  puedeTomarPedidos:      boolean("puede_tomar_pedidos").default(false).notNull(),
  puedeVerPedidos:        boolean("puede_ver_pedidos").default(false).notNull(),
  puedeCobrar:            boolean("puede_cobrar").default(false).notNull(),
  puedeCerrarCuenta:      boolean("puede_cerrar_cuenta").default(false).notNull(),
  puedeEmitirFacturas:    boolean("puede_emitir_facturas").default(false).notNull(),
  puedeAplicarDescuentos: boolean("puede_aplicar_descuentos").default(false).notNull(),
  puedeMarcarAgotados:    boolean("puede_marcar_agotados").default(false).notNull(),
  puedeEditarPrecios:     boolean("puede_editar_precios").default(false).notNull(),
  puedeGestionarMenu:     boolean("puede_gestionar_menu").default(false).notNull(),
  puedeCuadrarCaja:       boolean("puede_cuadrar_caja").default(false).notNull(),
  puedeVerReportes:       boolean("puede_ver_reportes").default(false).notNull(),
  activo:           boolean("activo").default(true).notNull(),
  intentosFallidos: integer("intentos_fallidos").default(0).notNull(),
  bloqueadoHasta:   timestamp("bloqueado_hasta"),
  creadoEn:         timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn:    timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx:         index("users_restaurant_idx").on(t.restaurantId),
  usernameRestaurantIdx: uniqueIndex("users_username_restaurant_idx").on(t.username, t.restaurantId),
}));

export const userEstaciones = pgTable("user_estaciones", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  estacionId: text("estacion_id").notNull().references(() => estaciones.id, { onDelete: "cascade" }),
}, (t) => ({
  userEstacionIdx: uniqueIndex("user_estacion_unique_idx").on(t.userId, t.estacionId),
  userIdx:         index("user_estaciones_user_idx").on(t.userId),
}));

// ═══════════════════════════════════════════════════════════
// MESAS
// ═══════════════════════════════════════════════════════════

export const mesas = pgTable("mesas", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:       text("nombre").notNull(),
  descripcion:  text("descripcion"),
  capacidad:    integer("capacidad"),
  orden:        integer("orden").default(0),
  estado:       mesaEstadoEnum("estado").default("LIBRE").notNull(),
  activa:       boolean("activa").default(true).notNull(),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx:       index("mesas_restaurant_idx").on(t.restaurantId),
  nombreRestaurantIdx: uniqueIndex("mesas_nombre_restaurant_idx").on(t.nombre, t.restaurantId),
}));

// ═══════════════════════════════════════════════════════════
// MENÚ
// ═══════════════════════════════════════════════════════════

export const categorias = pgTable("categorias", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:       text("nombre").notNull(),
  orden:        integer("orden").default(0),
  activa:       boolean("activa").default(true).notNull(),
  estacionId:   text("estacion_id").references(() => estaciones.id, { onDelete: "set null" }),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("categorias_restaurant_idx").on(t.restaurantId),
}));

export const menuItems = pgTable("menu_items", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId:   text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  categoriaId:    text("categoria_id").notNull().references(() => categorias.id, { onDelete: "restrict" }),
  nombre:         text("nombre").notNull(),
  descripcion:    text("descripcion"),
  precio:         decimal("precio", { precision: 10, scale: 2 }).notNull(),
  imagenUrl:      text("imagen_url"),
  tags:           jsonb("tags").$type<string[]>().default([]),
  disponible:     boolean("disponible").default(true).notNull(),
  agotado:        boolean("agotado").default(false).notNull(),
  orden:          integer("orden").default(0),
  estacionId:     text("estacion_id").references(() => estaciones.id, { onDelete: "set null" }),
  rucFacturacion: rucTipoEnum("ruc_facturacion").default("PRINCIPAL").notNull(),
  porcentajeIva:  decimal("porcentaje_iva", { precision: 5, scale: 2 }).default("15").notNull(),
  creadoEn:       timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn:  timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("menu_items_restaurant_idx").on(t.restaurantId),
  categoriaIdx:  index("menu_items_categoria_idx").on(t.categoriaId),
}));

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════

export const clientes = pgTable("clientes", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:       text("nombre").notNull(),
  telefono:     text("telefono").notNull(),
  email:        text("email"),
  notas:        text("notas"),
  activo:       boolean("activo").default(true).notNull(),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx:         index("clientes_restaurant_idx").on(t.restaurantId),
  telefonoRestaurantIdx: uniqueIndex("clientes_telefono_restaurant_idx").on(t.telefono, t.restaurantId),
}));

// ═══════════════════════════════════════════════════════════
// PROGRAMA DE FIDELIDAD — Plan PRO
// ═══════════════════════════════════════════════════════════

export const programasFidelidad = pgTable("programas_fidelidad", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId:  text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:        text("nombre").notNull(),
  tipo:          fidelidadTipoEnum("tipo").notNull(),
  puntosXDolar:      integer("puntos_x_dolar").default(10),
  puntosParaCanjear: integer("puntos_para_canjear").default(100),
  valorCanje:        decimal("valor_canje", { precision: 10, scale: 2 }).default("5"),
  sellosParaPremio:  integer("sellos_para_premio").default(10),
  descripcionPremio: text("descripcion_premio"),
  montoPlata:        decimal("monto_plata", { precision: 10, scale: 2 }).default("100"),
  montoOro:          decimal("monto_oro",   { precision: 10, scale: 2 }).default("300"),
  montoVip:          decimal("monto_vip",   { precision: 10, scale: 2 }).default("600"),
  diasAlertaRiesgo:  integer("dias_alerta_riesgo").default(15),
  diasAlertaPerdido: integer("dias_alerta_perdido").default(30),
  activo:        boolean("activo").default(true).notNull(),
  creadoEn:      timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: uniqueIndex("programas_fidelidad_restaurant_idx").on(t.restaurantId),
}));

export const clientePrograma = pgTable("cliente_programa", {
  id:               text("id").primaryKey().$defaultFn(() => createId()),
  clienteId:        text("cliente_id").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  programaId:       text("programa_id").notNull().references(() => programasFidelidad.id, { onDelete: "cascade" }),
  puntosAcumulados: integer("puntos_acumulados").default(0).notNull(),
  puntosCanjeados:  integer("puntos_canjeados").default(0).notNull(),
  sellosActuales:   integer("sellos_actuales").default(0).notNull(),
  sellosCanjeados:  integer("sellos_canjeados").default(0).notNull(),
  nivel:            nivelFidelidadEnum("nivel").default("BRONCE").notNull(),
  totalGastado:     decimal("total_gastado", { precision: 10, scale: 2 }).default("0").notNull(),
  totalVisitas:     integer("total_visitas").default(0).notNull(),
  ultimaVisitaEn:   timestamp("ultima_visita_en"),
  primeraVisitaEn:  timestamp("primera_visita_en").defaultNow().notNull(),
  creadoEn:         timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn:    timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  clienteProgramaIdx: uniqueIndex("cliente_programa_unique_idx").on(t.clienteId, t.programaId),
  clienteIdx:         index("cliente_programa_cliente_idx").on(t.clienteId),
  programaIdx:        index("cliente_programa_programa_idx").on(t.programaId),
}));

// ═══════════════════════════════════════════════════════════
// SESIONES
// ═══════════════════════════════════════════════════════════

export const sesiones = pgTable("sesiones", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId:  text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  mesaId:        text("mesa_id").notNull().references(() => mesas.id, { onDelete: "restrict" }),
  clienteId:     text("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  abiertaPorId:  text("abierta_por_id").references(() => users.id, { onDelete: "set null" }),
  cerradaPorId:  text("cerrada_por_id").references(() => users.id, { onDelete: "set null" }),
  estado:        sesionEstadoEnum("estado").default("ACTIVA").notNull(),
  nombreCliente: text("nombre_cliente"),
  numPersonas:   integer("num_personas"),
  token:         text("token").notNull().$defaultFn(() => createId()),
  subtotal:      decimal("subtotal",        { precision: 10, scale: 2 }),
  totalDescuento: decimal("total_descuento", { precision: 10, scale: 2 }).default("0"),
  totalPropina:  decimal("total_propina",   { precision: 10, scale: 2 }).default("0"),
  totalFinal:    decimal("total_final",     { precision: 10, scale: 2 }),
  abiertaEn:     timestamp("abierta_en").defaultNow().notNull(),
  cerradaEn:     timestamp("cerrada_en"),
}, (t) => ({
  restaurantIdx: index("sesiones_restaurant_idx").on(t.restaurantId),
  mesaIdx:       index("sesiones_mesa_idx").on(t.mesaId),
  tokenIdx:      uniqueIndex("sesiones_token_idx").on(t.token),
  mesaActivaIdx: index("sesiones_mesa_activa_idx").on(t.mesaId, t.estado),
}));

// ═══════════════════════════════════════════════════════════
// PAGOS DE SESIÓN
// ═══════════════════════════════════════════════════════════

export const pagosSesion = pgTable("pagos_sesion", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  sesionId:   text("sesion_id").notNull().references(() => sesiones.id, { onDelete: "cascade" }),
  metodo:     metodoPagoEnum("metodo").notNull(),
  monto:      decimal("monto", { precision: 10, scale: 2 }).notNull(),
  referencia: text("referencia"),
  creadoEn:   timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  sesionIdx: index("pagos_sesion_sesion_idx").on(t.sesionId),
}));

// ═══════════════════════════════════════════════════════════
// DESCUENTOS
// ═══════════════════════════════════════════════════════════

export const reglasDescuento = pgTable("reglas_descuento", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  nombre:       text("nombre").notNull(),
  condicion:    descuentoCondicionEnum("condicion").notNull(),
  valorCondicion: decimal("valor_condicion", { precision: 10, scale: 2 }),
  cantidadItems:  integer("cantidad_items"),
  descuentoTipo:  descuentoTipoEnum("descuento_tipo").notNull(),
  descuentoValor: decimal("descuento_valor", { precision: 10, scale: 2 }).notNull(),
  requiereAutorizacion: boolean("requiere_autorizacion").default(false).notNull(),
  activa:       boolean("activa").default(true).notNull(),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("reglas_descuento_restaurant_idx").on(t.restaurantId),
}));

export const descuentosSesion = pgTable("descuentos_sesion", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  sesionId:       text("sesion_id").notNull().references(() => sesiones.id, { onDelete: "cascade" }),
  reglaId:        text("regla_id").references(() => reglasDescuento.id, { onDelete: "set null" }),
  tipo:           descuentoTipoEnum("tipo").notNull(),
  valor:          decimal("valor",          { precision: 10, scale: 2 }).notNull(),
  montoAplicado:  decimal("monto_aplicado", { precision: 10, scale: 2 }).notNull(),
  motivo:         text("motivo"),
  autorizadoPorId: text("autorizado_por_id").references(() => users.id, { onDelete: "set null" }),
  creadoEn:       timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  sesionIdx: index("descuentos_sesion_sesion_idx").on(t.sesionId),
}));

// ═══════════════════════════════════════════════════════════
// PEDIDOS
// ═══════════════════════════════════════════════════════════

export const pedidos = pgTable("pedidos", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  sesionId:     text("sesion_id").notNull().references(() => sesiones.id, { onDelete: "cascade" }),
  mesaId:       text("mesa_id").notNull().references(() => mesas.id, { onDelete: "restrict" }),
  tomadoPorId:  text("tomado_por_id").references(() => users.id, { onDelete: "set null" }),
  estado:       pedidoEstadoEnum("estado").default("BORRADOR").notNull(),
  numero:       integer("numero").notNull().default(1),
  notas:        text("notas"),
  origenQr:     boolean("origen_qr").default(false).notNull(),
  enviadoCocinaEn: timestamp("enviado_cocina_en"),
  listoEn:         timestamp("listo_en"),
  entregadoEn:     timestamp("entregado_en"),
  creadoEn:        timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn:   timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("pedidos_restaurant_idx").on(t.restaurantId),
  sesionIdx:     index("pedidos_sesion_idx").on(t.sesionId),
  mesaIdx:       index("pedidos_mesa_idx").on(t.mesaId),
}));

export const itemsPedido = pgTable("items_pedido", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId:   text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  pedidoId:       text("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  menuItemId:     text("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "restrict" }),
  precioUnitario: decimal("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  cantidad:       integer("cantidad").notNull().default(1),
  nota:           text("nota"),
  estado:         itemEstadoEnum("estado").default("EN_COLA").notNull(),
  estacionId:     text("estacion_id").references(() => estaciones.id, { onDelete: "set null" }),
  marcadoPorId:   text("marcado_por_id").references(() => users.id, { onDelete: "set null" }),
  rucFacturacion: rucTipoEnum("ruc_facturacion").default("PRINCIPAL").notNull(),
  porcentajeIva:  decimal("porcentaje_iva", { precision: 5, scale: 2 }).default("15").notNull(),
  creadoEn:       timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn:  timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  pedidoIdx:     index("items_pedido_pedido_idx").on(t.pedidoId),
  restaurantIdx: index("items_pedido_restaurant_idx").on(t.restaurantId),
  estacionIdx:   index("items_pedido_estacion_idx").on(t.estacionId),
}));

// ═══════════════════════════════════════════════════════════
// FACTURAS — Plan PRO
// Komand guarda el resultado que devuelve Kipu
// Kipu es quien genera el XML, firma y envía al SRI
// ═══════════════════════════════════════════════════════════

export const facturas = pgTable("facturas", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  sesionId:     text("sesion_id").notNull().references(() => sesiones.id, { onDelete: "restrict" }),
  emitidaPorId: text("emitida_por_id").references(() => users.id, { onDelete: "set null" }),

  // RUC emisor (copiado al momento de emisión para auditoría)
  rucTipo:           rucTipoEnum("ruc_tipo").notNull(),
  rucEmisor:         text("ruc_emisor").notNull(),
  razonSocialEmisor: text("razon_social_emisor").notNull(),
  establecimiento:   text("establecimiento").notNull(),
  puntoEmision:      text("punto_emision").notNull(),
  secuencial:        text("secuencial").notNull(),
  numeroCompleto:    text("numero_completo").notNull(), // "001-001-000000001"

  // Datos del cliente
  identificacionTipo:   identificacionTipoEnum("identificacion_tipo").notNull(),
  identificacionNumero: text("identificacion_numero").notNull(),
  razonSocialCliente:   text("razon_social_cliente").notNull(),
  emailCliente:         text("email_cliente"),

  // Totales
  subtotal:        decimal("subtotal",         { precision: 10, scale: 2 }).notNull(),
  totalDescuento:  decimal("total_descuento",  { precision: 10, scale: 2 }).default("0").notNull(),
  totalSinImpuesto: decimal("total_sin_impuesto", { precision: 10, scale: 2 }).notNull(),
  totalIva:        decimal("total_iva",        { precision: 10, scale: 2 }).notNull(),
  propina:         decimal("propina",          { precision: 10, scale: 2 }).default("0").notNull(),
  total:           decimal("total",            { precision: 10, scale: 2 }).notNull(),

  // Estado SRI — viene de Kipu
  estado:       facturaEstadoEnum("estado").default("PENDIENTE").notNull(),
  kipuFacturaId: integer("kipu_factura_id"),    // ID en Kipu para consultas
  claveAcceso:  text("clave_acceso"),
  ambiente:     text("ambiente").notNull(),
  errorMensaje: text("error_mensaje"),

  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx:  index("facturas_restaurant_idx").on(t.restaurantId),
  sesionIdx:      index("facturas_sesion_idx").on(t.sesionId),
  claveAccesoIdx: uniqueIndex("facturas_clave_acceso_idx").on(t.claveAcceso),
}));

export const itemsFactura = pgTable("items_factura", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  facturaId:      text("factura_id").notNull().references(() => facturas.id, { onDelete: "cascade" }),
  menuItemId:     text("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  nombre:         text("nombre").notNull(),
  cantidad:       integer("cantidad").notNull(),
  precioUnitario: decimal("precio_unitario", { precision: 10, scale: 2 }).notNull(),
  descuento:      decimal("descuento",       { precision: 10, scale: 2 }).default("0").notNull(),
  porcentajeIva:  decimal("porcentaje_iva",  { precision: 5,  scale: 2 }).notNull(),
  subtotal:       decimal("subtotal",        { precision: 10, scale: 2 }).notNull(),
  totalIva:       decimal("total_iva",       { precision: 10, scale: 2 }).notNull(),
  total:          decimal("total",           { precision: 10, scale: 2 }).notNull(),
}, (t) => ({
  facturaIdx: index("items_factura_factura_idx").on(t.facturaId),
}));

// ═══════════════════════════════════════════════════════════
// PROMOCIONES
// ═══════════════════════════════════════════════════════════

export const promociones = pgTable("promociones", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),

  // Info básica
  titulo:       text("titulo").notNull(),
  descripcion:  text("descripcion"),
  emoji:        text("emoji").default("🎉"),
  tipo:         promocionTipoEnum("tipo_detalle").notNull(),
  
  // Visibilidad
  visibilidad:  promocionVisibilidadEnum("visibilidad").default("AMBOS").notNull(),

  // Valor del descuento
  porcentaje:   decimal("porcentaje",   { precision: 5, scale: 2 }), // para PORCENTAJE, HAPPY_HOUR
  montoFijo:    decimal("monto_fijo",   { precision: 10, scale: 2 }), // para MONTO_FIJO
  precioCombo:  decimal("precio_combo", { precision: 10, scale: 2 }), // para COMBO
  montoMinimo:  decimal("monto_minimo", { precision: 10, scale: 2 }), // monto mínimo para aplicar

  // Targets
  categoriaId:  text("categoria_id").references(() => categorias.id, { onDelete: "set null" }), // para PORCENTAJE_CATEGORIA
  menuItemId:   text("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),   // para 2X1, 3X2

  // Items del combo (array de menuItemIds)
  comboItems:   jsonb("combo_items").$type<string[]>().default([]), // para COMBO

  // Tiempo
  fechaInicio:  timestamp("fecha_inicio"),
  fechaFin:     timestamp("fecha_fin"),
  horaInicio:   text("hora_inicio"), // "14:00"
  horaFin:      text("hora_fin"),    // "15:00"
  diasSemana:   jsonb("dias_semana").$type<number[]>().default([]), // [1,2,3,4,5] lun-vie, 0=dom

  activa:       boolean("activa").default(true).notNull(),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("promociones_restaurant_idx").on(t.restaurantId),
}));

export const comboItems = pgTable("combo_items", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  promocionId: text("promocion_id").notNull().references(() => promociones.id, { onDelete: "cascade" }),
  menuItemId:  text("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  cantidad:    integer("cantidad").default(1).notNull(),
}, (t) => ({
  promocionIdx: index("combo_items_promocion_idx").on(t.promocionId),
}));

// ═══════════════════════════════════════════════════════════
// PUSH TOKENS
// ═══════════════════════════════════════════════════════════

export const pushTokens = pgTable("push_tokens", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  token:        text("token").notNull(),
  dispositivo:  text("dispositivo").default("web"),
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  userIdx:       index("push_tokens_user_idx").on(t.userId),
  restaurantIdx: index("push_tokens_restaurant_idx").on(t.restaurantId),
  tokenIdx:      uniqueIndex("push_tokens_token_idx").on(t.token),
}));


export const reseñas = pgTable("resenas", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  sesionId:     text("sesion_id").notNull().references(() => sesiones.id, { onDelete: "cascade" }),
  calificacion: integer("calificacion").notNull(), // 1-5
  comentario:   text("comentario"),
  nombreCliente: text("nombre_cliente"), // opcional
  creadoEn:     timestamp("creado_en").defaultNow().notNull(),
}, (t) => ({
  restaurantIdx: index("resenas_restaurant_idx").on(t.restaurantId),
  sesionIdx:     uniqueIndex("resenas_sesion_idx").on(t.sesionId), // una reseña por sesión
}));



// ═══════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════

export const adminsRelations = relations(admins, ({ many }) => ({
  restaurants: many(restaurants),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  admin:              one(admins, { fields: [restaurants.adminId], references: [admins.id] }),
  users:              many(users),
  mesas:              many(mesas),
  estaciones:         many(estaciones),
  categorias:         many(categorias),
  menuItems:          many(menuItems),
  sesiones:           many(sesiones),
  pedidos:            many(pedidos),
  promociones:        many(promociones),
  facturas:           many(facturas),
  clientes:           many(clientes),
  programasFidelidad: many(programasFidelidad),
  reglasDescuento:    many(reglasDescuento),
  impresoras:         many(impresoras),
}));

export const estacionesRelations = relations(estaciones, ({ one, many }) => ({
  restaurant:     one(restaurants, { fields: [estaciones.restaurantId], references: [restaurants.id] }),
  userEstaciones: many(userEstaciones),
  categorias:     many(categorias),
  menuItems:      many(menuItems),
  itemsPedido:    many(itemsPedido),
  impresoras:     many(impresoras),
}));

export const impresorasRelations = relations(impresoras, ({ one }) => ({
  restaurant: one(restaurants, { fields: [impresoras.restaurantId], references: [restaurants.id] }),
  estacion:   one(estaciones,  { fields: [impresoras.estacionId],   references: [estaciones.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  restaurant:     one(restaurants, { fields: [users.restaurantId], references: [restaurants.id] }),
  userEstaciones: many(userEstaciones),
  pushTokens:     many(pushTokens),
}));

export const userEstacionesRelations = relations(userEstaciones, ({ one }) => ({
  user:     one(users,      { fields: [userEstaciones.userId],     references: [users.id] }),
  estacion: one(estaciones, { fields: [userEstaciones.estacionId], references: [estaciones.id] }),
}));

export const mesasRelations = relations(mesas, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [mesas.restaurantId], references: [restaurants.id] }),
  sesiones:   many(sesiones),
}));

export const categoriasRelations = relations(categorias, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [categorias.restaurantId], references: [restaurants.id] }),
  estacion:   one(estaciones,  { fields: [categorias.estacionId],   references: [estaciones.id] }),
  items:      many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant:   one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
  categoria:    one(categorias,  { fields: [menuItems.categoriaId],  references: [categorias.id] }),
  estacion:     one(estaciones,  { fields: [menuItems.estacionId],   references: [estaciones.id] }),
  itemsPedido:  many(itemsPedido),
  itemsFactura: many(itemsFactura),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  restaurant:      one(restaurants, { fields: [clientes.restaurantId], references: [restaurants.id] }),
  sesiones:        many(sesiones),
  clientePrograma: many(clientePrograma),
}));

export const programasFidelidadRelations = relations(programasFidelidad, ({ one, many }) => ({
  restaurant:      one(restaurants, { fields: [programasFidelidad.restaurantId], references: [restaurants.id] }),
  clientePrograma: many(clientePrograma),
}));

export const clienteProgramaRelations = relations(clientePrograma, ({ one }) => ({
  cliente:  one(clientes,           { fields: [clientePrograma.clienteId],  references: [clientes.id] }),
  programa: one(programasFidelidad, { fields: [clientePrograma.programaId], references: [programasFidelidad.id] }),
}));

export const sesionesRelations = relations(sesiones, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [sesiones.restaurantId], references: [restaurants.id] }),
  mesa:       one(mesas,       { fields: [sesiones.mesaId],       references: [mesas.id] }),
  cliente:    one(clientes,    { fields: [sesiones.clienteId],    references: [clientes.id] }),
  abiertaPor: one(users, { fields: [sesiones.abiertaPorId], references: [users.id], relationName: "abiertaPor" }),
  cerradaPor: one(users, { fields: [sesiones.cerradaPorId], references: [users.id], relationName: "cerradaPor" }),
  pedidos:    many(pedidos),
  facturas:   many(facturas),
  pagos:      many(pagosSesion),
  descuentos: many(descuentosSesion),
}));

export const pagosSesionRelations = relations(pagosSesion, ({ one }) => ({
  sesion: one(sesiones, { fields: [pagosSesion.sesionId], references: [sesiones.id] }),
}));

export const reglasDescuentoRelations = relations(reglasDescuento, ({ one, many }) => ({
  restaurant:       one(restaurants, { fields: [reglasDescuento.restaurantId], references: [restaurants.id] }),
  descuentosSesion: many(descuentosSesion),
}));

export const descuentosSesionRelations = relations(descuentosSesion, ({ one }) => ({
  sesion:        one(sesiones,        { fields: [descuentosSesion.sesionId],        references: [sesiones.id] }),
  regla:         one(reglasDescuento, { fields: [descuentosSesion.reglaId],         references: [reglasDescuento.id] }),
  autorizadoPor: one(users,           { fields: [descuentosSesion.autorizadoPorId], references: [users.id] }),
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [pedidos.restaurantId], references: [restaurants.id] }),
  sesion:     one(sesiones,    { fields: [pedidos.sesionId],     references: [sesiones.id] }),
  mesa:       one(mesas,       { fields: [pedidos.mesaId],       references: [mesas.id] }),
  tomadoPor:  one(users,       { fields: [pedidos.tomadoPorId],  references: [users.id] }),
  items:      many(itemsPedido),
}));

export const itemsPedidoRelations = relations(itemsPedido, ({ one }) => ({
  pedido:     one(pedidos,    { fields: [itemsPedido.pedidoId],     references: [pedidos.id] }),
  menuItem:   one(menuItems,  { fields: [itemsPedido.menuItemId],   references: [menuItems.id] }),
  estacion:   one(estaciones, { fields: [itemsPedido.estacionId],   references: [estaciones.id] }),
  marcadoPor: one(users,      { fields: [itemsPedido.marcadoPorId], references: [users.id] }),
}));

export const facturasRelations = relations(facturas, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [facturas.restaurantId], references: [restaurants.id] }),
  sesion:     one(sesiones,    { fields: [facturas.sesionId],     references: [sesiones.id] }),
  emitidaPor: one(users,       { fields: [facturas.emitidaPorId], references: [users.id] }),
  items:      many(itemsFactura),
}));


export const reseñasRelations = relations(reseñas, ({ one }) => ({
  restaurant: one(restaurants, { fields: [reseñas.restaurantId], references: [restaurants.id] }),
  sesion:     one(sesiones,    { fields: [reseñas.sesionId],     references: [sesiones.id] }),
}));



export const itemsFacturaRelations = relations(itemsFactura, ({ one }) => ({
  factura:  one(facturas,  { fields: [itemsFactura.facturaId],  references: [facturas.id] }),
  menuItem: one(menuItems, { fields: [itemsFactura.menuItemId], references: [menuItems.id] }),
}));

export const comboItemsRelations = relations(comboItems, ({ one }) => ({
  promocion: one(promociones, { fields: [comboItems.promocionId], references: [promociones.id] }),
  menuItem:  one(menuItems,   { fields: [comboItems.menuItemId],  references: [menuItems.id] }),
}));

export const promocionesRelations = relations(promociones, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [promociones.restaurantId], references: [restaurants.id] }),
  categoria:  one(categorias,  { fields: [promociones.categoriaId],  references: [categorias.id] }),
  menuItem:   one(menuItems,   { fields: [promociones.menuItemId],   references: [menuItems.id] }),
  itemsCombo: many(comboItems),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user:       one(users,       { fields: [pushTokens.userId],       references: [users.id] }),
  restaurant: one(restaurants, { fields: [pushTokens.restaurantId], references: [restaurants.id] }),
}));

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type Admin             = typeof admins.$inferSelect;
export type NewAdmin          = typeof admins.$inferInsert;
export type Restaurant        = typeof restaurants.$inferSelect;
export type NewRestaurant     = typeof restaurants.$inferInsert;
export type Estacion          = typeof estaciones.$inferSelect;
export type NewEstacion       = typeof estaciones.$inferInsert;
export type Impresora         = typeof impresoras.$inferSelect;
export type NewImpresora      = typeof impresoras.$inferInsert;
export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type UserEstacion      = typeof userEstaciones.$inferSelect;
export type Mesa              = typeof mesas.$inferSelect;
export type NewMesa           = typeof mesas.$inferInsert;
export type Categoria         = typeof categorias.$inferSelect;
export type MenuItem          = typeof menuItems.$inferSelect;
export type NewMenuItem       = typeof menuItems.$inferInsert;
export type Cliente           = typeof clientes.$inferSelect;
export type NewCliente        = typeof clientes.$inferInsert;
export type ProgramaFidelidad = typeof programasFidelidad.$inferSelect;
export type ClientePrograma   = typeof clientePrograma.$inferSelect;
export type ReglaDescuento    = typeof reglasDescuento.$inferSelect;
export type NewReglaDescuento = typeof reglasDescuento.$inferInsert;
export type Sesion            = typeof sesiones.$inferSelect;
export type NewSesion         = typeof sesiones.$inferInsert;
export type PagoSesion        = typeof pagosSesion.$inferSelect;
export type NewPagoSesion     = typeof pagosSesion.$inferInsert;
export type DescuentoSesion   = typeof descuentosSesion.$inferSelect;
export type Pedido            = typeof pedidos.$inferSelect;
export type NewPedido         = typeof pedidos.$inferInsert;
export type ItemPedido        = typeof itemsPedido.$inferSelect;
export type NewItemPedido     = typeof itemsPedido.$inferInsert;
export type Factura           = typeof facturas.$inferSelect;
export type NewFactura        = typeof facturas.$inferInsert;
export type ItemFactura       = typeof itemsFactura.$inferSelect;
export type Promocion         = typeof promociones.$inferSelect;
export type PushToken         = typeof pushTokens.$inferSelect;
export type ComboItem    = typeof comboItems.$inferSelect;
export type NewComboItem = typeof comboItems.$inferInsert;
export type NewPromocion = typeof promociones.$inferInsert;
export type Resena    = typeof reseñas.$inferSelect;
export type NewResena = typeof reseñas.$inferInsert;

// ═══════════════════════════════════════════════════════════
// PLANTILLAS DE PERMISOS
// ═══════════════════════════════════════════════════════════

export const PLANTILLAS_PERMISOS = {
  MESERO: {
    label: "🧑‍🍽️ Mesero",
    descripcion: "Abre mesas, toma pedidos, informa el total",
    permisos: {
      puedeCrearMesas: false, puedeAbrirMesas: true, puedeVerTodasLasMesas: true,
      puedeTomarPedidos: true, puedeVerPedidos: true,
      puedeCobrar: true, puedeCerrarCuenta: false, puedeEmitirFacturas: false,
      puedeAplicarDescuentos: false, puedeMarcarAgotados: false,
      puedeEditarPrecios: false, puedeGestionarMenu: false,
      puedeCuadrarCaja: false, puedeVerReportes: false,
    },
  },
  CAJERO: {
    label: "💰 Cajero",
    descripcion: "Ve todas las cuentas, cobra, cierra y factura",
    permisos: {
      puedeCrearMesas: false, puedeAbrirMesas: false, puedeVerTodasLasMesas: true,
      puedeTomarPedidos: false, puedeVerPedidos: true,
      puedeCobrar: true, puedeCerrarCuenta: true, puedeEmitirFacturas: true,
      puedeAplicarDescuentos: true, puedeMarcarAgotados: false,
      puedeEditarPrecios: false, puedeGestionarMenu: false,
      puedeCuadrarCaja: true, puedeVerReportes: false,
    },
  },
  COCINERO: {
    label: "👨‍🍳 Cocinero",
    descripcion: "Solo ve y despacha su estación",
    permisos: {
      puedeCrearMesas: false, puedeAbrirMesas: false, puedeVerTodasLasMesas: false,
      puedeTomarPedidos: false, puedeVerPedidos: false,
      puedeCobrar: false, puedeCerrarCuenta: false, puedeEmitirFacturas: false,
      puedeAplicarDescuentos: false, puedeMarcarAgotados: true,
      puedeEditarPrecios: false, puedeGestionarMenu: false,
      puedeCuadrarCaja: false, puedeVerReportes: false,
    },
  },
  BARTENDER: {
    label: "🍺 Bartender",
    descripcion: "Despacha bebidas, puede cobrar",
    permisos: {
      puedeCrearMesas: false, puedeAbrirMesas: true, puedeVerTodasLasMesas: true,
      puedeTomarPedidos: false, puedeVerPedidos: true,
      puedeCobrar: true, puedeCerrarCuenta: false, puedeEmitirFacturas: false,
      puedeAplicarDescuentos: false, puedeMarcarAgotados: true,
      puedeEditarPrecios: false, puedeGestionarMenu: false,
      puedeCuadrarCaja: false, puedeVerReportes: false,
    },
  },
  SUPERVISOR: {
    label: "👔 Supervisor",
    descripcion: "Todo excepto gestionar menú",
    permisos: {
      puedeCrearMesas: true, puedeAbrirMesas: true, puedeVerTodasLasMesas: true,
      puedeTomarPedidos: true, puedeVerPedidos: true,
      puedeCobrar: true, puedeCerrarCuenta: true, puedeEmitirFacturas: true,
      puedeAplicarDescuentos: true, puedeMarcarAgotados: true,
      puedeEditarPrecios: true, puedeGestionarMenu: false,
      puedeCuadrarCaja: true, puedeVerReportes: true,
    },
  },
} as const;

export type PlantillaKey = keyof typeof PLANTILLAS_PERMISOS;

export type PermisosUser = {
  puedeCrearMesas: boolean;        puedeAbrirMesas: boolean;       puedeVerTodasLasMesas: boolean;
  puedeTomarPedidos: boolean;      puedeVerPedidos: boolean;
  puedeCobrar: boolean;            puedeCerrarCuenta: boolean;     puedeEmitirFacturas: boolean;
  puedeAplicarDescuentos: boolean; puedeMarcarAgotados: boolean;
  puedeEditarPrecios: boolean;     puedeGestionarMenu: boolean;
  puedeCuadrarCaja: boolean;       puedeVerReportes: boolean;
};

// ═══════════════════════════════════════════════════════════
// LÍMITES POR PLAN
// ═══════════════════════════════════════════════════════════

export const LIMITES_PLAN = {
  BASICO: { facturacion: false, fidelidad: false, multiRuc: false, reportesAvanzados: false },
  PRO:    { facturacion: true,  fidelidad: true,  multiRuc: true,  reportesAvanzados: true  },
} as const;

// ═══════════════════════════════════════════════════════════
// SLUGS RESERVADOS
// ═══════════════════════════════════════════════════════════

export const SLUGS_RESERVADOS = [
  "login", "registro", "admin", "api", "panel", "menu",
  "precios", "contacto", "blog", "about", "legal", "terms",
  "privacy", "soporte", "help", "app", "www", "mail", "static",
] as const;