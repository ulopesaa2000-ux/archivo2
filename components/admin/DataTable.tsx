// components/admin/DataTable.tsx
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Definición de una columna genérica.
 * T es el tipo de la fila de datos.
 */
export type ColumnDef<T> = {
  /** Identificador único de la columna */
  key: string
  /** Texto del header */
  header: string
  /** Función que extrae/renderiza el valor de la celda */
  cell: (row: T) => React.ReactNode
  /** Clase CSS adicional para la celda */
  className?: string
  /** Clase CSS adicional para el header */
  headerClassName?: string
}

type DataTableProps = {
  /** Cabeceras de la tabla */
  headers: React.ReactNode[]
  /** Datos de las filas ya renderizados (cada fila es un array de celdas) */
  rows: React.ReactNode[][]
  /** Función para obtener la key única de cada fila */
  rowKeys: (string | number)[]
  /** Mensaje cuando no hay datos */
  emptyMessage?: string
  /** Ícono cuando no hay datos */
  emptyIcon?: React.ReactNode
  /** Callback al hacer click en una fila */
  onRowClick?: (index: number) => void
  /** Clase CSS para filas clickeables */
  rowClassName?: (index: number) => string
  /** Estado de carga (muestra filas con opacidad) */
  isLoading?: boolean
}

/**
 * DataTable genérica reutilizable.
 */
export function DataTable({
  headers,
  rows,
  rowKeys,
  emptyMessage = 'No se encontraron resultados.',
  emptyIcon,
  onRowClick,
  rowClassName,
  isLoading = false,
}: DataTableProps) {
  if (rows.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {emptyIcon && (
            <div className="mb-4 text-muted-foreground">{emptyIcon}</div>
          )}
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
            {headers.map((header, i) => (
              <TableHead
                key={i}
                className={cn('text-xs font-semibold')}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowKeys[rowIndex]}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              className={cn(
                onRowClick && 'cursor-pointer',
                rowClassName?.(rowIndex)
              )}
            >
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className={cn('py-3')}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
