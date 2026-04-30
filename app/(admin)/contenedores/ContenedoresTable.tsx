// app/(admin)/contenedores/ContenedoresTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { DataTable, DataTableProvider, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures } from '@/components/admin/DataTable/types'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Ship, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { formatCurrency, cn } from '@/lib/utils'
import { ADMIN_ROUTES, ESTADO_CONTENEDOR_COLORS, ESTADO_CONTENEDOR_LABELS } from '@/lib/constants'
import type { ContenedorResumen } from '@/modules/contenedores/types'

type Props = {
  items: ContenedorResumen[]
  initialFeatures?: TableFeatures
}

function ContenedoresTableInner({ items }: Props) {
  const ctx = useDataTableContext()

  const columns: ColumnDef<ContenedorResumen>[] = [
    {
      key: 'numero_contenedor',
      header: 'N° Contenedor',
      sortKey: 'numero_contenedor',
      cell: (row) => (
        <span className="font-mono text-xs font-medium">
          {row.numero_contenedor ?? '—'}
        </span>
      ),
    },
    {
      key: 'codigo_contenedor',
      header: 'Código',
      sortKey: 'codigo_contenedor',
      cell: (row) => <span className="font-mono text-xs">{row.codigo_contenedor}</span>,
    },
    {
      key: 'fecha_eta',
      header: 'ETA',
      sortKey: 'fecha_eta',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      cell: (row) => <Fecha valor={row.fecha_eta} formato="fecha" className="text-xs" />,
    },
    {
      key: 'total_ordenes',
      header: 'Órdenes',
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
        return (
          <Badge variant="secondary" className={`text-xs ${estadoColor}`}>
            {ESTADO_CONTENEDOR_LABELS[row.estado] ?? row.estado}
          </Badge>
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
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}>
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
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
            aria-label={isOpen ? `Colapsar contenedor ${row.contenedor_id}` : `Expandir contenedor ${row.contenedor_id}`}
            onClick={(e) => {
              e.stopPropagation()
              ctx.onToggleExpand(row.contenedor_id)
            }}>
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        )
      }
    }] : []),
  ]

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row) => row.contenedor_id}
      defaultSortKey="fecha_eta"
      emptyMessage="No se encontraron contenedores."
      emptyIcon={<Ship className="h-12 w-12" />}
      renderExpanded={(item) => (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm p-4 bg-muted/20">
          <div>
            <span className="text-muted-foreground text-xs">Naviera</span>
            <p className="font-medium">{item.naviera ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">BL</span>
            <p className="font-mono text-xs">{item.numero_bl ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Buque</span>
            <p>{item.buque ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Ruta</span>
            <p className="text-xs">{item.puerto_origen ?? '?'} → {item.puerto_destino ?? '?'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">ETD</span>
            <p><Fecha valor={item.fecha_etd} formato="fecha" className="text-xs" /></p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">ETA</span>
            <p><Fecha valor={item.fecha_eta} formato="fecha" className="text-xs" /></p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Peso</span>
            <p className="tabular-nums">{item.peso_total_kg ? `${item.peso_total_kg} kg` : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">CBM</span>
            <p className="tabular-nums">
              {item.cbm_ocupado ?? 0} / {item.cbm_total ?? '?'}
              {item.pct_cbm_ocupado != null && (
                <span className="text-muted-foreground ml-1">({item.pct_cbm_ocupado}%)</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Piezas</span>
            <p className="tabular-nums font-medium">{item.piezas_totales}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Valor</span>
            <p className="font-medium">{item.valor_total_usd ? formatCurrency(item.valor_total_usd, 'USD') : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Proveedores</span>
            <p className="tabular-nums">{item.total_proveedores}</p>
          </div>
        </div>
      )}
    />
  )
}

const FALLBACK_FEATURES: TableFeatures = {
  selectable: true,
  expandable: true,
  sortable: true,
}

export function ContenedoresTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/contenedores" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <ContenedoresTableInner {...props} />
    </DataTableProvider>
  )
}
