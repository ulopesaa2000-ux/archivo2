# Regla 03: Ecommerce, Tienda Online Pública, Precios y SEO

## 1. Alcance del Bloque
Experiencia de compra pública para clientes finales, gestión comercial web en panel admin, administración de precios de venta, carritos de compra, órdenes de venta y optimización para motores de búsqueda (SEO).

---

## 2. Separación de Precios y Catálogo Web (`productos_web`)

1. **Desacoplamiento Financiero:**
   Los costos promedio de producción y compra residen en `variantes_producto.costo_promedio`. Los precios públicos de venta viven exclusivamente en `productos_web`:
   - `precio_publico`: Precio estándar de lista.
   - `precio_oferta`: Precio promocional aplicable en la tienda online.
   - `en_oferta`: Indicador booleano de descuento activo.
2. **Control de Visibilidad:**
   Un producto solo aparece en el ecommerce si `productos_web.publicado = true` y el producto base tiene `activo = true`.
3. **Slugs y URLs Amigables:**
   - La tienda pública resuelve productos por slug: `/tienda/[slug]`.
   - Slugs generados automáticamente por el trigger `trg_auto_slug_productos_web` y la función `fn_generar_slug_unico()`.

---

## 3. SEO y Metadatos Dinámicos

1. **OpenGraph e Imágenes Sociales:**
   - Generación de meta tags dinámicos (`og:title`, `og:description`, `og:image`, `twitter:card`).
   - Uso de la URL de la imagen principal original directa desde Supabase Storage para máxima compatibilidad con WhatsApp, Telegram, Facebook y Twitter.
2. **Estructura Semántica y Schema.org:**
   - Inyección de JSON-LD con esquema de tipo `Product` y `Offer` en cada página de producto.
   - `sitemap.xml` dinámico y `robots.txt` autogenerados basados en `productos_web` activos.

---

## 4. Carrito, Checkout y Órdenes de Venta

- **Carrito de Compras:** Manejo de estado del carrito persistente (local y/o sincronizado con sesión).
- **Órdenes de Venta:** Registro de pedidos provenientes del checkout ecommerce (`ordenes_venta`, `orden_venta_detalles`).
- **Reserva y Despacho:** Vinculación de pedidos confirmados con notas de inventario tipo `DESP` o salida para descontar existencias de la bodega designada para ecommerce.
