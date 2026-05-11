# Guía: Workflow de Migración n8n - Packing List

> **Proyecto**: inv-tienda  
> **Ruta**: `/Users/uriel/Downloads/enero 26/archivo2/plans/`  
> **Versión**: 1.0  
> **Fecha**: 2025-05-07

---

## 1. Resumen del Workflow

Este workflow en n8n procesa un archivo Excel tipo **Packing List** (enviado por un proveedor desde China), lo normaliza usando un **LLM (OpenAI)**, lo valida y lo persiste en **Supabase (PostgreSQL)**. Finalmente, notifica a la aplicación Next.js mediante un **callback**.

---

## 2. Estructura del Workflow (n8n nodes)

```
Step 1 ──► Step 2 ──► Step 3 ──► Step 4 ──► Step 5 ──► Step 6 ──► Step 7

[Webhook]  [Spreadsheet] [Function]  [OpenAI]    [Function] [Supabase] [HTTP]
Trigger    File        Prep        LLM         Validate   Insert     Callback
                                 Mapeo                   Data
```

---

## 3. Descripción de Cada Paso

### **Paso 1: Webhook Trigger Node**

**Configuración:**
- **Nombre**: `Recibir Packing List`
- **Tipo**: `Webhook`
- **HTTP Method**: `POST`
- **Path**: `procesar-packing-list`
- **Response Mode**: `Response Body` (para enviar respuesta inmediata a Next.js)
- **Body Content Type**: `multipart/form-data`

**Qué espera recibir:**
```
Content-Type: multipart/form-data

archivo: <binary (Excel .xlsx)>
jobId: "550e8400-e29b-41d4-a716-446655440000"
tipo_flujo: "packing-list"
```

---

### **Paso 2: Spreadsheet File Node**

**Configuración:**
- **Nombre**: `Leer Excel`
- **Tipo**: `Spreadsheet File`
- **Operation**: `Read File from Previous Node`
- **Property Name**: `archivo` (nombre del campo en el FormData)
- **Options**:
  - `Read As`: `JSON`
  - `Sheet`: `0` (primera hoja)
  - `Header Row`: `true` (primera fila como headers)

**Output esperado:**
```json
[
  {
    "STYLE NO": "PANT-001",
    "DESCRIPTION": "MEN'S PANT",
    "COLOR": "BLACK",
    "SIZE": "M",
    "QTY/CTN": "24",
    "TOTAL QTY": "480",
    "CTNS": "20"
  },
  ...
]
```

---

### **Paso 3: Function Node (Pre-normalización)**

**Nombre**: `Normalizar Columnas`
**Lenguaje**: `JavaScript`

```javascript
const items = $input.all()[0].json;

// Pre-normalizar nombres de columnas comunes
const normalizeColumn = (col) => {
  const map = {
    'STYLE NO': 'style_no',
    'STYLE NO.': 'style_no',
    'ESTILO': 'style_no',
    'ARTICULO': 'style_no',
    'ARTÍCULO': 'style_no',
    'DESCRIPTION': 'descripcion',
    'DESC': 'descripcion',
    'PRODUCT': 'descripcion',
    'COLOR': 'color',
    'COLOUR': 'color',
    'SIZE': 'talla',
    'SIZES': 'talla',
    'TALLA': 'talla',
    'QTY/CTN': 'piezas_por_caja',
    'QTY PER CTN': 'piezas_por_caja',
    'TOTAL QTY': 'cantidad_total',
    'CTNS': 'total_cajas',
    'TOTAL CTNS': 'total_cajas',
    'N.W.': 'peso_neto',
    'G.W.': 'peso_bruto',
    'CBM': 'cbm',
    'CONTAINER NO': 'numero_contenedor'
  };
  return map[col.toUpperCase()] || col.toLowerCase().replace(/\s+/g, '_');
};

const filasNormalizadas = items.map(row => {
  const nuevo = {};
  for (const [key, value] of Object.entries(row)) {
    const colNorm = normalizeColumn(key.toString().trim());
    nuevo[colNorm] = value;
  }
  return nuevo;
}); 

return [{ json: filasNormalizadas }];
```

---

### **Paso 4: OpenAI Node (LLM - Mapeo Inteligente)**

