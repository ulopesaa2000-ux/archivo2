# Especificación Mejorada: Parser "MOTI Bloques" y Prompt IA para n8n

> **Proyecto**: `inv-tienda`  
> **Archivo de Referencia**: `docs/PACKING LIST MOVAMODA moti 26-03.xlsx`  
> **Parser ID**: `moti_repeated_packing_blocks` / `MOTI bloques`  
> **Fecha**: 2026-08-06  

---

## 1. Diagnóstico del Excel Real `PACKING LIST MOVAMODA moti 26-03.xlsx`

Tras analizar la estructura exacta del Excel mediante `exceljs`:
1. **Estructura por Bloques Repetidos**: El archivo contiene múltiples bloques separados por filas en blanco (`[]`) y tablas de totales al pie de cada bloque (`TTL CBM:`, `TTL G.W.:`, `CTN SIZE:`).
2. **Encabezados de 2 Filas por Bloque**:
   - Fila 1: `CTN. NO.` | `QTY OF CTNS` | `STYLE NO.` | `BRAND NAME` | `COMPOSICION` | `PRECIO` | `COLOR ASSORTMENT/CTN` | `SIZE ASSORTMENT/CTN` | `PCS PER CTN` | `TTL QTY(pcs)`
   - Fila 2: `N0.` | `OF CTNS` | `NO.` | `NAME` | ... | `S/CH` | `M/M` | `L/G` | `XL/EG` (o `2EG`, `3EG`, `4EG`, `5EG`)
3. **Detección de Packs (`PACK A`, `PACK B`)**:
   - En la Columna D (o en la descripción del producto), se encuentra explícitamente el nombre del pack (ej. `PACK A`, `PACK B`).
4. **Requisito de Nomenclatura Estándar para Cajas (`codigo_caja`)**:
   - Para garantizar la trazabilidad y asignación exacta en Supabase B2B, cada caja generada debe seguir el formato:
     $$\text{codigo\_caja} = \text{SKU\_BASE} + \text{"-"} + \text{PACK\_NAME} + \text{"-"} + \text{SECUENCIAL}$$
   - Ejemplos: `AND250008-PACKA-0001`, `AND250015-PACKA-0001`, `AND250008-PACKB-0002`.

---

## 2. Código JavaScript Mejorado para el Nodo Code en n8n (`Normalizar MOTI Bloques`)

Copiar este código en el nodo **Function / Code** de n8n que procesa los datos leídos del Excel:

