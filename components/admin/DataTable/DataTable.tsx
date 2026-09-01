// components/admin/DataTable/DataTable.tsx
'use client'

/**
 * DataTable genérico para todas las secciones admin.
 *
 * Características:
 * - Genérico <T> para cualquier tipo de dato
 * - Selección múltiple (optional)
 * - Filas expandibles (optional)
 * - Ordenamiento por URL (optional)
 * - QuickEdit inline (optional, configurado por columna)
 * - Bulk actions via BulkActionBar (optional)
 * - Estado vacío personalizable
 * - Loading state con opacidad
 *
 * Todos los cambios de sort se propagan vía URL (searchParams).
 */

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ChevronsUpDown, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { useDataTableContext } from './DataTableProvider'
import type { ColumnDef, QuickEditField, BulkAction, TableFeatures, FieldType, BulkActionVariant } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos (re-exportados desde types.ts)
// ─────────────────────────────────────────────────────────────────────────────
export type { ColumnDef, QuickEditField, BulkAction, TableFeatures, FieldType, BulkActionVariant }

// ─────────────────────────────────────────────────────────────────────────────
// Props del componente
// ─────────────────────────────────────────────────────────────────────────────
type Props<T> = {
  /** Definición de columnas */
  columns: ColumnDef<T>[]

  /** Datos a renderizar */
  data: T[]

  /** Función para extraer clave única de cada fila */
  rowKey: (row: T) => string | number

  // ── Sort ──────────────────────────────────────────────────
  currentSortKey?: string
  currentOrder?: 'asc' | 'desc'
  defaultSortKey?: string

  // ── Filas expandibles ─────────────────────────────────────
  /** Renderiza contenido extra debajo de la fila cuando está expandida */
  renderExpanded?: (row: T) => ReactNode

  /** Legacy: controlado externo (usar features.expandable + context) */
  expandedRows?: Set<string | number>
  /** Legacy: controlado externo */
  onToggleRow?: (id: string | number) => void

  // ── Empty state ───────────────────────────────────────────
  emptyMessage?: string
  emptyIcon?: ReactNode

  // ── Misc ──────────────────────────────────────────────────
  isLoading?: boolean
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  rowKey,
  currentSortKey,
  currentOrder = 'desc',
  defaultSortKey = 'id',
  renderExpanded,
  expandedRows,
  onToggleRow,
  emptyMessage = 'No se encontraron resultados.',
  emptyIcon = <Inbox className="h-12 w-12" />,
  isLoading = false,
  onRowClick,
  rowClassName,
}: Props<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const ctx = useDataTableContext()

  const { selectable, expandable, sortable } = ctx.features

  // Legacy support: controlled expand mode
  const isControlledExpand = expandedRows !== undefined && onToggleRow !== undefined

  // ── Sort handler ───────────────────────────────────────────
  function handleSort(key: string, direction: 'asc' | 'desc') {
    if (!sortable) return
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (key === defaultSortKey) {
        params.delete('sort_by')
        params.delete('order')
      } else {
        params.set('sort_by', key)
        params.set('order', direction)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const hasExpandable = expandable && !!renderExpanded

  // ── Empty state ────────────────────────────────────────────
  if (data.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="text-muted-foreground">{emptyIcon}</div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        isLoading && 'opacity-60 pointer-events-none'
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {/* Columna de selección general */}
            {selectable && (
              <TableHead className="w-[40px] px-3 text-center">
                <Checkbox
                  checked={
                    data.length > 0 &&
                    ctx.selectedIds.size === data.length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      ctx.selectAll(data.map(rowKey))
                    } else {
                      ctx.clearSelection()
                    }
                  }}
                  aria-label="Seleccionar todo"
                />
              </TableHead>
            )}

            {/* Columna extra para expand toggle */}
            {hasExpandable && (
              <TableHead className="w-[40px] px-2" />
            )}

            {columns.map((col) => {
              const isRight = col.headerClassName?.includes('text-right') || col.className?.includes('text-right')
              const isCenter = col.headerClassName?.includes('text-center') || col.className?.includes('text-center')

              return (
                <TableHead
                  key={col.key}
                  className={cn('text-xs font-semibold px-3 py-2.5', col.headerClassName)}
                >
                  {col.sortKey && sortable && currentSortKey !== undefined ? (
                    <SortableHeader
                      label={col.header}
                      field={col.sortKey}
                      currentSort={currentSortKey}
                      currentOrder={currentOrder}
                      onSort={handleSort}
                      className={cn(
                        isRight && 'justify-end ml-auto',
                        isCenter && 'justify-center mx-auto'
                      )}
                    />
                  ) : (
                    <div className={cn(
                      'flex items-center',
                      isRight && 'justify-end',
                      isCenter && 'justify-center'
                    )}>
                      {col.header}
                    </div>
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((row) => {
            const key = rowKey(row)
            const isExpanded = ctx.expandedIds.has(key)

            return (
              <React.Fragment key={key}>
                <TableRow
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    ctx.selectedIds.has(key) && 'bg-primary/5',
                    rowClassName?.(row)
                  )}
                >
                  {/* Columna de selección por fila */}
                  {selectable && (
                    <TableCell
                      className="px-3 w-[40px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={ctx.selectedIds.has(key)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(ctx.selectedIds)
                          if (checked) {
                            newSet.add(key)
                          } else {
                            newSet.delete(key)
                          }
                          ctx.onSelectionChange(newSet)
                        }}
                        aria-label="Seleccionar fila"
                      />
                    </TableCell>
                  )}

                  {/* Expand button column */}
                  {hasExpandable && (
                    <TableCell className="px-2 py-2.5 w-[40px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          ctx.onToggleExpand(key)
                        }}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted transition-colors"
                        aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                      >
                        <ChevronsUpDown
                          className={cn(
                            'h-3 w-3 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                    </TableCell>
                  )}

                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn('px-3 py-2.5', col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Fila expandida */}
                {hasExpandable && isExpanded && renderExpanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell />
                    <TableCell
                      colSpan={
                        columns.length +
                        (selectable ? 1 : 0) +
                        (hasExpandable ? 1 : 0) -
                        (hasExpandable ? 1 : 0)
                      }
                      className="py-3 px-4"
                    >
                      {renderExpanded(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header sortable
// ─────────────────────────────────────────────────────────────────────────────

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string
  field: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  className?: string
}) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc'

  return (
    <button
      type="button"
      onClick={() => onSort(field, nextOrder)}
      className={cn(
        'flex items-center gap-1 group transition-colors whitespace-nowrap',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {label}
      <span className="shrink-0">
        {isActive ? (
          currentOrder === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70" />
        )}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Index para re-exportar desde el directorio DataTable/
// ─────────────────────────────────────────────────────────────────────────────
export { DataTableProvider, useDataTableContext, useDataTableSelection, useDataTableExpand, useDataTableFeatures } from './DataTableProvider'
export { BulkActionBar } from './BulkActionBar'
export { QuickEditPopover } from './QuickEditPopover'
export { EmptyState } from './EmptyState'