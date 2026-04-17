-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE inv-tienda.acabado_producto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer,
  tipo_acabado_id integer,
  detalle_acabado_id integer,
  patron_acabado_id integer,
  localizacion_id integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT acabado_producto_pkey PRIMARY KEY (id),
  CONSTRAINT acabado_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT acabado_producto_tipo_acabado_id_fkey FOREIGN KEY (tipo_acabado_id) REFERENCES inv-tienda.tipo_acabado(id),
  CONSTRAINT acabado_producto_detalle_acabado_id_fkey FOREIGN KEY (detalle_acabado_id) REFERENCES inv-tienda.detalle_acabado(id),
  CONSTRAINT acabado_producto_patron_acabado_id_fkey FOREIGN KEY (patron_acabado_id) REFERENCES inv-tienda.patron_acabado(id),
  CONSTRAINT acabado_producto_localizacion_id_fkey FOREIGN KEY (localizacion_id) REFERENCES inv-tienda.localizacion_acabado(id)
);
CREATE TABLE inv-tienda.auditoria_inventario (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nota_id integer,
  bodega_id integer NOT NULL,
  producto_id integer NOT NULL,
  cajas_anterior numeric,
  cajas_nuevo numeric,
  piezas_anterior integer,
  piezas_nuevo integer,
  usuario_id integer NOT NULL,
  fecha_auditoria timestamp without time zone DEFAULT now(),
  accion character varying NOT NULL,
  caja_id integer,
  CONSTRAINT auditoria_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT auditoria_inventario_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES inv-tienda.notas_inventario(id),
  CONSTRAINT auditoria_inventario_bodega_id_fkey FOREIGN KEY (bodega_id) REFERENCES inv-tienda.bodegas(id),
  CONSTRAINT auditoria_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT auditoria_inventario_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id)
);
CREATE TABLE inv-tienda.auditoria_productos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  productoid integer NOT NULL,
  accion character varying NOT NULL CHECK (accion::text = ANY (ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying]::text[])),
  campos_modificados ARRAY,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuarioid integer,
  fechaauditoria timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_productos_pkey PRIMARY KEY (id),
  CONSTRAINT auditoria_productos_usuarioid_fkey FOREIGN KEY (usuarioid) REFERENCES inv-tienda.usuarios(id),
  CONSTRAINT auditoria_productos_productoid_fkey FOREIGN KEY (productoid) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.bodegas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  direccion character varying,
  ciudad character varying,
  telefono character varying,
  activa boolean DEFAULT true,
  es_virtual boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT bodegas_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.caja_detalles (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  caja_id integer NOT NULL,
  variante_id integer,
  talla_id integer,
  color_id integer,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT caja_detalles_pkey PRIMARY KEY (id),
  CONSTRAINT caja_detalles_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id),
  CONSTRAINT caja_detalles_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES inv-tienda.variantes_producto(id),
  CONSTRAINT caja_detalles_talla_id_fkey FOREIGN KEY (talla_id) REFERENCES inv-tienda.cat_tallas(id),
  CONSTRAINT caja_detalles_color_id_fkey FOREIGN KEY (color_id) REFERENCES inv-tienda.cat_colores(id)
);
CREATE TABLE inv-tienda.cajas_producto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo_caja text NOT NULL UNIQUE,
  nombre_pack text,
  producto_id integer,
  proveedor_id integer,
  piezas_por_caja integer,
  tallas text,
  colores text,
  costo_total_caja numeric,
  peso_bruto_kg numeric,
  largo_cm numeric,
  ancho_cm numeric,
  alto_cm numeric,
  cbm numeric,
  created_at timestamp without time zone DEFAULT now(),
  activo boolean,
  CONSTRAINT cajas_producto_pkey PRIMARY KEY (id),
  CONSTRAINT cajas_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT cajas_producto_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES inv-tienda.personas(id)
);
CREATE TABLE inv-tienda.carrito_items (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  carrito_id integer NOT NULL,
  variante_id integer NOT NULL,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT carrito_items_pkey PRIMARY KEY (id),
  CONSTRAINT carrito_items_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES inv-tienda.carritos(id),
  CONSTRAINT carrito_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES inv-tienda.variantes_producto(id)
);
CREATE TABLE inv-tienda.carritos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text,
  usuario_id integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT carritos_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_colores (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo character varying NOT NULL UNIQUE,
  nombre text NOT NULL,
  hex_code character varying,
  nombre_intern character varying,
  tipo_color character varying NOT NULL,
  activo boolean DEFAULT true,
  orden_display integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_colores_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_edades (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  rango text NOT NULL,
  edad_talla text,
  orden integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_edades_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_estados_nota (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  descripcion character varying,
  color character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_estados_nota_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_generos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  codigo character varying UNIQUE,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_generos_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_marcas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  logo_url text,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  ORDEN smallint,
  CONSTRAINT cat_marcas_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_tallas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo character varying NOT NULL,
  categoria character varying,
  nombre character varying,
  es_extra boolean DEFAULT false,
  orden integer DEFAULT 0,
  talla_us character varying,
  tamano_cab_mx character varying,
  tamano_dama_mx character varying,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_tallas_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_telas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  composicion text,
  tela_material text,
  ref_gral text,
  tela_comercial text,
  vis_ind boolean DEFAULT true,
  tag_atributo text,
  tela_descripcion text,
  tela_fibra text,
  temperatura text,
  instrucciones_base_cuidado text,
  elasticidad_tela text,
  transparencia text,
  familia_tela text,
  created_at timestamp without time zone DEFAULT now(),
  orden smallint,
  CONSTRAINT cat_telas_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_tipo_prenda (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  sup_inf_compl text,
  vista_web text,
  descripcion_prenda text,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  orden smallint,
  CONSTRAINT cat_tipo_prenda_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.cat_tipos_movimiento (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  requiere_destino boolean DEFAULT false,
  afecta_inventario integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cat_tipos_movimiento_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.complemento_producto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer,
  parte_prenda_id integer,
  tipo_comp_id integer,
  material_id integer,
  corte_forma_id integer,
  descripcion_adicional text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT complemento_producto_pkey PRIMARY KEY (id),
  CONSTRAINT complemento_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT complemento_producto_parte_prenda_id_fkey FOREIGN KEY (parte_prenda_id) REFERENCES inv-tienda.parte_prenda_comp(id),
  CONSTRAINT complemento_producto_tipo_comp_id_fkey FOREIGN KEY (tipo_comp_id) REFERENCES inv-tienda.tipo_comp(id),
  CONSTRAINT complemento_producto_material_id_fkey FOREIGN KEY (material_id) REFERENCES inv-tienda.cat_telas(id),
  CONSTRAINT complemento_producto_corte_forma_id_fkey FOREIGN KEY (corte_forma_id) REFERENCES inv-tienda.corte_forma_comp(id)
);
CREATE TABLE inv-tienda.config_ecommerce (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".config_ecommerce_id_seq'::regclass),
  modo_operacion character varying NOT NULL DEFAULT 'catalogo'::character varying CHECK (modo_operacion::text = ANY (ARRAY['catalogo'::character varying, 'ecommerce'::character varying, 'hibrido'::character varying]::text[])),
  mostrar_precios boolean NOT NULL DEFAULT false,
  tipo_precio_visible character varying DEFAULT 'publico'::character varying CHECK (tipo_precio_visible::text = ANY (ARRAY['publico'::character varying, 'oferta'::character varying, 'ambos'::character varying]::text[])),
  tipo_venta character varying NOT NULL DEFAULT 'piezas'::character varying CHECK (tipo_venta::text = ANY (ARRAY['piezas'::character varying, 'cajas'::character varying, 'ambos'::character varying]::text[])),
  minimo_unidades integer DEFAULT 1,
  multiplo_cajas boolean NOT NULL DEFAULT true,
  texto_boton_agregar character varying DEFAULT 'Agregar a cotización'::character varying,
  texto_boton_finalizar character varying DEFAULT 'Solicitar cotización'::character varying,
  titulo_seccion_carrito character varying DEFAULT 'Tu Cotización'::character varying,
  mensaje_precio_variable text DEFAULT 'Los precios pueden variar según volumen y disponibilidad. Te contactaremos para confirmar.'::text,
  tipo_orden_generada character varying DEFAULT 'cotizacion'::character varying CHECK (tipo_orden_generada::text = ANY (ARRAY['cotizacion'::character varying, 'orden_b2b'::character varying, 'orden_venta'::character varying]::text[])),
  requiere_aprobacion boolean DEFAULT true,
  campos_contacto_requeridos jsonb DEFAULT '["nombre", "email", "telefono"]'::jsonb,
  permitir_checkout_invitado boolean DEFAULT true,
  email_notificaciones character varying,
  notificar_whatsapp boolean DEFAULT false,
  numero_whatsapp character varying,
  mostrar_stock boolean DEFAULT false,
  mostrar_sku boolean DEFAULT true,
  mostrar_medidas_tabla boolean DEFAULT true,
  mostrar_variantes_agotadas boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by integer,
  CONSTRAINT config_ecommerce_pkey PRIMARY KEY (id),
  CONSTRAINT config_ecommerce_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES inv-tienda.usuarios(id)
);
CREATE TABLE inv-tienda.contenedores (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_contenedor character varying,
  codigo_contenedor text NOT NULL UNIQUE,
  naviera character varying,
  numero_bl character varying,
  buque character varying,
  puerto_origen character varying,
  puerto_destino character varying,
  fecha_etd timestamp without time zone,
  fecha_eta timestamp without time zone,
  peso_total_kg numeric,
  cbm_total numeric,
  estado character varying DEFAULT 'borrador'::character varying CHECK (estado::text = ANY (ARRAY['borrador'::character varying, 'en_transito'::character varying, 'en_aduana'::character varying, 'en_bodega'::character varying, 'completo'::character varying, 'cerrado'::character varying, 'cancelado'::character varying]::text[])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  orden smallint,
  CONSTRAINT contenedores_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.corte_forma_comp (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  corte_forma_en text,
  CONSTRAINT corte_forma_comp_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.despachos (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".despachos_id_seq'::regclass),
  bodega_origen_id integer,
  bodega_destino_id integer,
  vehiculo_info character varying,
  chofer character varying,
  estado character varying DEFAULT 'Programado'::character varying,
  fecha_programada date,
  fecha_real_salida timestamp with time zone,
  fecha_recepcion timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT despachos_pkey PRIMARY KEY (id),
  CONSTRAINT despachos_bodega_origen_id_fkey FOREIGN KEY (bodega_origen_id) REFERENCES inv-tienda.bodegas(id),
  CONSTRAINT despachos_bodega_destino_id_fkey FOREIGN KEY (bodega_destino_id) REFERENCES inv-tienda.bodegas(id)
);
CREATE TABLE inv-tienda.despachos_detalles (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".despachos_detalles_id_seq'::regclass),
  despacho_id integer,
  caja_id integer,
  cantidad_cajas_solicitadas integer NOT NULL,
  cantidad_cajas_cargadas integer,
  cantidad_cajas_recibidas integer,
  created_at timestamp with time zone DEFAULT now(),
  producto_id integer,
  CONSTRAINT despachos_detalles_pkey PRIMARY KEY (id),
  CONSTRAINT despachos_detalles_despacho_id_fkey FOREIGN KEY (despacho_id) REFERENCES inv-tienda.despachos(id),
  CONSTRAINT despachos_detalles_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id),
  CONSTRAINT despachos_detalles_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.detalle_acabado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  tipo text,
  descripcion text,
  CONSTRAINT detalle_acabado_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.historial_estados_nota (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nota_id integer NOT NULL,
  estado_anterior_id integer,
  estado_nuevo_id integer NOT NULL,
  usuario_id integer NOT NULL,
  fecha_cambio timestamp without time zone DEFAULT now(),
  comentario character varying,
  CONSTRAINT historial_estados_nota_pkey PRIMARY KEY (id),
  CONSTRAINT historial_estados_nota_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES inv-tienda.notas_inventario(id),
  CONSTRAINT historial_estados_nota_estado_anterior_id_fkey FOREIGN KEY (estado_anterior_id) REFERENCES inv-tienda.cat_estados_nota(id),
  CONSTRAINT historial_estados_nota_estado_nuevo_id_fkey FOREIGN KEY (estado_nuevo_id) REFERENCES inv-tienda.cat_estados_nota(id)
);
CREATE TABLE inv-tienda.inventario_stock (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  bodega_id integer NOT NULL,
  producto_id integer NOT NULL,
  cajas numeric NOT NULL DEFAULT 0,
  piezas_sueltas integer NOT NULL DEFAULT 0,
  ubicacion_pasillo text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by integer,
  updated_by integer,
  caja_id integer,
  CONSTRAINT inventario_stock_pkey PRIMARY KEY (id),
  CONSTRAINT inventario_stock_bodega_id_fkey FOREIGN KEY (bodega_id) REFERENCES inv-tienda.bodegas(id),
  CONSTRAINT inventario_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT inventario_stock_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id)
);
CREATE TABLE inv-tienda.localizacion_acabado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT localizacion_acabado_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.medidas_producto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer NOT NULL,
  talla_id integer NOT NULL,
  punto_medida_id integer NOT NULL,
  medida_cm numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  medida_ft numeric DEFAULT round((medida_cm / 2.54), 2),
  CONSTRAINT medidas_producto_pkey PRIMARY KEY (id),
  CONSTRAINT medidas_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT medidas_producto_talla_id_fkey FOREIGN KEY (talla_id) REFERENCES inv-tienda.cat_tallas(id),
  CONSTRAINT medidas_producto_punto_medida_id_fkey FOREIGN KEY (punto_medida_id) REFERENCES inv-tienda.puntos_medida(id)
);
CREATE TABLE inv-tienda.nota_detalle_productos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nota_id integer NOT NULL,
  variante_id integer,
  cajas numeric NOT NULL,
  piezas_sueltas integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  caja_id integer,
  producto_id integer,
  CONSTRAINT nota_detalle_productos_pkey PRIMARY KEY (id),
  CONSTRAINT nota_detalle_productos_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES inv-tienda.notas_inventario(id),
  CONSTRAINT nota_detalle_productos_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES inv-tienda.variantes_producto(id),
  CONSTRAINT nota_detalle_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT nota_detalle_productos_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id)
);
CREATE TABLE inv-tienda.notas_inventario (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_nota character varying NOT NULL UNIQUE,
  tipo_movimiento_id integer NOT NULL,
  bodega_origen_id integer NOT NULL,
  bodega_destino_id integer,
  usuario_id integer NOT NULL,
  fecha_nota timestamp without time zone DEFAULT now(),
  fecha_confirmacion timestamp without time zone,
  nota_referencia character varying,
  nota_original_id integer,
  total_cajas integer DEFAULT 0,
  estado_id integer NOT NULL,
  observaciones text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notas_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT notas_inventario_tipo_movimiento_id_fkey FOREIGN KEY (tipo_movimiento_id) REFERENCES inv-tienda.cat_tipos_movimiento(id),
  CONSTRAINT notas_inventario_bodega_origen_id_fkey FOREIGN KEY (bodega_origen_id) REFERENCES inv-tienda.bodegas(id),
  CONSTRAINT notas_inventario_bodega_destino_id_fkey FOREIGN KEY (bodega_destino_id) REFERENCES inv-tienda.bodegas(id),
  CONSTRAINT notas_inventario_nota_original_id_fkey FOREIGN KEY (nota_original_id) REFERENCES inv-tienda.notas_inventario(id),
  CONSTRAINT notas_inventario_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES inv-tienda.cat_estados_nota(id)
);
CREATE TABLE inv-tienda.orden_cajas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  orden_id integer NOT NULL,
  caja_id integer NOT NULL,
  cantidad_cajas integer NOT NULL DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT orden_cajas_pkey PRIMARY KEY (id),
  CONSTRAINT orden_cajas_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES inv-tienda.ordenes_b2b(id),
  CONSTRAINT orden_cajas_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES inv-tienda.cajas_producto(id)
);
CREATE TABLE inv-tienda.orden_items (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  orden_id integer NOT NULL,
  variante_id integer NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT orden_items_pkey PRIMARY KEY (id),
  CONSTRAINT orden_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES inv-tienda.ordenes_venta(id),
  CONSTRAINT orden_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES inv-tienda.variantes_producto(id)
);
CREATE TABLE inv-tienda.ordenes_b2b (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".ordenes_b2b_id_seq'::regclass),
  cliente_b2b_id integer,
  proveedor_id integer,
  contenedor_id integer,
  estado character varying DEFAULT 'Borrador'::character varying,
  fecha_orden timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  folio_proveedor character varying,
  moneda character varying NOT NULL DEFAULT 'USD'::character varying CHECK (moneda::text = ANY (ARRAY['USD'::character varying, 'MXN'::character varying, 'CNY'::character varying]::text[])),
  tipo_cambio numeric,
  total_cajas integer DEFAULT 0,
  total_piezas integer DEFAULT 0,
  cbm_orden numeric,
  observaciones text,
  CONSTRAINT ordenes_b2b_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_b2b_cliente_b2b_id_fkey FOREIGN KEY (cliente_b2b_id) REFERENCES inv-tienda.personas(id),
  CONSTRAINT ordenes_b2b_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES inv-tienda.personas(id),
  CONSTRAINT ordenes_b2b_contenedor_id_fkey FOREIGN KEY (contenedor_id) REFERENCES inv-tienda.contenedores(id)
);
CREATE TABLE inv-tienda.ordenes_b2b_detalles (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".ordenes_b2b_detalles_id_seq'::regclass),
  orden_id integer,
  producto_id integer,
  cantidad_solicitada integer NOT NULL,
  cantidad_aprobada integer,
  precio_acordado numeric,
  estado_producto character varying DEFAULT 'Pendiente'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  precio_unitario numeric,
  precio_yuan numeric,
  importe_total numeric,
  piezas_pedidas integer DEFAULT 0,
  cajas_pedidas numeric DEFAULT 0,
  cbm_detalle numeric,
  peso_bruto_kg numeric,
  CONSTRAINT ordenes_b2b_detalles_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_b2b_detalles_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES inv-tienda.ordenes_b2b(id),
  CONSTRAINT ordenes_b2b_detalles_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.ordenes_compra (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  proveedor_id integer,
  folio_orden text UNIQUE,
  fecha_orden date DEFAULT CURRENT_DATE,
  estado character varying DEFAULT 'pendiente'::character varying,
  total numeric,
  created_at timestamp without time zone DEFAULT now(),
  persona_id integer,
  CONSTRAINT ordenes_compra_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_compra_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES inv-tienda.personas(id)
);
CREATE TABLE inv-tienda.ordenes_venta (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero_orden character varying NOT NULL UNIQUE,
  usuario_id integer,
  email_cliente text NOT NULL,
  nombre_cliente text NOT NULL,
  telefono_cliente text,
  direccion_envio jsonb,
  subtotal numeric NOT NULL,
  envio numeric DEFAULT 0,
  impuestos numeric DEFAULT 0,
  total numeric NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying,
  metodo_pago character varying,
  notas_cliente text,
  fecha_orden timestamp without time zone DEFAULT now(),
  fecha_envio timestamp without time zone,
  fecha_entrega timestamp without time zone,
  numero_rastreo character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT ordenes_venta_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.parte_prenda_comp (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  tipo character varying,
  CONSTRAINT parte_prenda_comp_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.patron_acabado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  estampado_patron text NOT NULL,
  subcategoria text,
  tipo_acabado text,
  CONSTRAINT patron_acabado_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.personas (
  id integer NOT NULL DEFAULT nextval('"inv-tienda".personas_id_seq'::regclass),
  tipo_entidad character varying NOT NULL CHECK (tipo_entidad::text = ANY (ARRAY['Proveedor'::character varying, 'Cliente B2B'::character varying, 'Cliente Retail'::character varying, 'Empleado'::character varying, 'Administrador'::character varying]::text[])),
  nombre_completo character varying NOT NULL,
  identificacion_fiscal character varying,
  email_contacto character varying,
  telefono_contacto character varying,
  direccion text,
  usuario_id integer,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personas_pkey PRIMARY KEY (id),
  CONSTRAINT personas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES inv-tienda.usuarios(id)
);
CREATE TABLE inv-tienda.producto_conjunto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_padre_id integer,
  producto_hijo_id integer,
  cantidad integer NOT NULL DEFAULT 1,
  es_requerido boolean DEFAULT true,
  orden integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT producto_conjunto_pkey PRIMARY KEY (id),
  CONSTRAINT producto_conjunto_producto_padre_id_fkey FOREIGN KEY (producto_padre_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT producto_conjunto_producto_hijo_id_fkey FOREIGN KEY (producto_hijo_id) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.producto_imagenes (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer NOT NULL,
  url text NOT NULL,
  es_principal boolean DEFAULT false,
  orden integer DEFAULT 0,
  alt_text text,
  created_at timestamp without time zone DEFAULT now(),
  uso_imagen text NOT NULL DEFAULT 'principal_ecommerce'::text CHECK (uso_imagen = ANY (ARRAY['principal_ecommerce'::text, 'galeria_secundaria'::text, 'ficha_tecnica'::text, 'marketing_banner'::text, 'etiqueta_logistica'::text, 'color_variacion'::text, 'tallas_variacion'::text])),
  origen_imagen text NOT NULL DEFAULT 'local'::text CHECK (origen_imagen = ANY (ARRAY['local'::text, 'url_externa'::text])),
  CONSTRAINT producto_imagenes_pkey PRIMARY KEY (id),
  CONSTRAINT producto_imagenes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.producto_tags (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer,
  tipo_tag_id integer,
  ref_tag_id integer,
  valor_texto character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT producto_tags_pkey PRIMARY KEY (id),
  CONSTRAINT producto_tags_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT producto_tags_tipo_tag_id_fkey FOREIGN KEY (tipo_tag_id) REFERENCES inv-tienda.tipo_tag(id),
  CONSTRAINT producto_tags_ref_tag_id_fkey FOREIGN KEY (ref_tag_id) REFERENCES inv-tienda.ref_tag(id)
);
CREATE TABLE inv-tienda.productos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  sku_base character varying NOT NULL UNIQUE,
  nombre text,
  descripcion text,
  composicion text,
  precio_ec numeric,
  proveedor_id integer,
  marca_id integer,
  genero_id integer,
  tela_forro_id integer,
  tela_ext_id integer,
  edad_id integer,
  tipo_prenda_id integer,
  pz_en_caja integer DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  familia text DEFAULT 'F000-000C'::text,
  estado text CHECK (estado = ANY (ARRAY['borrador'::character varying::text, 'pendiente'::character varying::text, 'publicado'::character varying::text, 'pausado'::character varying::text, 'descontinuado'::character varying::text])),
  destacado boolean DEFAULT false,
  es_conjunto boolean DEFAULT false,
  persona_id integer,
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES inv-tienda.cat_marcas(id),
  CONSTRAINT productos_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES inv-tienda.cat_generos(id),
  CONSTRAINT productos_tela_forro_id_fkey FOREIGN KEY (tela_forro_id) REFERENCES inv-tienda.cat_telas(id),
  CONSTRAINT productos_tela_ext_id_fkey FOREIGN KEY (tela_ext_id) REFERENCES inv-tienda.cat_telas(id),
  CONSTRAINT productos_edad_id_fkey FOREIGN KEY (edad_id) REFERENCES inv-tienda.cat_edades(id),
  CONSTRAINT productos_tipo_prenda_id_fkey FOREIGN KEY (tipo_prenda_id) REFERENCES inv-tienda.cat_tipo_prenda(id),
  CONSTRAINT productos_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES inv-tienda.personas(id)
);
CREATE TABLE inv-tienda.productos_web (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer NOT NULL,
  slug text NOT NULL UNIQUE,
  titulo_seo text,
  descripcion_seo text,
  keywords text,
  precio_publico numeric NOT NULL,
  precio_oferta numeric,
  en_oferta boolean DEFAULT false,
  destacado boolean DEFAULT false,
  nuevo boolean DEFAULT false,
  activo boolean DEFAULT true,
  orden_display integer DEFAULT 0,
  visitas integer DEFAULT 0,
  fecha_publicacion timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  modo_override character varying DEFAULT 'default'::character varying CHECK (modo_override::text = ANY (ARRAY['default'::character varying, 'catalogo'::character varying, 'ecommerce'::character varying]::text[])),
  precio_negociable boolean DEFAULT false,
  disponible_mayorista boolean DEFAULT true,
  unidad_venta character varying DEFAULT 'pieza'::character varying CHECK (unidad_venta::text = ANY (ARRAY['pieza'::character varying, 'caja'::character varying, 'ambas'::character varying]::text[])),
  CONSTRAINT productos_web_pkey PRIMARY KEY (id),
  CONSTRAINT productos_web_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id)
);
CREATE TABLE inv-tienda.puntos_medida (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  punto_medida text NOT NULL,
  size_inch text NOT NULL,
  position text,
  clasificacion text NOT NULL CHECK (clasificacion = ANY (ARRAY['SUPERIOR'::text, 'INFERIOR'::text, 'GORRO'::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT puntos_medida_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.ref_tag (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  tipo_tag_id integer NOT NULL,
  nombre character varying NOT NULL,
  codigo character varying,
  descripcion text,
  valor_booleano boolean,
  orden integer,
  sup_inf character varying,
  ingles_name character varying,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT ref_tag_pkey PRIMARY KEY (id),
  CONSTRAINT ref_tag_tipo_tag_id_fkey FOREIGN KEY (tipo_tag_id) REFERENCES inv-tienda.tipo_tag(id)
);
CREATE TABLE inv-tienda.rol_permisos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  rol_id integer NOT NULL,
  modulo character varying NOT NULL,
  puede_leer boolean DEFAULT false,
  puede_crear boolean DEFAULT false,
  puede_editar boolean DEFAULT false,
  puede_eliminar boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT rol_permisos_pkey PRIMARY KEY (id),
  CONSTRAINT rol_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES inv-tienda.roles(id)
);
CREATE TABLE inv-tienda.roles (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  descripcion character varying,
  nivel_acceso integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.tipo_acabado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT tipo_acabado_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.tipo_comp (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  complemento_en text,
  CONSTRAINT tipo_comp_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.tipo_tag (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  codigo character varying,
  descripcion character varying,
  tipo_dato character varying,
  es_multiple boolean DEFAULT false,
  orden integer,
  icono character varying,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tipo_tag_pkey PRIMARY KEY (id)
);
CREATE TABLE inv-tienda.usuario_bodegas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  usuario_id integer NOT NULL,
  bodega_id integer NOT NULL,
  puede_consultar boolean DEFAULT true,
  puede_crear_notas boolean DEFAULT false,
  puede_confirmar_notas boolean DEFAULT false,
  puede_transferir boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT usuario_bodegas_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_bodegas_bodega_id_fkey FOREIGN KEY (bodega_id) REFERENCES inv-tienda.bodegas(id)
);
CREATE TABLE inv-tienda.usuario_permisos (
  usuario_id integer NOT NULL,
  es_super_admin boolean DEFAULT false,
  puede_gestionar_compras_b2b boolean DEFAULT false,
  puede_gestionar_contenedores boolean DEFAULT false,
  puede_gestionar_ecommerce boolean DEFAULT false,
  puede_ver_inventario boolean DEFAULT false,
  puede_crear_notas_inventario boolean DEFAULT false,
  puede_aprobar_notas_inventario boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usuario_permisos_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT usuario_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES inv-tienda.usuarios(id)
);
CREATE TABLE inv-tienda.usuarios (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  auth_user_id uuid UNIQUE,
  username character varying NOT NULL UNIQUE,
  nombre_completo character varying NOT NULL,
  email character varying UNIQUE,
  telefono character varying,
  rol_id integer NOT NULL,
  tenant text NOT NULL DEFAULT 'inv-tienda'::text CHECK (tenant = 'inv-tienda'::text),
  appsheet_pin character varying,
  appsheet_activo boolean NOT NULL DEFAULT false,
  activo boolean DEFAULT true,
  ultimo_acceso timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES inv-tienda.roles(id)
);
CREATE TABLE inv-tienda.variantes_producto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  producto_id integer NOT NULL,
  talla_id integer NOT NULL,
  color_id integer NOT NULL,
  sku_completo text NOT NULL UNIQUE,
  costo_promedio numeric DEFAULT 0,
  precio_venta numeric CHECK (precio_venta > 0::numeric),
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT variantes_producto_pkey PRIMARY KEY (id),
  CONSTRAINT variantes_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES inv-tienda.productos(id),
  CONSTRAINT variantes_producto_talla_id_fkey FOREIGN KEY (talla_id) REFERENCES inv-tienda.cat_tallas(id),
  CONSTRAINT variantes_producto_color_id_fkey FOREIGN KEY (color_id) REFERENCES inv-tienda.cat_colores(id)
);
CREATE TABLE inv-tienda.z_proveedores_archivado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  contacto text,
  email text,
  telefono text,
  direccion text,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  ini_user text,
  generos text,
  orden smallint,
  precios text,
  calidades text,
  tallas text,
  CONSTRAINT z_proveedores_archivado_pkey PRIMARY KEY (id)
);