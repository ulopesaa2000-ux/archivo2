// app/(admin)/inventario/stock/ImportStepPreview.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
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

        const preview: FilaPreview[] = normalized.map(f => {
          const producto = productosMap.get(f.sku)
          const cajasNum = parseFloat(f.cajasRaw)
          let bodegaMatch = f.bodegaRaw ? bodegasMap.get(f.bodegaRaw.toLowerCase()) : null

          if (!isTodasBodegas && !bodegaMatch && bodegaDefault) {
            bodegaMatch = { id: bodegaDefault.id, nombre: bodegaDefault.nombre, codigo: bodegaDefault.codigo }
          }

          if (!producto) {
            return { ...f, producto_id: null, producto_nombre: null, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'error' as const, message: 'SKU no encontrado' }
          }

          if (isNaN(cajasNum)) {
            return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'error' as const, message: 'Cajas no es un numero valido' }
          }

          if (cajasNum === 0) {
            return { ...f, producto_id: producto.producto_id, producto_nombre: producto.nombre, bodega_id: bodegaMatch?.id ?? null, bodega_nombre: bodegaMatch?.nombre ?? null, status: 'warning' as const, message: 'Cajas = 0, se omitira' }
          }

          if (!bodegaMatch) {
            const bodegaMsg = isTodasBodegas
              ? 'Bodega no especificada en CSV (requerida con "Todas las bodegas")'
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
  const canContinue = errorCount === 0 && okCount > 0

  const bodegasInOk = [...new Set(filasPreview.filter(f => f.status === 'ok').map(f => f.bodega_nombre!).filter(Boolean))]

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
        <p className="text-sm text-muted-foreground">Resolviendo SKUs y bodegas...</p>
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
      <div>
        <h3 className="text-lg font-semibold">2. Vista previa</h3>
        <p className="text-sm text-muted-foreground">
          {fileName} — {filasPreview.length} filas
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-3.5" />
          {okCount} encontrados
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
            <AlertCircle className="size-3.5" />
            {errorCount} errores
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="size-3.5" />
            {warningCount} advertencias
          </div>
        )}
        {isTodasBodegas && bodegasInOk.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
            {bodegasInOk.length} bodega{bodegasInOk.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="max-h-80 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Producto</th>
              <th className="px-3 py-2 text-right font-medium">Cajas</th>
              <th className="px-3 py-2 text-left font-medium">Bodega</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filasPreview.map((f) => (
              <tr
                key={f.rowNum}
                className={
                  f.status === 'error' ? 'bg-red-50/50' :
                  f.status === 'warning' ? 'bg-amber-50/50' : ''
                }
              >
                <td className="px-3 py-1.5 text-muted-foreground">{f.rowNum}</td>
                <td className="px-3 py-1.5 font-mono">{f.sku}</td>
                <td className="px-3 py-1.5">{f.producto_nombre ?? '—'}</td>
                <td className="px-3 py-1.5 text-right font-mono">{f.cajasRaw}</td>
                <td className="px-3 py-1.5">{f.bodega_nombre ?? '—'}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={
                      f.status === 'ok' ? 'text-emerald-700' :
                      f.status === 'error' ? 'text-red-700' : 'text-amber-700'
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
        <Button variant="outline" onClick={onBack}>Atras</Button>
        <Button disabled={!canContinue} onClick={handleContinue}>
          Continuar con {okCount} producto{okCount !== 1 ? 's' : ''}
          {isTodasBodegas && bodegasInOk.length > 0 && ` en ${bodegasInOk.length} bodega${bodegasInOk.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}
