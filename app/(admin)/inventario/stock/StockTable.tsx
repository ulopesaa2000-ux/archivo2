// app/(admin)/inventario/stock/StockTable.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Loader2, Maximize2, Minimize2, Download, ExternalLink } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { exportStockByBodegaAction } from '@/modules/inventario/actions'
import type { StockListItem, StockDetalleCaja } from '@/modules/inventario/types'
import { ADMIN_ROUTES } from '@/lib/constants'

export function StockTable({
  items,
  bodegaId,
  agruparPor,
  bodegaNombre,
}: {
  items: StockListItem[]
  bodegaId: number
  agruparPor?: string
  bodegaNombre?: string
}) {
  const searchParams = useSearchParams()
  const isPronostico = searchParams.get('modo') === 'pronostico'

  const [isExporting, setIsExporting] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, StockDetalleCaja[] | null>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (familia: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(familia)) next.delete(familia)
      else next.add(familia)
      return next
    })
  }

  // Agrupación de items si agruparPor === 'familia'
  const groupedItems = useMemo(() => {
    if (agruparPor !== 'familia') return null

    const groups: Record<
      string,
      {
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
    > = {}

    items.forEach((item) => {
      const familiaKey = item.producto_familia || 'Sin Familia'
      if (!groups[familiaKey]) {
        groups[familiaKey] = {
          familia: familiaKey,
          total_piezas: 0,
          total_cajas: 0,
          total_entradas: 0,
          total_salidas: 0,
          total_delta: 0,
          total_pronosticado: 0,
          tiene_afectados: false,
          items: [],
        }
      }

      const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
      const delta = item.delta_cajas ?? 0
      const pronosticado = item.cajas_pronosticadas ?? (item.cajas + delta)

      groups[familiaKey].items.push(item)
      groups[familiaKey].total_piezas += totalPiezas
      groups[familiaKey].total_cajas += item.cajas
      groups[familiaKey].total_entradas += item.entradas_pendientes ?? 0
      groups[familiaKey].total_salidas += item.salidas_pendientes ?? 0
      groups[familiaKey].total_delta += delta
      groups[familiaKey].total_pronosticado += pronosticado
      if (item.tiene_movimiento_pendiente) {
        groups[familiaKey].tiene_afectados = true
      }
    })

    const sortedGroups = Object.values(groups).sort((a, b) => a.familia.localeCompare(b.familia))
    sortedGroups.forEach((g) => {
      g.items.sort((a, b) => (a.producto_sku || '').localeCompare(b.producto_sku || ''))
    })
    return sortedGroups
  }, [items, agruparPor])

  // Totales generales
  const { totalCajas, totalPiezas, totalDelta, totalPronosticado } = useMemo(() => {
    let tc = 0
    let tp = 0
    let td = 0
    let tpron = 0
    items.forEach((item) => {
      tc += item.cajas
      tp += (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
      const delta = item.delta_cajas ?? 0
      td += delta
      tpron += item.cajas_pronosticadas ?? (item.cajas + delta)
    })
    return { totalCajas: tc, totalPiezas: tp, totalDelta: td, totalPronosticado: tpron }
  }, [items])

  // Mapear descripción general por familia para usar en subtotales
  const familyDescriptions = useMemo(() => {
    const map: Record<string, string> = {}
    items.forEach((item) => {
      const family = item.producto_familia || 'Sin Familia'
      if (!map[family]) {
        map[family] = item.producto_nombre || item.producto_descripcion || ''
      }
    })
    return map
  }, [items])

  const expandAll = () => {
    if (!groupedItems) return
    toast.info('Expandiendo todas las familias...', {
      duration: 1500,
      position: 'top-right',
    })
    setExpandedGroups(new Set(groupedItems.map((g) => g.familia)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const toggleExpand = async (productoId: number) => {
    if (expanded[productoId] !== undefined) {
      setExpanded((prev) => {
        const next = { ...prev }
        delete next[productoId]
        return next
      })
      return
    }

    setLoading((prev) => ({ ...prev, [productoId]: true }))

    try {
      const { fetchStockDetallePorCaja } = await import('@/modules/inventario/queries')
      const detalles = await fetchStockDetallePorCaja(bodegaId, productoId)
      setExpanded((prev) => ({ ...prev, [productoId]: detalles }))
    } catch {
      setExpanded((prev) => ({ ...prev, [productoId]: [] }))
    } finally {
      setLoading((prev) => ({ ...prev, [productoId]: false }))
    }
  }

  const downloadExcel = async () => {
    setIsExporting(true)
    toast.info('Obteniendo existencias completas para exportar...')

    try {
      const q = searchParams.get('q') || undefined
      const con_stock_cero = searchParams.get('con_stock_cero') === 'true'
      const modo = searchParams.get('modo') === 'pronostico' ? 'pronostico' : 'fisico'
      const solo_afectados = searchParams.get('solo_afectados') === 'true'

      const res = await exportStockByBodegaAction(bodegaId, { q, con_stock_cero, modo, solo_afectados })
      if (!res.success || !res.data || res.data.length === 0) {
        toast.error(res.error || 'No se encontraron datos para exportar.')
        setIsExporting(false)
        return
      }

      const allItems = res.data
      allItems.sort((a, b) => {
        const famA = a.producto_familia || 'SIN FAMILIA'
        const famB = b.producto_familia || 'SIN FAMILIA'
        const famCmp = famA.localeCompare(famB)
        if (famCmp !== 0) return famCmp
        return (a.producto_sku || '').localeCompare(b.producto_sku || '')
      })
      const workbook = new ExcelJS.Workbook()

      const dataSheet = workbook.addWorksheet(isPronostico ? 'Stock Pronosticado' : 'Datos Stock')

      if (isPronostico) {
        dataSheet.columns = [
          { header: 'FAMILIA', key: 'familia', width: 18 },
          { header: 'DESCRIPCIÓN GENERAL', key: 'desc_gral', width: 40 },
          { header: 'SKU (ESTILO)', key: 'sku', width: 20 },
          { header: 'MARCA', key: 'marca', width: 20 },
          { header: 'CAJAS REALES', key: 'cajas', width: 15 },
          { header: 'EN TRÁMITE (+/-)', key: 'delta', width: 16 },
          { header: 'CAJAS PRONOSTICADAS', key: 'pronosticado', width: 22 },
          { header: 'NOTAS AFECTANDO', key: 'notas', width: 35 },
        ]

        allItems.forEach((item) => {
          const notasStr = (item.notas_pendientes_afectando || [])
            .map((n) => `${n.numero_nota} (${n.delta >= 0 ? '+' : ''}${n.delta} cjs)`)
            .join(', ')

          dataSheet.addRow({
            familia: item.producto_familia || 'SIN FAMILIA',
            desc_gral: item.producto_nombre || item.producto_descripcion || '',
            sku: item.producto_sku,
            marca: item.marca_nombre || '',
            cajas: item.cajas,
            delta: item.delta_cajas ?? 0,
            pronosticado: item.cajas_pronosticadas ?? item.cajas,
            notas: notasStr || '—',
          })
        })
      } else {
        dataSheet.columns = [
          { header: 'FAMILIA', key: 'familia', width: 20 },
          { header: 'DESCRIPCIÓN GENERAL', key: 'desc_gral', width: 45 },
          { header: 'SKU (ESTILO)', key: 'sku', width: 20 },
          { header: 'MARCA', key: 'marca', width: 20 },
          { header: 'CAJAS', key: 'cajas', width: 12 },
          { header: 'PZ SUELTAS', key: 'piezas_sueltas', width: 12 },
          { header: 'TOTAL PIEZAS', key: 'total_piezas', width: 15 },
          { header: 'UBICACIÓN', key: 'ubicacion', width: 15 },
        ]

        allItems.forEach((item) => {
          const totalPz = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
          dataSheet.addRow({
            familia: item.producto_familia || 'SIN FAMILIA',
            desc_gral: item.producto_nombre || item.producto_descripcion || '',
            sku: item.producto_sku,
            marca: item.marca_nombre || '',
            cajas: item.cajas,
            piezas_sueltas: item.piezas_sueltas,
            total_piezas: totalPz,
            ubicacion: item.ubicacion_pasillo || '—',
          })
        })
      }

      dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dataSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isPronostico ? 'FFD97706' : 'FF1E293B' },
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Stock_${isPronostico ? 'Pronosticado_' : ''}${bodegaNombre || 'Bodega'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Archivo Excel generado correctamente.')
    } catch (err: any) {
      console.error(err)
      toast.error('Error al generar archivo Excel.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {agruparPor === 'familia' && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Expandir Todo
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">
                <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
                Colapsar Todo
              </Button>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={downloadExcel}
          disabled={isExporting}
          className="text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-8 text-xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar Excel
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground border-b">
              <th className="px-2 py-3 w-[40px] sticky left-0 bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0]"></th>
              <th className="px-4 py-3 text-left sticky left-[40px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px]">
                Familia
              </th>
              <th className="px-4 py-3 text-left border-l sticky left-[180px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px]">
                SKU
              </th>
              <th className="px-4 py-3 text-left border-l hidden md:table-cell min-w-[200px]">Descripción</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell border-l">Marca</th>

              {isPronostico ? (
                <>
                  <th className="px-3 py-3 text-center border-l bg-muted/40 font-semibold w-[100px]">Cajas Reales</th>
                  <th className="px-3 py-3 text-center border-l bg-amber-500/10 text-amber-900 dark:text-amber-300 font-semibold w-[110px]">
                    En Trámite
                  </th>
                  <th className="px-3 py-3 text-center border-l bg-primary/10 text-primary font-bold w-[120px]">
                    Pronosticado
                  </th>
                  <th className="px-4 py-3 text-left border-l min-w-[180px]">Notas Afectando</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-center border-l">Cajas</th>
                  <th className="px-4 py-3 text-center border-l">Pz Sueltas</th>
                  <th className="px-4 py-3 text-right border-l">Total Piezas</th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell border-l">Ubicación</th>
                  <th className="px-4 py-3 text-right hidden xl:table-cell border-l">Actualizado</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={isPronostico ? 8 : 10}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : groupedItems ? (
              groupedItems.map((group, groupIdx) => {
                const isGroupExpanded = expandedGroups.has(group.familia)
                const isEven = groupIdx % 2 === 0
                const rowBgClass = isEven ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'bg-background'

                // Semáforo y estilo de la familia en modo pronóstico
                const isNegative = group.total_pronosticado < 0
                const isDecrease = group.total_delta < 0

                return (
                  <React.Fragment key={`group-${group.familia}`}>
                    {/* Fila Agrupadora (Familia) */}
                    <tr
                      className={`border-b hover:bg-blue-100/50 dark:hover:bg-blue-900/20 font-medium cursor-pointer transition-colors ${rowBgClass}`}
                      onClick={() => toggleGroup(group.familia)}
                    >
                      <td
                        className={`px-2 py-3 sticky left-0 z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[40px] ${
                          isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'
                        }`}
                      >
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary pointer-events-none">
                          {isGroupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td
                        className={`px-4 py-3 font-bold text-sm text-primary sticky left-[40px] z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] ${
                          isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{group.familia}</span>
                        </div>
                      </td>
                      <td
                        colSpan={3}
                        className={`px-4 py-3 text-xs text-muted-foreground italic bg-muted/5 truncate whitespace-nowrap overflow-hidden max-w-[420px] sticky left-[180px] z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] ${
                          isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'
                        }`}
                        title={familyDescriptions[group.familia]}
                      >
                        <div className="flex items-center gap-3">
                          <span className="truncate max-w-[200px]">{familyDescriptions[group.familia]}</span>

                          {/* Cápsula / Ecuación de la Familia en Modo Pronóstico */}
                          {isPronostico && (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                isNegative
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                                  : isDecrease
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              <span className="font-mono">Real: {group.total_cajas}</span>
                              <span>+</span>
                              <span className="font-mono">
                                Trámite: {group.total_delta >= 0 ? `+${group.total_delta}` : group.total_delta}
                              </span>
                              <span>=</span>
                              <span className="font-mono font-bold">Total: {group.total_pronosticado} cjs</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {isPronostico ? (
                        <>
                          <td className="px-3 py-3 text-center tabular-nums font-bold bg-muted/20 border-l">
                            {group.total_cajas}
                          </td>
                          <td
                            className={`px-3 py-3 text-center tabular-nums font-bold border-l ${
                              group.total_delta < 0
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                : group.total_delta > 0
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                : 'text-muted-foreground bg-muted/5'
                            }`}
                          >
                            {group.total_delta !== 0 ? (group.total_delta > 0 ? `+${group.total_delta}` : group.total_delta) : '—'}
                          </td>
                          <td
                            className={`px-3 py-3 text-center tabular-nums font-black border-l ${
                              isNegative
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/15'
                                : isDecrease
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            }`}
                          >
                            {group.total_pronosticado}
                          </td>
                          <td className="px-4 py-3 border-l text-xs text-muted-foreground">
                            {group.tiene_afectados ? (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Con notas pendientes
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-center tabular-nums font-bold bg-primary/5 border-l border-r">
                            {group.total_cajas}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-muted-foreground bg-muted/5">—</td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold bg-primary/10 text-primary border-l">
                            {group.total_piezas}
                          </td>
                          <td colSpan={2} className="px-4 py-3 hidden xl:table-cell"></td>
                        </>
                      )}
                    </tr>

                    {/* Filas Hijos (Productos) */}
                    {isGroupExpanded &&
                      group.items.map((item) => {
                        const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
                        const isExpanded = expanded[item.producto_id] !== undefined
                        const isLoading = loading[item.producto_id]
                        const detalles = expanded[item.producto_id]

                        const prodPronostico = item.cajas_pronosticadas ?? item.cajas
                        const isProdNegative = prodPronostico < 0
                        const isProdAffected = item.tiene_movimiento_pendiente

                        return (
                          <React.Fragment key={`child-${item.id}`}>
                            <tr
                              className={`border-t transition-colors ${
                                isProdAffected
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60'
                                  : isEven
                                  ? 'bg-blue-50/20 dark:bg-blue-900/5 hover:bg-primary/5'
                                  : 'bg-background hover:bg-primary/5'
                              }`}
                            >
                              <td
                                className={`px-2 py-2 text-right sticky left-0 z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[40px] ${
                                  isProdAffected
                                    ? 'bg-amber-50/90 dark:bg-amber-950/40'
                                    : isEven
                                    ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                    : 'bg-background/95'
                                }`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleExpand(item.producto_id)}
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                              </td>
                              <td
                                className={`px-4 py-2 text-xs text-muted-foreground italic sticky left-[40px] z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] ${
                                  isProdAffected
                                    ? 'bg-amber-50/90 dark:bg-amber-950/40'
                                    : isEven
                                    ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                    : 'bg-background/95'
                                }`}
                              >
                                {group.familia}
                              </td>
                              <td
                                className={`px-4 py-2 font-mono text-xs font-medium border-l sticky left-[180px] z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] ${
                                  isProdAffected
                                    ? 'bg-amber-50/90 dark:bg-amber-950/40'
                                    : isEven
                                    ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                    : 'bg-background/95'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/catalogo/${item.producto_id}`}
                                    className="hover:underline hover:text-primary transition-colors flex items-center gap-1"
                                    title="Ver ficha en catálogo"
                                  >
                                    {item.producto_sku}
                                    <ExternalLink className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                                  </Link>
                                </div>
                              </td>
                              <td
                                className="px-4 py-2 text-xs hidden md:table-cell truncate max-w-[280px] border-l"
                                title={item.producto_descripcion || item.producto_nombre || ''}
                              >
                                {item.producto_descripcion || item.producto_nombre || '—'}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell border-l">
                                {item.marca_nombre ?? '—'}
                              </td>

                              {isPronostico ? (
                                <>
                                  <td className="px-3 py-2 text-center tabular-nums font-medium border-l bg-muted/20">
                                    {item.cajas}
                                  </td>
                                  <td className="px-3 py-2 text-center tabular-nums border-l">
                                    {item.delta_cajas !== undefined && item.delta_cajas !== 0 ? (
                                      <Badge
                                        variant="outline"
                                        className={`font-mono text-xs px-1.5 py-0 ${
                                          item.delta_cajas < 0
                                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                        }`}
                                      >
                                        {item.delta_cajas > 0 ? `+${item.delta_cajas}` : item.delta_cajas}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center tabular-nums border-l">
                                    <Badge
                                      variant="outline"
                                      className={`font-mono font-bold text-xs px-2 py-0.5 ${
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
                                  <td className="px-4 py-2 border-l">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {item.notas_pendientes_afectando && item.notas_pendientes_afectando.length > 0 ? (
                                        item.notas_pendientes_afectando.map((n) => (
                                          <Link
                                            key={n.nota_id}
                                            href={ADMIN_ROUTES.inventario.notaDetalle(n.nota_id)}
                                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all font-mono font-medium"
                                            title={`${n.tipo_codigo} | ${n.cajas} cjs ${n.observaciones ? `— ${n.observaciones}` : ''}`}
                                          >
                                            <span>{n.numero_nota.replace(/^N-\d+-/, '')}</span>
                                            <span
                                              className={
                                                n.delta < 0
                                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                                  : 'text-emerald-600 dark:text-emerald-400 font-bold'
                                              }
                                            >
                                              {n.delta >= 0 ? `+${n.delta}` : n.delta}
                                            </span>
                                          </Link>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-2 text-center tabular-nums font-medium border-l">
                                    {item.cajas}
                                  </td>
                                  <td className="px-4 py-2 text-center tabular-nums border-l">{item.piezas_sueltas}</td>
                                  <td className="px-4 py-2 text-right tabular-nums font-bold border-l">
                                    {totalPiezas}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground hidden xl:table-cell border-l">
                                    {item.ubicacion_pasillo ?? '—'}
                                  </td>
                                  <td className="px-4 py-2 text-right hidden xl:table-cell border-l">
                                    <Fecha
                                      valor={item.updated_at}
                                      formato="relativo"
                                      className="text-xs text-muted-foreground"
                                    />
                                  </td>
                                </>
                              )}
                            </tr>

                            {/* Desglose por caja */}
                            {isExpanded && detalles && detalles.length > 0 && (
                              <tr key={`${item.id}-detail`} className="bg-muted/10">
                                <td></td>
                                <td colSpan={isPronostico ? 7 : 9} className="px-4 py-3">
                                  <div className="rounded border border-muted-foreground/20 overflow-hidden bg-background">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-muted/40">
                                          <th className="px-3 py-1.5 text-left font-semibold">Caja</th>
                                          <th className="px-3 py-1.5 text-left font-semibold">Pack</th>
                                          <th className="px-3 py-1.5 text-center font-semibold">Cajas Físicas</th>
                                          <th className="px-3 py-1.5 text-center font-semibold">Piezas Sueltas</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detalles.map((d) => (
                                          <tr key={d.id} className="border-t border-muted-foreground/10">
                                            <td className="px-3 py-1.5 font-mono font-medium">{d.caja_codigo ?? '—'}</td>
                                            <td className="px-3 py-1.5 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                                            <td className="px-3 py-1.5 text-center tabular-nums font-semibold">{d.cajas}</td>
                                            <td className="px-3 py-1.5 text-center tabular-nums">{d.piezas_sueltas}</td>
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
                      })}
                  </React.Fragment>
                )
              })
            ) : (
              /* Vista Plana (Sin Agrupar) */
              items.map((item) => {
                const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
                const isExpanded = expanded[item.producto_id] !== undefined
                const isLoading = loading[item.producto_id]
                const detalles = expanded[item.producto_id]

                const prodPronostico = item.cajas_pronosticadas ?? item.cajas
                const isProdNegative = prodPronostico < 0
                const isProdAffected = item.tiene_movimiento_pendiente

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`border-t transition-colors ${
                        isProdAffected
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpand(item.producto_id)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                        {item.producto_familia || '—'}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs font-medium border-l">
                        <Link
                          href={`/catalogo/${item.producto_id}`}
                          className="hover:underline hover:text-primary transition-colors flex items-center gap-1"
                          title="Ver ficha en catálogo"
                        >
                          {item.producto_sku}
                          <ExternalLink className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                        </Link>
                      </td>
                      <td
                        className="px-4 py-2 text-xs hidden md:table-cell truncate max-w-[300px] border-l"
                        title={item.producto_descripcion || item.producto_nombre || ''}
                      >
                        {item.producto_descripcion || item.producto_nombre || '—'}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell border-l">
                        {item.marca_nombre ?? '—'}
                      </td>

                      {isPronostico ? (
                        <>
                          <td className="px-3 py-2 text-center tabular-nums font-medium border-l bg-muted/20">
                            {item.cajas}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums border-l">
                            {item.delta_cajas !== undefined && item.delta_cajas !== 0 ? (
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs px-1.5 py-0 ${
                                  item.delta_cajas < 0
                                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {item.delta_cajas > 0 ? `+${item.delta_cajas}` : item.delta_cajas}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums border-l">
                            <Badge
                              variant="outline"
                              className={`font-mono font-bold text-xs px-2 py-0.5 ${
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
                          <td className="px-4 py-2 border-l">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.notas_pendientes_afectando && item.notas_pendientes_afectando.length > 0 ? (
                                item.notas_pendientes_afectando.map((n) => (
                                  <Link
                                    key={n.nota_id}
                                    href={ADMIN_ROUTES.inventario.notaDetalle(n.nota_id)}
                                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all font-mono font-medium"
                                    title={`${n.tipo_codigo} | ${n.cajas} cjs ${n.observaciones ? `— ${n.observaciones}` : ''}`}
                                  >
                                    <span>{n.numero_nota.replace(/^N-\d+-/, '')}</span>
                                    <span
                                      className={
                                        n.delta < 0
                                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                                          : 'text-emerald-600 dark:text-emerald-400 font-bold'
                                      }
                                    >
                                      {n.delta >= 0 ? `+${n.delta}` : n.delta}
                                    </span>
                                  </Link>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-center tabular-nums font-medium border-l">
                            {item.cajas}
                          </td>
                          <td className="px-4 py-2 text-center tabular-nums border-l">{item.piezas_sueltas}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold border-l">
                            {totalPiezas}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground hidden xl:table-cell border-l">
                            {item.ubicacion_pasillo ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right hidden xl:table-cell border-l">
                            <Fecha
                              valor={item.updated_at}
                              formato="relativo"
                              className="text-xs text-muted-foreground"
                            />
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Desglose por caja */}
                    {isExpanded && detalles && detalles.length > 0 && (
                      <tr key={`${item.id}-detail`} className="bg-muted/20">
                        <td></td>
                        <td colSpan={isPronostico ? 7 : 9} className="px-4 py-3">
                          <div className="rounded border overflow-hidden bg-background">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="px-3 py-1.5 text-left font-semibold">Caja</th>
                                  <th className="px-3 py-1.5 text-left font-semibold">Pack</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">Cajas Físicas</th>
                                  <th className="px-3 py-1.5 text-center font-semibold">Piezas Sueltas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalles.map((d) => (
                                  <tr key={d.id} className="border-t">
                                    <td className="px-3 py-1.5 font-mono font-medium">{d.caja_codigo ?? '—'}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                                    <td className="px-3 py-1.5 text-center tabular-nums font-semibold">{d.cajas}</td>
                                    <td className="px-3 py-1.5 text-center tabular-nums">{d.piezas_sueltas}</td>
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
              })
            )}
          </tbody>
          <tfoot className="bg-muted/60 font-bold border-t-2 border-primary/20">
            <tr>
              <td colSpan={2} className="px-4 py-4 text-left">
                TOTALES GENERALES
              </td>
              <td className="border-l"></td>
              <td className="hidden md:table-cell border-l"></td>
              <td className="hidden lg:table-cell border-l"></td>

              {isPronostico ? (
                <>
                  <td className="px-3 py-4 text-center tabular-nums border-l bg-muted/20 font-bold">
                    {totalCajas}
                  </td>
                  <td
                    className={`px-3 py-4 text-center tabular-nums border-l font-bold ${
                      totalDelta < 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : totalDelta > 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : ''
                    }`}
                  >
                    {totalDelta !== 0 ? (totalDelta > 0 ? `+${totalDelta}` : totalDelta) : '0'}
                  </td>
                  <td
                    className={`px-3 py-4 text-center tabular-nums border-l font-black ${
                      totalPronosticado < 0
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                        : 'text-primary bg-primary/10'
                    }`}
                  >
                    {totalPronosticado} cjs
                  </td>
                  <td className="border-l"></td>
                </>
              ) : (
                <>
                  <td className="px-4 py-4 text-center tabular-nums border-l bg-muted/20">{totalCajas}</td>
                  <td className="px-4 py-4 text-center tabular-nums border-l">—</td>
                  <td className="px-4 py-4 text-right tabular-nums border-l bg-primary/10 text-primary">
                    {totalPiezas}
                  </td>
                  <td colSpan={2} className="hidden xl:table-cell border-l"></td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
