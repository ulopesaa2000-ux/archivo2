# Plan: DataTable Genérico + AdminTableConfig

## Contexto

El `DataTable` actual está acoplado al catálogo. El objetivo es:
- DataTable completamente genérico para todas las secciones admin
- QuickEditPopover disponible en varias tablas (configurable por tabla)
- BulkActionBar con acciones definidas por cada página (global configurable)
- Página `/configuracion/tablas` con persistencia en Supabase por usuario

## Decisiones del usuario

- **QuickEditPopover**: Disponible en varias tablas (no solo catálogo)
- **BulkActionBar**: Global configurable — cada página define sus acciones
- **Persistencia config**: Supabase (por usuario), no localStorage

---

## Arquitectura

### Estructura de archivos

```
components/admin/DataTable/
├── DataTable.tsx              # Componente base genérico
├── DataTableProvider.tsx      # Context provider (estado selección, features)
├── QuickEditPopover.tsx       # Edición inline genérica
├── BulkActionBar.tsx          # Barra de acciones masivas (genérica)
├── TableToolbar.tsx           # Barra superior con búsqueda/filtros
├── ExpandedRow.tsx            # Helper para filas expandibles
├── EmptyState.tsx             # Estado vacío
└── types.ts                   # Tipos compartidos

app/(admin)/configuracion/tablas/
├── page.tsx                   # Lista de tablas con toggles
├── TableConfigCard.tsx        # Tarjeta de config por tabla
└── actions.ts                 # Acciones de persistencia en Supabase

modules/admin-table/
├── config/actions.ts          # Guardar/cargar config de tabla por usuario
├── config/queries.ts          # Queries de configuración
└── config/types.ts            # Tipos de configuración
```

### API de uso por página

```tsx
<AdminTableProvider
  route="catalogo"
  features={{
    selectable: true,
    expandable: false,
    sortable: true,
    quickEdit: { fields: ['precio_ec', 'estado', 'marca_id', 'descripcion', 'familia'] },
    bulkActions: [{ id: 'delete', label: 'Desactivar', icon: Trash2, variant: 'destructive' }],
  }}
>
  <DataTable<T> columns={columns} data={data} rowKey={r => r.id} />
  <BulkActionBar />
</AdminTableProvider>
```

---

## Implementación por fases

### Fase 1: Tipos y Provider

**1.1. `components/admin/DataTable/types.ts`** (NUEVO)
```ts
export type FieldType = 'text' | 'number' | 'currency' | 'select' | 'boolean' | 'date'

export type QuickEditField = {
  key: string
  label: string
  type: FieldType
  options?: { id: string | number; label: string }[]  // para select
  placeholder?: string
}

export type BulkAction = {
  id: string
  label: string
  icon: LucideIcon
  variant?: 'default' | 'destructive'
  onClick: (ids: number[]) => Promise<void>
}

export type TableFeatures = {
  selectable?: boolean
  expandable?: boolean
  sortable?: boolean
  quickEdit?: QuickEditField[] | false
  bulkActions?: BulkAction[]
  columnSelector?: boolean
}

export type TableConfig = {
  route: string
  label: string
  features: TableFeatures
}
```

**1.2. `components/admin/DataTable/DataTableProvider.tsx`** (NUEVO)
- Context con: `selectedIds`, `expandedIds`, `features`, `onSelectionChange`, `onToggleExpand`
- Provider recibe `features` y `route`
- Carga config del usuario desde Supabase al montar
- Expone `clearSelection()`, `selectAll(ids[])`

### Fase 2: DataTable base refactor

**2.1. `components/admin/DataTable/DataTable.tsx`** (REEMPLAZAR)
- Mantiene genérico `<T>`
- Usa `useDataTableContext()` para features
- Renderiza checkboxes si `selectable`
- Renderiza toggle de expansión si `expandable`
- Pasa `onSave` al `QuickEditPopover` cuando está configurado

**2.2. `components/admin/DataTable/ExpandedRow.tsx`** (NUEVO)
- Helper para renderizar contenido expandido
- Recibe `renderExpanded: (row: T) => ReactNode`

### Fase 3: QuickEditPopover genérico

**3.1. `components/admin/DataTable/QuickEditPopover.tsx`** (NUEVO, basado en actual)
- Acepta `field: QuickEditField` en vez de `config` hardcodeado
- Tipos de campo: text, number, currency, select, boolean
- Callback `onSave({ ids, field, value })`
- Confirmación masiva si `selectedIds.size > 1`

