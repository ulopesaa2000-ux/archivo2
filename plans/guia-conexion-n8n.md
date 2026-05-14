# Guía Definitiva: Conexión Next.js ↔ n8n

> **Proyecto**: inv-tienda  
> **Ruta**: `/Users/uriel/Downloads/enero 26/archivo2/plans/`  
> **Versión**: 1.0  
> **Fecha**: 2025-05-07

---

## 1. ¿Qué es n8n y Por Qué Usarlo?

**n8n** es una plataforma de automatización de workflows de código abierto. Te permite crear flujos visuales (como un diagrama de bloques) donde cada bloque es un "nodo" que hace algo: leer un archivo, procesar datos, consultar una base de datos, enviar un email, etc.

### **Ventajas para este proyecto:**
- **Procesamiento de Excel**: n8n tiene un nodo nativo `Spreadsheet File` que lee/escribe Excel sin necesidad de instalar más librerías.
- **Flexibilidad con LLM**: Puedes usar el nodo `OpenAI` para interpretar y mapear columnas de Excel que varían por proveedor.
- **Visual y editable sin tocar código**: Cambias mapeos de columnas desde la UI de n8n sin tocar tu app Next.js.
- **Dockerizado**: Corre en contenedor Docker, perfecto para tu VPS.

---

## 2. ¿Cómo se Conectan? (Visión General)

Tu **app Next.js** y **n8n** se comunican a través de **HTTP requests**.

```
  TU APP (Next.js)                    n8n (Docker VPS)
  ━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━
  
  [API Route]                            [Webhook Node]
  ---- POST ---->                      <---- Trigger ----
  /api/n8n/webhook                    /webhook/procesar-packing-list
  Body: archivo Excel                 Recibe archivo
  Headers: X-N8N-SECRET               Ejecuta workflow
                                      
                                      [HTTP Request Node]
                                      ---- POST ---->
                                      /api/n8n/callback
                                      Body: resultado procesado
                                      Headers: X-N8N-SECRET
```

**Puntos clave:**
1. Tu **app inicia** la petición a n8n.
2. n8n **procesa** el archivo.
3. n8n **devuelve** el resultado a tu app mediante un callback.
4. Ambos lados verifican un **shared secret** (`X-N8N-SECRET`) para asegurar que solo se comunican entre ellos.

---

## 3. Dónde Obtengo las Claves

### **3.1 API Key de n8n (para que tu app se autentique)**

n8n **no usa API Keys por default** para los webhooks. El mecanismo es:

| Método | Descripción | Dónde Obtener |
|--------|-------------|---------------|
| **Webhook URL pública** | URL que n8n genera automáticamente | `n8n UI > Workflow > Webhook Node > URL` |
| **Basic Auth** | Usuario/contraseña opcional | `n8n Settings > Security` |
| **Our Custom Header** | `X-N8N-SECRET` que nosotros inventamos | `Lo defines tú en .env` |

**La clave más segura para nosotros es:**

### **`X-N8N-SECRET`** (Shared Secret)

Esta no la "obtenes" de n8n. **La inventamos nosotros** y se la pasamos a ambos lados:

1. **En tu app Next.js** (`.env.local`):
   ```bash
   N8N_WEBHOOK_SECRET=sk-n8n-invtienda-abc123xyz-2025
   ```

2. **En tu n8n workflow** (HTTP Request node):
   ```javascript
   // En el node HTTP Request (callback), configuras el header:
   "X-N8N-SECRET": "sk-n8n-invtienda-abc123xyz-2025"
   ```

