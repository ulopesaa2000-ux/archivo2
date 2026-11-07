// app/(admin)/contenedores/ContenedoresTable.tsx
'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable, DataTableProvider, QuickEditPopover, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef, TableFeatures, QuickEditField } from '@/components/admin/DataTable/types'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Ship, Eye, Trash2, Loader2, ChevronDown, ChevronRight, Ban, TriangleAlert, Warehouse } from 'lucide-react'
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
  puedeEditar?: boolean
  puedeEliminar?: boolean
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
    { key: 'numero_contenedor', label: 'No. Contenedor', type: 'text' },
    { key: 'fecha_eta', label: 'ETA', type: 'date' },
  ],
}

async function handleQuickEditSave(ids: number[], field: string, value: unknown) {
  if (!['estado', 'codigo_contenedor', 'numero_contenedor', 'fecha_eta'].includes(field)) return

  const { quickEditContenedoresAction } = await import('@/modules/contenedores/actions')
  const result = await quickEditContenedoresAction(ids, field as 'estado' | 'codigo_contenedor' | 'numero_contenedor' | 'fecha_eta', value ? String(value) : null)

  if (!result.success) {
    toast.error('No se pudo actualizar', { description: result.error })
    return
  }

  toast.success(`Actualizado ${ids.length} contenedor${ids.length > 1 ? 'es' : ''}`)
}

