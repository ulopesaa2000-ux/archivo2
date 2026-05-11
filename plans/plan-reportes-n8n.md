# Plan de Trabajo: Módulo de Reportes + Integración n8n

> **Proyecto**: inv-tienda  
> **Ruta**: `/Users/uriel/Downloads/enero 26/archivo2/plans/`  
> **Versión**: 1.0  
> **Fecha**: 2025-05-07

---

## 1. Resumen Ejecutivo

Crear un módulo de reportes en `app/(admin)/reportes` con capacidad de:
1. **Generar reportes** desde Supabase (inventario, movimientos, ventas, productos por contenedor)
2. **Migrar datos desde Excel** (packing lists de proveedores) hacia la base de datos mediante workflows de n8n
3. **Procesar archivos variados** usando un LLM (OpenAI) en n8n para normalizar estructuras de Excel que varían por proveedor

El flujo central es: **Admin UI → Next.js API → n8n Webhook → LLM/Procesamiento → Supabase → Callback → Admin UI**

---

## 2. Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR / ADMIN                              │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  https://wear.fashiondisplaysmexico.com/(admin)/reportes   │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐  │    │
│   │  │  [Panel de Reportes]                                  │  │    │
│   │  │  - Generar reporte de inventario                     │  │    │
│   │  │  - Generar reporte de movimientos                    │  │    │
│   │  │  - Generar reporte de productos por contenedor       │  │    │
│   │  │  - [Subir Excel] -> n8n                              │  │    │
│   │  └──────────────────────────────────────────────────────┘  │    │
│   │                                                            │    │
│   └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              │ POST /api/n8n/webhook                 │
│                              │ (multipart/form-data + archivo)       │
│                              ▼                                       │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │              NEXT.JS API ROUTE (Server Side)               │    │
│   │                                                            │    │
│   │  app/api/n8n/webhook/route.ts                              │    │
│   │  ├─ Valida archivo (.xlsx)                               │    │
│   │  ├─ Verifica Content-Type y tamaño                         │    │
│   │  ├─ Genera `jobId` (UUID)                                  │    │
│   │  ├─ Guarda estado inicial en Supabase (procesos_n8n)       │    │
│   │  └─ Reenvía BINARY a n8n vía HTTP POST                     │    │
│   │                                                            │    │
│   └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              │ HTTPS:5678 (o 443 con proxy)          │
│                              │ Headers: X-N8N-SECRET                 │
│                              ▼                                       │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                        n8n (Docker VPS)                    │    │
│   │                                                            │    │
│   │  Webhook Node: /webhook/procesar-packing-list             │    │
│   │  ├─ Recibe archivo BINARY (Excel)                         │    │
│   │  │                                                        │    │
│   │  ├─ Spreadsheet File Node: Lee Excel -> JSON              │    │
│   │  ├─ Code Node (JS): Pre-normaliza columnas                │    │
│   │  │                                                        │    │
│   │  ├─ OpenAI Node (LLM):                                    │    │
│   │  │   "Mapea estas columnas al schema de Supabase"         │    │
│   │  │   -> Genera JSON estructurado                           │    │
│   │  │                                                        │    │
│   │  ├─ Data Validation Node: Valida datos críticos           │    │
│   │  │                                                        │    │
│   │  ├─ Supabase Node: INSERT contenedores                    │    │
│   │  │                      INSERT cajas_producto               │    │
│   │  │                      INSERT productos (si nuevos)       │    │
│   │  │                      INSERT variantes (si nuevas)       │    │
│   │  │                                                        │    │
│   │  └─ HTTP Request Node (Callback):                         │    │
│   │      POST https://wear.../api/n8n/callback                │    │
│   │      Body: { jobId, status, resultado, errores }            │    │
│   │                                                            │    │
│   └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              │ POST /api/n8n/callback                 │
│                              │ (Bearer token / X-N8N-SECRET)          │
│                              ▼                                       │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │              NEXT.JS API: RECIBE RESULTADO DE n8n            │    │
│   │                                                            │    │
│   │  app/api/n8n/callback/route.ts                             │    │
│   │  ├─ Verifica X-N8N-SECRET                                 │    │
│   │  ├─ Actualiza tabla procesos_n8n -> estado='completado'   │    │
│   │  ├─ Opcional: Trigger notificación (email, websocket)    │    │
│   │  └─ Response: { ok: true }                                │    │
│   │                                                            │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐      │
│   │              SUPABASE (PostgreSQL)                         │      │
│   │                                                            │      │
│   │  ┌─ procesos_n8n  (tracking de jobs)                       │      │
│   │  ├─ contenedores            (datos del contenedor)         │      │
│   │  ├─ cajas_producto          (cajas/packs)                  │      │
│   │  ├─ caja_detalles           (tallas, colores, cantidades)  │      │
│   │  ├─ productos               (catálogo maestro)             │      │
│   │  ├─ variantes_producto      (talla × color por producto)   │      │
│   │  └─ inventario_stock        (stock por bodega/producto)    │      │
│   │                                                            │      │
│   └────────────────────────────────────────────────────────────┘      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fases de Implementación