**Configuración:**
- **Nombre**: `Mapear con LLM`
- **Model**: `gpt-4o` o `gpt-3.5-turbo-16k` (cheaper)
- **Messages**:
  - **System**:
    ```
    You are a data mapping expert for a clothing import company. 
    Your task is to analyze supplier Excel data and map it to our database schema.
    
    Database Tables:
    - contenedores: (id, codigo_contenedor, naviera, puerto_origen, puerto_destino, fecha_eta, estado)
    - productos: (id, sku_base, nombre, marca_id, tipo_prenda_id, activo)
    - cajas_producto: (id, codigo_caja, producto_id, piezas_por_caja, costo_total_caja, cbm, peso_bruto_kg)
    - caja_detalles: (id, caja_id, talla_id, color_id, cantidad)
    - variantes_producto: (id, producto_id, talla_id, color_id, sku_completo)
    
    Input is an array of objects with pre-normalized column names.
    
    Task:
    1. Detect container info (if present in first rows)
    2. Map each row to the appropriate tables
    3. For colors, output the color NAME (we will match later against cat_colores)
    4. For sizes, output the size CODE (we will match later against cat_tallas)
    5. Group by style/color to create cajas_producto
    6. Flag any missing required data
    
    Output ONLY valid JSON, no markdown, no explanation.
    JSON structure:
    {
      "contenedor": { ... },
      "productos": [...],
      "cajas": [...],
      "detalles": [...],
      "flags": [...]
    }
    ```
  - **User**: `{{ $json }}` (la salida del Paso 3)
- **Format**: `JSON Object`
- **Temperature**: `0.1` (minima creatividad, maxima precision)

**Output esperado del LLM:**
```json
{
  "contenedor": {
    "codigo_contenedor": "HAMU1553617",
    "naviera": "COSCO",
    "puerto_origen": "SHANGHAI",
    "puerto_destino": "LAZARO CARDENAS",
    "fecha_eta": "2025-04-15"
  },
  "productos": [
    {
      "sku_base": "PANT-001",
      "nombre": "MEN'S PANT",
      "marca_id": null,
      "tipo_prenda_id": null
    }
  ],
  "cajas": [
    {
      "codigo_caja": "C-001-PANT-001-BLK",
      "producto_sku": "PANT-001",
      "piezas_por_caja": 24,
      "total_cajas": 20,
      "cbm": 0.045
    }
  ],
  "detalles": [
    {
      "caja_codigo": "C-001-PANT-001-BLK",
      "talla": "M",
      "color": "BLACK",
      "cantidad": 480
    }
  ],
  "flags": [
    "Color 'BLACK' needs matching in cat_colores"
  ]
}
```

---

### **Paso 5: Function Node (Validación y Enriquecimiento)**

**Nombre**: `Validar y Enriquecer`
**Lenguaje**: `JavaScript`

```javascript
const resultadoLLM = $input.all()[0].json;

const filas = Array.isArray(resultadoLLM) ? resultadoLLM : [resultadoLLM];

// Simulación de catálogos (en producción, n8n leería de Supabase)
const cat_colores = {
  'BLACK': 1, 'WHITE': 2, 'NAVY': 3, 'RED': 4, // ...
};

const cat_tallas = {
  'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6,
  '2XL': 6, '3XL': 7,
};

const validados = filas.map(row => {
  const valido = { ...row };
  
  // Validar color
  if (valido.color) {
    const colorId = cat_colores[valido.color.toUpperCase()];
    if (!colorId) {
      valido._flag_color = `Color '${valido.color}' no encontrado en catálogo`;
    }
    valido.color_id = colorId || null;
  }
  
  // Validar talla
  if (valido.talla) {
    const tallaId = cat_tallas[valido.talla.toUpperCase()];
    if (!tallaId) {
      valido._flag_talla = `Talla '${valido.talla}' no encontrada en catálogo`;
    }
    valido.talla_id = tallaId || null;
  }
  
  // Validar cantidades
  if (!valido.cantidad || isNaN(valido.cantidad)) {
    valido._flag_cantidad = 'Cantidad es requerida y debe ser numérica';
  }
  
  return valido;
});

return [{ json: validados }];
```

