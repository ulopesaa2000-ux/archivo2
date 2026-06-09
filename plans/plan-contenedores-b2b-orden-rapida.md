# Plan y Resumen del Proyecto: Contenedores y Orden Rápida B2B

Este documento consolida toda la investigación, conclusiones y tareas necesarias para implementar el reporte por año de contenedores, la mejora de campos logísticos, y la creación del flujo de **Orden Rápida B2B**. Sirve como la fuente única de verdad para el contexto, asegurando la continuidad del desarrollo.

---

## 1. RESUMEN EJECUTIVO (Preservación de Contexto)

### Contexto de Negocio
El sistema `inv-tienda` requiere optimizar y digitalizar el control de las importaciones y la planeación logística de contenedores. Actualmente, la información logística (fletes, aduanas, pagos, checklists de documentos) se administra en hojas de cálculo externas (Excel).
El objetivo es integrar esta información al panel de administración en Next.js, permitiendo asociar de forma ágil órdenes de compra B2B (con sus respectivas cajas desglosadas por talla/color/piezas) a contenedores, visualizando reportes consolidados anuales por proveedor, y habilitando una **Página de Orden Rápida** basada en la carga de un Packing List Excel.

### Hallazgos de la Investigación de Código y Base de Datos
1. **Esquema de la Tabla `contenedores`**:
   - Campos existentes en la BD: `id`, `numero_contenedor`, `codigo_contenedor`, `naviera`, `numero_bl`, `buque`, `puerto_origen`, `puerto_destino`, `fecha_etd`, `fecha_eta`, `peso_total_kg`, `cbm_total`, `estado`, `created_at`, `updated_at`, `orden`.
   - **Campos faltantes en la BD**: No existen columnas para fecha real de entrega a almacén, costos de flete marítimo, costos de desaduanamiento, comentarios del contenedor, estatus de pago de flete ni el checklist de documentación.
   - **Conclusión**: Se requiere una alteración aditiva en la tabla `contenedores` de la base de datos Supabase para almacenar esta información de forma nativa.

2. **Relación Contenedores-Proveedores**:
   - La tabla `contenedores` no posee una relación directa (`proveedor_id`).
   - Los proveedores se determinan de forma indirecta a través de las órdenes de compra (`ordenes_b2b`) que están vinculadas a dicho contenedor mediante `contenedor_id`.
   - El reporte anual por año y proveedor debe calcularse de manera agregada leyendo las órdenes de compra del contenedor y sus desgloses correspondientes.

3. **Lógica de Packing List Inteligente vía n8n**:
   - Cada proveedor envía su Packing List en su propio formato, por lo que n8n actuará como procesador inteligente de archivos.
   - La plataforma web se encargará únicamente de **subir el archivo, configurar proveedor y cliente B2B, y disparar el webhook hacia n8n**.
   - n8n procesará el archivo (sin importar el formato) y responderá con un JSON con formato estructurado unificado.
   - La interfaz de usuario del panel web utilizará este JSON para mostrar una pantalla de revisión interactiva organizada por secciones (Productos, Cajas, Información General y Alertas), utilizando componentes existentes como `cajaCard` para que el usuario solo corrobore la información antes de guardarla.

---

## 2. CONCLUSIONES TÉCNICAS Y DISEÑO PROPUESTO

### A. Estructura de Base de Datos Aditiva
Se propone ejecutar el siguiente script SQL mediante el servidor MCP (puerto 8080/mcp) o directamente en Supabase para agregar las columnas faltantes:
```sql
ALTER TABLE "inv-tienda".contenedores 
ADD COLUMN IF NOT EXISTS fecha_llegada_real date,
ADD COLUMN IF NOT EXISTS costo_flete_maritimo numeric,
ADD COLUMN IF NOT EXISTS costo_desaduanamiento numeric,
ADD COLUMN IF NOT EXISTS comentarios text,
ADD COLUMN IF NOT EXISTS pago_flete_detalles text,
ADD COLUMN IF NOT EXISTS documentos_checklist jsonb DEFAULT '{}'::jsonb;
```