function ContenedoresTableInner({ items, sortBy, order, puedeEditar = true, puedeEliminar = false }: Props) {
  const ctx = useDataTableContext()
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isPendingDelete, startDelete] = useTransition()
  const [cancelingContenedor, setCancelingContenedor] = useState<{ id: number; codigo: string } | null>(null)
  const [pendingSurtidoContenedor, setPendingSurtidoContenedor] = useState<{
    id: number
    codigo: string
    estadoDestino?: 'surtido' | 'completo'
  } | null>(null)
  const [confirmSurtidoSinStockOpen, setConfirmSurtidoSinStockOpen] = useState(false)

  const handleDeleteConfirm = () => {
    if (!deletingId) return
    startDelete(async () => {
      const { eliminarContenedorAction } = await import('@/modules/contenedores/actions')
      const result = await eliminarContenedorAction(deletingId)
      if (!result.success) {
        toast.error('No se pudo eliminar', { description: result.error })
        return
      }
      setDeletingId(null)
      toast.success('Contenedor eliminado')
      router.refresh()
    })
  }

  const handleConfirmCancel = () => {
    if (!cancelingContenedor) return
    startDelete(async () => {
      const { cambiarEstadoContenedorAction } = await import('@/modules/contenedores/actions')
      const result = await cambiarEstadoContenedorAction(cancelingContenedor.id, 'cancelado')
      if (!result.success) {
        toast.error('No se pudo cancelar', { description: result.error })
        return
      }
      setCancelingContenedor(null)
      toast.success('Contenedor cancelado')
      router.refresh()
    })
  }

  const handleConfirmSurtidoSinStock = () => {
    if (!pendingSurtidoContenedor) return
    const estadoFinal = pendingSurtidoContenedor.estadoDestino ?? 'surtido'
    const labelFinal = ESTADO_CONTENEDOR_LABELS[estadoFinal] ?? estadoFinal
    startDelete(async () => {
      const { cambiarEstadoContenedorAction } = await import('@/modules/contenedores/actions')
      const result = await cambiarEstadoContenedorAction(pendingSurtidoContenedor.id, estadoFinal)
      if (!result.success) {
        toast.error('No se pudo actualizar', { description: result.error })
        return
      }
      setConfirmSurtidoSinStockOpen(false)
      setPendingSurtidoContenedor(null)
      toast.success(`Contenedor marcado como ${labelFinal}`)
      router.refresh()
    })
  }

  const handleEstadoQuickEditSave = async (ids: number[], field: string, value: unknown) => {
    if (field !== 'estado') {
      return handleQuickEditSave(ids, field, value)
    }

    const nuevoEstado = String(value)
    if (nuevoEstado === 'cancelado') {
      const firstItem = items.find((it) => ids.includes(it.contenedor_id))
      setCancelingContenedor({
        id: ids[0],
        codigo: firstItem?.codigo_contenedor ?? `ID ${ids[0]}`,
      })
      return
    }

    if (nuevoEstado === 'surtido' || nuevoEstado === 'completo') {
      const enBodegaItem = items.find(
        (it) => ids.includes(it.contenedor_id) && it.estado === 'en_bodega'
      )
      if (enBodegaItem) {
        setPendingSurtidoContenedor({
          id: enBodegaItem.contenedor_id,
          codigo: enBodegaItem.codigo_contenedor,
          estadoDestino: nuevoEstado as 'surtido' | 'completo',
        })
        return
      }
    }

    await handleQuickEditSave(ids, field, value)
    router.refresh()
  }

  const quickEditFields = (puedeEditar ? ((ctx.features.quickEdit as QuickEditField[] | null) ?? []) : [])
    .map((field) => {
      if (field.key === 'estado') return { ...field, type: 'select' as const, options: ESTADO_OPTIONS }
      if (field.key === 'codigo_contenedor') return { ...field, type: 'text' as const, label: 'Codigo' }
      if (field.key === 'numero_contenedor') return { ...field, type: 'text' as const, label: 'No. Contenedor' }
      if (field.key === 'fecha_eta') return { ...field, type: 'date' as const, label: 'ETA' }
      return field
    })
  // Garantiza edicion rapida del No. Contenedor aunque la config guardada
  // en BD (usuario/defaults globales) aun no incluya el campo.
  if (!quickEditFields.some((field) => field.key === 'numero_contenedor')) {
    quickEditFields.push({ key: 'numero_contenedor', label: 'No. Contenedor', type: 'text' })
  }

  const estadoField = quickEditFields.find((field) => field.key === 'estado')
  const codigoField = quickEditFields.find((field) => field.key === 'codigo_contenedor')
  const numeroField = quickEditFields.find((field) => field.key === 'numero_contenedor')
  const etaField = quickEditFields.find((field) => field.key === 'fecha_eta')

  const columns: ColumnDef<ContenedorResumen>[] = [
    {
      key: 'numero_contenedor',
      header: 'No. Contenedor',
      sortKey: 'numero_contenedor',
      cell: (row) => {
        const content = (
          <span className="font-mono text-xs font-medium">
            {row.numero_contenedor ?? '-'}
          </span>
        )
        if (!numeroField) return content
        return (
          <QuickEditPopover
            field={numeroField}
            value={row.numero_contenedor ?? ''}
            rowId={row.contenedor_id}
            onSaveGlobal={handleQuickEditSave}
          >
            {content}
          </QuickEditPopover>
        )
      },
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
            onSaveGlobal={handleEstadoQuickEditSave}
          >
            {badge}
          </QuickEditPopover>
        )
      },
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[90px]',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={ADMIN_ROUTES.contenedores.detalle(row.contenedor_id)}
            title={`Ver contenedor ${row.contenedor_id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          {puedeEditar && row.estado !== 'cancelado' && row.estado !== 'cerrado' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              title={`Cancelar contenedor ${row.codigo_contenedor}`}
              aria-label={`Cancelar contenedor ${row.codigo_contenedor}`}
              onClick={(e) => {
                e.stopPropagation()
                setCancelingContenedor({ id: row.contenedor_id, codigo: row.codigo_contenedor })
              }}
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title={`Eliminar contenedor ${row.contenedor_id}`}
              aria-label={`Eliminar contenedor ${row.contenedor_id}`}
              onClick={(e) => {
                e.stopPropagation()
                setDeletingId(row.contenedor_id)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
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
    <>
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
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contenedor</AlertDialogTitle>
            <AlertDialogDescription>
              Se dará de baja el contenedor (activo = false) y sus órdenes quedarán libres para vincular a otro contenedor. Esta acción no borra el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPendingDelete} onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPendingDelete && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Confirmar Cancelación de Contenedor */}
      <AlertDialog
        open={cancelingContenedor !== null}
        onOpenChange={(open) => { if (!open) setCancelingContenedor(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desea cancelar este contenedor? ¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <span className="block">
                El contenedor <strong className="text-foreground">{cancelingContenedor?.codigo}</strong> pasará a estado <strong>Cancelado</strong>.
              </span>
              <span className="block text-xs text-muted-foreground">
                Esta acción indica que la operación del contenedor no continuará. Se conserva el historial del contenedor en el sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPendingDelete}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPendingDelete}
              onClick={handleConfirmCancel}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isPendingDelete && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Sí, cancelar contenedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Ventana 1 y 2 - Sugerencia y Doble Protección al pasar a Surtido/Completo */}
      {(() => {
        const estadoDestino = pendingSurtidoContenedor?.estadoDestino ?? 'surtido'
        const labelDestino = ESTADO_CONTENEDOR_LABELS[estadoDestino] ?? estadoDestino
        const labelMayus = labelDestino.toUpperCase()

        return (
          <>
            <AlertDialog
              open={pendingSurtidoContenedor !== null && !confirmSurtidoSinStockOpen}
              onOpenChange={(open) => { if (!open) setPendingSurtidoContenedor(null) }}
            >
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-base font-semibold">
                    <Warehouse className="h-5 w-5 text-primary" />
                    ¿Desea surtir este contenedor a bodega virtual primero?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-sm pt-1">
                    <span className="block">
                      El contenedor <strong className="text-foreground">{pendingSurtidoContenedor?.codigo}</strong> se encuentra actualmente <strong>En Bodega</strong>.
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Para que las cajas y piezas ingresen formalmente al stock del inventario (ej. bodega virtual tipo RI&amp;KA), el proceso de surtido debe realizarse desde el detalle del contenedor antes de marcarlo como <strong>{labelDestino}</strong>.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel onClick={() => setPendingSurtidoContenedor(null)}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmSurtidoSinStockOpen(true)}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:border-amber-700/50 dark:hover:bg-amber-950/30 text-xs"
                  >
                    No, cambiar a {labelDestino} sin surtir
                  </Button>
                  {pendingSurtidoContenedor && (
                    <Button
                      type="button"
                      onClick={() => {
                        const id = pendingSurtidoContenedor.id
                        setPendingSurtidoContenedor(null)
                        router.push(ADMIN_ROUTES.contenedores.detalle(id))
                      }}
                      className="bg-primary text-primary-foreground font-semibold text-xs"
                    >
                      <Warehouse className="h-3.5 w-3.5 mr-1" /> Ir a surtir al contenedor
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Modal: Ventana 2 - Doble Protección Crítica al pasar a Surtido/Completo sin stock */}
            <AlertDialog
              open={confirmSurtidoSinStockOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setConfirmSurtidoSinStockOpen(false)
                  setPendingSurtidoContenedor(null)
                }
              }}
            >
              <AlertDialogContent className="max-w-lg border-destructive/40">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive font-bold">
                    <TriangleAlert className="h-5 w-5 text-destructive" />
                    ⚠️ Doble Protección: Pasar a {labelDestino} sin ingresar stock
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-sm pt-2 text-foreground/90">
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive font-medium text-xs leading-relaxed">
                      El contenedor <strong className="text-foreground">{pendingSurtidoContenedor?.codigo}</strong> pasará a <strong>{labelMayus} SIN SURTIR</strong> realmente ninguna bodega virtual tipo RI&amp;KA.
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• <strong>NO se generará nota de ingreso</strong> en el módulo de inventario.</p>
                      <p>• <strong>NO se incrementará el stock</strong> de ningún producto en las bodegas.</p>
                      <p>• <strong>Este proceso no se puede deshacer</strong> una vez cambiado el estado a {labelDestino}.</p>
                    </div>
                    <p className="font-semibold text-xs pt-1 text-foreground">
                      Si está seguro de continuar presione &quot;Sí, marcar como {labelDestino} sin stock&quot;.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setConfirmSurtidoSinStockOpen(false)
                      setPendingSurtidoContenedor(null)
                    }}
                  >
                    No, regresar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isPendingDelete}
                    onClick={handleConfirmSurtidoSinStock}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
                  >
                    {isPendingDelete && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Sí, marcar como {labelDestino} sin stock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )
      })()}
    </>
  )
}

export function ContenedoresTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/contenedores" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <ContenedoresTableInner {...props} />
    </DataTableProvider>
  )
}