### **Fase 0: Infraestructura y Documentación** (Esta guía)
- [x] Crear documentación de arquitectura
- [x] Crear guía de conexión con n8n
- [ ] Crear guía de workflow de packing list
- [ ] Actualizar .env.example con variables de n8n
- [ ] Crear tabla `procesos_n8n` en Supabase (si no existe)

### **Fase 1: API de Conexión Next.js → n8n**
Archivos a crear:
- `app/api/n8n/webhook/route.ts` — Recibe Excel y reenvía a n8n
- `app/api/n8n/callback/route.ts` — Recibe resultado de n8n
- `lib/n8n/client.ts` — Helper para llamar n8n
- `lib/n8n/types.ts` — Tipos TypeScript para requests/responses

| Campo | Descripción |
|-------|-------------|
| `X-N8N-SECRET` | Header de autenticación compartido |
| `jobId` | UUID generado en Next.js, trackeado en ambos lados |
| `tipo_flujo` | Enum: `packing-list`, `inventario`, `ventas` |
| `archivo` | Binary (Excel .xlsx) |

### **Fase 2: UI de Reportes y Migración**
Archivos a crear:
- `app/(admin)/reportes/page.tsx` — Dashboard general de reportes
- `app/(admin)/reportes/migrar/page.tsx` — UI de migración de Excel
- `components/admin/reportes/UploaderExcel.tsx` — Drag & drop
- `components/admin/reportes/EstadoProceso.tsx` — Polling de estado
- `components/admin/reportes/SelectorTipoFlujo.tsx` — Selección de tipo

### **Fase 3: Configuración de n8n en Docker (VPS)**
Tareas en el VPS:
1. **Docker Compose** para n8n con variables de entorno
2. **Webhook node** configurado con path `/procesar-packing-list`
3. **Spreadsheet File node** para leer Excel
4. **OpenAI node** con prompt de mapeo de columnas
5. **Supabase node** conectado a `supabase.sistemaindumentaria.com`
6. **HTTP Request node** para callback a Next.js

### **Fase 4: Logic Mapping (Mapeo Excel → Schema)**
El OpenAI node recibe:
```json
{
  "columnas_detectadas": ["STYLE NO.", "DESCRIPTION", "COLOR", "SIZE", "QTY/CTN"],
  "ejemplo_filas": [ [...], [...] ],
  "schema_destino": "cajas_producto / caja_detalles / productos / variantes_producto"
}
```

Y genera:
```json
{
  "mapeo": {
    "STYLE NO.": "productos.sku_base",
    "DESCRIPTION": "productos.nombre",
    "COLOR": "variantes_producto.color_id (cat_colores)",
    "SIZE": "variantes_producto.talla_id (cat_tallas)",
    "QTY/CTN": "cajas_producto.piezas_por_caja",
    "CTNS": "cajas_producto.total_cajas"
  },
  "transformaciones": [
    "SKU base = primeros 3 chars de STYLE NO.",
    "Color = buscar en cat_colores por nombre, si no existe crear"
  ]
}
```

### **Fase 5: Pruebas y Validación**
- Subir `Packing list-260320.xlsx` real
- Verificar que n8n procesa correctamente
- Validar inserción en `contenedores`, `cajas_producto`, `caja_detalles`
- Comprobar callback recibido en Next.js y estado actualizado

