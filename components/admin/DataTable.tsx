// components/admin/DataTable.tsx
'use client'

/**
 * DataTable genérica con soporte de:
 * - Columnas tipadas (ColumnDef<T>[])
 * - Headers ordenables (sortKey + sortDir via URL)
 * - Filas expandibles (onExpandRow + renderExpanded)
 * - Estado vacío personalizable
 * - Estado de carga con opacidad
 *
 * Todos los cambios de sort se propagan vía URL (searchParams),
 * por lo que son compatibles con Server Components y sin re-mount del shell.
 */

import React, { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ChevronsUpDown, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type ColumnDef<T> = {
  /** Identificador único de la columna (también se usa como React key) */
  key: string

  /** Texto del encabezado. String vacío = sin header visible */
  header: string

  /**
   * Si está presente, el encabezado se convierte en un botón que ordena por
   * este campo. Debe coincidir con el nombre del campo en la BD / query.
   */
  sortKey?: string

  /** Renderiza la celda para una fila */
  cell: (row: T) => ReactNode

  /** Clases adicionales para la celda <td> */
  className?: string

  /** Clases adicionales para el <th> (override de alineación, ancho, etc.) */
  headerClassName?: string
}

type DataTableProps<T> = {
  /** Definición de columnas (tipada con T) */
  columns: ColumnDef<T>[]

  /** Datos a renderizar */
  data: T[]

  /** Extrae la clave única de cada fila */
  rowKey: (row: T) => string | number

  // ── Sort ──────────────────────────────────────────────────
  /**
   * Valor actual de sort_by en los searchParams.
   * Si no se provee, los headers sortables quedan desactivados.
   */
  currentSortKey?: string

  /**
   * Dirección actual del ordenamiento ('asc' | 'desc').
   * Por defecto 'desc'.
   */
  currentOrder?: 'asc' | 'desc'

  /**
   * Clave de sorteo por defecto (sin parámetro en URL).
   * Se usa para saber cuándo mostrar el botón de dirección.
   * Por defecto: 'id'
   */
  defaultSortKey?: string

  // ── Filas expandibles ─────────────────────────────────────
  /**
   * Set de IDs de filas expandidas. Si se pasa, el DataTable
   * renderiza un botón ▶/▼ en la primera columna.
   */
  expandedRows?: Set<string | number>

  /** Toggle de expansión de fila */
  onToggleRow?: (id: string | number) => void

  /** Contenido que se renderiza debajo de la fila cuando está expandida */
  renderExpanded?: (row: T) => ReactNode

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
  expandedRows,
  onToggleRow,
  renderExpanded,
  emptyMessage = 'No se encontraron resultados.',
  emptyIcon = <Inbox className="h-12 w-12" />,
  isLoading = false,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // ── Sort handler ───────────────────────────────────────────
  function handleSort(key: string, direction: 'asc' | 'desc') {
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

  const hasExpandable = !!onToggleRow

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
            {/* Columna extra para expand toggle */}
            {hasExpandable && (
              <TableHead className="w-[40px] px-2" />
            )}

            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn('text-xs font-semibold', col.headerClassName)}
              >
                {col.sortKey && currentSortKey !== undefined ? (
                  <SortableHeader
                    label={col.header}
                    field={col.sortKey}
                    currentSort={currentSortKey}
                    currentOrder={currentOrder}
                    onSort={handleSort}
                  />
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((row) => {
            const key = rowKey(row)
            const isExpanded = expandedRows?.has(key) ?? false

            return (
              <React.Fragment key={key}>
                <TableRow
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                >
                  {/* Expand button column */}
                  {hasExpandable && (
                    <TableCell className="px-2 py-3 w-[40px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleRow?.(key)
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
                      className={cn('py-3', col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Fila expandida */}
                {hasExpandable && isExpanded && renderExpanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell /> {/* celda vacía del toggle */}
                    <TableCell colSpan={columns.length} className="py-3 px-4">
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
}: {
  label: string
  field: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
}) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc'

  return (
    <button
      type="button"
      onClick={() => onSort(field, nextOrder)}
      className={cn(
        'flex items-center gap-1 group transition-colors whitespace-nowrap',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