### B. Reporte Anual de Contenedores por Proveedor (YoY)
- Implementar en `app/(admin)/contenedores/page.tsx` un control para alternar entre la vista de "Tabla" y la vista de "Reporte Anual".
- El reporte anual cargará mediante un Server Component la agregación de contenedores por proveedor y año de arribo (ETA), mostrando una matriz con los años (ej. 2024, 2025, 2026, 2027) y el total de contenedores programados.
- Cada celda de la matriz será interactiva: al hacer clic, se mostrará un modal con el desglose de los contenedores asociados a esa celda (nombre, código, estado y botón de acceso al detalle).

### C. Flujo de Orden Rápida B2B con Webhook n8n
La página `app/(admin)/ordenes-b2b/orden-rapida/page.tsx` integrará el siguiente flujo:
1. **Configuración y Envío**:
   - Seleccionar: Proveedor, Cliente B2B, Moneda, Tipo de Cambio y selección de contenedor (existente o crear uno nuevo inline).
   - Subir el archivo del Packing List original.
   - Presionar "Procesar con n8n" para enviar el archivo y las configuraciones vía POST Webhook.
2. **Revisión en el Panel (JSON n8n)**:
   - El webhook de n8n retornará una estructura JSON estándar que mapeará productos, cajas, y desgloses.
   - El panel presentará la información dividida en 3 apartados interactivos para corroborar:
     - **Apartado Productos**: Valida si el SKU base existe en el catálogo. Si existe, muestra los detalles guardados. Si es nuevo o le falta info, despliega un formulario rápido para complementar/crear el producto antes de continuar.
     - **Apartado Cajas (`cajaCard`)**: Muestra las cajas armadas con su matriz de talla/color/piezas usando un visualizador interactivo.
     - **Apartado Orden y Alertas**: Muestra la información general (totales, cbm) junto con advertencias de detección en rojo/amarillo (ej. "Talla no identificada mapeada a Unitalla", "Cantidad inconsistente con el SKU").

---

## 3. ESPECIFICACIÓN DEL JSON DE INTERFASES (n8n Webhook)

### Entrada hacia n8n (Multipart Form Data / POST)
Se enviará:
- `file`: El archivo Excel original.
- `proveedor_id`: ID del proveedor seleccionado.
- `cliente_b2b_id`: ID del cliente B2B seleccionado.

### Salida desde n8n hacia la Web (JSON Estructurado)
El webhook inteligente de n8n responderá con la siguiente estructura de datos alineada a la base de datos de `inv-tienda`:

```json
{
  "orden_general": {
    "proveedor_id": 15,
    "cliente_b2b_id": 8,
    "moneda": "USD",
    "tipo_cambio": 17.50,
    "folio_proveedor": "PL-HONT-2026-09",
    "total_cajas": 45,
    "total_piezas": 540,
    "cbm_estimado": 4.25,
    "peso_estimado_kg": 650.0
  },
  "warnings": [
    {
      "tipo": "TALLA_DESCONOCIDA",
      "mensaje": "En la caja 'BOX-AZU-01', la talla 'XS' no existe en cat_tallas, se sugiere mapear a 'ECH'.",
      "item_ref": "BOX-AZU-01"
    },
    {
      "tipo": "SKU_NUEVO",
      "mensaje": "El SKU 'K24-NUEVO' no existe en el catálogo de productos y se requiere su creación.",
      "item_ref": "K24-NUEVO"
    }
  ],
  "productos": [
    {
      "sku_base": "K24",
      "existe": true,
      "nombre": "Playera Polo Algodón",
      "marca_id": 2,
      "genero_id": 1,
      "piezas_por_caja": 12
    },
    {
      "sku_base": "K24-NUEVO",
      "existe": false,
      "nombre": "Playera Cuello V Nueva",
      "marca_id": null,
      "genero_id": null,
      "piezas_por_caja": 12
    }
  ],
  "cajas": [
    {
      "codigo_caja": "BOX-AZU-01",
      "nombre_pack": "Pack Azul CH-M-G 12 pzs",
      "producto_sku": "K24",
      "piezas_por_caja": 12,
      "cantidad_cajas": 20,
      "cbm": 0.095,
      "peso_bruto_kg": 14.50,
      "largo_cm": 50,
      "ancho_cm": 40,
      "alto_cm": 30,
      "costo_total_caja": 180.00,
      "desglose": [
        { "talla_codigo": "CH", "color_nombre": "Azul", "cantidad": 4 },
        { "talla_codigo": "M", "color_nombre": "Azul", "cantidad": 4 },
        { "talla_codigo": "G", "color_nombre": "Azul", "cantidad": 4 }
      ]
    },
    {
      "codigo_caja": "BOX-NUEVO-02",
      "nombre_pack": "Pack Nuevo",
      "producto_sku": "K24-NUEVO",
      "piezas_por_caja": 12,
      "cantidad_cajas": 25,
      "cbm": 0.095,
      "peso_bruto_kg": 14.50,
      "largo_cm": 50,
      "ancho_cm": 40,
      "alto_cm": 30,
      "costo_total_caja": 200.00,
      "desglose": [
        { "talla_codigo": "CH", "color_nombre": "Negro", "cantidad": 6 },
        { "talla_codigo": "M", "color_nombre": "Negro", "cantidad": 6 }
      ]
    }
  ]
}
```

