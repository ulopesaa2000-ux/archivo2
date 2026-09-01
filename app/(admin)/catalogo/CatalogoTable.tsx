'use client'

// app/(admin)/catalogo/CatalogoTable.tsx

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DataTable, DataTableProvider, useDataTableContext, BulkActionBar, QuickEditPopover } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures, QuickEditField, BulkAction } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2, Star, Layers, Package, Sparkles } from 'lucide-react'
import { DestacadoStarButton } from './components/DestacadoStarButton'
import { formatCurrency, truncate } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS, ADMIN_ROUTES } from '@/lib/constants'
import type { ProductoListItem, CatalogosParaFiltros, CatalogoSortBy } from '@/modules/catalogo/types'
import { toast } from 'sonner'

type Props = {
  productos: ProductoListItem[]
  catalogos: CatalogosParaFiltros
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
  initialFeatures: TableFeatures
}

// ── Acciones masivas (definidas por la página, no acopladas) ─────────────────
const bulkActions: BulkAction[] = [
  {
    id: 'deactivate',
    label: 'Desactivar',
    icon: Trash2,
    variant: 'destructive' as const,
    async onClick(ids: number[]) {
      const { bulkDeactivateProductsAction } = await import('@/modules/catalogo/actions')
      const result = await bulkDeactivateProductsAction(ids)
      return result.success
    },
  },
]

// Opciones para estado
const ESTADO_OPTIONS = [
  { id: 'borrador', label: 'Borrador' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'publicado', label: 'Publicado' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'descontinuado', label: 'Descontinuado' },
] as const

// Features base de respaldo en caso de que initialFeatures falle
const FALLBACK_FEATURES: TableFeatures = {
  selectable: true,
  sortable: true,
  quickEdit: [
    { key: 'descripcion', label: 'Descripción', type: 'textarea' as const },
    { key: 'familia', label: 'Familia', type: 'text' as const },
    { key: 'marca_id', label: 'Marca', type: 'select' as const, options: [] as {id: string | number; label: string}[] },
    { key: 'genero_id', label: 'Género', type: 'select' as const, options: [] as {id: string | number; label: string}[] },
    { key: 'edad_id', label: 'Edad', type: 'select' as const, options: [] as {id: string | number; label: string}[] },
    { key: 'precio_ec', label: 'Precio EC', type: 'currency' as const },
    { key: 'estado', label: 'Estado', type: 'select' as const, options: [...ESTADO_OPTIONS] as {id: string; label: string}[] },
  ] as QuickEditField[],
  bulkActions,
  columnSelector: false,
}

// ── QuickEdit save handler (global para todas las celdas) ────────────────────
async function handleQuickEditSave(
  ids: number[],
  field: string,
  value: unknown
) {
  const { bulkUpdateProductsAction } = await import('@/modules/catalogo/actions')
  const res = await bulkUpdateProductsAction(ids, { [field]: value })
  if (res.success) {
    toast.success(`Actualizado ${ids.length} producto${ids.length > 1 ? 's' : ''}`)
  } else {
    toast.error('Error al actualizar', { description: res.error })
  }
}

async function handleQuickEditRecordSave(
  ids: number[],
  updates: Record<string, unknown>
) {
  const { bulkUpdateProductsAction } = await import('@/modules/catalogo/actions')
  const res = await bulkUpdateProductsAction(ids, updates)
  if (res.success) {
    toast.success(`Actualizado ${ids.length} producto${ids.length > 1 ? 's' : ''}`)
  } else {
    toast.error('Error al actualizar', { description: res.error })
  }
}

