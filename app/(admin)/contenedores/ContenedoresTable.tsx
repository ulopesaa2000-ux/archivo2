// app/(admin)/contenedores/ContenedoresTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { DataTable, DataTableProvider, QuickEditPopover, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures, QuickEditField } from '@/components/admin/DataTable/types'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Ship, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { formatCurrency, cn } from '@/lib/utils'
import {
  ADMIN_ROUTES,
  ESTADO_CONTENEDOR_COLORS,
  ESTADO_CONTENEDOR_LABELS,
  ESTADOS_CONTENEDOR,
} from '@/lib/constants'
import type { ContenedorResumen, ContenedorSortBy } from '@/modules/contenedores/types'
import { toast } from 'sonner'

type Props = {
  items: ContenedorResumen[]
  sortBy: ContenedorSortBy
  order: 'asc' | 'desc'
  initialFeatures?: TableFeatures
}

const ESTADO_OPTIONS = ESTADOS_CONTENEDOR.map((estado) => ({
  id: estado,
  label: ESTADO_CONTENEDOR_LABELS[estado] ?? estado,
}))

const FALLBACK_FEATURES: TableFeatures = {
  selectable: true,
  expandable: true,
  sortable: true,
  quickEdit: [
    { key: 'estado', label: 'Estado', type: 'select', options: ESTADO_OPTIONS },
    { key: 'codigo_contenedor', label: 'Codigo', type: 'text' },
    { key: 'fecha_eta', label: 'ETA', type: 'date' },
  ],
}

async function handleQuickEditSave(ids: number[], field: string, value: unknown) {
  if (!['estado', 'codigo_contenedor', 'fecha_eta'].includes(field)) return

  const { quickEditContenedoresAction } = await import('@/modules/contenedores/actions')
  const result = await quickEditContenedoresAction(ids, field as 'estado' | 'codigo_contenedor' | 'fecha_eta', value ? String(value) : null)

  if (!result.success) {
    toast.error('No se pudo actualizar', { description: result.error })
    return
  }

  toast.success(`Actualizado ${ids.length} contenedor${ids.length > 1 ? 'es' : ''}`)
}

