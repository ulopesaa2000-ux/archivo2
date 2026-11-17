// app/(admin)/inventario/stock/_components/StockMobileTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink, History, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_ROUTES } from '@/lib/constants'
import { useHeaderFlotante } from '@/app/(admin)/inventario/stock/historico/_hooks/use-header-flotante'
import type { StockDetalleCaja, StockListItem } from '@/modules/inventario/types'

export type StockGroup = {
  familia: string
  total_piezas: number
  total_cajas: number
  total_entradas: number
  total_salidas: number
  total_delta: number
  total_pronosticado: number
  tiene_afectados: boolean
  items: StockListItem[]
}

type Props = {
  items: StockListItem[]
  groupedItems: StockGroup[] | null
  isPronostico: boolean
  bodegaNombre?: string
  familyDescriptions: Record<string, string>
  expandedGroups: Set<string>
  onToggleGroup: (familia: string) => void
  expanded: Record<number, StockDetalleCaja[] | null>
  loading: Record<number, boolean>
  onToggleExpand: (productoId: number) => void
  totalCajas: number
  totalPiezas: number
  totalDelta: number
  totalPronosticado: number
  onOpenAuditoria: (target: { modo: 'producto' | 'familia'; productoId?: number; familia?: string; sku?: string }) => void
}

