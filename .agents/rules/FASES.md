# Arquitectura Funcional y Reglas por Bloques (`inv-tienda`)

Este documento define la estructura arquitectónica del sistema `inv-tienda`, organizado en **3 Grandes Bloques Funcionales** gobernados por una **Capa Base Transversal de Autenticación y RBAC**.

---

## 🏛️ Estructura de Reglas Maestras

```
.agents/rules/
├── 00_base_auth_rbac.md     # 🔐 Base, Auth, Usuarios, Roles, Personas y Seguridad
├── 01_catalogo_b2b.md       # 🏷️ BLOQUE 1: Catálogo, Cajas, Órdenes B2B, Contenedores e Imágenes
├── 02_inventario.md         # 📦 BLOQUE 2: Inventario, Notas de Movimiento, Stock y Bodegas
└── 03_ecommerce_tienda.md   # 🛍️ BLOQUE 3: Ecommerce, Precios, SEO, Tienda Online y Checkout
```

---

## 🔐 Capa Transversal: Base, Auth & RBAC
- **Documento:** [00_base_auth_rbac.md](file:///c:/Users/uriel/Downloads/enero%2026/archivo2/.agents/rules/00_base_auth_rbac.md)
- **Alcance:**
  - Supabase Auth vinculado a `inv-tienda.usuarios`, `inv-tienda.roles` y `inv-tienda.personas`.
  - Matriz de permisos (`usuario_permisos`) y asignación de bodegas autorizadas (`usuario_bodegas`).
  - Shell Admin persistente (`app/(admin)/layout.tsx`) y selector de bodega activa (físicas y virtuales).
  - Timezone estricto `America/Mexico_City` para renderizado y UTC en base de datos.

---

## 🏷️ Bloque 1: Catálogo de Productos y Cadena de Suministro
- **Documento:** [01_catalogo_b2b.md](file:///c:/Users/uriel/Downloads/enero%2026/archivo2/.agents/rules/01_catalogo_b2b.md)
- **Alcance:**
  - Productos de ropa, variantes (`variantes_producto`) y atributos técnicos (marcas, géneros, telas, acabados).
  - Estructura de cajas de empaque y matriz interactiva talla × color (`cajas`, `caja_detalles`).
  - Órdenes comerciales B2B, contenedores de importación marítima y packing lists asistidos por OCR/n8n.
  - Gestión y optimización de imágenes en Supabase Storage (`product_images`).

---

## 📦 Bloque 2: Inventario, Movimientos y Bodegas
- **Documento:** [02_inventario.md](file:///c:/Users/uriel/Downloads/enero%2026/archivo2/.agents/rules/02_inventario.md)
- **Alcance:**
  - **Regla inquebrantable:** El stock no se edita directamente; todo cambio se procesa mediante `notas_inventario` al pasar a estado `CONF` (disparando `fn_procesar_nota_inventario`).
  - Unidad de stock trackeada a nivel `inventario_stock.producto_id`.
  - Operación en bodegas físicas y bodegas virtuales (`bodegas.es_virtual`).
  - Matriz de existencias, cálculo de pronósticos y despachos.

---

## 🛍️ Bloque 3: Ecommerce y Tienda Pública
- **Documento:** [03_ecommerce_tienda.md](file:///c:/Users/uriel/Downloads/enero%2026/archivo2/.agents/rules/03_ecommerce_tienda.md)
- **Alcance:**
  - Separación de costo promedio vs. precios de venta al público en `productos_web` (`precio_publico`, `precio_oferta`).
  - Slugs amigables para URLs `/tienda/[slug]`.
  - Optimización SEO completa, OpenGraph con imagen principal real y datos estructurados Schema.org.
  - Carrito de compras, órdenes de venta y checkout.

---

> **Nota histórica:** Los documentos originales de las fases iniciales de desarrollo se encuentran respaldados en `docs/architecture/backups/`.