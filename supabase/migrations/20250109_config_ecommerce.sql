-- supabase/migrations/20250109_config_ecommerce.sql
-- Migración: Crear tabla de configuración del ecommerce
-- ============================================================

-- Crear tabla config_ecommerce
CREATE TABLE IF NOT EXISTS "inv-tienda".config_ecommerce (
  id SERIAL PRIMARY KEY,
  
  -- ═════════════════════════════════════════════════════════
  -- MODO DE OPERACIÓN
  -- ═════════════════════════════════════════════════════════
  modo_operacion VARCHAR(20) NOT NULL DEFAULT 'catalogo' 
    CHECK (modo_operacion IN ('catalogo', 'ecommerce', 'hibrido')),
  -- 'catalogo'   = Solo catálogo, sin precios, cotizaciones
  -- 'ecommerce'  = Venta directa con precios fijos
  -- 'hibrido'    = Catálogo con opción de "consultar precio"
  
  -- ═════════════════════════════════════════════════════════
  -- VISUALIZACIÓN DE PRECIOS
  -- ═════════════════════════════════════════════════════════
  mostrar_precios BOOLEAN NOT NULL DEFAULT false,
  -- false = Precios ocultos (modo catálogo B2B)
  -- true  = Precios visibles (modo ecommerce)
  
  tipo_precio_visible VARCHAR(20) DEFAULT 'publico' 
    CHECK (tipo_precio_visible IN ('publico', 'oferta', 'ambos')),
  -- 'publico' = Solo precio_publico
  -- 'oferta'  = Solo precio_oferta (si existe)
  -- 'ambos'   = Precio oferta tachado + precio público
  
  -- ═════════════════════════════════════════════════════════
  -- TIPO DE VENTA (Mayorista)
  -- ═════════════════════════════════════════════════════════
  tipo_venta VARCHAR(20) NOT NULL DEFAULT 'piezas' 
    CHECK (tipo_venta IN ('piezas', 'cajas', 'ambos')),
  -- 'piezas' = Venta por pieza individual
  -- 'cajas'  = Venta por cajas completas (usar pz_en_caja)
  -- 'ambos'  = Permitir seleccionar modo
  
  minimo_unidades INTEGER DEFAULT 1,
  -- Cantidad mínima para agregar al carrito/cotización
  
  multiplo_cajas BOOLEAN NOT NULL DEFAULT true,
  -- true = Cantidades deben ser múltiplos de pz_en_caja
  
  -- ═════════════════════════════════════════════════════════
  -- TEXTO Y LABELS (Personalización UI)
  -- ═════════════════════════════════════════════════════════
  texto_boton_agregar VARCHAR(50) DEFAULT 'Agregar a cotización',
  -- Ejemplos: "Agregar a cotización", "Agregar al carrito", "Solicitar precio"
  
  texto_boton_finalizar VARCHAR(50) DEFAULT 'Solicitar cotización',
  -- Ejemplos: "Solicitar cotización", "Finalizar compra", "Enviar solicitud"
  
  titulo_seccion_carrito VARCHAR(50) DEFAULT 'Tu Cotización',
  -- Ejemplos: "Tu Cotización", "Carrito de Compras", "Solicitud de Pedido"
  
  mensaje_precio_variable TEXT DEFAULT 
    'Los precios pueden variar según volumen y disponibilidad. Te contactaremos para confirmar.',
  -- Mensaje mostrado cuando modo_operacion = 'hibrido' o mostrar_precios = false
  
  -- ═════════════════════════════════════════════════════════
  -- FLUJO DE ORDENES
  -- ═════════════════════════════════════════════════════════
  tipo_orden_generada VARCHAR(20) DEFAULT 'cotizacion' 
    CHECK (tipo_orden_generada IN ('cotizacion', 'orden_b2b', 'orden_venta')),
  -- 'cotizacion'  = Crea solicitud de cotización (sin stock comprometido)
  -- 'orden_b2b'   = Crea orden B2B directamente (para mayoristas)
  -- 'orden_venta' = Crea orden de venta tradicional
  
  requiere_aprobacion BOOLEAN DEFAULT true,
  -- true = Las cotizaciones/órdenes entran como "pendiente" y requieren aprobación admin
  
  -- ═════════════════════════════════════════════════════════
  -- CONFIGURACIÓN DE CONTACTO
  -- ═════════════════════════════════════════════════════════
  campos_contacto_requeridos JSONB DEFAULT '["nombre", "email", "telefono"]'::jsonb,
  -- Array de campos obligatorios en checkout: nombre, email, telefono, empresa, direccion
  
  permitir_checkout_invitado BOOLEAN DEFAULT true,
  -- true = Permitir cotizar/comprar sin login
  
  -- ═════════════════════════════════════════════════════════
  -- NOTIFICACIONES
  -- ═════════════════════════════════════════════════════════
  email_notificaciones VARCHAR(255),
  -- Email donde llegan las nuevas cotizaciones/órdenes
  
  notificar_whatsapp BOOLEAN DEFAULT false,
  numero_whatsapp VARCHAR(20),
  
  -- ═════════════════════════════════════════════════════════
  -- CONFIGURACIÓN VISUAL
  -- ═════════════════════════════════════════════════════════
  mostrar_stock BOOLEAN DEFAULT false,
  -- Mostrar cantidad disponible en la UI
  
  mostrar_sku BOOLEAN DEFAULT true,
  -- Mostrar SKU en tarjetas de producto
  
  mostrar_medidas_tabla BOOLEAN DEFAULT true,
  -- Mostrar tabla de medidas en PDP
  
  mostrar_variantes_agotadas BOOLEAN DEFAULT false,
  -- true = Mostrar variantes sin stock (deshabilitadas)
  -- false = Ocultar variantes agotadas
  
  -- ═════════════════════════════════════════════════════════
  -- METADATOS
  -- ═════════════════════════════════════════════════════════
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES "inv-tienda".usuarios(id)
);

