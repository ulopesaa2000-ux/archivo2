# Skill: Patron de Importacion Masiva con Validacion de Duplicados

## Descripcion

Este skill documenta y codifica el patron de importacion masiva reusable que se extrae del modulo de catalogo/imagenes (ImportarMasivoModal.tsx) y se aplica a otros modulos del sistema (productos, variantes, inventario, etc.).

El patron sigue una arquitectura de **3 pasos**:
1. **Subir/Cargar fuente** (archivos, CSV, Excel) - validacion de formato y limite
2. **Revisar y resolver duplicados** - deteccion automatica, resolucion interactiva  
3. **Confirmar e importar** - insercion batch, reporte de resultados

## Origen

Extraido del `ImportarMasivoModal.tsx` del modulo de imagenes de catalogo.
Aplicado/refactorizado para: importacion de productos via CSV.

## Reglas Inquebrantables

1. El estado siempre vive en la URL o en React state (nunca en BD sin confirmacion)
2. La validacion de duplicados siempre sucede en el cliente CONTRA una cache de datos existentes
3. Nunca se modifica la BD hasta que el usuario confirma explicitamente
4. Cada paso debe tener loading skeleton y manejo de errores
5. Las Server Actions solo hacen la persistencia final

## Patron de 3 Pasos

### Paso 1: Carga de Fuente

```
Estados del item: 'pending' | 'valid' | 'invalid'
Validaciones: tipo de archivo, formato, limite de filas/archivos
Cachear en memoria todos los items a importar
```

### Paso 2: Revision de Duplicados

```
Cargar todos los registros EXISTENTES de una query (una sola vez)
Para cada item:
  - Detectar coincidencia (auto-match por nombre/CSV/sku)
  - Si duplicado -> estado 'duplicado', permitir Omitir/Actualizar/Cancelar
  - Si nuevo -> estado 'nuevo'
  - Si no identificable -> estado 'manual', buscador interactivo
```

### Paso 3: Confirmacion e Import

```
Filtrar solo items con estado != 'duplicado_omitir'
Agrupar por accion: 'crear' | 'actualizar' | 'omitir'
Ejecutar Server Actions batch
Reportar resultados (exito/fallo) por item
```

## Componentes Reutilizables

### Validacion de SKU Duplicado

```typescript
// Normaliza para comparar: upper, sin espacios, / en vez de _ y -
function normalizeSku(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, '/').replace(/\s+/g, '')
}

// Cache de SKUs existentes (una sola query al entrar al paso 2)
const allSkusRef = useRef<SkuRecord[]>([])

// Match exacto normalizado
const exact = allSkus.find(s => normalizeSku(s.sku_base) === nameNorm)

// Fuzzy matching con Levenshtein (usar solo si se necesita)
function levenshteinDistance(a: string, b: string): number { ... }
```

### Interface CsvRow (ejemplo para productos)

```typescript
interface CsvProducto {
  sku_base: string     // PK - siempre se valida duplicado
  nombre: string       // Requerido
  descripcion: string  // Opcional
  familia: string      // Default: 'F000-000C'
  precio_ec: number    // Opcional
  marca_id: number     // Referencia a cat_marcas
  genero_id: number    // Referencia a cat_generos
  estado: string       // Default: 'borrador'
  // ...otros campos libres del CSV
}
```

### Estado del Item en Importacion

```typescript
interface ImportItem<T> {
  id: number           // Index temporal del array
  data: T              // Datos parseados de la fuente (CSV/fila)
  status: 'nuevo' | 'duplicado' | 'omitido' | 'actualizar' | 'sin_sku' | 'error'
  existingId?: number   // ID del producto existente encontrado (si duplicado)
  existingSku?: string  // SKU del producto existente (si duplicado)
  errors: string[]     // Errores de validacion
  action: 'crear' | 'omitir' | 'actualizar'  // Accion elegida por usuario
}
```

## Server Actions

### validateCsvBeforeImportAction

```typescript
// Valida el CSV parseado en el servidor (sin tocar BD aun)
// Devuelve: { validos, duplicados, erroresDeFormato }
```

### importProductsFromCsvAction

```typescript
// Recibe solo los items CONFIRMADOS por el usuario
// Inserta/actualiza en batch
// Devuelve: { creados: number, actualizados: number, omitidos: number, fallidos: number }
```

## Referencia Visual del Wizard

```
+-----------------------------------------------------+
|  Header (title + boton cerrar + indicador de pasos) |
+-----------------------------------------------------+
|                                                     |
|   PASO 1: DropZone / FileInput + Preview grid       |
|   PASO 2: Tabla de revision con estados por fila   |
|   PASO 3: Resumen y confirmacion final             |
|                                                     |
|   Footer: [Atras] [Siguiente/Importar]              |
+-----------------------------------------------------+
```

## Location

Este skill se encuentra en:
- `.claude/skills/importacion-masiva/SKILL.md`