> **Nota**: En un workflow real, este paso puede hacer queries a Supabase usando el nodo `Supabase` para obtener los IDs reales de `cat_colores` y `cat_tallas`.

---

### **Paso 6: Supabase Node (Persistencia)**

**Configuración:**
- **Nombre**: `Guardar en Supabase`
- **Tipo**: `Supabase`
- **Operation**: `Insert / Upsert (Rows)`
- **Table**: `inv-tienda.cajas_producto` (ejemplo de una tabla)
- **Data**: `{{ $json }}` (la salida del Paso 5)

**Nota sobre Service Role Key:**
En n8n, configura la conexión a Supabase con el **Service Role Key** (NO el anon key). Esto permite escritura directa en tablas protegidas por RLS.

Config en n8n:
```
Host: https://supabase.sistemaindumentaria.com
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la misma que en tu .env)
```

---

### **Paso 7: HTTP Request Node (Callback a Next.js)**

**Configuración:**
- **Nombre**: `Notificar a Next.js`
- **Tipo**: `HTTP Request`
- **Method**: `POST`
- **URL**: `https://wear.fashiondisplaysmexico.com/api/n8n/callback`
- **Headers**:
  - `Content-Type: application/json`
  - `X-N8N-SECRET: {{ $env.N8N_WEBHOOK_SECRET }}` (o hardcodeado si no usas env vars)
- **Body**:
  ```json
  {
    "jobId": "{{ $json.jobId }}",
    "status": "completado",
    "resultado": {
      "contenedores_insertados": 1,
      "cajas_insertadas": 20,
      "productos_nuevos": 1,
      "detalles": []
    },
    "errores": []
  }
  ```

---

## 4. JSON del Workflow Completo (para importar en n8n)

```json
{
  "name": "inv-tienda: Packing List → Supabase",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "procesar-packing-list",
        "responseMode": "responseBody"
      },
      "name": "Recibir Packing List",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "readFile",
        "binaryPropertyName": "=data",
        "options": {
          "range": "",
          "headerRow": true
        }
      },
      "name": "Leer Excel",
      "type": "n8n-nodes-base.spreadsheetFile",
      "typeVersion": 2,
      "position": [480, 300]
    },
    {
      "parameters": {
        "jsCode": "// Paso 3: Pre-normalización\nconst items = $input.all().map(item => item.json);\n\n// ... (ver código arriba) ...\n\nreturn { json: filasNormalizadas };"
      },
      "name": "Normalizar Columnas",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [720, 300]
    },
    {
      "parameters": {
        "model": "gpt-4o",
        "messages": {
          "message": [
            {
              "role": "system",
              "content": "=You are a data mapping expert..." // (ver prompt en Paso 4)
            },
            {
              "role": "user",
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        },
        "options": {
          "temperature": 0.1
        }
      },
      "name": "Mapear con LLM",
      "type": "n8n-nodes-base.openAi",
      "typeVersion": 1,
      "position": [960, 300]
    },
    {
      "parameters": {
        "jsCode": "// Paso 5: Validación y Enriquecimiento\n// ... (ver código arriba) ...\n\nreturn { json: validados };"
      },
      "name": "Validar y Enriquecer",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1200, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "tableId": "cajas_producto",
        "schema": "inv-tienda",
        "dataToSend": "autoMapInputData"
      },
      "name": "Guardar en Supabase",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 2,
      "position": [1440, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://wear.fashiondisplaysmexico.com/api/n8n/callback",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-N8N-SECRET",
              "value": "={{ $env.N8N_WEBHOOK_SECRET }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "jobId",
              "value": "={{ $json.jobId }}"
            },
            {
              "name": "status",
              "value": "completado"
            }
          ]
        }
      },
      "name": "Notificar a Next.js",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1680, 300]
    }
  ],
  "connections": {
    "Recibir Packing List": {
      "main": [[{"node": "Leer Excel", "type": "main", "index": 0}]]
    },
    "Leer Excel": {
      "main": [[{"node": "Normalizar Columnas", "type": "main", "index": 0}]]
    },
    "Normalizar Columnas": {
      "main": [[{"node": "Mapear con LLM", "type": "main", "index": 0}]]
    },
    "Mapear con LLM": {
      "main": [[{"node": "Validar y Enriquecer", "type": "main", "index": 0}]]
    },
    "Validar y Enriquecer": {
      "main": [[{"node": "Guardar en Supabase", "type": "main", "index": 0}]]
    },
    "Guardar en Supabase": {
      "main": [[{"node": "Notificar a Next.js", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

---

## 5. Cómo Importar Este Workflow en n8n

1. Copia el JSON del paso 4 arriba.
2. En la UI de n8n, ve a `Workflows` (izquierda).
3. Click en `Create Workflow`.
4. En el menú, click en los `...` (tres puntos) arriba a la derecha.
5. Selecciona `Import` → `From JSON`.
6. Pega el JSON y guarda.
7. **Configura las credenciales** (ver paso siguiente).

---

## 6. Credenciales Necesarias en n8n

### **6.1 OpenAI Account (para LLM)**
- **Tipo**: `openAiApi`
- **API Key**: Tu API Key de OpenAI (`sk-proj-...`)
- **Where**: `Settings` → `Credentials` → `New Credential` → `OpenAI`

### **6.2 Supabase (para conexión a la base de datos)**
- **Tipo**: `supabaseApi`
- **Host**: `https://supabase.sistemaindumentaria.com`
- **Service Role Key**: `eyJhbG...` (la misma que tienes en tu `.env.local`)
- **Where**: `Settings` → `Credentials` → `New Credential` → `Supabase`

