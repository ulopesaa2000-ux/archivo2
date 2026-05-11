Documentos Creados
Se creó la carpeta plans/ con 3 guías completas y se actualizó el .env.example:
1. plans/plan-reportes-n8n.md — Plan Maestro de Trabajo
Diseñé un plan completo de 10 fases con:
- Arquitectura visual del flujo completo (Next.js → API → n8n → LLM → Supabase → Callback)
- Estructura de archivos detallada
- Mapeo Excel → Schema de Supabase
- Tabla de tracking de jobs
- Cronograma sugerido por día
2. plans/guia-conexion-n8n.md — Guía Definitiva de Configuración
Explica paso a paso:
- Cómo se conectan Next.js y n8n (webhooks + shared secret)
- Dónde obtener las URLs de n8n (test vs production)
- Cómo se autentican ambos lados (X-N8N-SECRET)
- Docker Compose para n8n
- Código completo de las API routes
- Troubleshooting de problemas comunes
- Diagrama de secuencia completo
3. plans/guia-workflow-packing-list.md — Especificación Técnica del Workflow
Contiene:
- Los 7 pasos del workflow con configuración de cada nodo
- Código JavaScript para cada Function Node
- Prompt completo para OpenAI (LLM)
- JSON exportable para importar en n8n
- Instrucciones para configurar credenciales (OpenAI + Supabase)
- Manejo de errores por paso
4. .env.example — Actualizado
Agregué las 3 variables de entorno nuevas:
SUPABASE_SERVICE_ROLE_KEY=""
N8N_WEBHOOK_URL=""
N8N_WEBHOOK_SECRET=""
OPENAI_API_KEY=""
---
Próximo Paso: ¿Empezamos la implementación?
Dime si quieres que proceda con alguna de estas fases:
Fase	Descripción
Fase 1	Crear las API routes (app/api/n8n/webhook/, app/api/n8n/callback/) + lib/n8n/
Fase 2	Crear UI de migración (app/(admin)/reportes/migrar/ + UploaderExcel)
Fase 3	Deploy de n8n en Docker + configuración del workflow
Todo junto	Implementar todo en orden (Fase 1 → 2 → 3)
¿Qué preferís? 🚀
▣  Build · Kimi K2.6 · 14m 39s
antes de genrar workflosws te voy a dar contexto, cuando ya tengo mis productos terminados, yol e digo a mi porvedor que piezas requiero esas se empaquetan en una caja, hay son vairaciones de mi producto en cuanto a color y talla; tambien tiene una tabla de medidas por talla pero eso es secundario para estos gflujos; esas cajs se agrupan y se dice con producto id y cajaid el numeo de piezas en pedio, la caja se empaquta esas piezas del pedido, y despues esa orden se manda a un contenedor todas esas cajas en un contendor, ese contedor puede tener varias ordenes de provedoresdiferentes; hay segenra uan hoja para el envarque y todo eso desde china para que en una fecha llegue amexico y a aduana,para pasar a bodega virtuales (bodega externa que no manejo). asi tengo documentos pdf y excel, oden uno esta la orden compelta, los datos de enbarque y el pakinkg list de los prodcutos (armador de cajas), para asi resibir mis productos en bodegas fisicas mias. asi que todos esos docuemntso los tengo en drive, pero como te dije cada proveedor maneja su formato unico y nececito un llm para que adapte mis tabla de productos(ya creados aunque sea como platillas en base de datos), cajas_producto, dodnes del paquink list se deben armar, orden_caja, para decir hay cajs de este y este proucto en la orden; despues hay detels orden_prodcuto dodne se resuen el pedidoc omo tantas peizas de tal producto . esa orden arma un pdf para contenedor dodne se agrupa la info del contendor con n ordenes y un lsitado de lo que lleva el contenedor. prinicpalmente esa es mi desorgancizcion con mis archivos. asi que un flujo para armar cajas primircial apartir del paquink list, despues la orden detalles y depeus otra para armar contenedores , @docs\db_dumb.txt contiene la estrutura real de mi base de datos y sus asiciaciones para poder manejar esta parte de tralado b2b
 txt  docs\db_dumb.txt 