function ContenedoresTableInner({ items, sortBy, order }: Props) {
  const ctx = useDataTableContext()

  const quickEditFields = ((ctx.features.quickEdit as QuickEditField[] | null) ?? [])
    .map((field) => {
      if (field.key === 'estado') return { ...field, type: 'select' as const, options: ESTADO_OPTIONS }
      if (field.key === 'codigo_contenedor') return { ...field, type: 'text' as const, label: 'Codigo' }
      if (field.key === 'fecha_eta') return { ...field, type: 'date' as const, label: 'ETA' }
      return field
    })

  const estadoField = quickEditFields.find((field) => field.key === 'estado')
  const codigoField = quickEditFields.find((field) => field.key === 'codigo_contenedor')
  const etaField = quickEditFields.find((field) => field.key === 'fecha_eta')

  const columns: ColumnDef<ContenedorResumen>[] = [
    {
      key: 'numero_contenedor',
      header: 'No. Contenedor',
      sortKey: 'numero_contenedor',
      cell: (row) => (
        <span className="font-mono text-xs font-medium">
          {row.numero_contenedor ?? '-'}
        </span>
      ),
    },
    {
      key: 'codigo_contenedor',
      header: 'Codigo',
      sortKey: 'codigo_contenedor',
      cell: (row) => {
        const content = <span className="font-mono text-xs">{row.codigo_contenedor}</span>
        if (!codigoField) return content
        return (
          <QuickEditPopover
            field={codigoField}
            value={row.codigo_contenedor}
            rowId={row.contenedor_id}
            onSaveGlobal={handleQuickEditSave}
          >
            {content}
          </QuickEditPopover>
        )
      },
    },
    {
      key: 'fecha_eta',
      header: 'ETA',
      sortKey: 'fecha_eta',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      cell: (row) => {
        const content = <Fecha valor={row.fecha_eta} formato="fecha" className="text-xs" />
        if (!etaField) return content
        return (
          <QuickEditPopover
            field={etaField}
            value={row.fecha_eta}
            rowId={row.contenedor_id}
            onSaveGlobal={handleQuickEditSave}
          >
            {content}
          </QuickEditPopover>
        )
      },
    },
    {
      key: 'total_ordenes',
      header: 'Ordenes',
      sortKey: 'total_ordenes',
      headerClassName: 'text-center hidden lg:table-cell',
      className: 'text-center tabular-nums hidden lg:table-cell',
      cell: (row) => row.total_ordenes,
    },
    {
      key: 'cajas_totales',
      header: 'Cajas',
      sortKey: 'cajas_totales',
      headerClassName: 'text-center hidden lg:table-cell',
      className: 'text-center tabular-nums hidden lg:table-cell',
      cell: (row) => row.cajas_totales,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      cell: (row) => {
        const estadoColor = ESTADO_CONTENEDOR_COLORS[row.estado] ?? ''
        const badge = (
          <Badge variant="secondary" className={`text-xs ${estadoColor}`}>
            {ESTADO_CONTENEDOR_LABELS[row.estado] ?? row.estado}
          </Badge>
        )

        if (!estadoField) return badge

        return (
          <QuickEditPopover
            field={estadoField}
            value={row.estado}
            rowId={row.contenedor_id}
            onSaveGlobal={handleQuickEditSave}
          >
            {badge}
          </QuickEditPopover>
        )
      },
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px]',
      cell: (row) => (
        <Link
          href={ADMIN_ROUTES.contenedores.detalle(row.contenedor_id)}
          title={`Ver contenedor ${row.contenedor_id}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    ...(ctx.features.expandable ? [{
      key: 'expand',
      header: '',
      headerClassName: 'w-[40px]',
      cell: (row: ContenedorResumen) => {
        const isOpen = ctx.expandedIds.has(row.contenedor_id)
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label={isOpen ? `Colapsar contenedor ${row.contenedor_id}` : `Expandir contenedor ${row.contenedor_id}`}
            onClick={(e) => {
              e.stopPropagation()
              ctx.onToggleExpand(row.contenedor_id)
            }}
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )
      },
    }] : []),
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row) => row.contenedor_id}
      currentSortKey={sortBy}
      currentOrder={order}
      defaultSortKey="fecha_eta"
      emptyMessage="No se encontraron contenedores."
      emptyIcon={<Ship className="h-12 w-12" />}
      renderExpanded={(item) => (
        <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 text-sm sm:grid-cols-4">
          <div>
            <span className="text-xs text-muted-foreground">Naviera</span>
            <p className="font-medium">{item.naviera ?? '-'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">BL</span>
            <p className="font-mono text-xs">{item.numero_bl ?? '-'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Buque</span>
            <p>{item.buque ?? '-'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ruta</span>
            <p className="text-xs">{item.puerto_origen ?? '?'} {'->'} {item.puerto_destino ?? '?'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">ETD</span>
            <p><Fecha valor={item.fecha_etd} formato="fecha" className="text-xs" /></p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">ETA</span>
            <p><Fecha valor={item.fecha_eta} formato="fecha" className="text-xs" /></p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Peso</span>
            <p className="tabular-nums">{item.peso_total_kg ? `${item.peso_total_kg} kg` : '-'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">CBM</span>
            <p className="tabular-nums">
              {item.cbm_ocupado ?? 0} / {item.cbm_total ?? '?'}
              {item.pct_cbm_ocupado != null && (
                <span className="ml-1 text-muted-foreground">({item.pct_cbm_ocupado}%)</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Piezas</span>
            <p className="tabular-nums font-medium">{item.piezas_totales}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Valor</span>
            <p className="font-medium">{item.valor_total_usd ? formatCurrency(item.valor_total_usd, 'USD') : '-'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Proveedores</span>
            <p className="tabular-nums">{item.total_proveedores}</p>
          </div>
        </div>
      )}
    />
  )
}

export function ContenedoresTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/contenedores" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <ContenedoresTableInner {...props} />
    </DataTableProvider>
  )
}