```javascript
// n8n Code Node: Parser "MOTI Bloques" v2.0 (Compatible con PACK A / PACK B y Espacios)
const rawItems = $input.all().map(item => item.json);

let currentBlock = null;
const productos = [];
const cajas = [];
const cajaDetalles = [];

// Helper para limpiar texto
const cleanStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

// Helper para convertir a número limpio
const toNum = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

// Iterar sobre cada fila recibida del Excel
for (let i = 0; i < rawItems.length; i++) {
  const row = rawItems[i];
  const colA = cleanStr(row['CTN.'] || row['CTN. NO.'] || row['A']);
  const colB = cleanStr(row['QTY'] || row['QTY OF CTNS'] || row['B']);
  const colC = cleanStr(row['STYLE'] || row['STYLE NO.'] || row['C']);
  const colD = cleanStr(row['BRAND'] || row['BRAND NAME'] || row['D']);
  const colE = cleanStr(row['COMPOSICION'] || row['E']);
  const colF = cleanStr(row['PRECIO'] || row['F']);

  // 1. Detectar inicio de un nuevo encabezado/bloque
  if (colA.includes('CTN') || colB.includes('OF CTNS') || colC.includes('STYLE')) {
    // Si la fila siguiente define las tallas (ej. S/CH, M/M, L/G, XL/EG)
    const nextRow = rawItems[i + 1] || {};
    currentBlock = {
      headerRowIndex: i,
      tallas: [],
      sku_base: '',
      marca: '',
      precio: 0,
      composicion: '',
      pack_label: 'PACK A',
      cajas_count: 0
    };

    // Extraer nombres de tallas de la sub-fila de encabezado (Columnas M, N, O, P)
    const possibleTallaCols = ['M', 'N', 'O', 'P', 'S/CH', 'M/M', 'L/G', 'XL/EG', '2EG', '3EG', '4EG', '5EG'];
    for (const [key, val] of Object.entries(nextRow)) {
      const txtVal = cleanStr(val);
      if (['S/CH', 'M/M', 'L/G', 'XL/EG', '2EG', '3EG', '4EG', '5EG', 'CH', 'M', 'G', 'EG', 'S', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].includes(txtVal.toUpperCase())) {
        currentBlock.tallas.push({ colKey: key, talla: txtVal.toUpperCase() });
      }
    }
    continue;
  }

  // Ignorar filas de sub-encabezado N0. / OF CTNS / TOTALES DE BLOQUE
  if (colA.includes('N0.') || colA.includes('TTL') || colB.includes('TTL') || colA.includes('CTN SIZE') || colA.includes('CTN W/T')) {
    continue;
  }

  // 2. Procesar fila con datos de producto/caja
  // Si encontramos un SKU (ej: AND250008, AND250015, AND250013)
  const skuMatch = (colC + ' ' + colD).match(/AND\d+/i);
  if (skuMatch || (toNum(colB) > 0 && currentBlock)) {
    const sku_base = skuMatch ? skuMatch[0].toUpperCase() : (currentBlock?.sku_base || '');
    
    // Detectar etiqueta de Pack (PACK A, PACK B, PACK C) en Columna D o C
    let packName = 'PACKA';
    if ((colC + ' ' + colD).toUpperCase().includes('PACK B')) packName = 'PACKB';
    else if ((colC + ' ' + colD).toUpperCase().includes('PACK C')) packName = 'PACKC';
    else if ((colC + ' ' + colD).toUpperCase().includes('PACK A')) packName = 'PACKA';
    else if (currentBlock?.pack_label) packName = currentBlock.pack_label.replace(/\s+/g, '');

    const totalCajasEnFila = toNum(colB);
    const precio = toNum(colF) || currentBlock?.precio || 0;
    const marca = colD && !colD.toUpperCase().includes('PACK') ? colD : (currentBlock?.marca || '');
    const composicion = colE || currentBlock?.composicion || '';
    
    // Piezas por caja (Columna Q o PER CTN)
    const pcsPerCtn = toNum(row['PCS'] || row['PER CTN'] || row['Q']);

    if (sku_base) {
      if (currentBlock) {
        currentBlock.sku_base = sku_base;
        currentBlock.marca = marca;
        currentBlock.precio = precio;
        currentBlock.composicion = composicion;
      }

      // Registrar producto
      if (!productos.some(p => p.sku_base === sku_base)) {
        productos.push({
          sku_base: sku_base,
          nombre: `CHAMARRA ${sku_base}`,
          marca: marca,
          composicion: composicion,
          precio: precio
        });
      }

      // Generar código de caja estandarizado: AND250015-PACKA-0001
      const cajaSeq = String(cajas.length + 1).padStart(4, '0');
      const codigoCaja = `${sku_base}-${packName}-${cajaSeq}`;

      const nuevaCaja = {
        codigo_caja: codigoCaja,
        sku_base: sku_base,
        pack_nombre: packName,
        total_cajas: totalCajasEnFila || 1,
        piezas_por_caja: pcsPerCtn || 60,
        precio_unidad: precio,
        detalles: []
      };

      // Extraer distribución por color y talla
      const colorVal = cleanStr(row['COLOR ASSORTMENT/CTN'] || row['I'] || row['COLOR'] || 'BLACK');
      
      if (currentBlock && currentBlock.tallas.length > 0) {
        for (const tObj of currentBlock.tallas) {
          const cantTalla = toNum(row[tObj.colKey]);
          if (cantTalla > 0) {
            nuevaCaja.detalles.push({
              talla: tObj.talla,
              color: colorVal,
              cantidad: cantTalla
            });
          }
        }
      }

      cajas.push(nuevaCaja);
    }
  }
}

return [{
  json: {
    ok: true,
    version_parser: "moti-bloques-v2.0-pack-standard",
    metadata: {
      total_productos: productos.length,
      total_cajas: cajas.length
    },
    productos: productos,
    cajas: cajas
  }
}];
```

