// app/(admin)/inventario/stock/_components/StockMatrixMobileTable.tsx
'use client'

import React from 'react'
import { ChevronDown, ChevronRight, Route, History } from 'lucide-react'
import { isUnassignedFamily } from '@/lib/inventario/familias-orden'
import { useHeaderFlotante } from '@/app/(admin)/inventario/stock/historico/_hooks/use-header-flotante'
import type { StockMatrixItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'

export type StockMatrixGroup = {
  familia: string
  total_general: number
  total_real: number
  total_delta: number
  total_pronosticado: number
  stock_por_bodega: Record<number, { cajas: number; delta: number; pronosticado: number; tiene_movimiento: boolean }>
  items: StockMatrixItem[]
}

export type CiudadGrupo = {
  ciudadKey: string
  label: string
  bodegas: BodegaRow[]
  subtotal: number
}

type AuditoriaTarget = {
  modo: 'producto' | 'familia'
  productoId?: number
  familia?: string
  sku?: string
  descripcion?: string | null
}

type Props = {
  items: StockMatrixItem[]
  groupedItems: StockMatrixGroup[] | null
  bodegasColumnas: BodegaRow[]
  ciudadesGrupos: CiudadGrupo[]
  totalsPerBodega: Record<number, number>
  totalesCajasRealesPorBodega?: Record<number, number>
  grandTotal: number
  grandTotalReal: number
  familyDescriptions: Record<string, string>
  expandedGroups: Set<string>
  onToggleGroup: (familia: string) => void
  isPronostico: boolean
  onOpenAuditoria: (target: AuditoriaTarget) => void
}

/**
 * Recorta texto dinámicamente según el presupuesto de caracteres de la vista móvil,
 * evitando cortar palabras o romper el ancho de la columna fija.
 */
function truncateDynamic(text: string | null | undefined, maxChars: number): string {
  const clean = (text || '').trim()
  if (!clean) return '—'
  if (clean.length <= maxChars) return clean
  return `${clean.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
}

export function StockMatrixMobileTable({
  items,
  groupedItems,
  bodegasColumnas,
  ciudadesGrupos,
  totalsPerBodega,
  totalesCajasRealesPorBodega,
  grandTotal,
  grandTotalReal,
  familyDescriptions,
  expandedGroups,
  onToggleGroup,
  isPronostico,
  onOpenAuditoria,
}: Props) {
  const { scrollRef, headerRef, ancho, alto, onScroll } = useHeaderFlotante()

  const headerRows = (
    <>
      <tr className="bg-slate-100 dark:bg-zinc-900 font-semibold text-muted-foreground">
        <th
          rowSpan={2}
          className="px-2.5 py-2.5 text-left sticky left-0 z-30 bg-slate-100 dark:bg-zinc-900 w-[156px] min-w-[156px] max-w-[156px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)] align-bottom"
        >
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              SKU / Modelo
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">
              Descripción
            </span>
          </div>
        </th>
        <th
          rowSpan={2}
          className="px-2 py-2 text-center border-b border-r bg-slate-100 dark:bg-zinc-900 w-[64px] min-w-[64px] align-bottom"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 tabular-nums">
              {grandTotalReal.toLocaleString('es-MX')}
            </span>
            <span className="font-bold text-primary text-[10px] uppercase tracking-wider">
              TOTAL
            </span>
          </div>
        </th>
        {ciudadesGrupos.map((g) => (
          <th
            key={g.ciudadKey}
            colSpan={g.bodegas.length}
            className="px-2 py-1 text-center border-b border-r bg-slate-200/70 dark:bg-zinc-800/90 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
          >
            {g.label} · {g.subtotal.toLocaleString('es-MX')} cjs
          </th>
        ))}
      </tr>
      <tr className="bg-slate-100 dark:bg-zinc-900 font-semibold text-muted-foreground">
        {ciudadesGrupos.flatMap((g) =>
          g.bodegas.map((b) => {
            const totalCajasBodega = totalesCajasRealesPorBodega?.[b.id] ?? totalsPerBodega[b.id] ?? 0
            return (
              <th
                key={b.id}
                className="px-2 py-1.5 text-center border-b border-r whitespace-nowrap min-w-[64px] align-bottom"
                title={`${b.nombre} · ${g.label}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 tabular-nums">
                    {totalCajasBodega.toLocaleString('es-MX')}
                  </span>
                  <span className="block truncate max-w-[60px] text-[10px] font-semibold text-foreground">
                    {truncateDynamic(b.nombre, 10)}
                  </span>
                </div>
              </th>
            )
          })
        )}
      </tr>
    </>
  )

  return (
    <div className="rounded-lg border shadow-sm bg-background">
      {/* Resumen compacto por ciudad */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-muted/40 border-b text-[11px] rounded-t-lg">
        <span className="font-bold text-muted-foreground uppercase tracking-wide mr-1">
          Ciudades:
        </span>
        {ciudadesGrupos.map((g) => (
          <span
            key={g.ciudadKey}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background font-semibold"
          >
            {g.label} · <span className="font-mono tabular-nums">{g.subtotal.toLocaleString('es-MX')}</span>
          </span>
        ))}
        <span className="ml-auto font-mono tabular-nums font-bold text-primary">
          {grandTotalReal.toLocaleString('es-MX')} cjs
        </span>
      </div>

      {/* Header flotante fijo verticalmente y sincronizado horizontalmente */}
      <div className="sticky top-0 z-40 overflow-hidden bg-slate-100 dark:bg-zinc-900" style={{ marginBottom: -alto }}>
        <div ref={headerRef} style={{ width: ancho || '100%' }}>
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>{headerRows}</thead>
          </table>
        </div>
      </div>

      {/* Contenedor con scroll horizontal y columna izquierda fija */}
      <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead className="invisible">{headerRows}</thead>

          <tbody>
            {groupedItems ? (
              groupedItems.map((group, groupIdx) => {
                const isExpanded = expandedGroups.has(group.familia)
                const isEven = groupIdx % 2 === 0
                const stickyGroupBg = isEven
                  ? 'bg-blue-50 dark:bg-slate-900'
                  : 'bg-background dark:bg-zinc-950'
                const cellGroupBg = isEven
                  ? 'bg-blue-50/70 dark:bg-slate-900/70'
                  : 'bg-background'

                return (
                  <React.Fragment key={`m-group-${group.familia}`}>
                    {/* Fila Agrupadora (Familia) */}
                    <tr
                      className="cursor-pointer transition-colors"
                      onClick={() => onToggleGroup(group.familia)}
                    >
                      <td
                        className={`px-2.5 py-2 sticky left-0 z-20 w-[156px] min-w-[156px] max-w-[156px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.18)] ${stickyGroupBg}`}
                      >
                        <div className="flex items-start gap-1.5">
                          {isExpanded ? (
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
                                title={`Rastrear ${group.familia}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenAuditoria({
                                    modo: 'familia',
                                    familia: group.familia,
                                    descripcion: familyDescriptions[group.familia] || '',
                                  })
                                }}
                              >
                                <History className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                              {isUnassignedFamily(group.familia)
                                ? 'Sin familia'
                                : truncateDynamic(familyDescriptions[group.familia], 26)}
                            </p>
                            <span className="inline-block text-[9px] font-semibold text-muted-foreground/80 mt-0.5">
                              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td
                        className={`px-2 py-2 text-center tabular-nums font-bold border-b border-r ${cellGroupBg} ${
                          isPronostico && group.total_general < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-primary'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                          {group.total_general}
                        </span>
                      </td>

                      {bodegasColumnas.map((b) => {
                        const cell = group.stock_por_bodega[b.id]
                        const val = isPronostico ? (cell?.pronosticado ?? 0) : (cell?.cajas ?? 0)
                        const delta = cell?.delta ?? 0
                        const tieneMov = isPronostico && (cell?.tiene_movimiento || delta !== 0)

                        return (
                          <td
                            key={`m-group-b-${b.id}`}
                            className={`px-2 py-2 text-center tabular-nums border-b border-r ${cellGroupBg}`}
                          >
                            {isPronostico && tieneMov ? (
                              <span
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  val < 0
                                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                    : delta < 0
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {val}
                              </span>
                            ) : val > 0 ? (
                              <span className="font-semibold text-foreground">{val}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Filas Hijos (Productos) */}
                    {isExpanded &&
                      group.items.map((item) => {
                        const itemVisibleTotal = bodegasColumnas.reduce(
                          (sum, b) => sum + (item.stock_por_bodega[b.id]?.total ?? 0),
                          0
                        )
                        const itemVisibleDelta = bodegasColumnas.reduce(
                          (sum, b) => sum + (item.stock_por_bodega[b.id]?.delta ?? 0),
                          0
                        )
                        const stickyChildBg = isEven
                          ? 'bg-slate-50 dark:bg-zinc-900'
                          : 'bg-background dark:bg-zinc-950'

                        return (
                          <tr key={`m-child-${item.producto_id}`}>
                            <td
                              className={`px-2.5 py-2 sticky left-0 z-10 w-[156px] min-w-[156px] max-w-[156px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.14)] ${stickyChildBg}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-[11px] text-foreground truncate">
                                  {item.producto_sku}
                                </span>
                                <button
                                  type="button"
                                  className="text-primary/70 hover:text-primary shrink-0"
                                  title={`Auditoría CONF de ${item.producto_sku}`}
                                  onClick={() =>
                                    onOpenAuditoria({
                                      modo: 'producto',
                                      productoId: item.producto_id,
                                      familia: item.producto_familia || '',
                                      sku: item.producto_sku,
                                      descripcion: item.producto_nombre || item.producto_descripcion,
                                    })
                                  }
                                >
                                  <Route className="h-3 w-3" />
                                </button>
                              </div>
                              <p
                                className="text-[10px] leading-tight text-muted-foreground line-clamp-2 mt-0.5"
                                title={item.producto_descripcion || item.producto_nombre || ''}
                              >
                                {truncateDynamic(item.producto_nombre || item.producto_descripcion, 44)}
                              </p>
                            </td>

                            <td className="px-2 py-2 text-center tabular-nums border-b border-r">
                              <span
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded font-bold text-[11px] ${
                                  isPronostico && itemVisibleTotal < 0
                                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                    : isPronostico && itemVisibleDelta < 0
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {itemVisibleTotal}
                              </span>
                            </td>

                            {bodegasColumnas.map((b) => {
                              const cell = item.stock_por_bodega[b.id]
                              const val = cell?.total ?? 0
                              const delta = cell?.delta ?? 0
                              const tieneMov = isPronostico && (cell?.tiene_movimiento || delta !== 0)
                              const pronosticado = cell?.pronosticado ?? val

                              return (
                                <td
                                  key={`m-child-${item.producto_id}-${b.id}`}
                                  className="px-2 py-2 text-center tabular-nums border-b border-r"
                                >
                                  {isPronostico && tieneMov ? (
                                    <span
                                      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                        pronosticado < 0
                                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                          : delta < 0
                                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {pronosticado}
                                    </span>
                                  ) : val > 0 ? (
                                    <span className={isPronostico ? 'font-medium text-foreground' : 'font-semibold text-primary'}>
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                  </React.Fragment>
                )
              })
            ) : (
              items.map((item) => {
                const itemVisibleTotal = bodegasColumnas.reduce(
                  (sum, b) => sum + (item.stock_por_bodega[b.id]?.total ?? 0),
                  0
                )
                const itemVisibleDelta = bodegasColumnas.reduce(
                  (sum, b) => sum + (item.stock_por_bodega[b.id]?.delta ?? 0),
                  0
                )

                return (
                  <tr key={`m-flat-${item.producto_id}`}>
                    <td className="px-2.5 py-2 sticky left-0 z-10 bg-background dark:bg-zinc-950 w-[156px] min-w-[156px] max-w-[156px] border-b border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.16)]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-[11px] text-foreground truncate">
                          {item.producto_sku}
                        </span>
                        <button
                          type="button"
                          className="text-primary/70 hover:text-primary shrink-0"
                          title={`Auditoría CONF de ${item.producto_sku}`}
                          onClick={() =>
                            onOpenAuditoria({
                              modo: 'producto',
                              productoId: item.producto_id,
                              familia: item.producto_familia || '',
                              sku: item.producto_sku,
                              descripcion: item.producto_nombre || item.producto_descripcion,
                            })
                          }
                        >
                          <Route className="h-3 w-3" />
                        </button>
                      </div>
                      <p
                        className="text-[10px] leading-tight text-muted-foreground line-clamp-2 mt-0.5"
                        title={item.producto_descripcion || item.producto_nombre || ''}
                      >
                        {truncateDynamic(item.producto_nombre || item.producto_descripcion, 44)}
                      </p>
                      {item.producto_familia && (
                        <span className="block text-[9px] font-mono text-primary/75 truncate mt-0.5">
                          {item.producto_familia}
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-2 text-center tabular-nums border-b border-r">
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded font-bold text-[11px] ${
                          isPronostico && itemVisibleTotal < 0
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            : isPronostico && itemVisibleDelta < 0
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {itemVisibleTotal}
                      </span>
                    </td>

                    {bodegasColumnas.map((b) => {
                      const cell = item.stock_por_bodega[b.id]
                      const val = cell?.total ?? 0
                      const delta = cell?.delta ?? 0
                      const tieneMov = isPronostico && (cell?.tiene_movimiento || delta !== 0)
                      const pronosticado = cell?.pronosticado ?? val

                      return (
                        <td
                          key={`m-flat-${item.producto_id}-${b.id}`}
                          className="px-2 py-2 text-center tabular-nums border-b border-r"
                        >
                          {isPronostico && tieneMov ? (
                            <span
                              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                pronosticado < 0
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                  : delta < 0
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {pronosticado}
                            </span>
                          ) : val > 0 ? (
                            <span className={isPronostico ? 'font-medium text-foreground' : 'font-semibold text-primary'}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>

          <tfoot className="bg-slate-100 dark:bg-zinc-900 font-bold">
            <tr>
              <td className="px-2.5 py-3 sticky left-0 z-20 bg-slate-100 dark:bg-zinc-900 w-[156px] min-w-[156px] max-w-[156px] border-t-2 border-primary/20 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)] text-[11px]">
                TOTALES
              </td>
              <td className="px-2 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r bg-blue-500/10 text-primary">
                {grandTotal}
              </td>
              {bodegasColumnas.map((b) => (
                <td
                  key={`m-foot-${b.id}`}
                  className="px-2 py-3 text-center tabular-nums border-t-2 border-primary/20 border-r"
                >
                  {totalsPerBodega[b.id] ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

