'use client'

// app/(admin)/inventario/notas/NotasTable.tsx

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable, DataTableProvider, useDataTableContext } from '@/components/admin/DataTable'
import type { ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Eye, FileText, Image as ImageIcon, CheckCircle2, Loader2, ExternalLink, Package } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_NOTA_COLORS, TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS } from '@/lib/constants'
import type { NotaListItem } from '@/modules/inventario/types'
import { confirmarNotaAction, getNotaDetallesAction } from '@/modules/inventario/actions'
import { toast } from 'sonner'

type Props = {
  notas: NotaListItem[]
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  initialFeatures?: import('@/components/admin/DataTable/types').TableFeatures
  bodegaFiltradaId?: number
}

// Features base con FastCheck (expandable: true)
const FALLBACK_FEATURES = {
  selectable: false,
  expandable: true,
  sortable: true,
  columnSelector: false,
} as const

function ComprobantePreviewButton({ url }: { url: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(true)
            }}
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors leading-none"
            title="Ver comprobante firmado"
          />
        }
      >
        <ImageIcon className="h-4 w-4 text-primary" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden bg-background border">
        <DialogHeader className="sr-only">
          <DialogTitle>Previsualización de Comprobante</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-[4/3] max-h-[80vh] flex items-center justify-center p-4">
          <Image
            src={url}
            alt="Comprobante firmado"
            fill
            className="object-contain p-2"
            sizes="(max-w-768px) 100vw, 800px"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NotaFastCheckExpandedRow({ row }: { row: NotaListItem }) {
  const router = useRouter()
  const [items, setItems] = useState<{ id: number; producto_id: number; sku_base: string; descripcion: string; cajas: number; piezas_sueltas: number }[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [isConfirming, startConfirmTransition] = useTransition()

  useEffect(() => {
    let isMounted = true
    setIsLoadingItems(true)
    getNotaDetallesAction(row.id)
      .then((res) => {
        if (isMounted) {
          setItems(res)
          setIsLoadingItems(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingItems(false)
      })
    return () => {
      isMounted = false
    }
  }, [row.id])

  const handleQuickConfirm = () => {
    startConfirmTransition(async () => {
      const res = await confirmarNotaAction(row.id)
      if (res.success) {
        toast.success(`Nota ${row.numero_nota} confirmada exitosamente`)
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo confirmar la nota')
      }
    })
  }

  const isPending = row.estado_codigo === 'PEND' || row.estado_codigo === 'BORR'

  return (
    <div className="p-4 bg-muted/15 border rounded-lg space-y-4 my-2 animate-in fade-in duration-200">
      {/* Resumen Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              FastCheck: Nota {row.numero_nota}
              <Badge variant="outline" className="font-mono text-[10px]">
                {row.tipo_nombre}
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Origen: <span className="font-medium text-foreground">{row.bodega_origen_nombre}</span>
              {row.bodega_destino_nombre && (
                <> $\rightarrow$ Destino: <span className="font-medium text-foreground">{row.bodega_destino_nombre}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8"
                    disabled={isConfirming}
                  />
                }
              >
                {isConfirming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Confirmar Nota Ahora
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar Nota {row.numero_nota}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción procesará el inventario en la bodega {row.bodega_origen_nombre} ({row.total_cajas ?? 0} cajas). Esta operación no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleQuickConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Confirmar e Impactar Stock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Link href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver Ficha Completa
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabla de Productos Rápida */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Contenido de la Nota ({items.length} productos)
        </h5>

        {isLoadingItems ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando líneas de la nota...
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 italic">Sin productos detallados.</p>
        ) : (
          <div className="overflow-x-auto border rounded bg-background">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b font-medium text-muted-foreground">
                <tr>
                  <th className="py-2 px-3">SKU Base</th>
                  <th className="py-2 px-3">Descripción</th>
                  <th className="py-2 px-3 text-center">Cajas</th>
                  <th className="py-2 px-3 text-center">Piezas Sueltas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-2 px-3 font-mono font-medium">{item.sku_base}</td>
                    <td className="py-2 px-3 truncate max-w-[280px]" title={item.descripcion}>{item.descripcion}</td>
                    <td className="py-2 px-3 text-center font-semibold">{item.cajas}</td>
                    <td className="py-2 px-3 text-center text-muted-foreground">{item.piezas_sueltas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observaciones y Comprobante */}
      {(row.observaciones || row.nota_referencia || row.comprobante_url) && (
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 pt-2 border-t">
          <div className="space-y-0.5">
            {row.nota_referencia && <p><span className="font-semibold text-foreground">Ref:</span> {row.nota_referencia}</p>}
            {row.observaciones && <p className="italic">"{row.observaciones}"</p>}
          </div>
          {row.comprobante_url && (
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <ComprobantePreviewButton url={row.comprobante_url} />
              <span>Comprobante firmado disponible</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotasTableInner({
  notas,
  sortKey,
  sortOrder,
  bodegaFiltradaId,
}: Props) {
  const ctx = useDataTableContext()
  const isExpandedRow = (row: NotaListItem) => ctx.expandedIds.has(row.id)

  const columns: ColumnDef<NotaListItem>[] = [
    {
      key: 'numero_nota',
      header: 'N° Nota',
      sortKey: 'numero_nota',
      headerClassName: 'w-[180px]',
      cell: (row: NotaListItem) => (
        <div className="flex items-center gap-2">
          <Link
            href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}
            className="font-mono text-sm font-medium text-primary hover:underline animate-in fade-in"
          >
            {row.numero_nota}
          </Link>
          {row.comprobante_url && (
            <ComprobantePreviewButton url={row.comprobante_url} />
          )}
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortKey: 'tipo_codigo',
      cell: (row: NotaListItem) => {
        let icon = TIPO_MOVIMIENTO_ICONS[row.tipo_codigo] ?? ''
        let color = TIPO_MOVIMIENTO_COLORS[row.tipo_codigo] ?? 'bg-gray-100 text-gray-800'
        let nombre = row.tipo_nombre

        if (row.tipo_codigo === 'TRF' && bodegaFiltradaId) {
          if (row.bodega_destino_id === bodegaFiltradaId) {
            icon = '↔↑'
            color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-300/30'
            nombre = 'Traspaso (Entrada)'
          } else if (row.bodega_origen_id === bodegaFiltradaId) {
            icon = '↔↓'
            color = 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-300/30'
            nombre = 'Traspaso (Salida)'
          }
        }

        return (
          <Badge variant="secondary" className={`text-xs ${color}`}>
            <span className="mr-1">{icon}</span>
            {nombre}
          </Badge>
        )
      },
    },
    {
      key: 'origen',
      header: 'Origen',
      sortKey: 'bodega_origen_nombre',
      cell: (row: NotaListItem) => {
        const esFiltrada = bodegaFiltradaId === row.bodega_origen_id
        return (
          <span className={`text-sm ${esFiltrada ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
            {row.bodega_origen_nombre}
          </span>
        )
      },
    },
    {
      key: 'destino',
      header: 'Destino',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (row: NotaListItem) => {
        const esFiltrada = bodegaFiltradaId === row.bodega_destino_id
        return (
          <span className={`text-sm ${esFiltrada ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
            {row.bodega_destino_nombre ?? '—'}
          </span>
        )
      },
    },
    {
      key: 'total_cajas',
      header: 'Cajas',
      sortKey: 'total_cajas',
      headerClassName: 'text-center w-[70px]',
      className: 'text-center',
      cell: (row: NotaListItem) => (
        <span className="text-sm tabular-nums font-medium">
          {row.total_cajas ?? 0}
        </span>
      ),
    },
    {
      key: 'costo_total',
      header: 'Costo',
      sortKey: 'costo_total',
      headerClassName: 'text-right w-[110px]',
      className: 'text-right font-mono font-semibold tabular-nums',
      cell: (row: NotaListItem) => (
        <span className="text-sm">
          {row.costo_total !== undefined && row.costo_total !== null && Number(row.costo_total) > 0 ? (
            `$${Number(row.costo_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortKey: 'estado_codigo',
      headerClassName: 'w-[120px]',
      cell: (row) => {
        const colorClasses = ESTADO_NOTA_COLORS[row.estado_codigo] ?? 'bg-gray-100 text-gray-800'
        return (
          <Badge variant="secondary" className={`text-xs ${colorClasses}`}>
            {row.estado_nombre}
          </Badge>
        )
      },
    },
    {
      key: 'fecha_nota',
      header: 'Fecha',
      sortKey: 'fecha_nota',
      cell: (row) => <Fecha valor={row.fecha_nota} formato="fecha-hora" />,
    },
    {
      key: 'usuario',
      header: 'Usuario',
      headerClassName: 'hidden xl:table-cell',
      className: 'hidden xl:table-cell',
      cell: (row: NotaListItem) => (
        <span className="text-sm text-muted-foreground">
          {row.usuario_nombre}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      headerClassName: 'w-[50px]',
      cell: (row: NotaListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                Ver detalle
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={notas}
      rowKey={(row) => row.id}
      currentSortKey={sortKey}
      currentOrder={sortOrder}
      defaultSortKey="fecha_nota"
      emptyMessage="No se encontraron notas con los filtros aplicados."
      emptyIcon={<FileText className="h-12 w-12" />}
      renderExpanded={(row) => <NotaFastCheckExpandedRow row={row} />}
    />
  )
}

export function NotasTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/inventario/notas" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <NotasTableInner {...props} />
    </DataTableProvider>
  )
}