### Fase 4: BulkActionBar genérico

**4.1. `components/admin/DataTable/BulkActionBar.tsx`** (NUEVO)
- Recibe `actions: BulkAction[]` desde el provider o props
- Muestra contador de seleccionados
- Para cada acción, llama `action.onClick(Array.from(selectedIds))`
- No tiene lógica de negocio acoplada

### Fase 5: Módulo de persistencia

**5.1. `modules/admin-table/config/types.ts`** (NUEVO)
```ts
export type UserTableConfig = {
  user_id: string
  route: string
  features: TableFeatures
  columnas_visibles: string[] | null  // null = todas
  updated_at: string
}
```

**5.2. `modules/admin-table/config/queries.ts`** (NUEVO)
- `fetchUserTableConfig(userId, route): Promise<TableConfig | null>`
- `fetchAllUserTableConfigs(userId): Promise<UserTableConfig[]>`

**5.3. `modules/admin-table/config/actions.ts`** (NUEVO)
- `saveTableConfigAction(config: TableConfig): Promise<ActionResult>`
- `resetTableConfigAction(route): Promise<ActionResult>`

### Fase 6: Página de configuración

**6.1. `app/(admin)/configuracion/tablas/page.tsx`** (NUEVO)
- Lista ثابتa de rutas admin: catalogo, inventario/notas, inventario/stock, ordenes-b2b, ordenes-b2b/cajas, contenedores
- Para cada ruta muestra toggles: selectable, expandable, sortable, quickEdit, bulkActions, columnSelector
- Si quickEdit activo, muestra lista de campos editables
- Botón "Guardar cambios" → `saveTableConfigAction`
- Botón "Restablecer valores predeterminados"

**6.2. `app/(admin)/configuracion/tablas/actions.ts`** (NUEVO)
- Server actions que delegan a `modules/admin-table/config/actions.ts`

### Fase 7: Migración de tablas existentes

**7.1. `CatalogoTable.tsx`** — ACTUALIZAR
- Extraer `bulkActions` del provider o pasar directo
- Mantener `QuickEditPopover` con campos específicos de producto

**7.2. `NotasTable.tsx`** — ACTUALIZAR
- `features={{ selectable: false, expandable: false, sortable: true }}`
- Sin quickEdit, sin bulkActions

**7.3. `OrdenesTable.tsx`** — ACTUALIZAR
- `features={{ selectable: true, expandable: true, sortable: true }}`
- Sin quickEdit, con bulkActions vacíos

**7.4. Nueva `CajasTable.tsx`** (crear en `app/(admin)/ordenes-b2b/cajas/`)
- `features={{ selectable: true, expandable: false, sortable: true }}`
- Sin quickEdit, bulkActions vacío

---

## Archivos a crear/modificar

### NUEVOS
- `components/admin/DataTable/types.ts`
- `components/admin/DataTable/DataTableProvider.tsx`
- `components/admin/DataTable/QuickEditPopover.tsx`
- `components/admin/DataTable/BulkActionBar.tsx`
- `components/admin/DataTable/TableToolbar.tsx`
- `components/admin/DataTable/ExpandedRow.tsx`
- `components/admin/DataTable/EmptyState.tsx`
- `modules/admin-table/config/queries.ts`
- `modules/admin-table/config/actions.ts`
- `modules/admin-table/config/types.ts`
- `app/(admin)/configuracion/tablas/page.tsx`
- `app/(admin)/configuracion/tablas/TableConfigCard.tsx`

### MODIFICADOS
- `components/admin/DataTable.tsx` → Mover a `DataTable/DataTable.tsx`
- `app/(admin)/catalogo/CatalogoTable.tsx` → Actualizar a nuevo API
- `app/(admin)/inventario/notas/NotasTable.tsx` → Actualizar
- `app/(admin)/ordenes-b2b/OrdenesTable.tsx` → Actualizar
- `app/(admin)/ordenes-b2b/cajas/CajasTable.tsx` → Crear (referencia NotasTable)
- `lib/constants.ts` → Agregar rutas de configuracion

---

## Verificación

1. `/catalogo` — seguir funcionando igual (selección múltiple, quickEdit, bulk actions)
2. `/inventario/notas` — sin quickEdit, sin bulk, con ordenamiento
3. `/ordenes-b2b` — con filas expandibles y selección
4. `/ordenes-b2b/cajas` — similar a notas
5. `/configuracion/tablas` — carga, muestra toggles, guarda en Supabase
6. TypeScript compila sin errores en todos los archivos nuevos y modificados