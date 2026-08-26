# Regla 01: Catálogo de Productos, Cajas, Órdenes B2B y Contenedores

## 1. Alcance del Bloque
Gestiona el ciclo de vida de los productos de ropa, su clasificación técnica, estructura de empaque (cajas con matriz), órdenes de compra/importación B2B, contenedores marítimos y galería de imágenes.

---

## 2. Catálogo de Productos y Atributos

### Estructura de Datos:
- `productos`: Entidad principal de catálogo (`sku_base`, `descripcion`, `familia_id`, `marca_id`, `genero_id`, `tipo_prenda_id`, `edad_id`, `piezas_x_caja`, `es_conjunto`, `activo`, `estado`).
- `variantes_producto`: Desglose por color y talla (`sku`, `talla_id`, `color_id`, `costo_promedio`, `precio_mayoreo`).
- **Tablas de Soporte:** `cat_marcas`, `cat_generos`, `cat_telas`, `cat_acabados`, `cat_complementos`, `cat_tags`.

### Reglas de Negocio y URLs:
1. En el panel Admin, las rutas usan el ID numérico (`/catalogo/[id]`) para garantizar compatibilidad con cualquier formato de SKU (ej. SKUs con diagonales o caracteres especiales).
2. El listado `/catalogo` mantiene filtros desacoplados en URL (`searchParams`) con debounce de 300 ms sin desmontar el panel de filtros.
3. La vista de detalle `/catalogo/[id]` utiliza streaming progresivo con `<Suspense>` independiente por pestaña (Catálogos, Imágenes, Cajas, Tags, Complementos, Acabados, Variantes, Medidas, Conjunto).

---

## 3. Estructura de Cajas y Matriz Talla × Color

- `cajas`: Definición del contenedor/caja de empaque asignada al producto.
- `caja_detalles`: Contenido específico que conforma la caja, mapeando las piezas por combinación de talla y color.
- En la UI, se presenta la matriz interactiva para visualización rápida de la distribución de piezas por caja.

---

## 4. Órdenes B2B, Contenedores e Importaciones

- `ordenes_b2b`: Órdenes comerciales y de importación (`numero_orden`, `cliente_b2b_id`, `contenedor_id`, `estado`, `fecha_embarque`).
- `orden_b2b_detalles`: Renglones de la orden con productos, cajas solicitadas y cantidades pactadas.
- `contenedores`: Control de contenedores de importación (`codigo`, `naviera`, `cbm_total`, `peso_total`, `estado`).
- `packing_list_propuestas`: Propuestas generadas a través de flujos OCR de n8n / Gemini antes de su oficialización.
- **Promoción a Inventario:** Al recibir y validar una orden B2B o contenedor, la incorporación a inventario se realiza mediante el procedimiento almacenado correspondiente que crea las `notas_inventario`.

---

## 5. Gestión de Imágenes y Media

- `producto_imagenes`: Registro de imágenes asociadas a cada producto (`url`, `tipo_uso`, `es_principal`, `orden`).
- **Bucket Storage:** Almacenamiento en Supabase Storage (`product_images`).
- **Regla Inquebrantable de Imágenes:**
  - Se utiliza la imagen original del bucket directamente optimizada con Next.js Image / imgproxy.
  - No generar archivos sintéticos recortados `_seo.jpg`.