function truncateDynamic(text: string | null | undefined, maxChars: number): string {
  const clean = (text || '').trim()
  if (!clean) return '—'
  if (clean.length <= maxChars) return clean
  return `${clean.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
}

export function StockMobileTable({
  items,
  groupedItems,
  isPronostico,
  bodegaNombre,
  familyDescriptions,
  expandedGroups,
  onToggleGroup,
  expanded,
  loading,
  onToggleExpand,
  totalCajas,
  totalPiezas,
  totalDelta,
  totalPronosticado,
  onOpenAuditoria,
}: Props) {
  const { scrollRef, headerRef, ancho, alto, onScroll } = useHeaderFlotante()

  const headerRow = (
    <tr className="bg-slate-100 dark:bg-zinc-900 font-semibold text-muted-foreground">
      <th className="px-2.5 py-2.5 text-left sticky left-0 z-30 bg-slate-100 dark:bg-zinc-900 w-[168px] min-w-[168px] max-w-[168px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)] align-bottom">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            SKU / Modelo
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">
            Descripción
          </span>
        </div>
      </th>
      {isPronostico ? (
        <>
          <th className="px-2.5 py-2.5 text-center border-b border-r bg-slate-100 dark:bg-zinc-900 min-w-[74px] whitespace-nowrap">
            Reales
          </th>
          <th className="px-2.5 py-2.5 text-center border-b border-r bg-amber-500/10 text-amber-800 dark:text-amber-300 min-w-[74px] whitespace-nowrap">
            Trámite
          </th>
          <th className="px-2.5 py-2.5 text-center border-b border-r bg-primary/10 text-primary font-bold min-w-[88px] whitespace-nowrap">
            Pronóstico
          </th>
          <th className="px-3 py-2.5 text-left border-b border-r bg-slate-100 dark:bg-zinc-900 min-w-[150px] whitespace-nowrap">
            Notas Afectando
          </th>
        </>
      ) : (
        <>
          <th className="px-2.5 py-2.5 text-center border-b border-r bg-slate-100 dark:bg-zinc-900 min-w-[68px] whitespace-nowrap">
            Cajas
          </th>
          <th className="px-2.5 py-2.5 text-center border-b border-r bg-slate-100 dark:bg-zinc-900 min-w-[72px] whitespace-nowrap">
            Pz Sueltas
          </th>
          <th className="px-2.5 py-2.5 text-right border-b border-r bg-slate-100 dark:bg-zinc-900 min-w-[82px] whitespace-nowrap">
            Total Pzs
          </th>
          <th className="px-2.5 py-2.5 text-left border-b bg-slate-100 dark:bg-zinc-900 min-w-[90px] whitespace-nowrap">
            Marca
          </th>
        </>
      )}
    </tr>
  )

  const renderProductoRow = (item: StockListItem, stickyBgClass: string, isChild = false) => {
    const totalPiezasItem = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
    const isExpanded = expanded[item.producto_id] !== undefined
    const isLoading = loading[item.producto_id]
    const detalles = expanded[item.producto_id]
    const prodPronostico = item.cajas_pronosticadas ?? item.cajas
    const isProdNegative = prodPronostico < 0
    const isProdAffected = item.tiene_movimiento_pendiente

    const resolvedStickyBg = isProdAffected
      ? 'bg-amber-50 dark:bg-amber-950'
      : stickyBgClass

    return (
      <React.Fragment key={isChild ? `m-child-${item.id}` : `m-flat-${item.id}`}>
        <tr className={isProdAffected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
          <td
            className={`px-2 py-2 sticky left-0 z-10 w-[168px] min-w-[168px] max-w-[168px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.16)] ${resolvedStickyBg}`}
          >
            <div className="flex items-start gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 shrink-0 mt-0.5"
                onClick={() => onToggleExpand(item.producto_id)}
                title="Ver desglose por caja"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <Link
                    href={`/catalogo/${item.producto_id}`}
                    className="font-mono font-bold text-[11px] text-foreground hover:text-primary hover:underline truncate inline-flex items-center gap-0.5"
                  >
                    <span className="truncate">{item.producto_sku}</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-40 shrink-0" />
                  </Link>
                  <button
                    type="button"
                    className="text-primary/60 hover:text-primary shrink-0"
                    title={`Auditoría CONF de ${item.producto_sku}`}
                    onClick={() =>
                      onOpenAuditoria({
                        modo: 'producto',
                        productoId: item.producto_id,
                        familia: item.producto_familia || '',
                        sku: item.producto_sku,
                      })
                    }
                  >
                    <History className="h-3 w-3" />
                  </button>
                </div>
                <p
                  className="text-[10px] leading-tight text-muted-foreground line-clamp-2 mt-0.5"
                  title={item.producto_descripcion || item.producto_nombre || ''}
                >
                  {truncateDynamic(item.producto_descripcion || item.producto_nombre, 42)}
                </p>
                {!isChild && item.producto_familia && (
                  <span className="block text-[9px] font-mono text-primary/75 truncate mt-0.5">
                    {item.producto_familia}
                  </span>
                )}
              </div>
            </div>
          </td>

          {isPronostico ? (
            <>
              <td className="px-2.5 py-2 text-center tabular-nums font-medium border-b border-r bg-muted/10">
                {item.cajas}
              </td>
              <td className="px-2.5 py-2 text-center tabular-nums border-b border-r">
                {item.delta_cajas !== undefined && item.delta_cajas !== 0 ? (
                  <Badge
                    variant="outline"
                    className={`font-mono text-[11px] px-1.5 py-0 ${
                      item.delta_cajas < 0
                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {item.delta_cajas > 0 ? `+${item.delta_cajas}` : item.delta_cajas}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-2.5 py-2 text-center tabular-nums border-b border-r">
                <Badge
                  variant="outline"
                  className={`font-mono font-bold text-[11px] px-1.5 py-0.5 ${
                    isProdNegative
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                      : item.delta_cajas && item.delta_cajas < 0
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {prodPronostico} cjs
                </Badge>
              </td>
              <td className="px-2.5 py-2 border-b border-r">
                <div className="flex flex-wrap items-center gap-1">
                  {item.notas_pendientes_afectando && item.notas_pendientes_afectando.length > 0 ? (
                    item.notas_pendientes_afectando.map((n) => (
                      <Link
                        key={n.nota_id}
                        href={ADMIN_ROUTES.inventario.notaDetalle(n.nota_id)}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-mono font-medium"
                      >
                        <span>{n.numero_nota.replace(/^N-\d+-/, '')}</span>
                        <span className={n.delta < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                          {n.delta >= 0 ? `+${n.delta}` : n.delta}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </td>
            </>
          ) : (
            <>
              <td className="px-2.5 py-2 text-center tabular-nums font-bold text-primary border-b border-r">
                {item.cajas}
              </td>
              <td className="px-2.5 py-2 text-center tabular-nums border-b border-r">
                {item.piezas_sueltas}
              </td>
              <td className="px-2.5 py-2 text-right tabular-nums font-bold border-b border-r">
                {totalPiezasItem}
              </td>
              <td className="px-2.5 py-2 text-muted-foreground border-b truncate max-w-[110px]">
                {item.marca_nombre ?? '—'}
              </td>
            </>
          )}
        </tr>

        {isExpanded && detalles && detalles.length > 0 && (
          <tr key={`${item.id}-m-detail`} className="bg-muted/15">
            <td colSpan={isPronostico ? 5 : 5} className="px-3 py-2 border-b">
              <div className="rounded border bg-background overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="px-2 py-1 text-left font-semibold">Caja</th>
                      <th className="px-2 py-1 text-left font-semibold">Pack</th>
                      <th className="px-2 py-1 text-center font-semibold">Cajas</th>
                      <th className="px-2 py-1 text-center font-semibold">Pzs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d) => (
                      <tr key={d.id} className="border-t border-muted-foreground/10">
                        <td className="px-2 py-1 font-mono font-medium">{d.caja_codigo ?? '—'}</td>
                        <td className="px-2 py-1 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                        <td className="px-2 py-1 text-center tabular-nums font-semibold">{d.cajas}</td>
                        <td className="px-2 py-1 text-center tabular-nums">{d.piezas_sueltas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className="rounded-lg border shadow-sm bg-background">
      {/* Header flotante fijo verticalmente y sincronizado horizontalmente */}
      <div className="sticky top-0 z-40 overflow-hidden bg-slate-100 dark:bg-zinc-900 rounded-t-lg" style={{ marginBottom: -alto }}>
        <div ref={headerRef} style={{ width: ancho || '100%' }}>
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>{headerRow}</thead>
          </table>
        </div>
      </div>

      {/* Contenedor táctil deslizable horizontalmente */}
      <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto touch-pan-x">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead className="invisible">{headerRow}</thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground border-b">
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : groupedItems ? (
              groupedItems.map((group, groupIdx) => {
                const isGroupExpanded = expandedGroups.has(group.familia)
                const isEven = groupIdx % 2 === 0
                const stickyGroupBg = isEven
                  ? 'bg-blue-50 dark:bg-slate-900'
                  : 'bg-background dark:bg-zinc-950'
                const cellGroupBg = isEven
                  ? 'bg-blue-50/70 dark:bg-slate-900/70'
                  : 'bg-background'
                const isNegative = group.total_pronosticado < 0
                const isDecrease = group.total_delta < 0

                return (
                  <React.Fragment key={`m-group-${group.familia}`}>
                    <tr
                      className="cursor-pointer transition-colors"
                      onClick={() => onToggleGroup(group.familia)}
                    >
                      <td
                        className={`px-2 py-2 sticky left-0 z-20 w-[168px] min-w-[168px] max-w-[168px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.18)] ${stickyGroupBg}`}
                      >
                        <div className="flex items-start gap-1">
                          {isGroupExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-primary text-[11px] truncate">
                                {group.familia}
                              </span>
                              <button
                                type="button"
                                className="text-primary/70 hover:text-primary shrink-0"
                                title={`Rastrear movimientos CONF de ${group.familia} en ${bodegaNombre || 'bodega'}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenAuditoria({ modo: 'familia', familia: group.familia })
                                }}
                              >
                                <History className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                              {truncateDynamic(familyDescriptions[group.familia], 28)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {isPronostico ? (
                        <>
                          <td className={`px-2.5 py-2 text-center tabular-nums font-bold border-b border-r ${cellGroupBg}`}>
                            {group.total_cajas}
                          </td>
                          <td className={`px-2.5 py-2 text-center tabular-nums font-bold border-b border-r ${cellGroupBg}`}>
                            {group.total_delta !== 0 ? (group.total_delta > 0 ? `+${group.total_delta}` : group.total_delta) : '—'}
                          </td>
                          <td
                            className={`px-2.5 py-2 text-center tabular-nums font-black border-b border-r ${
                              isNegative
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/15'
                                : isDecrease
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            }`}
                          >
                            {group.total_pronosticado}
                          </td>
                          <td className={`px-2.5 py-2 border-b border-r text-[10px] ${cellGroupBg}`}>
                            {group.tiene_afectados ? 'Con notas' : '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`px-2.5 py-2 text-center tabular-nums font-bold border-b border-r text-primary ${cellGroupBg}`}>
                            {group.total_cajas}
                          </td>
                          <td className={`px-2.5 py-2 text-center tabular-nums text-muted-foreground border-b border-r ${cellGroupBg}`}>
                            —
                          </td>
                          <td className={`px-2.5 py-2 text-right tabular-nums font-bold text-primary border-b border-r ${cellGroupBg}`}>
                            {group.total_piezas}
                          </td>
                          <td className={`px-2.5 py-2 border-b ${cellGroupBg}`}></td>
                        </>
                      )}
                    </tr>

                    {isGroupExpanded &&
                      group.items.map((item) =>
                        renderProductoRow(
                          item,
                          isEven ? 'bg-slate-50 dark:bg-zinc-900' : 'bg-background dark:bg-zinc-950',
                          true
                        )
                      )}
                  </React.Fragment>
                )
              })
            ) : (
              items.map((item) =>
                renderProductoRow(item, 'bg-background dark:bg-zinc-950', false)
              )
            )}
          </tbody>

          <tfoot className="bg-slate-100 dark:bg-zinc-900 font-bold">
            <tr>
              <td className="px-2.5 py-3 sticky left-0 z-20 bg-slate-100 dark:bg-zinc-900 w-[168px] min-w-[168px] max-w-[168px] border-t-2 border-primary/20 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)] text-[11px]">
                TOTALES
              </td>
              {isPronostico ? (
                <>
                  <td className="px-2.5 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r">
                    {totalCajas}
                  </td>
                  <td className="px-2.5 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r">
                    {totalDelta !== 0 ? (totalDelta > 0 ? `+${totalDelta}` : totalDelta) : '0'}
                  </td>
                  <td className="px-2.5 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r text-primary">
                    {totalPronosticado} cjs
                  </td>
                  <td className="border-t-2 border-primary/20 border-r"></td>
                </>
              ) : (
                <>
                  <td className="px-2.5 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r text-primary">
                    {totalCajas}
                  </td>
                  <td className="px-2.5 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r">
                    —
                  </td>
                  <td className="px-2.5 py-3 text-right tabular-nums border-t-2 border-primary/20 border-r text-primary">
                    {totalPiezas}
                  </td>
                  <td className="border-t-2 border-primary/20"></td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
