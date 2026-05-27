// modules/admin-table/config/types.ts

import type { LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de campo para edición rápida (copia local sin dependencias de cliente)
// ─────────────────────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'number' | 'currency' | 'select' | 'boolean' | 'date'

export type QuickEditField = {
  key: string
  label: string
  type: FieldType
  options?: { id: string | number; label: string }[]
  placeholder?: string
}

export type BulkActionVariant = 'default' | 'destructive' | 'outline'

export type BulkAction = {
  id: string
  label: string
  icon?: LucideIcon
  variant?: BulkActionVariant
  onClick: (ids: number[]) => Promise<boolean | void>
}

export type TableFeatures = {
  selectable?: boolean
  expandable?: boolean
  sortable?: boolean
  quickEdit?: QuickEditField[] | false
  bulkActions?: BulkAction[]
  columnSelector?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Config de tabla por usuario (tal como se guarda en Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export type UserTableConfigRow = {
  id: number
  user_id: number
  route: string
  features: TableFeatures
  columnas_visibles: string[] | null
  is_default: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Config global por defecto (sin usuario)
// ─────────────────────────────────────────────────────────────────────────────
export type TableConfigDefaultRow = {
  id: number
  route: string
  features: TableFeatures
  columnas_visibles: string[] | null
  description: string | null
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// payload para guardar/actualizar config
// ─────────────────────────────────────────────────────────────────────────────
export type SaveTableConfigPayload = {
  route: string
  features: TableFeatures
  columnas_visibles?: string[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Registro de tablas admin disponibles (para la UI de configuración)
// ─────────────────────────────────────────────────────────────────────────────
export type AdminTableDefinition = {
  route: string
  label: string
  description: string
  features_disponibles: (keyof TableFeatures)[]
}

// Lista estática de todas las tablas del admin que pueden configurarse
export const ADMIN_TABLES_LIST: AdminTableDefinition[] = [
  {
    route: '/catalogo',
    label: 'Catálogo de Productos',
    description: 'Listado de productos con búsqueda, filtros y acciones masivas.',
    features_disponibles: ['selectable', 'sortable', 'quickEdit', 'bulkActions', 'columnSelector'],
  },
  {
    route: '/inventario/notas',
    label: 'Notas de Inventario',
    description: 'Movimientos de inventario: entradas, salidas, transferencias.',
    features_disponibles: ['selectable', 'sortable', 'columnSelector'],
  },
  {
    route: '/inventario/stock',
    label: 'Stock por Bodega (Específico)',
    description: 'Inventario de una bodega seleccionada.',
    features_disponibles: ['sortable', 'columnSelector'],
  },
  {
    route: '/inventario/stock-global',
    label: 'Stock Global (Matriz)',
    description: 'Matriz consolidada de inventario en todas las bodegas.',
    features_disponibles: ['sortable', 'columnSelector'],
  },
  {
    route: '/ordenes-b2b',
    label: 'Órdenes B2B',
    description: 'Órdenes de compra con proveedores B2B.',
    features_disponibles: ['selectable', 'expandable', 'sortable', 'columnSelector'],
  },
  {
    route: '/ordenes-b2b/cajas',
    label: 'Cajas B2B',
    description: 'Cajas físicas vinculadas a órdenes B2B.',
    features_disponibles: ['selectable', 'sortable', 'columnSelector'],
  },
  {
    route: '/contenedores',
    label: 'Contenedores',
    description: 'Contenedores de importación con su estado y contenido.',
    features_disponibles: ['selectable', 'expandable', 'sortable', 'quickEdit', 'columnSelector'],
  },
]