3. **En tu Next.js API**, verificás que el header coincida:
   ```typescript
   const n8nSecret = request.headers.get('x-n8n-secret');
   if (n8nSecret !== process.env.N8N_WEBHOOK_SECRET) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

> **¿Por qué esto funciona?** Porque ambos lados "saben" la misma clave. Es como dos amigos con una contraseña secreta: si alguien llega sin ella, no pasa.

---

### **3.2 URL del Webhook de n8n**

Cuando tenés n8n corriendo en Docker, la URL por defecto es:

```
http://localhost:5678/webhook/<nombre-del-workflow>
```

Pero desde tu app Next.js (que está en otro servidor o contenedor), no existe `localhost`. Necesitás:

#### Opción A: n8n en el mismo VPS (Docker network)

```
http://n8n:5678/webhook/procesar-packing-list
```

#### Opción B: n8n con dominio propio (HTTPS, recomendado)

```
https://n8n.sistemaindumentaria.com/webhook/procesar-packing-list
```

> **¿Cómo se obtiene esta URL?**
> 
> Cuando creas un `Webhook Node` en n8n y le das "Test Workflow", n8n te muestra la URL completa. Ejemplo:
> ```
> https://n8n.sistemaindumentaria.com/webhook/procesar-packing-list
> ```

**Pero ojo:** Las URLs de webhook en n8n hay dos modos:

| Modo | URL | Uso |
|------|-----|-----|
| **Test URL** (temporal) | `https://.../webhook-test/...` | Solo cuando el workflow está activo y en modo test |
| **Production URL** | `https://.../webhook/...` | URL permanente, funciona siempre que el workflow esté activado |

> **Regla de oro**: En producción, usa la **Production URL** y **activa** el workflow (switch en la UI).

---

## 4. Configuración Paso a Paso

### **Paso 1: Instalar n8n con Docker Compose**

Creamos un `docker-compose.yml` en tu VPS en la ruta `/opt/n8n/docker-compose.yml` (o donde prefieras, según los permisos de tu VPS):

```yaml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # Autenticación básica de la UI de n8n (opcional pero recomendado)
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=tu_password_seguro_aqui_123

      # Conexión a Supabase (PostgreSQL de tu Supabase self-hosted)
      - N8N_DB_TYPE=postgresdb
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=db.supabase.sistemaindumentaria.com
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=TU_SUPABASE_DB_PASSWORD
      - DB_POSTGRESDB_DATABASE=postgres

      # Variables de n8n
      - N8N_WEBHOOK_URL=https://n8n.sistemaindumentaria.com/
      - WEBHOOK_TUNNEL_URL=https://n8n.sistemaindumentaria.com/
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - NODE_OPTIONS=--max-old-space-size=4096

    volumes:
      - ~/.n8n:/home/node/.n8n
      - /ruta/a/archivosExcel:/data/excel_files
```

**Luego en tu VPS:**

```bash
cd /opt/n8n
docker-compose up -d
```

### **Paso 2: Obtener la URL del Webhook en n8n**

1. Abri la UI de n8n: `https://n8n.sistemaindumentaria.com`
2. Crear un nuevo **Workflow**
3. Añadir un node **Webhook**:
   - **HTTP Method**: `POST`
   - **Path**: `procesar-packing-list` (esto es lo que va al final de la URL)
   - **Response Mode**: `Last Node` (o `Response Body` si querés controlar el response)
4. Click en **Execute Node** (el botón de "Play"). Esto activa el modo test.
5. Copiar la URL que aparece. Será algo como:
   ```
   https://n8n.sistemaindumentaria.com/webhook-test/procesar-packing-list
   ```

> **Para producción**, activa el workflow (switch de "Active" arriba a la izquierda) y usa:
> ```
> https://n8n.sistemaindumentaria.com/webhook/procesar-packing-list
> ```

### **Paso 3: Configurar Variables en next.js**

En tu archivo `.env.local`:

```bash
# ─── Supabase (ya existentes) ───
NEXT_PUBLIC_SUPABASE_URL=https://supabase.sistemaindumentaria.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# ─── n8n Webhook ───
N8N_WEBHOOK_URL=https://n8n.sistemaindumentaria.com/webhook/
N8N_WEBHOOK_SECRET=sk-n8n-invtienda-abc123xyz-2025

# ─── OpenAI (n8n lo usa internamente) ───
OPENAI_API_KEY=sk-proj-...  # Opcional si lo configurás en n8n directamente
```

