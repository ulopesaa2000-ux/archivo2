// app/(admin)/inventario/stock/ImportStepPreview.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2, Download, Filter } from 'lucide-react'
import { buscarProductosPorSkuBatch, buscarBodegasBatch } from '@/modules/inventario/import-queries'
import type { BodegaRow } from '@/lib/types/tables'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'

export type FilaPreview = {
  rowNum: number
  sku: string
  cajasRaw: string
  bodegaRaw: string
  producto_id: number | null
  producto_nombre: string | null
  bodega_id: number | null
  bodega_nombre: string | null
  status: 'ok' | 'error' | 'warning'
  message: string
}

type Props = {
  filas: Record<string, string>[]
  fileName: string
  bodegaDefaultId: number
  bodegas: BodegaRow[]
  onValidar: (filasValidas: ImportFilaValida[]) => void
  onBack: () => void
}

export function ImportStepPreview({ filas, fileName, bodegaDefaultId, bodegas, onValidar, onBack }: Props) {
  const [filasPreview, setFilasPreview] = useState<FilaPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error' | 'warning'>('all')

  const isTodasBodegas = bodegaDefaultId === 0

  useEffect(() => {
    const resolve = async () => {
      try {
        const normalized = filas.map((f, i) => {
          const sku = (f.sku ?? f.codigo ?? f.SKU ?? f.Codigo ?? '').trim()
          const cajasRaw = (f.cajas ?? f.Cajas ?? f.qty ?? f.cantidad ?? '0').trim()
          const bodegaRaw = (f.bodega ?? f.Bodega ?? f.warehouse ?? '').trim()
          return { rowNum: i + 2, sku, cajasRaw, bodegaRaw }
        }).filter(f => f.sku !== '' || f.cajasRaw !== '')

        const skus = [...new Set(normalized.map(f => f.sku).filter(Boolean))]
        const bodegaNombres = [...new Set(normalized.map(f => f.bodegaRaw).filter(Boolean))]

        const [productosMap, bodegasMap] = await Promise.all([
          buscarProductosPorSkuBatch(skus),
          buscarBodegasBatch(bodegaNombres),
        ])

        const bodegaDefault = !isTodasBodegas ? bodegas.find(b => b.id === bodegaDefaultId) : null
        const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')

        const preview: FilaPreview[] = normalized.map(f => {
          const producto = productosMap.get(f.sku)
          const cajasNum = parseFloat(f.cajasRaw)
          let bodegaMatch = f.bodegaRaw
            ? (bodegasMap.get(f.bodegaRaw.toLowerCase()) || bodegasMap.get(normalizeStr(f.bodegaRaw)))
            : null

          if (!isTodasBodegas && !bodegaMatch && bodegaDefault) {
            bodegaMatch = { id: bodegaDefault.id, nombre: bodegaDefault.nombre, codigo: bodegaDefault.codigo }
          }

          if (!producto) {
            return { ...f, producto_id: null, producto_nombre: null, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'error' as const, message: 'SKU no encontrado en catálogo' }
          }

          if (isNaN(cajasNum)) {
            return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'error' as const, message: 'Cajas no es un número válido' }
          }

          if (cajasNum === 0) {
            return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'warning' as const, message: 'Cajas = 0, se omitirá' }
          }

          if (!bodegaMatch) {
            const bodegaMsg = isTodasBodegas
              ? 'Bodega no especificada o no encontrada'
              : 'Bodega no encontrada'
            return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: null, bodega_nombre: null, status: 'error' as const, message: bodegaMsg }
          }

          return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: bodegaMatch.id, bodega_nombre: bodegaMatch.nombre, status: 'ok' as const, message: cajasNum > 0 ? `+${cajasNum} cajas` : `${cajasNum} cajas` }
        })

        setFilasPreview(preview)
      } catch (err: any) {
        setError(err.message ?? 'Error al resolver SKUs')
      } finally {
        setIsLoading(false)
      }
    }

    resolve()
  }, [filas, bodegaDefaultId, bodegas, isTodasBodegas])

  const okCount = filasPreview.filter(f => f.status === 'ok').length
  const errorCount = filasPreview.filter(f => f.status === 'error').length
  const warningCount = filasPreview.filter(f => f.status === 'warning').length
  const canContinue = okCount > 0

  const bodegasInOk = [...new Set(filasPreview.filter(f => f.status === 'ok').map(f => f.bodega_nombre!).filter(Boolean))]

  const displayFilas = statusFilter === 'all'
    ? filasPreview
    : filasPreview.filter(f => f.status === statusFilter)

  const downloadErrorReport = async () => {
    const errorRows = filasPreview.filter(f => f.status === 'error')
    if (errorRows.length === 0) return

    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Errores de Importación')

      sheet.addRow(['sku', 'cajas', 'bodega', 'detalle_error'])
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DC2626' }, // Rojo corporativo
      }

      errorRows.forEach(f => {
        sheet.addRow([f.sku, f.cajasRaw, f.bodega_nombre || f.bodegaRaw || '', f.message])
      })

      sheet.columns.forEach(column => {
        column.width = 22
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_errores_importacion_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error al generar Excel de errores:', err)
    }
  }

  const handleContinue = () => {
    const validas: ImportFilaValida[] = filasPreview
      .filter(f => f.status === 'ok')
      .map(f => ({
        sku: f.sku,
        producto_id: f.producto_id!,
        producto_nombre: f.producto_nombre,
        cajas: parseFloat(f.cajasRaw),
        bodega_id: f.bodega_id!,
        bodega_nombre: f.bodega_nombre!,
      }))

    if (validas.length === 0) return
    onValidar(validas)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Resolviendo SKUs y bodegas con algoritmo inteligente...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">2. Vista previa</h3>
          <p className="text-sm text-muted-foreground">
            {fileName} — {filasPreview.length} filas procesadas
          </p>
        </div>

        {errorCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadErrorReport}
            className="gap-1.5 text-xs text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Download className="size-3.5 text-red-600" />
            Descargar reporte errores ({errorCount})
          </Button>
        )}
      </div>

      {/* Badges interactivos de filtro */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === 'ok'
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/50 shadow-sm'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {okCount} encontrados
        </button>

        {errorCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'error'
                ? 'bg-red-600 text-white ring-2 ring-red-600/50 shadow-sm'
                : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="size-3.5" />
            {errorCount} errores
          </button>
        )}

        {warningCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'warning'
                ? 'bg-amber-600 text-white ring-2 ring-amber-600/50 shadow-sm'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="size-3.5" />
            {warningCount} advertencias
          </button>
        )}

        {isTodasBodegas && bodegasInOk.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-300">
            {bodegasInOk.length} bodega{bodegasInOk.length !== 1 ? 's' : ''}
          </div>
        )}

        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs h-7 gap-1 text-muted-foreground"
          >
            <Filter className="size-3" />
            Ver todos ({filasPreview.length})
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">SKU Leído</th>
              <th className="px-3 py-2 text-left font-medium">Producto Resuelto</th>
              <th className="px-3 py-2 text-right font-medium">Cajas</th>
              <th className="px-3 py-2 text-left font-medium">Bodega</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {displayFilas.map((f) => (
              <tr
                key={f.rowNum}
                className={
                  f.status === 'error' ? 'bg-red-50/50 dark:bg-red-950/20' :
                  f.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                }
              >
                <td className="px-3 py-1.5 text-muted-foreground">{f.rowNum}</td>
                <td className="px-3 py-1.5 font-mono font-bold">{f.sku}</td>
                <td className="px-3 py-1.5">{f.producto_nombre ?? '—'}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{f.cajasRaw}</td>
                <td className="px-3 py-1.5">{f.bodega_nombre ?? '—'}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={
                      f.status === 'ok' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' :
                      f.status === 'error' ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'
                    }
                  >
                    {f.message}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Atrás</Button>
        <Button disabled={!canContinue} onClick={handleContinue} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          Continuar con {okCount} producto{okCount !== 1 ? 's' : ''} válidos
          {isTodasBodegas && bodegasInOk.length > 0 && ` en ${bodegasInOk.length} bodega${bodegasInOk.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}
