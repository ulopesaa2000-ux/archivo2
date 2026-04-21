// components/admin/DataTable/ExpandedRow.tsx
'use client'

import type { ReactNode } from 'react'
import { TableRow, TableCell } from '@/components/ui/table'
import { useDataTableContext } from './DataTableProvider'

type Props<T> = {
  row: T
  rowKey: string | number
  renderExpanded: (row: T) => ReactNode
  columnsCount: number
  selectable?: boolean
}

export function ExpandedRow<T>({
  row,
  rowKey,
  renderExpanded,
  columnsCount,
  selectable,
}: Props<T>) {
  const ctx = useDataTableContext()
  const isExpanded = ctx.expandedIds.has(rowKey)

  if (!isExpanded) return null

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      {/* Empty cell for expand toggle column */}
      <TableCell className="w-[40px]" />
      {/* Empty cell for selection column if present */}
      {selectable && <TableCell className="w-[40px]" />}
      <TableCell colSpan={columnsCount} className="py-3 px-4">
        {renderExpanded(row)}
      </TableCell>
    </TableRow>
  )
}