### **Fase 6: Reportes Nativos (sin n8n)**
- Reporte de inventario por bodega
- Reporte de movimientos por fecha
- Reporte de productos por contenedor (similar a `TABLA HAMU1553617.xlsx`)
- Reporte de ventas por período

---

## 4. Estructura de Archivos del Módulo

```
app/
├── (admin)/
│   └── reportes/
│       ├── page.tsx                          # Dashboard de reportes
│       ├── loading.tsx                       # Skeleton
│       ├── layout.tsx                        # Layout del módulo
│       └── migrar/
│           ├── page.tsx                      # UI de migración Excel
│           └── loading.tsx
│
├── api/
│   └── n8n/
│       ├── webhook/
│       │   └── route.ts                      # POST: Recibe Excel → reenvía a n8n
│       └── callback/
│           └── route.ts                      # POST: Recibe resultado de n8n
│
components/
├── admin/
│   └── reportes/
│       ├── UploaderExcel.tsx                 # Drag & drop component
│       ├── SelectorTipoFlujo.tsx             # Select tipo de flujo
│       ├── EstadoProceso.tsx                 # Polling del estado
│       ├── TablaResultado.tsx                # Tabla de datos procesados
│       └── ReporteCard.tsx                   # Card para seleccionar reporte
│
lib/
└── n8n/
    ├── client.ts                             # Helper HTTP para n8n
    └── types.ts                              # Types: N8NWebhookPayload, N8NResponse, etc.
│
modules/
└── reportes/
    ├── actions.ts                            # Server Actions (si aplica)
    └── queries.ts                            # Queries Supabase para reportes
```

---

## 5. Tablas de Supabase Involucradas

### **5.1 Tabla de Tracking de Jobs: `procesos_n8n`**
```sql
CREATE TABLE inv-tienda.procesos_n8n (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL UNIQUE,
  tipo_flujo text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
    -- 'pendiente', 'procesando', 'completado', 'error'
  archivo_nombre text,
  archivo_size_bytes integer,
  resultado jsonb,
  errores jsonb,
  creado_por integer REFERENCES inv-tienda.usuarios(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completado_at timestamp with time zone
);
```

### **5.2 Tablas del Schema Ya Existentes (según db_dumb.txt)**

| Tabla | Rol en la Migración |
|-------|---------------------|
| `contenedores` | Se inserta/actualiza con datos del contenedor |
| `cajas_producto` | Cada caja/pack del Excel → una fila aquí |
| `caja_detalles` | Detalle de tallas, colores y cantidades por caja |
| `productos` | Si el SKU no existe, se crea (o se valida) |
| `variantes_producto` | Se crean variantes talla×color si no existen |
| `cat_tallas` | Catálogo maestro de tallas |
| `cat_colores` | Catálogo maestro de colores |
| `cat_marcas` | Catálogo maestro de marcas |

---

## 6. Variables de Entorno Necesarias

```bash
# ─── Supabase (ya existentes) ───
NEXT_PUBLIC_SUPABASE_URL=https://supabase.sistemaindumentaria.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# ─── n8n ───
N8N_WEBHOOK_URL=https://n8n.tu-vps.com/webhook/
N8N_WEBHOOK_SECRET=sk-n8n-invtienda-miclavesupersecreta

# ─── OpenAI (usado por n8n) ───
OPENAI_API_KEY=sk-proj-...

# ─── App ───
NEXT_PUBLIC_SITE_URL=https://wear.fashiondisplaysmexico.com
```

---

## 7. Seguridad y Autenticación

| Capa | Mecanismo |
|------|-----------|
| **Next.js → n8n** | Header `X-N8N-SECRET` (shared secret) + HTTPS |
| **n8n → Next.js (callback)** | Header `X-N8N-SECRET` (verificación bidireccional) |
| **n8n → Supabase** | Service Role Key (almacenada como credential en n8n) |
| **App Next.js → Supabase** | Supabase Auth (session cookies + RLS) |
| **API Routes de Next.js** | Verificación de sesión + `service_role` key |

---

## 8. Mapa de Datos: Excel Packing List → Supabase