---

## 7. Prompts Sugeridos para el LLM por Tipo de Proveedor

Como los Excel varían, puedes crear **sub-workflows** o usar un `If Node` para elegir el prompt adecuado:

### **Variante A: Proveedor "Fábrica A"** (columnas: STYLE NO, COLOR, SIZE, QTY/CTN)
```
System: Este proveedor usa el formato estándar con columnas directas.
Mapea: STYLE NO → sku_base, COLOR → color, SIZE → talla, QTY/CTN → piezas_por_caja
```

### **Variante B: Proveedor "Fábrica B"** (columnas: ART, DESCRIPCION, COLOUR, SIZES, UNITS)
```
System: Este proveedor usa un formato alternativo.
Mapea: ART → sku_base, DESCRIPCION → nombre, COLOUR → color, SIZES → talla, UNITS → cantidad_total
```

### **Variante C: Proveedor "Fábrica C"** (con columnas mezcladas, sin headers claros)
```
System: Este proveedor tiene un formato raro. Analiza las primeras filas para detectar 
dónde están los headers y mapea las columnas de acuerdo con:
- El SKU suele estar en la columna A (ej: PANT-001, SHIRT-002)
- El color suele estar en la columna D (ej: BLACK, WHITE, NAVY)
- La talla suele estar en la columna E (ej: M, L, XL)
- La cantidad por caja suele estar en la columna G (ej: 24, 12, 48)
```

---

## 8. Manejo de Errores en n8n

El workflow tiene 3 puntos de control de errores:

| Paso | Error posible | Solución en n8n |
|------|---------------|-----------------|
| **Paso 2** | Excel corrupto o no es .xlsx | `IF node` verifica Content-Type antes de leer |
| **Paso 4** | LLM devuelve JSON inválido | `Error Trigger` + `Code node` verifica formato JSON |
| **Paso 6** | Insert falla en Supabase | `Error Trigger` + `HTTP Request` envía callback con `status: "error"` |

**Nodo de Error Global (recomendado):**
Añadir un `Error Trigger` conectado al `HTTP Request Node` que siempre envíe callback a Next.js, incluso si hay error.

---

## 9. Monitoreo del Workflow

En la UI de n8n, puedes ver:
- **Execution List**: Historial de cada ejecución (éxito / error)
- **Execution Data**: Datos que pasaron por cada nodo
- **Error Log**: Detalles de errores específicos

**Para debugging:**
1. Activa `Execution Data` en `Settings` del workflow.
2. Revisa el `Execution` que te interesa.
3. Click en cada nodo para ver su input y output.

---

*Esta guía cubre la especificación completa del workflow de n8n para migrar Excel de Packing List a Supabase.*
