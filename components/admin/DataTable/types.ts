// components/admin/DataTable/types.ts
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de campo para edición rápida
// ─────────────────────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'textarea' | 'number' | 'currency' | 'select' | 'boolean' | 'date'

export type QuickEditField = {
  /** Key del campo en el registro (ej. 'precio_ec', 'estado') */
  key: string
  /** Label legible para mostrar en el popover */
  label: string
  /** Tipo de input */
  type: FieldType
  /** Opciones para campos select */
  options?: { id: string | number; label: string }[]
  /** Placeholder para inputs de texto */
  placeholder?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Acciones masivas
// ─────────────────────────────────────────────────────────────────────────────
export type BulkActionVariant = 'default' | 'destructive' | 'outline'

export type BulkAction = {
  id: string
  label: string
  icon?: LucideIcon
  variant?: BulkActionVariant
  /** Retorna true si la acción se ejecutó exitosamente (para limpiar selección) */
  onClick: (ids: number[]) => Promise<boolean | void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Features de tabla
// ─────────────────────────────────────────────────────────────────────────────
export type TableFeatures = {
  /** Habilita columna de checkboxes para selección múltiple */
  selectable?: boolean
  /** Habilita filas expandibles con toggle */
  expandable?: boolean
  /** Habilita ordenamiento por columnas (sortKey en ColumnDef) */
  sortable?: boolean
  /** Configuración de edición rápida por clic en celda */
  quickEdit?: QuickEditField[] | false
  /** Acciones disponibles en barra de bulk */
  bulkActions?: BulkAction[]
  /** Habilita selector de columnas visibles */
  columnSelector?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Config de una tabla específica
// ─────────────────────────────────────────────────────────────────────────────
export type TableConfig = {
  route: string
  label: string
  features: TableFeatures
}

// ─────────────────────────────────────────────────────────────────────────────
// Column definition (genérica, unchanged del original)
// ─────────────────────────────────────────────────────────────────────────────
export type ColumnDef<T> = {
  key: string
  header: string
  sortKey?: string
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado del provider
// ─────────────────────────────────────────────────────────────────────────────
export type DataTableState = {
  selectedIds: Set<string | number>
  expandedIds: Set<string | number>
  features: TableFeatures
  route: string
}