// ── Componente interno (usa el context) ──────────────────────────────────────
function CatalogoTableInner({
  productos,
  catalogos,
  sortBy,
  order,
}: Props) {
  const ctx = useDataTableContext()
  const searchParams = useSearchParams()
  const marcasMap = new Map(catalogos.marcas.map((m) => [m.id, m.nombre]))
  const generosMap = new Map(catalogos.generos.map((g) => [g.id, g.nombre]))
  const edadesMap = new Map((catalogos.edades || []).map((e) => [e.id, e.nombre]))

  const createModalUrl = (paramsToAdd: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(paramsToAdd).forEach(([key, val]) => {
      params.set(key, val)
    })
    return `/catalogo?${params.toString()}`
  }

  const handleBulkDeactivate = async (ids: number[]) => {
    const { bulkDeactivateProductsAction } = await import('@/modules/catalogo/actions')
    return bulkDeactivateProductsAction(ids)
  }

  // Construir opciones de catálogos para los campos select
  const marcaOptions = catalogos.marcas.map(m => ({ id: m.id, label: m.nombre }))
  const generoOptions = catalogos.generos.map(g => ({ id: g.id, label: g.nombre }))
  const edadOptions = (catalogos.edades || []).map(e => ({ id: e.id, label: e.nombre }))
  const prendaOptions = (catalogos.tipos_prenda || []).map(t => ({ id: t.id, label: t.nombre }))

  // Combina las features configuradas con los defaults de fallback para asegurar que ningún campo nuevo quede undefined
  const activeQuickEditList = ctx.features.quickEdit === false
    ? null
    : [
        ...(Array.isArray(ctx.features.quickEdit) ? ctx.features.quickEdit : []),
        ...(FALLBACK_FEATURES.quickEdit as QuickEditField[]).filter(
          fb => !Array.isArray(ctx.features.quickEdit) || !ctx.features.quickEdit.some(q => q.key === fb.key)
        )
      ]

  // Enrich quickEdit fields con opciones
  const quickEditFields = activeQuickEditList?.map((f) => {
    if (f.key === 'marca_id') return { ...f, options: marcaOptions }
    if (f.key === 'genero_id') return { ...f, options: generoOptions }
    if (f.key === 'edad_id') return { ...f, options: edadOptions }
    if (f.key === 'estado') return { ...f, options: [...ESTADO_OPTIONS] as {id: string; label: string}[] }
    return f
  }) ?? null

  const columns: ColumnDef<ProductoListItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortKey: 'sku_base',
      headerClassName: 'w-[140px] min-w-[130px]',
      className: 'w-[140px] min-w-[130px]',
      cell: (row: ProductoListItem) => (
        <Link
          href={ADMIN_ROUTES.catalogo.detalle(row.id)}
          className="font-mono text-sm font-semibold text-primary hover:underline block truncate"
        >
          {row.sku_base}
        </Link>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      headerClassName: 'min-w-[260px]',
      className: 'min-w-[260px]',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'descripcion')!}
          value={row.descripcion ?? row.nombre}
          rowId={row.id}
          companionFields={{
            prenda: { value: row.tipo_prenda_id, options: prendaOptions },
            genero: { value: row.genero_id, options: generoOptions },
            edad: { value: row.edad_id, options: edadOptions },
            marca: { value: row.marca_id, options: marcaOptions },
          }}
          catalogos={catalogos}
          onSaveRecord={handleQuickEditRecordSave}
          onSaveGlobal={handleQuickEditSave}
        >
          <span className="text-sm block truncate w-full" title={row.descripcion ?? row.nombre ?? ''}>
            {row.descripcion ?? row.nombre ?? '—'}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'familia',
      header: 'Familia',
      sortKey: 'familia',
      headerClassName: 'w-[120px] min-w-[110px]',
      className: 'w-[120px] min-w-[110px]',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'familia')!}
          value={row.familia}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
        >
          <span className="text-sm text-muted-foreground block truncate">{row.familia ?? '—'}</span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'marca',
      header: 'Marca',
      sortKey: 'marca_id',
      headerClassName: 'w-[130px] min-w-[120px]',
      className: 'w-[130px] min-w-[120px]',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'marca_id')!}
          value={row.marca_id}
          rowId={row.id}
          onSaveGlobal={handleQuickEditSave}
        >
          <span className="text-sm block truncate">
            {row.marca_id ? marcasMap.get(row.marca_id) ?? '—' : '—'}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'pz_en_caja',
      header: 'Pz/Caja',
      sortKey: 'pz_en_caja',
      headerClassName: 'w-[95px] min-w-[85px] text-right',
      className: 'w-[95px] min-w-[85px] text-right font-mono',
      cell: (row: ProductoListItem) => (
        <span className="text-sm tabular-nums">{row.pz_en_caja ?? '—'}</span>
      ),
    },
    {
      key: 'precio_ec',
      header: 'Precio EC',
      sortKey: 'precio_ec',
      headerClassName: 'w-[115px] min-w-[105px] text-right',
      className: 'w-[115px] min-w-[105px] text-right font-mono',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'precio_ec')!}
          value={row.precio_ec}
          rowId={row.id}
          align="end"
          onSaveGlobal={handleQuickEditSave}
        >
          <span className="text-sm font-medium tabular-nums">
            {row.precio_ec != null ? formatCurrency(row.precio_ec) : '—'}
          </span>
        </QuickEditPopover>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado',
      headerClassName: 'w-[130px] min-w-[120px] text-center',
      className: 'w-[130px] min-w-[120px] text-center',
      cell: (row: ProductoListItem) => (
        <QuickEditPopover
          field={(quickEditFields ?? []).find(f => f.key === 'estado')!}
          value={row.estado}
          rowId={row.id}
          align="center"
          onSaveGlobal={handleQuickEditSave}
        >
          <Badge
            variant="secondary"
            className={`text-xs ${ESTADO_PRODUCTO_COLORS[row.estado] ?? 'bg-gray-100 text-gray-800'}`}
          >
            {row.estado}
          </Badge>
        </QuickEditPopover>
      ),
    },
    {
      key: 'flags',
      header: '',
      headerClassName: 'w-[70px] min-w-[65px] text-center',
      className: 'w-[70px] min-w-[65px] text-center',
      cell: (row: ProductoListItem) => (
        <div className="flex items-center justify-center gap-1">
          <DestacadoStarButton
            id={row.id}
            initialDestacado={row.destacado ?? false}
            variant="table"
          />
          {row.es_conjunto && (
            <span title="Conjunto">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
            </span>
          )}
          {!row.activo && (
            <Badge variant="outline" className="text-[10px] px-1 text-red-500 border-red-200">
              Inactivo
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px] text-right',
      className: 'w-[50px] text-right',
      cell: (row: ProductoListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <span suppressHydrationWarning>
                <MoreHorizontal className="h-4 w-4" />
              </span>
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={ADMIN_ROUTES.catalogo.detalle(row.id)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                Ver detalle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={createModalUrl({ modal: 'edit', edit_id: String(row.id) })}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Editar rápido
              </Link>
            </DropdownMenuItem>
            {row.activo && (
              <DropdownMenuItem asChild>
                <Link
                  href={createModalUrl({ modal: 'delete', delete_id: String(row.id) })}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Desactivar
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const tableBulkActions: BulkAction[] = [
    {
      id: 'autodetect',
      label: 'Detectar (Género, Edad, Marca)',
      icon: Sparkles,
      variant: 'default' as const,
      async onClick(ids: number[]) {
        const { bulkUpdateProductsAction } = await import('@/modules/catalogo/actions')
        const { detectProductAttributesFromText } = await import('@/modules/catalogo/utils/detector')

        let updatedCount = 0
        for (const id of ids) {
          const prod = productos.find(p => p.id === id)
          if (!prod) continue
          const text = `${prod.nombre ?? ''} ${prod.descripcion ?? ''}`.trim()
          const detected = detectProductAttributesFromText(text, catalogos)

          const payload: Record<string, unknown> = {}
          if (detected.tipo_prenda_id) payload.tipo_prenda_id = detected.tipo_prenda_id
          if (detected.genero_id) payload.genero_id = detected.genero_id
          if (detected.edad_id) payload.edad_id = detected.edad_id
          if (detected.marca_id) payload.marca_id = detected.marca_id

          if (Object.keys(payload).length > 0) {
            const res = await bulkUpdateProductsAction([id], payload)
            if (res.success) updatedCount++
          }
        }

        if (updatedCount > 0) {
          toast.success(`Atributos auto-detectados y actualizados en ${updatedCount} producto${updatedCount > 1 ? 's' : ''}`)
        } else {
          toast.info('No se encontraron coincidencias en las descripciones seleccionadas.')
        }
        return true
      },
    },
    ...bulkActions,
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={productos}
        rowKey={(row: ProductoListItem) => row.id}
        currentSortKey={sortBy}
        currentOrder={order}
        defaultSortKey="id"
        emptyMessage="No se encontraron productos con los filtros aplicados."
        emptyIcon={<Package className="h-12 w-12" />}
      />

      <BulkActionBar
        actions={tableBulkActions.map(a => ({
          ...a,
          onClick: async (ids: number[]) => {
            const res = await a.onClick(ids)
            if (res !== false) {
              ctx.clearSelection()
            }
          },
        }))}
        label="productos"
      />
    </>
  )
}

export function CatalogoTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/catalogo" features={{ ...FALLBACK_FEATURES, ...initialFeatures, bulkActions }}>
      <CatalogoTableInner {...props} sortBy={props.sortBy} order={props.order} initialFeatures={initialFeatures} />
    </DataTableProvider>
  )
}