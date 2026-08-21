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
import { 
  MoreHorizontal, MoreVertical, Eye, FileText, Image as ImageIcon, 
  CheckCircle2, Loader2, ExternalLink, Package, Trash2, Ban,
  Warehouse, Building2, Calendar, DollarSign, User, Clock 
} from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_NOTA_COLORS, TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { NotaListItem } from '@/modules/inventario/types'
import type { AccionEliminarNota } from '@/modules/inventario/config-types'
import { confirmarNotaAction, getNotaDetallesAction, eliminarNotaAction } from '@/modules/inventario/actions'
import { toast } from 'sonner'

type Props = {
  notas: NotaListItem[]
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  initialFeatures?: import('@/components/admin/DataTable/types').TableFeatures
  bodegaFiltradaId?: number
  accionEliminar?: AccionEliminarNota
}

function NotaAccionesCell({
  row,
  isVertical = false,
  accionEliminar = 'eliminar_soft',
}: {
  row: NotaListItem
  isVertical?: boolean
  accionEliminar?: AccionEliminarNota
}) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const isSoloCancelar = accionEliminar === 'solo_cancelar'
  const isNinguno = accionEliminar === 'ninguno'
  const yaCancelada = row.estado_codigo === 'CANC'

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await eliminarNotaAction(row.id)
      if (res.success) {
        toast.success(
          isSoloCancelar
            ? `Nota ${row.numero_nota} cancelada exitosamente`
            : `Nota ${row.numero_nota} eliminada exitosamente`
        )
        setShowDeleteDialog(false)
        router.refresh()
      } else {
        toast.error(res.error ?? (isSoloCancelar ? 'No se pudo cancelar la nota' : 'No se pudo eliminar la nota'))
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            {isVertical ? <MoreVertical className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}>
              <Eye className="mr-2 h-3.5 w-3.5" />
              Ver detalle
            </Link>
          </DropdownMenuItem>

          {!isNinguno && !yaCancelada && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className={cn(
                "font-semibold cursor-pointer",
                isSoloCancelar
                  ? "text-amber-600 dark:text-amber-400 focus:bg-amber-500/10 focus:text-amber-600"
                  : "text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600"
              )}
            >
              {isSoloCancelar ? (
                <>
                  <Ban className="mr-2 h-3.5 w-3.5" />
                  Cancelar nota
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar nota
                </>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border">
          <AlertDialogHeader>
            <AlertDialogTitle className={cn("font-bold", isSoloCancelar ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
              {isSoloCancelar
                ? `¿Cancelar Nota ${row.numero_nota}?`
                : `¿Eliminar Nota ${row.numero_nota}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs text-muted-foreground pt-1">
              {isSoloCancelar ? (
                <span>
                  La nota cambiará a estado <strong>Cancelada</strong>. El administrador podrá revisarla o decidir eliminarla definitivamente.
                </span>
              ) : row.estado_codigo === 'CONF' ? (
                <span>
                  Esta nota ya fue confirmada. Se ocultará de las listas conservando el historial de movimientos de inventario.
                </span>
              ) : (
                <span>
                  Se borrará esta nota del sistema y pasará automáticamente a estado Cancelada.
                </span>
              )}
              <span className="block font-bold text-foreground">
                ¿Estás seguro de continuar?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-10 text-xs font-semibold">
              Descartar
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "text-white font-bold text-xs uppercase tracking-wider rounded-xl h-10 gap-1.5",
                isSoloCancelar
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isSoloCancelar ? 'Cancelando...' : 'Eliminando...'}
                </>
              ) : (
                isSoloCancelar ? 'Sí, cancelar nota' : 'Sí, eliminar nota'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
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

  const isConfirmable = row.estado_codigo === 'PEND' || row.estado_codigo === 'BORR' || row.estado_codigo === 'PROC'
  const isTraspasoEnProceso = row.tipo_codigo === 'TRF' && row.estado_codigo === 'PROC'

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
          {isConfirmable && (
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
                {isTraspasoEnProceso ? 'Confirmar Recepción / Llegada' : 'Confirmar Nota Ahora'}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isTraspasoEnProceso
                      ? `¿Confirmar Recepción de Traspaso ${row.numero_nota}?`
                      : `¿Confirmar Nota ${row.numero_nota}?`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isTraspasoEnProceso
                      ? `Esta acción confirmará la llegada de la mercancía a ${row.bodega_destino_nombre || 'la bodega destino'} e ingresará el stock transferido (${row.total_cajas ?? 0} cajas). Esta operación no se puede deshacer.`
                      : `Esta acción procesará el inventario en la bodega ${row.bodega_origen_nombre} (${row.total_cajas ?? 0} cajas). Esta operación no se puede deshacer.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleQuickConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isTraspasoEnProceso ? 'Confirmar Recepción e Ingresar Stock' : 'Confirmar e Impactar Stock'}
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
          <div className="overflow-x-auto border rounded-xl bg-background shadow-inner">
            <table className="w-full text-xs text-left min-w-[320px] sm:min-w-full">
              <thead className="bg-muted/50 border-b font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">SKU</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Cajas</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap hidden md:table-cell">Piezas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-primary whitespace-nowrap">{item.sku_base}</td>
                    <td className="py-2 px-3 text-center font-mono font-extrabold text-foreground">{item.cajas}</td>
                    <td className="py-2 px-3 min-w-[150px] max-w-[240px] truncate" title={item.descripcion}>
                      {item.descripcion || '—'}
                    </td>
                    <td className="py-2 px-3 text-center text-muted-foreground hidden md:table-cell">
                      {item.piezas_sueltas}
                    </td>
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
  accionEliminar,
}: Props) {
  const ctx = useDataTableContext()
  const isExpandedRow = (row: NotaListItem) => ctx.expandedIds.has(row.id)

  const columns: ColumnDef<NotaListItem>[] = [
    {
      key: 'numero_nota',
      header: 'N° Nota',
      sortKey: 'numero_nota',
      headerClassName: 'w-[180px]',
      cell: (row: NotaListItem) => {
        const esOcr = Boolean(
          row.nota_referencia?.toUpperCase().includes('OCR') ||
          row.numero_nota?.includes('PROPUESTA-OCR') ||
          row.observaciones?.toUpperCase().includes('OCR')
        )

        return (
          <div className="flex items-center gap-2">
            <Link
              href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}
              className="font-mono text-sm font-medium text-primary hover:underline animate-in fade-in"
            >
              {row.numero_nota}
            </Link>

            {esOcr && (
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider px-1.5 py-0 leading-tight shrink-0 shadow-xs">
                🤖 OCR IA
              </Badge>
            )}

            {row.comprobante_url && (
              <ComprobantePreviewButton url={row.comprobante_url} />
            )}
          </div>
        )
      },
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
      cell: (row: NotaListItem) => <NotaAccionesCell row={row} accionEliminar={accionEliminar} />,
    },
  ]

  return (
    <>
      {/* ── Vista de Tabla para Pantallas Medianas y Grandes (Desktop/Tablet) ── */}
      <div className="hidden md:block">
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
      </div>

      {/* ── Vista de Tarjetas Nativas para Móvil (Mobile Cards View) ── */}
      <div className="md:hidden space-y-3">
        {notas.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl border bg-card/60 p-6 text-center space-y-3 shadow-xs">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No se encontraron notas con los filtros aplicados.
            </p>
          </div>
        ) : (
          notas.map((row) => (
            <NotaMobileCard
              key={row.id}
              row={row}
              bodegaFiltradaId={bodegaFiltradaId}
              accionEliminar={accionEliminar}
            />
          ))
        )}
      </div>
    </>
  )
}

function NotaMobileCard({
  row,
  bodegaFiltradaId,
  accionEliminar,
}: {
  row: NotaListItem
  bodegaFiltradaId?: number
  accionEliminar?: AccionEliminarNota
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Tipo de movimiento badge formatting
  let icon = TIPO_MOVIMIENTO_ICONS[row.tipo_codigo] ?? '•'
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

  // Estado badge color classes
  const estadoColors = ESTADO_NOTA_COLORS[row.estado_codigo] ?? 'bg-gray-100 text-gray-800'
  const isEstadoConfirmada = row.estado_codigo === 'CONF'
  const isEstadoPendiente = row.estado_codigo === 'PEND' || row.estado_codigo === 'BORR'

  // OCR Tag detection
  const esOcr = Boolean(
    (row.observaciones && (row.observaciones.includes('[OCR-PROP]') || row.observaciones.includes('OCR'))) ||
    (row.nota_referencia && row.nota_referencia.includes('OCR'))
  )

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 dark:bg-zinc-900/90 shadow-sm p-4 space-y-3.5 transition-all hover:border-primary/30">
      {/* ── Header de la Tarjeta ── */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Link
            href={ADMIN_ROUTES.inventario.notaDetalle(row.id)}
            className="font-mono font-bold text-sm tracking-tight text-foreground hover:text-primary transition-colors truncate"
          >
            {row.numero_nota}
          </Link>
          
          <Badge variant="secondary" className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0", color)}>
            <span>{icon}</span>
            <span>{nombre}</span>
          </Badge>

          {esOcr && (
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0 rounded shrink-0">
              🤖 OCR
            </Badge>
          )}

          {row.comprobante_url && (
            <ComprobantePreviewButton url={row.comprobante_url} />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", estadoColors)}>
            {row.estado_nombre}
          </Badge>
          <NotaAccionesCell row={row} isVertical accionEliminar={accionEliminar} />
        </div>
      </div>

      {/* ── Grid 2 Columnas de Atributos ── */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Origen */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Warehouse className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Origen</span>
            <span className="font-bold text-foreground truncate block" title={row.bodega_origen_nombre}>
              {row.bodega_origen_nombre}
            </span>
          </div>
        </div>

        {/* Destino */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Destino</span>
            <span className="font-bold text-foreground truncate block" title={row.bodega_destino_nombre ?? '—'}>
              {row.bodega_destino_nombre ?? '—'}
            </span>
          </div>
        </div>

        {/* Cajas */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Cajas</span>
            <span className="font-bold font-mono text-foreground block">
              {row.total_cajas ?? 0}
            </span>
          </div>
        </div>

        {/* Costo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Costo</span>
            <span className="font-bold font-mono text-foreground block">
              {row.costo_total !== undefined && row.costo_total !== null && Number(row.costo_total) > 0 ? (
                `$${Number(row.costo_total).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            {isEstadoConfirmada ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : isEstadoPendiente ? (
              <Clock className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Estado</span>
            <span className="font-bold text-foreground block truncate">
              {row.estado_nombre}
            </span>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Fecha</span>
            <span className="font-medium text-foreground text-[11px] block truncate">
              <Fecha valor={row.fecha_nota} formato="fecha-hora" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer: Usuario ── */}
      <div className="pt-2 border-t flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/60 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block font-medium">Usuario</span>
            <span className="font-semibold text-foreground truncate block">
              {row.usuario_nombre || 'Sistema'}
            </span>
          </div>
        </div>

        {/* Botón FastCheck desplegable */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 text-xs font-bold gap-1 rounded-xl text-primary hover:text-primary hover:bg-primary/10"
        >
          <span>{isExpanded ? 'Ocultar' : 'Ver Productos'}</span>
        </Button>
      </div>

      {/* FastCheck desplegado en móvil */}
      {isExpanded && (
        <div className="pt-2 border-t">
          <NotaFastCheckExpandedRow row={row} />
        </div>
      )}
    </div>
  )
}

export function NotasTable({ initialFeatures, ...props }: Props) {
  return (
    <DataTableProvider route="/inventario/notas" features={{ ...FALLBACK_FEATURES, ...initialFeatures }}>
      <NotasTableInner {...props} />
    </DataTableProvider>
  )
}