| Columna Excel (ejemplo) | Tabla Supabase | Columna | Notas |
|--------------------------|----------------|---------|-------|
| `CONTAINER NO` / `N° CONTENEDOR` | `contenedores` | `codigo_contenedor` | Identificador del contenedor |
| `STYLE NO` / `ESTILO` / `ARTICULO` | `productos` | `sku_base` | Extraer prefix del estilo |
| `DESCRIPTION` | `productos` | `nombre` | Nombre del producto |
| `COLOR` | `variantes_producto` | `color_id` → `cat_colores` | Lookup por nombre |
| `SIZE` / `TALLA` | `variantes_producto` | `talla_id` → `cat_tallas` | Lookup por código |
| `QTY/CTN` / `QTY PER CARTON` | `cajas_producto` | `piezas_por_caja` | Cantidad por caja |
| `TOTAL CTNS` / `TOTAL CARTONS` | `cajas_producto` | (calculado) | Total de cajas |
| `N.W.` / `NET WEIGHT` | `cajas_producto` | `peso_bruto_kg` | Peso (si aplica) |
| `CBM` | `cajas_producto` | `cbm` | Metros cúbicos |
| `CARTON NO` | `cajas_producto` | `codigo_caja` | Identificador de la caja |

> **Nota**: Las columnas pueden variar por proveedor. El LLM en n8n normaliza el mapeo.

---

## 9. Flujo de Estados del Job

```
  ┌─────────────┐
  │  PENDIENTE  │ ───► Usuario sube archivo en UI
  └──────┬──────┘
         │     POST /api/n8n/webhook
         ▼
  ┌─────────────┐
  │  ENVIADO    │ ───► Next.js guarda en procesos_n8n
  └──────┬──────┘
         │     Forward a n8n Webhook
         ▼
  ┌─────────────┐
  │ PROCESANDO  │ ───► n8n lee Excel → LLM → Mapeo → Supabase
  └──────┬──────┘
         │     Callback POST /api/n8n/callback
         ▼
  ┌─────────────┐     ┌─────────────┐
  │ COMPLETADO  │ 🟢 │   ERROR     │ 🔴
  └─────────────┘     └─────────────┘
         │                    │
         ▼                    ▼
   UI muestra             UI muestra
   datos procesados       mensaje de error
   con opción de          con detalle
   descargar log
```

---

## 10. Cronograma Sugerido

| Día | Tarea | Archivos |
|-----|-------|----------|
| Día 1 | Documentación + Infra | `plans/`, `.env.example` |
| Día 2 | API Routes Next.js | `app/api/n8n/webhook/`, `app/api/n8n/callback/` |
| Día 3 | UI de Migración | `UploaderExcel`, `EstadoProceso`, `SelectorTipoFlujo` |
| Día 4 | n8n Docker + Webhook | `docker-compose.yml`, n8n workflow JSON |
| Día 5 | Mapeo + LLM en n8n | OpenAI node, mapeo dinámico |
| Día 6 | Conexión Supabase + Callback | Insert datos, callback a Next.js |
| Día 7 | Pruebas completas con Excel real | `Packing list-260320.xlsx` |
| Día 8 | Reportes nativos sin n8n | Inventario, movimientos, contenedores |
| Día 9 | Refactor + Cleanup | Code review, tipos, manejo de errores |
| Día 10 | Deploy + Documentación final | README del módulo, guía de uso |

---

## 11. Checklist de Completado

- [ ] Crear carpeta `plans/` y guías `.md`
- [ ] Actualizar `.env.example` con variables n8n
- [ ] Crear tabla `procesos_n8n` en Supabase
- [ ] Implementar `app/api/n8n/webhook/route.ts`
- [ ] Implementar `app/api/n8n/callback/route.ts`
- [ ] Implementar `lib/n8n/client.ts` y `types.ts`
- [ ] Crear UI de migración (`UploaderExcel`)
- [ ] Desplegar n8n en Docker (VPS)
- [ ] Configurar webhook en n8n
- [ ] Configurar OpenAI node en n8n
- [ ] Crear workflow de mapeo con LLM
- [ ] Configurar Supabase node en n8n
- [ ] Probar flujo completo con Excel real
- [ ] Crear reportes nativos (inventario, movimientos)
- [ ] Documentación final y guía de usuario

---

*Generado para el proyecto inv-tienda. Este plan es la referencia maestra para todas las tareas del módulo de reportes y migración n8n.*