% WebFetch https://sheets.best/
Transport error (GET https://sheets.best/)
% WebFetch https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.google/
StatusCode: non 2xx status code (404 GET https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.google/)
% WebFetch https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.google/
StatusCode: non 2xx status code (404 GET https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.google/)
% WebFetch https://docs.n8n.io/integrations/
Perfecto. Contexto completamente entendido. Ya leeré el schema que tengo y armaré los documentos.
---
Entendí tu flujo comercial real
Aquí está tu cadena logística, completamente mapeada a tu schema:
PRODUCTO TERMINADO (En tu sistema)
        │
        ▼
   ┌─────────────────────────────────────┐
   │  productos (sku_base, nombre, ...)  │
   │  variantes_producto (talla×color)   │
   └────────┬────────────────────────────┘
             │
             ├────► PEDIDO AL PROVEEDOR (Cajas)
             │          │
             │    ┌────────────────────────── ─────┐
             │    │  cajas_producto                │
             │    │  (codigo_caja, piezas_por_caja,│
             │    │   dimensiones, cbm, peso)      │
             │    └────────┬───────────────────────┘
             │             │
             │    ┌────────┴─────────────────────  ──┐
             │    │  caja_detalles (variantes        │
             │    │  dentro de cada caja: talla_id,  │
             │    │  color_id, cantidad)             │
             │    └──────────────────────────────────┘
             │
             ▼
   ORDEN B2B (Pedido al proveedor)
   ┌────────────────────────────────────────┐
   │  ordenes_b2b (cliente_b2b_id,          │
   │  proveedor_id, fecha_orden, estado)    │
   └────────┬───────────────────────────────┘
             │
             ├────► ORDEN B2B DETALLES (Por producto)
             │     ┌───────────────────────────   ──┐
             │     │  ordenes_b2b_detalles          │
             │     │  (orden_id, producto_id,       │
             │     │   cantidad_solicitada,         │
             │     │   piezas_pedidas, cajas_pedidas│
             │     │   precio_acordado, cbm, peso)  │
             │     └────────────────────────────── ─┘
             │
             │     Qué CAJAS van en la orden:
             │     ┌─────────────────────────--────┐
             │     │  orden_cajas (orden_id,       │
             │     │   caja_id, cantidad_cajas)    │
             │     └───────────────────────────────┘
             │
             │
             ▼
   CONTENEDOR (Agrupa múltiples órdenes)
   ┌────────────────────────────────────────┐
   │  contenedores (numero_contenedor,      │
   │  codigo_contenedor, naviera,           │
   │  fecha_etd, fecha_eta, puerto_origen,  │
   │  puerto_destino, estado)               │
   │                                        │
   │  Relación: ordenes_b2b.contenedor_id   │
   └────────────────────────────────────────┘
             │
             │
             ▼
   BIENVENIDO A MÉXICO 🇲🇽
   ┌────────────────────────────────────────┐
   │  Bodega virtual (externa)              │
   │  Viajes (despachos)                    │
   │  Notas de inventario (traspasos)       │
   └────────────────────────────────────────┘
---
Tablas críticas del schema db_dumb.txt que intervienen
Entidad         | Tablas
Contenedor      | contenedores, ordenes_b2b (vía contenedor_id)
Orden           | ordenes_b2b, ordenes_b2b_detalles, orden_cajas
Cajas           | cajas_producto, caja_detalles
Productos       | productos, variantes_producto
Catálogos       | cat_colores, cat_tallas, cat_marcas, cat_generos, personas
---
Los 3 Flujos de n8n que te ofrezco
🔄 Flujo	Entrada (Excel/PDF)	Salida (Tablas)
1️⃣ Armar Cajas	Packing List del proveedor con SKUs, colores, tallas, piezas por caja	cajas_producto + caja_detalles (y crea variantes_producto si no existen)
2️⃣ Armar Orden B2B	Documento de orden/proforma con productos, cantidades, precios, cajas	ordenes_b2b + ordenes_b2b_detalles + orden_cajas
3️⃣ Armar Contenedor	HOJA DE EMBARQUE con ordenes agrupadas, datos de naviera, BL, ETA/ETD	contenedores + Relación ordenes_b2b.contenedor_id
---
## ¿Cuál es la señal?
Cada proveedor envía **DOCUMENTOS DIFERENTES**. ¿Necesitamos que el LLM detecte automáticamente de qué tipo es el documento? Por ejemplo, un flag como:
- Si detecta columnas como `CTNS`, `QTY/CTN`, `CARTON NO.` → Flaipo **Packing List** (Flujo 1)
- Si detecta `PRECIO`, `TOTAL AMOUNT`, `FOB` → Flsho **Proforma** (Flujo 2)
- Si detecta `BL NO.`, `VESSEL`, `ESTIMATED ETA` → Flaipo **Hoja de Embarque** (Flujo 3)
---


claridad total. Aquí está el plan de implementación completo basado en toda la información que me diste.
---
Decisiones Tomadas
#	Decisión	Justificación
1	Selector de tipo de documento en la UI	El usuario selecciona "Packing List", "Invoice" o "Hoja de Embarque". n8n recibe el tipo y el archivo.
2	Rutas separadas por tipo	Packing List e Invoice → Excel → n8n Webhook. Hoja de Embarque → PDF → OCR → n8n Webhook.
3	OCR para PDF	Convert to File o PDF.co node → OCR → texto crudo → LLM (OpenAI).
4	3 Webhooks separados	packing-list, invoice, hoja-embarque. Más limpio, menos complejo.
5	API callbacks	Cada flujo responde a Next.js con el estado de la operación.
---
Esquema de Datos Destino (Supabase)
Basado en tu schema db_dumb.txt:
Tablas Involucradas
Tabla	Descripción	Relaciones
productos	SKU base, nombre, marca, tipo	sku_base único
variantes_producto	Tall x color por producto	FK a productos, cat_tallas, cat_colores
cajas_producto	Cada caja/pack de producto	FK a productos, personas(proveedor)
caja_detalles	Detalle de variantes dentro de caja	FK a cajas_producto, variantes_producto
ordenes_b2b	Orden de compra al proveedor	FK a personas(proveedor), contenedores
ordenes_b2b_detalles	Producto por orden con cantidad/precio	FK a ordenes_b2b, productos
orden_cajas	Cajas asignadas a una orden	FK a ordenes_b2b, cajas_producto
contenedores	Info del contenedor (naviera, BL, fechas)	FK a ordenes_b2b(indirecto)
personas	Proveedores, Clientes B2B	tipo_entidad: 'Proveedor'
---
Arquitectura de los 3 Flujos
Flujo 1: Packing List (Excel)
[App Next.js] ──► [Webhook n8n: packing-list] ──► [Spreadsheet File]
                                                          │
                                                          ▼
                                     [Code Node] ──► Pre-normalizar columnas
                                                          │
                                                          ▼
                                             [OpenAI LLM: mappeo de cajas]
                                                          │
                                                          ▼
                                        [Supabase Node: INSERT cajas_producto]
                                                          │
                                                          ▼
                                             [Supabase Node: INSERT caja_detalles]
                                                          │
                                                          ▼
                              [HTTP Request: POST /api/n8n/callback ⬅ Está desactivado,
                                almohadilla del personaje que faltaba, siguiente línea:
                              [HTTP Request: POST callback Next.js con resultado]
Flujo 2: Invoice (Excel)
[App Next.js] ──► [Webhook n8n: invoice] ──► [Spreadsheet File]
                                                      │
                                                      ▼
                                    [Code Node] ──► Pre-normalizar columnas
                                                      │
                                                      ▼
                                         [OpenAI LLM: mapeo de orden]
                                                      │
                                                      ▼
                                            [Supabase Node: INSERT ordenes_b2b]
                                                      │
                                                      ▼
                                    [Supabase Node: INSERT ordenes_b2b_detalles]
                                                      │
                                                      ▼
                              [HTTP Request: POST callback Next.js con resultado]
Flujo 3: Hoja de Embarque (PDF)
[App Next.js] ──► [Webhook n8n: hoja-embarque] ──► [Spreadsheet File] (nó, es PDF)
                                                        │
                           ┌──────────────────────────┘
                           ▼
                    [PDF.co / Code Node: OCR] ──► Extrae texto del PDF
                                                        │
                                                        ▼
                                          [OpenAI LLM: mapeo de contenedor]
                                                        │
                                                        ▼
                              [Supabase Node: INSERT contenedores]
                                                        │
                                                        ▼
                              [HTTP Request: POST callback Next.js con resultado]
---
Prompts LLM para cada Flujo
Prompt Flujo 1: Packing List → Cajas + Detalles
Eres un experto en logística de importación textil.
Recibes un array de filas de Excel que representan un Packing List de un proveedor.
Tu tarea es mapear estos datos al schema de nuestra base de datos PostgreSQL.
Schema detalle:
- cajas_producto: codigo_caja, producto_id, piezas_por_caja, costo_total_caja, cbm, peso_bruto_kg
- caja_detalles: caja_id, variante_id, talla_id, color_id, cantidad
Input: Array de filas con columnas del packing list (formato varía por proveedor).
Reglas:
1. El SKU base es el codigo antes del primer guion (ej: "SHIRT-001-BLK" → "SHIRT-001")
2. El color es la última parte después del último guion (ej: "SHIRT-001-BLK" → "BLACK")
3. Las tallas son los codigos intermedia (ej: "SHIRT-001-M-BLK" → "M")
4. Si el color es "BLK" mapear a "BLACK", "WHT" a "WHITE", etc.
5. Si piezas por caja no está, calcular: total_piezas / total_cajas
6. Si CBM no está, calcular: largo × ancho × alto / 1,000,000
Retorna EXACTAMENTE este JSON (sin markdown, sin explicaciones):
{
  "cajas": [
    {
      "codigo_caja": "string",
      "producto_sku": "string (sku_base)",
      "piezas_por_caja": number,
      "costo_total_caja": number,
      "cbm": number,
      "peso_bruto_kg": number,
      "detalles": [
        {
          "talla_id": "string (codigo de cat_tallas)",
          "color_id": "string (nombre de cat_colores)",
          "cantidad": number
        }
      ]
    }
  ],
  "productos_nuevos": [
    { "sku_base": "string", "nombre": "string", "variantes": [...] }
  ],
  "errores": ["string"] // si hay filas que no pudieron parsearse
}
Prompt Flujo 2: Invoice → Orden B2B
Eres un experto en procesamiento de facturas comerciales (Invoice/Proforma).
Recibes un array de filas de Excel que representan un Invoice de un proveedor.
Mapea al schema de ordenes B2B:
Schema:
- ordenes_b2b: proveedor_id, cliente_b2b_id, contenedor_id, estado, fecha_orden, moneda, total_cajas, total_piezas, cbm_orden, observaciones
- ordenes_b2b_detalles: orden_id, producto_id, cantidad_solicitada, precio_acordado, precio_yuan, importe_total, piezas_pedidas, cajas_pedidas, cbm_detalle, peso_bruto_kg
Input: Array de filas del invoice.
Reglas:
1. Proveedor: buscar en personas por nombre y tipo_entidad='Proveedor'
2. Moneda: detectar de columna (USD, CNY, MXN) o asumir USD
3. precio_yuan: el precio en moneda del proveedor (antes de conversión)
4. importe_total = cantidad_solicitada × precio_acordado
Retorna EXACTAMENTE:
{
  "orden": {
    "proveedor_id": number,
    "folio_proveedor": "string",
    "moneda": "USD|CNY|MXN",
    "tipo_cambio": number,
    "total_cajas": number,
    "total_piezas": number,
    "cbm_orden": number,
    "observaciones": "string"
  },
  "detalles": [
    {
      "producto_sku": "string",
      "cantidad_solicitada": number,
      "precio_acordado": number,
      "precio_yuan": number,
      "piezas_pedidas": number,
      "cajas_pedidas": number,
      "cbm_detalle": number,
      "peso_bruto_kg": number
    }
  ],
  "errores": ["string"]
}
Prompt Flujo 3: Hoja de Embarque (OCR) → Contenedor
Eres un experto en procesamiento de documentos de embarque (Bill of Lading / Shipping Document).
Recibes el TEXTO EXTRAÍDO de un PDF de una hoja de embarque.
Debes extraer los datos críticos del contenedor.
Schema:
- contenedores: numero_contenedor, naviera, numero_bl, buque, puerto_origen, puerto_destino, fecha_etd, fecha_eta, peso_total_kg, cbm_total, estado
Input: Texto plano del PDF.
Reglas:
1. El numero_contenedor sigue el formato: XXXX1234567 (4 letras + 7 dígitos)
2. La naviera es la compañía de transporte (ej: COSCO, HAPAG-LLOYD, MSC)
3. El BL es el número de Bill of Lading
4. Fechas: detectar formato (dd/mm/yyyy, mm/dd/yyyy, etc.)
5. ETD = Estimated Time of Departure (salida)
6. ETA = Estimated Time of Arrival (llegada)
Mapea estado:
- Si ETA > hoy → "en_transito"
- Si ETA <= hoy y < 7 días → "en_aduana"
- Si está en bodega → "en_bodega"
Retorna EXACTAMENTE:
{
  "contenedor": {
    "numero_contenedor": "string (procesado)",
    "codigo_contenedor": "string (original del PDF)",
    "naviera": "string",
    "numero_bl": "string",
    "buque": "string",
    "puerto_origen": "string",
    "puerto_destino": "string",
    "fecha_etd": "YYYY-MM-DD",
    "fecha_eta": "YYYY-MM-DD",
    "peso_total_kg": number,
    "cbm_total": number,
    "estado": "borrador|en_transito|en_aduana|en_bodega|completo"
  },
  "confirmacion_manual": ["string"] // campos ambiguos que necesitan revisión humana
}
---
Estructura Final del Módulo
app/(admin)/reportes/
├── page.tsx                              # Dashboard con 3 cards
├── loading.tsx
├── layout.tsx
│
└── migrar/
    ├── page.tsx                          # Selector de tipo de documento
    └── [tipo-doc]uploader/
        ├── page.tsx                      # Drag & drop específico
        └── EstadoFlujo.tsx              # Seguimiento del procesamiento
│
app/api/n8n/
├── webhook/
│   └── [tipo]/
│       └── route.ts                      # Routes dinámicos:
│                                          #   /webhook/packing-list
│                                          #   /webhook/invoice
│                                          #   /webhook/hoja-embarque
│
└── callback/
    └── route.ts                          # Recibe resultado de n8n
│
lib/n8n/
├── client.ts                             # Helper para llamar webhooks
├── types.ts                              # Tipos TypeScript
└── prompts/
    ├── packing-list.md                   # Prompt LLM mapeo cajas
    ├── invoice.md                        # Prompt LLM mapeo orden
    └── hoja-embarque.md                  # Prompt LLM mapeo contenedor
│
components/admin/reportes/
├── SelectorFlujo.tsx                     # 3 cards: Packing/Invoice/Embarque
├── UploaderExcel.tsx                     # Drag & drop para Excel
├── UploaderPDF.tsx                       # Drag & drop para PDF
├── EstadoProceso.tsx                     # Polling del estado
└── TablaResumen.tsx                      # Tabla de datos procesados
---
Variables de Entorno (actualizadas en .env.local)
# ─── Supabase ───
NEXT_PUBLIC_SUPABASE_URL=https://supabase.sistemaindumentaria.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
# ─── n8n ───
N8N_WEBHOOK_URL=https://n8n.sistemaindumentaria.com/webhook/
N8N_WEBHOOK_SECRET=sk-n8n-invtienda-abc123xyz-2025
# ─── PDF & OCR (para hoja de embarque) ───
PDF_OCR_API_KEY=your_pdfco_key_here      # Para PDF.co OCR
# O usar Google Vision si prefieres
GOOGLE_CLOUD_VISION_KEY=your_gc_key
# ─── Opcional (si n8n lo necesita) ───
OPENAI_API_KEY=sk-proj-...                # Puede ir en n8n como credential
---
Próximos Pasos Confirmados
Pasu	¿Qué hacer?	Archivo generado
1	Crear UI de Selector de Flujo	components/admin/reportes/SelectorFlujo.tsx
2	Crear API route dinámico (/api/n8n/webhook/[tipo])	app/api/n8n/webhook/[tipo]/route.ts
3	Crear API callback	app/api/n8n/callback/route.ts
4	Generar JSONs de workflows n8n (3 JSONs exportables)	/plans/workflows/
5	Configurar n8n en Docker con Supabase + OpenAI	docker-compose.yml en VPS
¿Esta arquitectura refleja exactamente lo que necesitas? ¿Hay algo que quieras ajustar antes de que proceda con el código? 
¿Te gustaría que respecte los 3 flujos en los nuevos documentos plans/workflows/ como JSON exportables para n8n antes de generar el código?