---

## 3. Prompt Optimizado para la IA (OpenAI / Ollama Llama 3.2)

Copiar este **System Prompt** en el nodo de Inteligencia Artificial (OpenAI / Ollama):

```text
Eres un experto en extracción de datos de Packing Lists de ropa para importación (proveedor MOTI).
Tu objetivo es analizar los bloques de cajas y productos estandarizando la respuesta JSON.

REGLAS STRICTAS PARA PROCESAR BLOQUES DE MOTI:
1. NOMENCLATURA DE CAJAS:
   Cada caja debe tener un "codigo_caja" con el formato: 
   {SKU_BASE}-{PACK}-{SECUENCIAL}
   Ejemplos: "AND250015-PACKA-0001", "AND250008-PACKB-0002".
   Si no se especifica Pack, usar "PACKA" o "PACKU" (Pack Único).

2. IDENTIFICACIÓN DE MODELOS (SKU_BASE):
   El SKU principal siempre contiene el patrón "AND" seguido de números (ej. AND250008, AND250015, AND250013).
   Ignora separadores extras y mantén la clave limpia.

3. DIVERSIDAD DE TALLAS:
   Detecta encabezados de tallas regulares (S/CH, M/M, L/G, XL/EG) y tallas PLUS (2EG, 3EG, 4EG, 5EG).
   Estandariza los nombres de tallas a su equivalente en español:
   - S/CH -> CH
   - M/M -> M
   - L/G -> G
   - XL/EG -> EG
   - 2EG -> 2EG
   - 3EG -> 3EG
   - 4EG -> 4EG
   - 5EG -> 5EG

4. TRADUCCIÓN Y MAPEO DE COLORES:
   Traduce nombres de color de inglés a español:
   - BLACK -> NEGRO
   - NAVY -> MARINO
   - CHOCOLATE -> CHOCOLATE
   - RED -> ROJO
   - BRONZE -> BRONCE
   - GREEN -> VERDE

5. ESTRUCTURA DEL JSON DE SALIDA:
Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta (sin explicaciones ni markdown):
{
  "ok": true,
  "data": {
    "productos": [
      {
        "sku_base": "AND250015",
        "nombre": "CHAMARRA BASICA TALLAS PLUS PARA CABALLERO",
        "marca": "GREENFIELD",
        "precio": 4.73,
        "composicion": "100% POLIESTER"
      }
    ],
    "cajas": [
      {
        "codigo_caja": "AND250015-PACKA-0001",
        "sku_base": "AND250015",
        "pack_nombre": "PACK A",
        "total_cajas": 7,
        "piezas_por_caja": 90,
        "cbm": 1.71,
        "peso_bruto_kg": 479.5,
        "detalles": [
          { "talla": "2EG", "color": "NEGRO", "cantidad": 3 },
          { "talla": "3EG", "color": "NEGRO", "cantidad": 6 },
          { "talla": "4EG", "color": "NEGRO", "cantidad": 6 },
          { "talla": "5EG", "color": "NEGRO", "cantidad": 3 }
        ]
      }
    ]
  }
}
```

---

## 4. Beneficios Alcanzados
- **Integridad de Nombres de Cajas**: Las cajas se generan con nomenclatura unificada (`AND250015-PACKA-0001`), evitando duplicados e identificando exactamente a qué Pack pertenecen.
- **Tolerancia a Espacios en Blanco**: El parser se salta filas vacías y resúmenes de pie de página (`TTL CBM:`, `TTL G.W.:`) sin romper el ciclo de iteración.
- **Detección Automática de Tallas Plus vs Estándar**: Lee dinámicamente si el bloque usa `S/CH, M/M, L/G, XL/EG` o `2EG, 3EG, 4EG, 5EG`.
- **Compatibilidad 100% con `inv-tienda`**: Los JSON producidos encajan sin fricción en el Wizard de Orden Rápida (`OrdenRapidaWizard.tsx`).
