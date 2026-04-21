'use client'

// components/admin/DataTable/DataTableProvider.tsx

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { TableFeatures, QuickEditField } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
type DataTableContextValue = {
  // Selección
  selectedIds: Set<string | number>
  onSelectionChange: (ids: Set<string | number>) => void
  clearSelection: () => void
  selectAll: (ids: (string | number)[]) => void

  // Expansión
  expandedIds: Set<string | number>
  onToggleExpand: (id: string | number) => void
  clearExpanded: () => void

  // Features
  features: TableFeatures

  // Route (para referencia)
  route: string

  // QuickEdit callback global (para pasar a celdas que lo necesiten)
  onQuickEditSave?: (ids: number[], field: string, value: unknown) => Promise<void>
}

const DataTableContext = createContext<DataTableContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  route: string
  features: TableFeatures
  onQuickEditSave?: (ids: number[], field: string, value: unknown) => Promise<void>
  children: ReactNode
}

export function DataTableProvider({
  route,
  features,
  onQuickEditSave,
  children,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set())

  // Limpiar selección cuando cambian los features (navegación entre páginas)
  useEffect(() => {
    setSelectedIds(new Set())
    setExpandedIds(new Set())
  }, [route])

  const onSelectionChange = useCallback((ids: Set<string | number>) => {
    setSelectedIds(ids)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectAll = useCallback((ids: (string | number)[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const onToggleExpand = useCallback((id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearExpanded = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const value: DataTableContextValue = {
    selectedIds,
    onSelectionChange,
    clearSelection,
    selectAll,
    expandedIds,
    onToggleExpand,
    clearExpanded,
    features,
    route,
    onQuickEditSave,
  }

  return (
    <DataTableContext.Provider value={value}>
      {children}
    </DataTableContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useDataTableContext(): DataTableContextValue {
  const ctx = useContext(DataTableContext)
  if (!ctx) {
    throw new Error('useDataTableContext must be used inside DataTableProvider')
  }
  return ctx
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience hooks
// ─────────────────────────────────────────────────────────────────────────────
export function useDataTableSelection() {
  const { selectedIds, onSelectionChange, clearSelection, selectAll } =
    useDataTableContext()
  return { selectedIds, onSelectionChange, clearSelection, selectAll }
}

export function useDataTableExpand() {
  const { expandedIds, onToggleExpand, clearExpanded } = useDataTableContext()
  return { expandedIds, onToggleExpand, clearExpanded }
}

export function useDataTableFeatures() {
  const { features } = useDataTableContext()
  return features
}

// ─────────────────────────────────────────────────────────────────────────────
// HOC para envolver un field con QuickEdit si está configurado
// (Reexporta el tipo para conveniencia)
// ─────────────────────────────────────────────────────────────────────────────
export type { QuickEditField }