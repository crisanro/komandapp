CREATE TYPE "public"."confirmacion_pedido" AS ENUM('AUTOMATICA', 'REQUIERE_MESERO');--> statement-breakpoint
CREATE TYPE "public"."descuento_condicion" AS ENUM('MANUAL', 'MONTO_MINIMO', 'CANTIDAD_ITEMS');--> statement-breakpoint
CREATE TYPE "public"."descuento_tipo" AS ENUM('PORCENTAJE', 'MONTO_FIJO', 'CORTESIA_ITEM');--> statement-breakpoint
CREATE TYPE "public"."factura_estado" AS ENUM('PENDIENTE', 'AUTORIZADA', 'DEVUELTA', 'ANULADA', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."fidelidad_tipo" AS ENUM('PUNTOS', 'SELLOS', 'NIVELES', 'COMBINADO');--> statement-breakpoint
CREATE TYPE "public"."identificacion_tipo" AS ENUM('RUC', 'CEDULA', 'PASAPORTE', 'CONSUMIDOR_FINAL');--> statement-breakpoint
CREATE TYPE "public"."impresora_tipo" AS ENUM('COCINA', 'CAJA', 'BARRA');--> statement-breakpoint
CREATE TYPE "public"."item_estado" AS ENUM('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."mesa_estado" AS ENUM('LIBRE', 'OCUPADA', 'INACTIVA');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR', 'PUNTOS');--> statement-breakpoint
CREATE TYPE "public"."nivel_fidelidad" AS ENUM('BRONCE', 'PLATA', 'ORO', 'VIP');--> statement-breakpoint
CREATE TYPE "public"."pedido_estado" AS ENUM('BORRADOR', 'ENVIADO', 'EN_PROCESO', 'LISTO', 'ENTREGADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('BASICO', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."promocion_tipo" AS ENUM('CLIENTE', 'EQUIPO', 'AMBOS');--> statement-breakpoint
CREATE TYPE "public"."propina_modo" AS ENUM('AUTOMATICA', 'SUGERIDA', 'INCLUIDA', 'DESACTIVADA');--> statement-breakpoint
CREATE TYPE "public"."ruc_tipo" AS ENUM('PRINCIPAL', 'ARTESANAL');--> statement-breakpoint
CREATE TYPE "public"."sesion_estado" AS ENUM('ACTIVA', 'CERRADA');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0,
	"activa" boolean DEFAULT true NOT NULL,
	"estacion_id" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente_programa" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"programa_id" text NOT NULL,
	"puntos_acumulados" integer DEFAULT 0 NOT NULL,
	"puntos_canjeados" integer DEFAULT 0 NOT NULL,
	"sellos_actuales" integer DEFAULT 0 NOT NULL,
	"sellos_canjeados" integer DEFAULT 0 NOT NULL,
	"nivel" "nivel_fidelidad" DEFAULT 'BRONCE' NOT NULL,
	"total_gastado" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_visitas" integer DEFAULT 0 NOT NULL,
	"ultima_visita_en" timestamp,
	"primera_visita_en" timestamp DEFAULT now() NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"email" text,
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "descuentos_sesion" (
	"id" text PRIMARY KEY NOT NULL,
	"sesion_id" text NOT NULL,
	"regla_id" text,
	"tipo" "descuento_tipo" NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"monto_aplicado" numeric(10, 2) NOT NULL,
	"motivo" text,
	"autorizado_por_id" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"color" text DEFAULT '#6366F1',
	"activa" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facturas" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"sesion_id" text NOT NULL,
	"emitida_por_id" text,
	"ruc_tipo" "ruc_tipo" NOT NULL,
	"ruc_emisor" text NOT NULL,
	"razon_social_emisor" text NOT NULL,
	"establecimiento" text NOT NULL,
	"punto_emision" text NOT NULL,
	"secuencial" text NOT NULL,
	"numero_completo" text NOT NULL,
	"identificacion_tipo" "identificacion_tipo" NOT NULL,
	"identificacion_numero" text NOT NULL,
	"razon_social_cliente" text NOT NULL,
	"email_cliente" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"total_descuento" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_sin_impuesto" numeric(10, 2) NOT NULL,
	"total_iva" numeric(10, 2) NOT NULL,
	"propina" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"estado" "factura_estado" DEFAULT 'PENDIENTE' NOT NULL,
	"kipu_factura_id" integer,
	"clave_acceso" text,
	"ambiente" text NOT NULL,
	"error_mensaje" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impresoras" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"estacion_id" text,
	"nombre" text NOT NULL,
	"tipo" "impresora_tipo" NOT NULL,
	"ip_address" text,
	"conexion" text,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items_factura" (
	"id" text PRIMARY KEY NOT NULL,
	"factura_id" text NOT NULL,
	"menu_item_id" text,
	"nombre" text NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0' NOT NULL,
	"porcentaje_iva" numeric(5, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"total_iva" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items_pedido" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"pedido_id" text NOT NULL,
	"menu_item_id" text NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"nota" text,
	"estado" "item_estado" DEFAULT 'PENDIENTE' NOT NULL,
	"estacion_id" text,
	"marcado_por_id" text,
	"ruc_facturacion" "ruc_tipo" DEFAULT 'PRINCIPAL' NOT NULL,
	"porcentaje_iva" numeric(5, 2) DEFAULT '15' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"categoria_id" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"precio" numeric(10, 2) NOT NULL,
	"imagen_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"disponible" boolean DEFAULT true NOT NULL,
	"agotado" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0,
	"estacion_id" text,
	"ruc_facturacion" "ruc_tipo" DEFAULT 'PRINCIPAL' NOT NULL,
	"porcentaje_iva" numeric(5, 2) DEFAULT '15' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mesas" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"capacidad" integer,
	"orden" integer DEFAULT 0,
	"estado" "mesa_estado" DEFAULT 'LIBRE' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_sesion" (
	"id" text PRIMARY KEY NOT NULL,
	"sesion_id" text NOT NULL,
	"metodo" "metodo_pago" NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"referencia" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"sesion_id" text NOT NULL,
	"mesa_id" text NOT NULL,
	"tomado_por_id" text,
	"estado" "pedido_estado" DEFAULT 'BORRADOR' NOT NULL,
	"numero" integer DEFAULT 1 NOT NULL,
	"notas" text,
	"origen_qr" boolean DEFAULT false NOT NULL,
	"enviado_cocina_en" timestamp,
	"listo_en" timestamp,
	"entregado_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programas_fidelidad" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "fidelidad_tipo" NOT NULL,
	"puntos_x_dolar" integer DEFAULT 10,
	"puntos_para_canjear" integer DEFAULT 100,
	"valor_canje" numeric(10, 2) DEFAULT '5',
	"sellos_para_premio" integer DEFAULT 10,
	"descripcion_premio" text,
	"monto_plata" numeric(10, 2) DEFAULT '100',
	"monto_oro" numeric(10, 2) DEFAULT '300',
	"monto_vip" numeric(10, 2) DEFAULT '600',
	"dias_alerta_riesgo" integer DEFAULT 15,
	"dias_alerta_perdido" integer DEFAULT 30,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promociones" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"emoji" text DEFAULT '🎉',
	"tipo" "promocion_tipo" DEFAULT 'AMBOS' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"fecha_inicio" timestamp,
	"fecha_fin" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"token" text NOT NULL,
	"dispositivo" text DEFAULT 'web',
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reglas_descuento" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"condicion" "descuento_condicion" NOT NULL,
	"valor_condicion" numeric(10, 2),
	"cantidad_items" integer,
	"descuento_tipo" "descuento_tipo" NOT NULL,
	"descuento_valor" numeric(10, 2) NOT NULL,
	"requiere_autorizacion" boolean DEFAULT false NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"slug_cambiado_en" timestamp,
	"logo_url" text,
	"color" text DEFAULT '#E85D04',
	"whatsapp" text,
	"ciudad" text,
	"moneda" text DEFAULT 'USD',
	"notas_menu" text,
	"nota_cuenta" text,
	"plan" "plan" DEFAULT 'BASICO' NOT NULL,
	"confirmacion_pedidos" "confirmacion_pedido" DEFAULT 'AUTOMATICA' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"iva_porcentaje" numeric(5, 2) DEFAULT '15' NOT NULL,
	"propina_modo" "propina_modo" DEFAULT 'SUGERIDA' NOT NULL,
	"porcentaje_propina" integer DEFAULT 10,
	"propina_adicional_permitida" boolean DEFAULT true NOT NULL,
	"ruc_principal" text,
	"razon_social" text,
	"cod_establecimiento" text,
	"cod_punto_emision" text,
	"secuencial_principal" integer DEFAULT 1,
	"ambiente" text DEFAULT '2',
	"kipu_validado" boolean DEFAULT false NOT NULL,
	"ruc_artesanal" text,
	"razon_social_artesanal" text,
	"cod_establecimiento_artesanal" text,
	"cod_punto_emision_artesanal" text,
	"secuencial_artesanal" integer DEFAULT 1,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"mesa_id" text NOT NULL,
	"cliente_id" text,
	"abierta_por_id" text,
	"cerrada_por_id" text,
	"estado" "sesion_estado" DEFAULT 'ACTIVA' NOT NULL,
	"nombre_cliente" text,
	"num_personas" integer,
	"token" text NOT NULL,
	"subtotal" numeric(10, 2),
	"total_descuento" numeric(10, 2) DEFAULT '0',
	"total_propina" numeric(10, 2) DEFAULT '0',
	"total_final" numeric(10, 2),
	"abierta_en" timestamp DEFAULT now() NOT NULL,
	"cerrada_en" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_estaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"estacion_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"nombre" text NOT NULL,
	"username" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"codigo_visible" text NOT NULL,
	"puede_crear_mesas" boolean DEFAULT false NOT NULL,
	"puede_abrir_mesas" boolean DEFAULT false NOT NULL,
	"puede_ver_todas_mesas" boolean DEFAULT false NOT NULL,
	"puede_tomar_pedidos" boolean DEFAULT false NOT NULL,
	"puede_ver_pedidos" boolean DEFAULT false NOT NULL,
	"puede_cobrar" boolean DEFAULT false NOT NULL,
	"puede_cerrar_cuenta" boolean DEFAULT false NOT NULL,
	"puede_emitir_facturas" boolean DEFAULT false NOT NULL,
	"puede_aplicar_descuentos" boolean DEFAULT false NOT NULL,
	"puede_marcar_agotados" boolean DEFAULT false NOT NULL,
	"puede_editar_precios" boolean DEFAULT false NOT NULL,
	"puede_gestionar_menu" boolean DEFAULT false NOT NULL,
	"puede_cuadrar_caja" boolean DEFAULT false NOT NULL,
	"puede_ver_reportes" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_estacion_id_estaciones_id_fk" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_programa" ADD CONSTRAINT "cliente_programa_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_programa" ADD CONSTRAINT "cliente_programa_programa_id_programas_fidelidad_id_fk" FOREIGN KEY ("programa_id") REFERENCES "public"."programas_fidelidad"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "descuentos_sesion" ADD CONSTRAINT "descuentos_sesion_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "descuentos_sesion" ADD CONSTRAINT "descuentos_sesion_regla_id_reglas_descuento_id_fk" FOREIGN KEY ("regla_id") REFERENCES "public"."reglas_descuento"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "descuentos_sesion" ADD CONSTRAINT "descuentos_sesion_autorizado_por_id_users_id_fk" FOREIGN KEY ("autorizado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estaciones" ADD CONSTRAINT "estaciones_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_emitida_por_id_users_id_fk" FOREIGN KEY ("emitida_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impresoras" ADD CONSTRAINT "impresoras_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impresoras" ADD CONSTRAINT "impresoras_estacion_id_estaciones_id_fk" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_factura" ADD CONSTRAINT "items_factura_factura_id_facturas_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_factura" ADD CONSTRAINT "items_factura_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_estacion_id_estaciones_id_fk" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_marcado_por_id_users_id_fk" FOREIGN KEY ("marcado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_estacion_id_estaciones_id_fk" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_sesion" ADD CONSTRAINT "pagos_sesion_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mesa_id_mesas_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_tomado_por_id_users_id_fk" FOREIGN KEY ("tomado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programas_fidelidad" ADD CONSTRAINT "programas_fidelidad_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_descuento" ADD CONSTRAINT "reglas_descuento_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_mesa_id_mesas_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_abierta_por_id_users_id_fk" FOREIGN KEY ("abierta_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_cerrada_por_id_users_id_fk" FOREIGN KEY ("cerrada_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_estaciones" ADD CONSTRAINT "user_estaciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_estaciones" ADD CONSTRAINT "user_estaciones_estacion_id_estaciones_id_fk" FOREIGN KEY ("estacion_id") REFERENCES "public"."estaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "categorias_restaurant_idx" ON "categorias" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cliente_programa_unique_idx" ON "cliente_programa" USING btree ("cliente_id","programa_id");--> statement-breakpoint
CREATE INDEX "cliente_programa_cliente_idx" ON "cliente_programa" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "cliente_programa_programa_idx" ON "cliente_programa" USING btree ("programa_id");--> statement-breakpoint
CREATE INDEX "clientes_restaurant_idx" ON "clientes" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_telefono_restaurant_idx" ON "clientes" USING btree ("telefono","restaurant_id");--> statement-breakpoint
CREATE INDEX "descuentos_sesion_sesion_idx" ON "descuentos_sesion" USING btree ("sesion_id");--> statement-breakpoint
CREATE INDEX "estaciones_restaurant_idx" ON "estaciones" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "facturas_restaurant_idx" ON "facturas" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "facturas_sesion_idx" ON "facturas" USING btree ("sesion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_clave_acceso_idx" ON "facturas" USING btree ("clave_acceso");--> statement-breakpoint
CREATE INDEX "impresoras_restaurant_idx" ON "impresoras" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "items_factura_factura_idx" ON "items_factura" USING btree ("factura_id");--> statement-breakpoint
CREATE INDEX "items_pedido_pedido_idx" ON "items_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "items_pedido_restaurant_idx" ON "items_pedido" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "items_pedido_estacion_idx" ON "items_pedido" USING btree ("estacion_id");--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_idx" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_categoria_idx" ON "menu_items" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "mesas_restaurant_idx" ON "mesas" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mesas_nombre_restaurant_idx" ON "mesas" USING btree ("nombre","restaurant_id");--> statement-breakpoint
CREATE INDEX "pagos_sesion_sesion_idx" ON "pagos_sesion" USING btree ("sesion_id");--> statement-breakpoint
CREATE INDEX "pedidos_restaurant_idx" ON "pedidos" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "pedidos_sesion_idx" ON "pedidos" USING btree ("sesion_id");--> statement-breakpoint
CREATE INDEX "pedidos_mesa_idx" ON "pedidos" USING btree ("mesa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programas_fidelidad_restaurant_idx" ON "programas_fidelidad" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "promociones_restaurant_idx" ON "promociones" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "push_tokens_user_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_tokens_restaurant_idx" ON "push_tokens" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reglas_descuento_restaurant_idx" ON "reglas_descuento" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_idx" ON "restaurants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "restaurants_admin_idx" ON "restaurants" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "sesiones_restaurant_idx" ON "sesiones" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "sesiones_mesa_idx" ON "sesiones" USING btree ("mesa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_token_idx" ON "sesiones" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sesiones_mesa_activa_idx" ON "sesiones" USING btree ("mesa_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "user_estacion_unique_idx" ON "user_estaciones" USING btree ("user_id","estacion_id");--> statement-breakpoint
CREATE INDEX "user_estaciones_user_idx" ON "user_estaciones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_restaurant_idx" ON "users" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_restaurant_idx" ON "users" USING btree ("username","restaurant_id");