---

## 4. MAPA DE RUTA Y TAREAS PASO A PASO

### Fase 1: Ajuste de Base de Datos y Tipos
- [ ] **Paso 1.1**: Ejecutar script SQL de alteración en Supabase para añadir las 6 columnas logísticas a `contenedores`.
- [ ] **Paso 1.2**: Actualizar la interfaz de tipos de TypeScript en `lib/types/database.types.ts` y `lib/types/tables.ts` para reflejar estas nuevas columnas.

### Fase 2: Mejoras en la Vista y Edición del Contenedor
- [ ] **Paso 2.1**: Actualizar `modules/contenedores/actions.ts` (`actualizarContenedorAction`) para capturar y guardar las nuevas variables logísticas en Supabase.
- [ ] **Paso 2.2**: Modificar `app/(admin)/contenedores/[id]/components/ContenedorCabecera.tsx`:
  - Agregar campos de lectura y edición de: flete marítimo, desaduanamiento, comentarios generales, notas de pago de flete y fecha real de entrega al almacén.
  - Implementar un checklist visual de documentación (BL, Factura, Packing List, Telex, Muestras) que se guarde como un JSON (`documentos_checklist`) en Supabase.

### Fase 3: Reporte Anual de Contenedores por Proveedor (YoY)
- [ ] **Paso 3.1**: Crear la función de agregación `fetchContenedoresReporteAnual()` en `modules/contenedores/queries.ts` para calcular los datos acumulados por proveedor/año.
- [ ] **Paso 3.2**: Crear el componente `ContenedoresReporteAnual.tsx` en `app/(admin)/contenedores/`.
- [ ] **Paso 3.3**: Modificar `app/(admin)/contenedores/page.tsx` para permitir cambiar a la vista de reporte anual y renderizar el componente.

### Fase 4: Flujo y Conexión Webhook con n8n
- [ ] **Paso 4.1**: Crear una Server Action en `modules/ordenes-b2b/orden-rapida/actions.ts` que reciba el archivo Packing List y realice la llamada HTTP POST multipart al webhook de n8n (`http://localhost:5678/...` o la URL configurada en variables de entorno), retornando la respuesta JSON estructurada al cliente.
- [ ] **Paso 4.2**: Desarrollar la UI de previsualización inteligente en `app/(admin)/ordenes-b2b/orden-rapida/page.tsx`. Dividir en pestañas/apartados:
  - **Pestaña Alertas**: Cuadro de Warnings e inconsistencias detectadas en n8n para corroboración explícita.
  - **Pestaña Productos**: Validación de SKUs y mini-formulario para complementar o crear inline los productos con `existe: false`.
  - **Pestaña Cajas (`cajaCard`)**: Listado visual de cajas armadas, mostrando las piezas, CBM, pesos y desglose de tallas/colores en un formato amigable.
- [ ] **Paso 4.3**: Crear la Server Action `crearOrdenRapidaB2BAction` que consolide todo: crear productos nuevos, crear cajas (`cajas_producto`), desgloses (`caja_detalles`), insertar la orden B2B (`ordenes_b2b`) con sus detalles (`ordenes_b2b_detalles`) y asociar todo al contenedor.
- [ ] **Paso 4.4**: Enlazar la página en el Sidebar persistente (`components/admin/SidebarContent.tsx`) bajo B2B: "Orden Rápida".