-- Insertar configuración por defecto (solo una fila permitida)
INSERT INTO "inv-tienda".config_ecommerce (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION "inv-tienda".update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_config_ecommerce_updated_at ON "inv-tienda".config_ecommerce;
CREATE TRIGGER update_config_ecommerce_updated_at
  BEFORE UPDATE ON "inv-tienda".config_ecommerce
  FOR EACH ROW EXECUTE FUNCTION "inv-tienda".update_updated_at_column();

-- RLS: Solo admins pueden modificar configuración
ALTER TABLE "inv-tienda".config_ecommerce ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_ecommerce_select_all ON "inv-tienda".config_ecommerce;
CREATE POLICY config_ecommerce_select_all
  ON "inv-tienda".config_ecommerce FOR SELECT USING (true);
  
DROP POLICY IF EXISTS config_ecommerce_update_admin ON "inv-tienda".config_ecommerce;
CREATE POLICY config_ecommerce_update_admin
  ON "inv-tienda".config_ecommerce FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM "inv-tienda".usuarios u
    JOIN "inv-tienda".roles r ON u.rol_id = r.id
    WHERE u.auth_id = auth.uid() AND r.nivel_acceso <= 2
  ));

-- ============================================================
-- ADAPTAR TABLA productos_web (campos adicionales)
-- ============================================================

-- Agregar campos para soporte de modo híbrido por producto
-- (override de la configuración global si es necesario)

ALTER TABLE "inv-tienda".productos_web 
ADD COLUMN IF NOT EXISTS modo_override VARCHAR(20) 
  CHECK (modo_override IN ('default', 'catalogo', 'ecommerce'))
  DEFAULT 'default';
-- 'default' = Usar config_ecommerce.modo_operacion
-- 'catalogo' = Forzar modo catálogo para este producto
-- 'ecommerce' = Forzar modo ecommerce para este producto

ALTER TABLE "inv-tienda".productos_web 
ADD COLUMN IF NOT EXISTS precio_negociable BOOLEAN DEFAULT false;
-- true = Precio mostrado es "referencial" y puede negociarse
-- false = Precio es fijo

ALTER TABLE "inv-tienda".productos_web 
ADD COLUMN IF NOT EXISTS disponible_mayorista BOOLEAN DEFAULT true;
-- false = Producto solo disponible para venta retail (no B2B)

ALTER TABLE "inv-tienda".productos_web 
ADD COLUMN IF NOT EXISTS unidad_venta VARCHAR(20) DEFAULT 'pieza' 
  CHECK (unidad_venta IN ('pieza', 'caja', 'ambas'));

COMMENT ON TABLE "inv-tienda".config_ecommerce IS 'Configuración global del ecommerce - solo una fila (id=1)';
COMMENT ON COLUMN "inv-tienda".config_ecommerce.modo_operacion IS 'catalogo: sin precios/cotizaciones, ecommerce: precios fijos, hibrido: precios referenciales';
