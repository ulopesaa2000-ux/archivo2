// app/(admin)/contenedores/[id]/components/ContenedorPacking.tsx
'use client'

import { useState, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { Package, Layers, ListFilter, ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import type { ContenedorPackingItem } from '@/modules/contenedores/types'

type SubGrupoPack = {
  key: string
  productoId: number | null
  skuBase: string | null
  modelo: string
  nombrePack: string | null
  descripcion: string
  productoNombre: string | null
  totalCajas: number
  piezasPorCajaEstandar: number
  piezasReales: number
  piezasPlaneadas: number
  precioUnitario: number | null
  importeTotal: number
  cbmDetalle: number
  itemsDetalle: ContenedorPackingItem[]
  _maxCajas: number
}

type GrupoOrden = {
  ordenId: number
  folio: string | null
  estado: string | null
  items: ContenedorPackingItem[]
  subgrupos: SubGrupoPack[]
  subtotal: { cajas: number; piezas_reales: number; piezas_planeadas: number; importe: number }
}

function normalizarPack(nombrePack: string | null): string {
  let pack = (nombrePack || '').trim().toUpperCase()
  if (
    !pack ||
    pack === 'PACK UNICO' ||
    pack === 'UNICO' ||
    pack === 'PACK ÚNICO' ||
    pack === 'ÚNICO' ||
    pack === 'DEFAULT' ||
    pack === 'STANDARD' ||
    pack === 'PRINCIPAL' ||
    pack === 'A01' ||
    pack === 'B01' ||
    pack === 'C01'
  ) {
    return ''
  }

  const match = pack.match(/PACK\s+([A-Z0-9]+)/i) || pack.match(/^([A-Z0-9]+)$/i)
  if (match && pack.includes('PACK')) {
    return `PACK ${match[1]}`
  }
  return pack
}

function agrupar(items: ContenedorPackingItem[]): GrupoOrden[] {
  const map = new Map<number, GrupoOrden>()

  for (const item of items) {
    const oid = item.orden_id
    if (!map.has(oid)) {
      map.set(oid, {
        ordenId: oid,
        folio: item.folio_proveedor,
        estado: item.estado_orden,
        items: [],
        subgrupos: [],
        subtotal: { cajas: 0, piezas_reales: 0, piezas_planeadas: 0, importe: 0 },
      })
    }
    const g = map.get(oid)!
    g.items.push(item)
    g.subtotal.cajas += item.cantidad_cajas ?? 0
    g.subtotal.piezas_reales += item.piezas_reales ?? 0
    g.subtotal.piezas_planeadas += item.piezas_planeadas ?? 0
    g.subtotal.importe += item.importe_total ?? 0
  }

  // Agrupar subgrupos por producto y pack normalizado
  for (const g of map.values()) {
    const subMap = new Map<string, SubGrupoPack>()

    for (const it of g.items) {
      const pack = normalizarPack(it.nombre_pack)
      const key = `${it.producto_id ?? it.sku_base}_${pack}`

      if (!subMap.has(key)) {
        let modelo = it.sku_base || '—'
        if (pack && !modelo.toUpperCase().includes(pack)) {
          modelo = `${modelo} ${pack}`
        }

        subMap.set(key, {
          key,
          productoId: it.producto_id,
          skuBase: it.sku_base,
          modelo: modelo.trim(),
          nombrePack: pack || null,
          descripcion: it.producto_descripcion || it.producto_nombre || '—',
          productoNombre: it.producto_nombre,
          totalCajas: 0,
          piezasPorCajaEstandar: it.piezas_por_caja || 0,
          piezasReales: 0,
          piezasPlaneadas: 0,
          precioUnitario: it.precio_unitario,
          importeTotal: 0,
          cbmDetalle: 0,
          itemsDetalle: [],
          _maxCajas: -1,
        })
      }

      const sg = subMap.get(key)!
      sg.totalCajas += it.cantidad_cajas ?? 0
      sg.piezasReales += it.piezas_reales ?? ((it.cantidad_cajas ?? 0) * (it.piezas_por_caja ?? 0))
      sg.piezasPlaneadas += it.piezas_planeadas ?? 0
      sg.importeTotal += it.importe_total ?? 0
      sg.cbmDetalle = Number((sg.cbmDetalle + (it.cbm_detalle ?? 0)).toFixed(4))
      sg.itemsDetalle.push(it)

      // Determinar piezas/caja de la caja predominante
      if ((it.cantidad_cajas ?? 0) > sg._maxCajas) {
        sg._maxCajas = it.cantidad_cajas ?? 0
        if ((it.piezas_por_caja ?? 0) > 0) {
          sg.piezasPorCajaEstandar = it.piezas_por_caja ?? 0
        }
      }
      if (it.precio_unitario && !sg.precioUnitario) {
        sg.precioUnitario = it.precio_unitario
      }
    }

    g.subgrupos = Array.from(subMap.values())
  }

  return Array.from(map.values())
}

export function ContenedorPacking({ items }: { items: ContenedorPackingItem[] }) {
  const [modoVista, setModoVista] = useState<'agrupado' | 'extendido'>('agrupado')
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground mt-4">
        <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin packing list.</p>
      </div>
    )
  }

  const grupos = agrupar(items)
  const granTotal = grupos.reduce(
    (acc, g) => ({
      cajas: acc.cajas + g.subtotal.cajas,
      piezas_reales: acc.piezas_reales + g.subtotal.piezas_reales,
      piezas_planeadas: acc.piezas_planeadas + g.subtotal.piezas_planeadas,
      importe: acc.importe + g.subtotal.importe,
    }),
    { cajas: 0, piezas_reales: 0, piezas_planeadas: 0, importe: 0 },
  )

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandAll = () => {
    const allKeys: Record<string, boolean> = {}
    const shouldExpand = Object.values(expandedKeys).filter(Boolean).length < 3
    for (const g of grupos) {
      for (const sg of g.subgrupos) {
        if (sg.itemsDetalle.length > 1) {
          allKeys[sg.key] = shouldExpand
        }
      }
    }
    setExpandedKeys(allKeys)
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Selector de Modo de Vista y Controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/20 p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button
            variant={modoVista === 'agrupado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoVista('agrupado')}
            className="h-8 text-xs font-semibold"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Vista Agrupada (Por Packs / Modelo)
          </Button>
          <Button
            variant={modoVista === 'extendido' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModoVista('extendido')}
            className="h-8 text-xs font-semibold"
          >
            <ListFilter className="h-3.5 w-3.5 mr-1.5" />
            Vista Extendida (Desglose de Cajas)
          </Button>
        </div>

        {modoVista === 'agrupado' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpandAll}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
            Expandir / Colapsar Desgloses
          </Button>
        )}
      </div>

      {/* Lista de Órdenes */}
      {grupos.map((grupo) => (
        <div key={grupo.ordenId} className="rounded-lg border overflow-auto bg-card shadow-sm">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b">
            <span className="font-mono text-xs text-primary font-bold">Orden #{grupo.ordenId}</span>
            <span className="font-medium text-sm">{grupo.folio ?? '—'}</span>
            {grupo.estado && (
              <Badge variant="secondary" className={cn('text-[10px]', ESTADO_ORDEN_B2B_COLORS[grupo.estado] ?? '')}>
                {grupo.estado}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {modoVista === 'agrupado'
                ? `${grupo.subgrupos.length} modelo${grupo.subgrupos.length !== 1 ? 's' : ''}`
                : `${grupo.items.length} línea${grupo.items.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {modoVista === 'agrupado' ? (
            /* TABLA MODO AGRUPADO (POR MODELO / PACKS) */
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/20 font-semibold text-muted-foreground border-b">
                  <th className="px-2 py-2 text-center w-8"></th>
                  <th className="px-3 py-2 text-left">Modelo / Pack</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-center">Pz / Caja (Est.)</th>
                  <th className="px-3 py-2 text-center">Total Cajas</th>
                  <th className="px-3 py-2 text-right">Pz Reales</th>
                  <th className="px-3 py-2 text-right">Pz Pedidas</th>
                  <th className="px-3 py-2 text-right">Dif</th>
                  <th className="px-3 py-2 text-right">Precio USD</th>
                  <th className="px-3 py-2 text-right">Importe Total</th>
                </tr>
              </thead>
              <tbody>
                {grupo.subgrupos.map((sg) => {
                  const dif = sg.piezasReales - sg.piezasPlaneadas
                  const hasMultiplesCajas = sg.itemsDetalle.length > 1
                  const isExpanded = !!expandedKeys[sg.key]

                  return (
                    <Fragment key={sg.key}>
                      <tr
                        className={cn(
                          'border-t hover:bg-muted/10 transition-colors',
                          hasMultiplesCajas && 'cursor-pointer'
                        )}
                        onClick={() => hasMultiplesCajas && toggleExpand(sg.key)}
                      >
                        {/* Flechita expandir */}
                        <td className="px-2 py-2 text-center w-8">
                          {hasMultiplesCajas && (
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(sg.key)
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Modelo */}
                        <td className="px-3 py-2 font-mono font-bold text-foreground whitespace-nowrap">
                          {sg.modelo}
                          {sg.itemsDetalle.length > 1 && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                              ({sg.itemsDetalle.length} cajas)
                            </span>
                          )}
                        </td>

                        {/* Descripción */}
                        <td className="px-3 py-2 text-muted-foreground max-w-[240px] truncate" title={sg.descripcion}>
                          {sg.descripcion}
                        </td>

                        {/* Pz/Caja Estándar */}
                        <td className="px-3 py-2 text-center font-mono tabular-nums font-semibold">
                          {sg.piezasPorCajaEstandar || '—'}
                        </td>

                        {/* Total Cajas */}
                        <td className="px-3 py-2 text-center font-mono font-bold tabular-nums">
                          {sg.totalCajas}
                        </td>

                        {/* Pz Reales */}
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground tabular-nums">
                          {sg.piezasReales.toLocaleString()}
                        </td>

                        {/* Pz Planeadas */}
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                          {sg.piezasPlaneadas ? sg.piezasPlaneadas.toLocaleString() : '—'}
                        </td>

                        {/* Diferencia */}
                        <td
                          className={cn(
                            'px-3 py-2 text-right font-mono tabular-nums font-semibold',
                            dif !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                          )}
                        >
                          {dif !== 0 ? (dif > 0 ? `+${dif}` : dif) : '0'}
                        </td>

                        {/* Precio USD */}
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {sg.precioUnitario ? formatCurrency(sg.precioUnitario, 'USD') : '—'}
                        </td>

                        {/* Importe Total */}
                        <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-foreground">
                          {sg.importeTotal ? formatCurrency(sg.importeTotal, 'USD') : '—'}
                        </td>
                      </tr>

                      {/* Desglose desplegable de cajas físicas si está expandido */}
                      {isExpanded && hasMultiplesCajas && (
                        <tr className="bg-muted/30 border-t border-dashed">
                          <td colSpan={10} className="px-6 py-2.5">
                            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Desglose de Cajas Físicas:
                            </div>
                            <div className="space-y-1">
                              {sg.itemsDetalle.map((d, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="flex items-center justify-between text-xs py-1 px-3 rounded bg-background/90 border text-muted-foreground"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-primary font-medium">{d.codigo_caja ?? 'Sin código'}</span>
                                    {d.nombre_pack && <Badge variant="outline" className="text-[10px] py-0">{d.nombre_pack}</Badge>}
                                  </div>
                                  <div className="flex items-center gap-6 tabular-nums font-mono">
                                    <span>{d.cantidad_cajas} caja{d.cantidad_cajas !== 1 ? 's' : ''}</span>
                                    <span>{d.piezas_por_caja} pz/caja</span>
                                    <span className="font-semibold text-foreground">{d.piezas_reales} pz totales</span>
                                    {d.cbm_detalle ? <span>{d.cbm_detalle} CBM</span> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20 font-semibold text-xs">
                  <td colSpan={4} className="px-3 py-2 text-muted-foreground">Subtotal Orden</td>
                  <td className="px-3 py-2 text-center tabular-nums">{grupo.subtotal.cajas}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{grupo.subtotal.piezas_reales.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{grupo.subtotal.piezas_planeadas.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-semibold">
                    {grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas !== 0
                      ? (grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas > 0
                        ? `+${grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas}`
                        : grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas)
                      : '0'}
                  </td>
                  <td></td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                    {formatCurrency(grupo.subtotal.importe, 'USD')}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* TABLA MODO EXTENDIDO (DESGLOSE COMPLETO PLANO) */
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/20 font-semibold text-muted-foreground border-b">
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-left">Caja</th>
                  <th className="px-3 py-2 text-center">Cajas</th>
                  <th className="px-3 py-2 text-right">Pz Reales</th>
                  <th className="px-3 py-2 text-right">Pz Pedidas</th>
                  <th className="px-3 py-2 text-right">Dif</th>
                  <th className="px-3 py-2 text-right">P.Unit</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((item, i) => {
                  const real = item.piezas_reales ?? 0
                  const plan = item.piezas_planeadas ?? 0
                  const dif = real - plan
                  return (
                    <tr key={i} className="border-t hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium">{item.sku_base ?? '—'}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <div className="truncate text-xs font-medium">{item.producto_descripcion ?? item.producto_nombre ?? '—'}</div>
                        {item.producto_nombre && item.producto_descripcion && (
                          <div className="text-[10px] text-muted-foreground truncate leading-tight">{item.producto_nombre}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-primary">{item.codigo_caja ?? '—'}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-semibold">{item.cantidad_cajas ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{real}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{plan || '—'}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums', dif !== 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground')}>
                        {dif !== 0 ? (dif > 0 ? `+${dif}` : dif) : '0'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.precio_unitario ? formatCurrency(item.precio_unitario, 'USD') : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{item.importe_total ? formatCurrency(item.importe_total, 'USD') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20 font-semibold text-xs">
                  <td colSpan={3} className="px-3 py-2 text-muted-foreground">Subtotal Orden</td>
                  <td className="px-3 py-2 text-center tabular-nums">{grupo.subtotal.cajas}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{grupo.subtotal.piezas_reales}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{grupo.subtotal.piezas_planeadas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-semibold">
                    {grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas !== 0
                      ? (grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas > 0
                        ? `+${grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas}`
                        : grupo.subtotal.piezas_reales - grupo.subtotal.piezas_planeadas)
                      : '0'}
                  </td>
                  <td></td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{formatCurrency(grupo.subtotal.importe, 'USD')}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      ))}

      {/* Total General */}
      <div className="rounded-lg border bg-muted/10 p-4">
        <div className="flex items-center justify-between text-sm font-bold flex-wrap gap-4">
          <span className="text-base text-foreground">Total General del Contenedor</span>
          <div className="flex items-center gap-6 tabular-nums flex-wrap">
            <span className="bg-muted/50 px-2.5 py-1 rounded border font-mono">{granTotal.cajas} cajas</span>
            <span className="bg-muted/50 px-2.5 py-1 rounded border font-mono">{granTotal.piezas_reales.toLocaleString()} pz reales</span>
            <span className="bg-muted/50 px-2.5 py-1 rounded border font-mono">{granTotal.piezas_planeadas.toLocaleString()} pz pedidas</span>
            <span className={cn('px-2.5 py-1 rounded border font-mono', granTotal.piezas_reales - granTotal.piezas_planeadas !== 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-muted/50')}>
              {granTotal.piezas_reales - granTotal.piezas_planeadas !== 0
                ? `Dif: ${granTotal.piezas_reales - granTotal.piezas_planeadas > 0 ? '+' : ''}${granTotal.piezas_reales - granTotal.piezas_planeadas}`
                : 'Sin diferencia'}
            </span>
            <span className="text-primary text-base font-extrabold">{formatCurrency(granTotal.importe, 'USD')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