### **Paso 4: Crear la API Route en Next.js**

**Archivo: `app/api/n8n/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parsear el FormData (archivo + metadatos) ──
    const formData = await request.formData();
    const archivo = formData.get('archivo') as File;

    if (!archivo) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo' },
        { status: 400 }
      );
    }

    // Validar que sea .xlsx
    if (!archivo.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos .xlsx' },
        { status: 400 }
      );
    }

    // ── 2. Generar jobId único ──
    const jobId = crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}`;

    // ── 3. (Opcional) Guardar tracking inicial en Supabase ──
    // const { data, error } = await supabase.from('procesos_n8n').insert({ ... });

    // ── 4. Reenviar archivo a n8n ──
    const n8nFormData = new FormData();
    n8nFormData.append('archivo', archivo);
    n8nFormData.append('jobId', jobId);
    n8nFormData.append('tipo_flujo', formData.get('tipo_flujo')?.toString() || 'packing-list');

    const n8nResponse = await fetch(
      `${process.env.N8N_WEBHOOK_URL}procesar-packing-list`,
      {
        method: 'POST',
        body: n8nFormData,
        headers: {
          'X-N8N-SECRET': process.env.N8N_WEBHOOK_SECRET || '',
        },
      }
    );

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text();
      throw new Error(`n8n respondió con ${n8nResponse.status}: ${errorBody}`);
    }

    const resultado = await n8nResponse.json();

    // ── 5. Responder al frontend ──
    return NextResponse.json({
      success: true,
      jobId,
      mensaje: 'Archivo enviado a procesar en n8n',
      resultado_n8n: resultado,
    });

  } catch (error: any) {
    console.error('Error en API n8n/webhook:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo', detail: error.message },
      { status: 500 }
    );
  }
}
```

### **Paso 5: Crear el Callback de Respuesta**

**Archivo: `app/api/n8n/callback/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Verificar Secret ──
    const n8nSecret = request.headers.get('x-n8n-secret');
    
    if (n8nSecret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // ── 2. Parsear el body ──
    const body = await request.json();

    /*
      Ejemplo de body esperado de n8n:
      {
        "jobId": "uuid-generado-en-nextjs",
        "status": "completado",  // o "error"
        "resultado": {
          "contenedores": 1,
          "cajas_insertadas": 45,
          "productos_nuevos": 12,
          "detalles": [...]
        },
        "errores": []
      }
    */

    // ── 3. Guardar resultado en Supabase ──
    // const { error } = await supabase.from('procesos_n8n")
    //   .update({
    //     estado: body.status === 'completado' ? 'completado' : 'error',
    //     resultado: body.resultado,
    //     errores: body.errores,
    //     completado_at: new Date().toISOString(),
    //   })
    //   .eq('job_id', body.jobId);

    // ── 4. (Opcional) Notificar al usuario
    // Ejemplo: enviar email, trigger de websocket, etc.
    // Puedes usar Supabase Realtime para notificar al frontend

    return NextResponse.json({ recibido: true, jobId: body.jobId });

  } catch (error: any) {
    console.error('Error en callback de n8n:', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
```

---

## 5. Flujo Visual del n8n Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    n8n WORKFLOW                              │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   TRIGGER: Webhook Node                                │  │
│  │   ├─ Method: POST                                      │  │
│  │   ├─ Path: /procesar-packing-list                    │  │
│  │   └─ Body: { archivo: binary, jobId, tipo_flujo }     │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   SPREADSHEET FILE NODE                                │  │
│  │   ├─ Read File from Previous Node                   │  │
│  │   └─ Convert to: JSON (Each Sheet -> JSON)           │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   FUNCTION NODE (Code)                               │  │
│  │   ├─ Pre-normalizar nombres de columnas              │  │
│  │   ├─ Eliminar filas vacías                            │  │
│  │   └─ Output: { filas_normalizadas: [...] }           │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   OPENAI NODE (LLM - GPT-4o / Claude 3)                │  │
│  │   ├─ System Prompt: "Eres un experto en mapeo de     │  │
│  │   │   datos de Excel a schemas de base de datos.       │  │
│  │   │   Tu tarea es mapear las columnas del Excel       │  │
│  │   │   al siguiente schema: ..."                         │  │
│  │   └─ Output: JSON estructurado con mapeo confirmado  │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   FUNCTION NODE (Code)                                 │  │
│  │   ├─ Validar datos obligatorios (sku, cantidad, etc.) │  │
│  │   ├─ Buscar/matchear colores en cat_colores           │  │
│  │   ├─ Buscar/matchear tallas en cat_tallas              │  │
│  │   └─ Generar arrays de inserts SQL o JSON              │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   SUPABASE NODE (Insert / Upsert)                       │  │
│  │   ├─ Table: contenedores (INSERT/UPDATE)                │  │
│  │   ├─ Table: productos (INSERT si no existe)             │  │
│  │   ├─ Table: cajas_producto (INSERT)                     │  │
│  │   ├─ Table: caja_detalles (INSERT)                     │  │
│  │   └─ Table: variantes_producto (INSERT/UPDATE)         │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────┴───────────────────────────────────┐  │
│  │   HTTP REQUEST NODE (Callback a Next.js)               │  │
│  │   ├─ Method: POST                                      │  │
│  │   ├─ URL: https://wear.../api/n8n/callback            │  │
│  │   ├─ Headers: { "X-N8N-SECRET": "..." }                 │  │
│  │   └─ Body: { jobId, status, resultado, errores }        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Ejemplo de Prompt para OpenAI (n8n)

En el `OpenAI Node` de n8n, el `System Prompt` puede ser:

```
You are a data migration expert for an import/export company.
Your task is to analyze an Excel sheet containing a "packing list" 
from a Chinese supplier and map it to their PostgreSQL database schema.

Database Tables Relevant:
- contenedores: id, codigo_contenedor, naviera, puerto_origen, puerto_destino, fecha_eta
- productos: id, sku_base, nombre, marca_id, tipo_prenda_id
- variantes_producto: id, producto_id, talla_id, color_id, sku_completo
- cajas_producto: id, codigo_caja, producto_id, piezas_por_caja, costo_total_caja, cbm
- caja_detalles: id, caja_id, talla_id, color_id, cantidad

Rules:
1. Extract container number, airline, and dates if present in the Excel.
2. Map "STYLE NO", "ESTILO", "ARTICULO" → productos.sku_base
3. Map "COLOR" → lookup in cat_colores.name. If not found, return { needs_creation: true, ... }.
4. Map "SIZE", "TALLA" → lookup in cat_tallas.codigo. If not found, note it.
5. Calculate total boxes and quantities.
6. Return a structured JSON with arrays of records ready for INSERT.
7. Flag any missing or ambiguous data.

Output ONLY valid JSON, no markdown.
```

---

## 7. Seguridad: Resumen

| Quien | Qué hace | Seguridad |
|-------|----------|-----------|
| **Next.js → n8n** | POST archivo Excel + metadata | `X-N8N-SECRET` en header + HTTPS |
| **n8n → Next.js** | POST resultado del procesamiento | `X-N8N-SECRET` en header + HTTPS |
| **n8n → Supabase** | INSERT datos procesados | Service Role Key (nunca expuesta al frontend) |
| **Usuario → Next.js** | Login + Sesión | Supabase Auth (session cookies) |

### **Checklist de Seguridad**
- [x] Usar `X-N8N-SECRET` compartido (largo, aleatorio, guardado en `.env`)
- [x] Verificar el header en **AMBAS** direcciones (Next.js y n8n callback)
- [x] Usar HTTPS en producción (nunca HTTP)
- [x] No exponer `SUPABASE_SERVICE_ROLE_KEY` al frontend (solo usar en API routes)
- [x] Validar tipo de archivo antes de reenviar (solo `.xlsx`)
- [x] Limitar tamaño de archivo (ej. 10MB max)
- [x] Sanitizar nombres de columnas en el LLM prompt
- [x] Usar RBAC de Supabase para controlar quién puede subir archivos

---

## 8. Troubleshooting (Problemas Comunes)

### **Problema: "Connection refused" al conectar Next.js → n8n**

**Causa**: Next.js y n8n están en contenedores diferentes o en diferentes máquinas.

**Solución**: Usar la IP pública o el nombre de dominio de n8n, nunca `localhost`.

```
# ❌ Mal (en Docker, localhost es el contenedor mismo)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/

# ✅ Bien (nombre de host correcto)
N8N_WEBHOOK_URL=http://n8n:5678/webhook/  # Mismo docker network
# o
N8N_WEBHOOK_URL=https://n8n.sistemaindumentaria.com/webhook/  # Dominio público
```

### **Problema: n8n no recibe el archivo**

**Causa**: El archivo no está en el `FormData` correcto o no se envía como `multipart/form-data`.

**Verificación:**

En n8n, revisa el webhook log (Execution List) para ver qué recibió. Si no llega nada, revisa:
1. ¿El n8n está activado? (Switch de "Active" en la UI)
2. ¿La URL del webhook es correcta? (Production vs Test)
3. ¿El Content-Type es `multipart/form-data`?

### **Problema: "Unauthorized" en el callback**

**Causa**: El header `X-N8N-SECRET` no coincide entre n8n y Next.js.

**Verificación**:
En n8n, abre el `HTTP Request node` y revisa que el header sea exactamente igual al de `.env.local`.

### **Problema: El archivo Excel se corrompe al pasar por n8n**

**Causa**: El `Binary Data` (archivo Excel) no se maneja correctamente en n8n.

**Solución**: 
1. En n8n, asegúrate de configurar el `Webhook Node` para recibir `Binary Data`.
2. Usar el nodo `Spreadsheet File` con la opción de leer desde `Binary`.

---

## 9. Diagrama de Secuencia Completo

```
Usuario                    Next.js                  n8n                    Supabase
   │                         │                       │                       │
   │ Subir Excel             │                       │                       │
   │────────────────────────>│                       │                       │
   │                         │                       │                       │
   │                         │ POST /api/n8n/webhook │                       │
   │                         │ body: FormData        │                       │
   │                         │ (archivo, tipo_flujo) │                       │
   │                         │──────────────────────>│                       │
   │                         │                       │                       │
   │                         │  jobId: uuid          │ Recibe archivo        │
   │                         │  X-N8N-SECRET         │ │                     │
   │                         │                       │ │                     │
   │                         │                       │ V                     │
   │                         │                       │ Lee Excel             │
   │                         │                       │ Normaliza             │
   │                         │                       │ Columnas              │
   │                         │                       │ │                     │
   │                         │                       │ │ LLM (OpenAI)        │
   │                         │                       │ │ Mapeo de datos     │
   │                         │                       │ │                     │
   │                         │                       │ V                     │
   │                         │                       │ WRITE Supabase        │
   │                         │                       │─────────────────────>│
   │                         │                       │                       │
   │                         │                       │  INSERT ok            │
   │                         │                       │<─────────────────────│
   │                         │                       │                       │
   │                         │ POST /api/n8n/callback│                       │
   │                         │ body: {jobId, status} │                       │
   │                         │<─────────────────────│                       │
   │                         │                       │                       │
   │ Actualizar UI           │                       │                       │
   │<────────────────────────│                       │                       │
   │"¡Proceso completado!"  │                       │                       │
   │                         │                       │                       │
```

---

## 10. Referencias

- [n8n Webhook Node Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n Supabase Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)
- [n8n OpenAI Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.openai/)
- [n8n Docker Compose Setup](https://docs.n8n.io/hosting/installation/docker/)
- [Vite en Docker (dependiendo de setup)](https://docs.n8n.io/hosting/installation/docker/)

---

*Esta guía es la referencia definitiva para configurar y entender la conexión entre tu aplicación Next.js y n8n.*
