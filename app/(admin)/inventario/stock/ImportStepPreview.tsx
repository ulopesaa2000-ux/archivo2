// app/(admin)/inventario/stock/ImportStepPreview.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  Search,
} from 'lucide-react'
import {
  buscarProductosPorSkuBatch,
  buscarBodegasBatch,
  buscarProductosCatalogo,
  type ProductoMatch,
} from '@/modules/inventario/import-queries'
import type { BodegaRow } from '@/lib/types/tables'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'
import { toast } from 'sonner'

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
  manualMatch?: boolean
}

type Props = {
  filas: Record<string, string>[]
  fileName: string
  bodegaDefaultId: number
  bodegas: BodegaRow[]
  onValidar: (filasValidas: ImportFilaValida[]) => void
  onBack: () => void
}

export function ImportStepPreview({
  filas,
  fileName,
  bodegaDefaultId,
  bodegas,
  onValidar,
  onBack,
}: Props) {
  const [filasPreview, setFilasPreview] = useState<FilaPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, startSyncTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error' | 'warning'>('all')

  // Estado para el modal de búsqueda manual de producto por SKU
  const [activeSearchRowIndex, setActiveSearchRowIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const isTodasBodegas = bodegaDefaultId === 0
  const bodegaDefault = !isTodasBodegas ? bodegas.find((b) => b.id === bodegaDefaultId) : null
  const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')

  // Inicialización de filas
  useEffect(() => {
    const resolve = async () => {
      try {
        const normalized = filas
          .map((f, i) => {
            const sku = (f.sku ?? f.codigo ?? f.SKU ?? f.Codigo ?? f.estilo ?? '').trim()
            const cajasRaw = (f.cajas ?? f.Cajas ?? f.qty ?? f.cantidad ?? '0').trim()
            const bodegaRaw = (f.bodega ?? f.Bodega ?? f.warehouse ?? '').trim()
            return { rowNum: i + 1, sku, cajasRaw, bodegaRaw }
          })
          .filter((f) => f.sku !== '' || f.cajasRaw !== '')

        const skus = [...new Set(normalized.map((f) => f.sku).filter(Boolean))]
        const bodegaNombres = [...new Set(normalized.map((f) => f.bodegaRaw).filter(Boolean))]

        const [productosMap, bodegasMap] = await Promise.all([
          buscarProductosPorSkuBatch(skus),
          buscarBodegasBatch(bodegaNombres),
        ])

        const preview: FilaPreview[] = normalized.map((f) => {
          const producto = productosMap.get(f.sku)
          const cajasNum = parseFloat(f.cajasRaw)
          let bodegaMatch = f.bodegaRaw
            ? bodegasMap.get(f.bodegaRaw.toLowerCase()) || bodegasMap.get(normalizeStr(f.bodegaRaw))
            : null

          if (!isTodasBodegas && !bodegaMatch && bodegaDefault) {
            bodegaMatch = { id: bodegaDefault.id, nombre: bodegaDefault.nombre, codigo: bodegaDefault.codigo }
          }

          if (!producto) {
            return {
              ...f,
              producto_id: null,
              producto_nombre: null,
              bodega_id: bodegaMatch?.id ?? null,
              bodega_nombre: bodegaMatch?.nombre ?? null,
              status: 'error',
              message: 'SKU no encontrado en BD',
            }
          }

          if (isNaN(cajasNum)) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: bodegaMatch?.id ?? null,
              bodega_nombre: bodegaMatch?.nombre ?? null,
              status: 'error',
              message: 'Cajas no es un número válido',
            }
          }

          if (cajasNum === 0) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: bodegaMatch?.id ?? null,
              bodega_nombre: bodegaMatch?.nombre ?? null,
              status: 'warning',
              message: 'Cajas = 0, se omitirá',
            }
          }

          if (!bodegaMatch) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: null,
              bodega_nombre: null,
              status: 'error',
              message: isTodasBodegas ? 'Bodega no especificada' : 'Bodega no encontrada',
            }
          }

          return {
            ...f,
            producto_id: producto.producto_id,
            producto_nombre: producto.nombre,
            bodega_id: bodegaMatch.id,
            bodega_nombre: bodegaMatch.nombre,
            status: 'ok',
            message: cajasNum > 0 ? `+${cajasNum} cajas` : `${cajasNum} cajas`,
          }
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

  // Re-sincronización de SKUs masiva
  const handleResyncSkus = () => {
    startSyncTransition(async () => {
      try {
        const skusToSync = [
          ...new Set(filasPreview.map((f) => f.sku).filter(Boolean)),
        ]
        const bodegaNombres = [
          ...new Set(filasPreview.map((f) => f.bodegaRaw).filter(Boolean)),
        ]

        const [productosMap, bodegasMap] = await Promise.all([
          buscarProductosPorSkuBatch(skusToSync),
          buscarBodegasBatch(bodegaNombres),
        ])

        const updated = filasPreview.map((f) => {
          // Si fue asignado manualmente, conservar la asignación manual
          if (f.manualMatch && f.producto_id !== null) {
            const cajasNum = parseFloat(f.cajasRaw)
            return {
              ...f,
              status: isNaN(cajasNum) || cajasNum === 0 ? ('error' as const) : ('ok' as const),
              message: isNaN(cajasNum) ? 'Cajas no válidas' : cajasNum === 0 ? 'Cajas = 0' : `+${cajasNum} cajas`,
            }
          }

          const producto = productosMap.get(f.sku)
          const cajasNum = parseFloat(f.cajasRaw)
          let bodegaMatch = f.bodegaRaw
            ? bodegasMap.get(f.bodegaRaw.toLowerCase()) || bodegasMap.get(normalizeStr(f.bodegaRaw))
            : null

          if (!isTodasBodegas && !bodegaMatch && bodegaDefault) {
            bodegaMatch = { id: bodegaDefault.id, nombre: bodegaDefault.nombre, codigo: bodegaDefault.codigo }
          }

          if (!producto) {
            return {
              ...f,
              producto_id: null,
              producto_nombre: null,
              bodega_id: bodegaMatch?.id ?? (bodegaDefault?.id ?? null),
              bodega_nombre: bodegaMatch?.nombre ?? (bodegaDefault?.nombre ?? null),
              status: 'error' as const,
              message: 'SKU no encontrado en BD',
            }
          }

          if (isNaN(cajasNum)) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: bodegaMatch?.id ?? (bodegaDefault?.id ?? null),
              bodega_nombre: bodegaMatch?.nombre ?? (bodegaDefault?.nombre ?? null),
              status: 'error' as const,
              message: 'Cajas no es un número válido',
            }
          }

          if (cajasNum === 0) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: bodegaMatch?.id ?? (bodegaDefault?.id ?? null),
              bodega_nombre: bodegaMatch?.nombre ?? (bodegaDefault?.nombre ?? null),
              status: 'warning' as const,
              message: 'Cajas = 0, se omitirá',
            }
          }

          const finalBodegaId = bodegaMatch?.id ?? (bodegaDefault?.id ?? null)
          const finalBodegaNombre = bodegaMatch?.nombre ?? (bodegaDefault?.nombre ?? null)

          if (!finalBodegaId) {
            return {
              ...f,
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre,
              bodega_id: null,
              bodega_nombre: null,
              status: 'error' as const,
              message: 'Bodega no encontrada',
            }
          }

          return {
            ...f,
            producto_id: producto.producto_id,
            producto_nombre: producto.nombre,
            bodega_id: finalBodegaId,
            bodega_nombre: finalBodegaNombre,
            status: 'ok' as const,
            message: cajasNum > 0 ? `+${cajasNum} cajas` : `${cajasNum} cajas`,
          }
        })

        setFilasPreview(updated)
        toast.success('SKUs resincronizados con la base de datos')
      } catch (err: any) {
        toast.error(`Error al resincronizar: ${err.message}`)
      }
    })
  }

  // Edición directa de celda SKU
  const handleEditSku = (index: number, newSku: string) => {
    setFilasPreview((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        sku: newSku,
        manualMatch: false,
      }
      return copy
    })
  }

  // Edición directa de celda Cajas
  const handleEditCajas = (index: number, newCajas: string) => {
    setFilasPreview((prev) => {
      const copy = [...prev]
      const current = copy[index]
      const num = parseFloat(newCajas)

      let nextStatus = current.status
      let nextMsg = current.message

      if (current.producto_id !== null && current.bodega_id !== null) {
        if (isNaN(num)) {
          nextStatus = 'error'
          nextMsg = 'Cajas no válidas'
        } else if (num === 0) {
          nextStatus = 'warning'
          nextMsg = 'Cajas = 0'
        } else {
          nextStatus = 'ok'
          nextMsg = num > 0 ? `+${num} cajas` : `${num} cajas`
        }
      }

      copy[index] = {
        ...current,
        cajasRaw: newCajas,
        status: nextStatus,
        message: nextMsg,
      }
      return copy
    })
  }

  // Agregar una nueva línea vacía
  const handleAddRow = () => {
    const defaultB = bodegaDefault ? bodegaDefault : bodegas[0]
    setFilasPreview((prev) => [
      ...prev,
      {
        rowNum: prev.length + 1,
        sku: '',
        cajasRaw: '1',
        bodegaRaw: defaultB?.nombre ?? '',
        producto_id: null,
        producto_nombre: null,
        bodega_id: defaultB?.id ?? null,
        bodega_nombre: defaultB?.nombre ?? null,
        status: 'error',
        message: 'Escribe un SKU',
      },
    ])
  }

  // Eliminar una línea
  const handleRemoveRow = (index: number) => {
    setFilasPreview((prev) => {
      const copy = prev.filter((_, i) => i !== index)
      return copy.map((f, i) => ({ ...f, rowNum: i + 1 }))
    })
  }

  // Búsqueda manual de productos en modal
  const handleOpenSearchModal = (index: number) => {
    setActiveSearchRowIndex(index)
    const currentSku = filasPreview[index]?.sku || ''
    setSearchQuery(currentSku)
    if (currentSku.trim()) {
      executeSearch(currentSku)
    } else {
      setSearchResults([])
    }
  }

  const executeSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const res = await buscarProductosCatalogo(query)
      setSearchResults(res)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectProduct = (prod: ProductoMatch) => {
    if (activeSearchRowIndex === null) return
    const idx = activeSearchRowIndex

    setFilasPreview((prev) => {
      const copy = [...prev]
      const row = copy[idx]
      const cajasNum = parseFloat(row.cajasRaw)
      const bId = row.bodega_id ?? (bodegaDefault?.id ?? bodegas[0]?.id ?? null)
      const bNombre = row.bodega_nombre ?? (bodegaDefault?.nombre ?? bodegas[0]?.nombre ?? null)

      copy[idx] = {
        ...row,
        sku: prod.sku_base,
        producto_id: prod.producto_id,
        producto_nombre: prod.nombre,
        bodega_id: bId,
        bodega_nombre: bNombre,
        manualMatch: true,
        status: isNaN(cajasNum) || cajasNum === 0 ? 'warning' : 'ok',
        message: isNaN(cajasNum) ? 'Cajas no válidas' : cajasNum === 0 ? 'Cajas = 0' : `+${cajasNum} cajas`,
      }
      return copy
    })

    setActiveSearchRowIndex(null)
    toast.success(`Producto '${prod.sku_base}' asignado a la fila #${idx + 1}`)
  }

  const okCount = filasPreview.filter((f) => f.status === 'ok').length
  const errorCount = filasPreview.filter((f) => f.status === 'error').length
  const warningCount = filasPreview.filter((f) => f.status === 'warning').length
  const canContinue = okCount > 0

  const bodegasInOk = [
    ...new Set(
      filasPreview
        .filter((f) => f.status === 'ok')
        .map((f) => f.bodega_nombre!)
        .filter(Boolean)
    ),
  ]

  const displayFilas =
    statusFilter === 'all'
      ? filasPreview
      : filasPreview.filter((f) => f.status === statusFilter)

  const downloadExcelReport = async () => {
    if (displayFilas.length === 0) return

    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const sheetName = statusFilter === 'error' ? 'Errores de Importación' : 'Vista Actual Ajuste'
      const sheet = workbook.addWorksheet(sheetName)

      // Encabezados de columna
      sheet.addRow(['#', 'SKU Leído (Estilo Raw)', 'Cajas', 'Bodega', 'SKU / Producto Resuelto', 'Estado / Detalle'])
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E293B' },
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      // Filas
      displayFilas.forEach((f) => {
        const row = sheet.addRow([
          f.rowNum,
          f.sku,
          f.cajasRaw,
          f.bodega_nombre || f.bodegaRaw || '',
          f.producto_id ? `${f.sku} - ${f.producto_nombre}` : 'NO ENCONTRADO EN BD',
          f.message,
        ])

        // Estilos según el estado de la fila
        if (f.status === 'error') {
          // Destacar en ROJO si no tiene coincidencia o tiene error
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEE2E2' }, // Fondo rojo claro
          }
          row.font = { color: { argb: '991B1B' }, bold: true } // Texto rojo oscuro en negrita
        } else if (f.status === 'warning') {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEF3C7' }, // Fondo amarillo/ámbar
          }
          row.font = { color: { argb: '92400E' } }
        } else {
          // OK
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F0FDF4' }, // Fondo verde claro
          }
          row.font = { color: { argb: '166534' } }
        }
      })

      // Anchos de columnas
      sheet.columns.forEach((column) => {
        column.width = 24
      })
      sheet.getColumn(1).width = 8
      sheet.getColumn(3).width = 12

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filterSuffix = statusFilter === 'error' ? 'solo_errores' : statusFilter === 'ok' ? 'solo_resueltos' : 'vista_completa'
      a.download = `ajuste_inventario_${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte Excel descargado correctamente')
    } catch (err: any) {
      console.error('Error al generar Excel:', err)
      toast.error(`Error al generar Excel: ${err.message}`)
    }
  }

  const handleContinue = () => {
    const validas: ImportFilaValida[] = filasPreview
      .filter((f) => f.status === 'ok')
      .map((f) => ({
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
        <p className="text-sm text-muted-foreground">
          Resolviendo SKUs y bodegas con el catálogo activo de la base de datos...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera superior con título y botones de acción principal */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">2. Ajustar y Sincronizar SKUs</h3>
          <p className="text-xs text-muted-foreground">
            {fileName} — {filasPreview.length} filas procesadas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResyncSkus}
            disabled={isSyncing}
            className="font-bold text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 rounded-xl gap-1.5 h-9"
          >
            {isSyncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            SINCRONIZAR SKUS
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="font-bold text-xs rounded-xl h-9 gap-1.5"
          >
            <Plus className="size-4" />
            Agregar Línea
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadExcelReport}
            className="font-bold text-xs rounded-xl h-9 gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            Exportar (Vista actual - {displayFilas.length})
          </Button>
        </div>
      </div>

      {/* Badges interactivos de filtro por estado */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'ok'
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/50 shadow-xs'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {okCount} resueltos
        </button>

        {errorCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'error'
                ? 'bg-red-600 text-white ring-2 ring-red-600/50 shadow-xs'
                : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="size-3.5" />
            {errorCount} no encontrados / error
          </button>
        )}

        {warningCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'warning'
                ? 'bg-amber-600 text-white ring-2 ring-amber-600/50 shadow-xs'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="size-3.5" />
            {warningCount} advertencias
          </button>
        )}

        {isTodasBodegas && bodegasInOk.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-300 border border-blue-200/50">
            {bodegasInOk.length} bodega{bodegasInOk.length !== 1 ? 's' : ''} destino
          </div>
        )}

        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs h-8 gap-1 text-muted-foreground rounded-lg"
          >
            <Filter className="size-3" />
            Ver todos ({filasPreview.length})
          </Button>
        )}
      </div>

      {/* Tabla Interactiva Estilo Editor OCR / Sincronizador SKU */}
      <div className="max-h-[55vh] overflow-auto rounded-xl border shadow-xs bg-card">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-muted/60 sticky top-0 z-10 border-b font-bold text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-center w-[50px]">#</th>
              <th className="px-3 py-2.5 min-w-[200px]">TEXTO / SKU LEÍDO (`ESTILO_RAW`)</th>
              <th className="px-3 py-2.5 text-center w-[90px]">CAJAS</th>
              <th className="px-3 py-2.5 min-w-[280px]">SKU RESUELTO EN BD</th>
              <th className="px-3 py-2.5 text-center w-[80px]">CONF.</th>
              <th className="px-3 py-2.5 text-center w-[60px]">🗑️</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {displayFilas.map((f) => {
              const actualIndex = filasPreview.findIndex((item) => item.rowNum === f.rowNum)
              const idx = actualIndex !== -1 ? actualIndex : f.rowNum - 1

              return (
                <tr
                  key={f.rowNum}
                  className={`hover:bg-muted/30 transition-colors ${
                    f.status === 'error'
                      ? 'bg-red-500/5'
                      : f.status === 'warning'
                      ? 'bg-amber-500/5'
                      : ''
                  }`}
                >
                  {/* # Index */}
                  <td className="px-3 py-2 text-center font-mono font-bold text-muted-foreground">
                    {f.rowNum}
                  </td>

                  {/* SKU / Texto Detectado Editable */}
                  <td className="px-3 py-2">
                    <Input
                      value={f.sku}
                      onChange={(e) => handleEditSku(idx, e.target.value)}
                      className="h-8 font-mono text-xs font-bold uppercase bg-background border-muted/80 focus-visible:ring-indigo-500"
                      placeholder="Escribe el SKU..."
                    />
                  </td>

                  {/* Cajas Editable */}
                  <td className="px-3 py-2 text-center">
                    <Input
                      type="number"
                      value={f.cajasRaw}
                      onChange={(e) => handleEditCajas(idx, e.target.value)}
                      className="h-8 font-mono text-xs font-bold text-center bg-background border-muted/80 w-16 mx-auto focus-visible:ring-indigo-500"
                    />
                  </td>

                  {/* SKU Resuelto en BD / Buscador Rápido */}
                  <td className="px-3 py-2">
                    {f.producto_id !== null ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold shrink-0">
                          ✓ {f.sku}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={f.producto_nombre || ''}>
                          {f.producto_nombre}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-[11px] font-bold shrink-0">
                          ⚠️ NO ENCONTRADO
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSearchModal(idx)}
                          className="h-7 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold px-2 rounded-lg gap-1"
                        >
                          <Search className="size-3" />
                          Usa el buscador rápido
                        </Button>
                      </div>
                    )}
                  </td>

                  {/* Confianza / Estado */}
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] font-bold ${
                        f.status === 'ok'
                          ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                          : 'border-muted text-muted-foreground'
                      }`}
                    >
                      {f.status === 'ok' ? '90%' : '—'}
                    </Badge>
                  </td>

                  {/* Eliminar Fila */}
                  <td className="px-3 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRow(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                      title="Eliminar fila"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pie de navegación y confirmación */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} className="rounded-xl h-10 text-xs font-bold">
          Atrás
        </Button>

        <Button
          disabled={!canContinue}
          onClick={handleContinue}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl h-10 px-5 shadow-md"
        >
          Continuar con {okCount} producto{okCount !== 1 ? 's' : ''} válidos
          {isTodasBodegas && bodegasInOk.length > 0 && ` en ${bodegasInOk.length} bodega${bodegasInOk.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Modal / Dialog para el Buscador Rápido de Producto por SKU */}
      <Dialog
        open={activeSearchRowIndex !== null}
        onOpenChange={(open) => !open && setActiveSearchRowIndex(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-5 text-indigo-600" />
              Buscar y cambiar por SKU
            </DialogTitle>
            <DialogDescription className="text-xs">
              Busca un producto activo en la base de datos por su SKU o Nombre para asignarlo a la fila #{activeSearchRowIndex !== null ? activeSearchRowIndex + 1 : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  executeSearch(e.target.value)
                }}
                placeholder="Escribe SKU base o descripción del producto..."
                className="pl-9 h-10 rounded-xl font-mono text-xs font-bold bg-background"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-60 overflow-auto border rounded-xl divide-y text-xs bg-card">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground italic">
                  {searchQuery.trim() ? 'No se encontraron coincidencias.' : 'Escribe para buscar...'}
                </div>
              ) : (
                searchResults.map((prod) => (
                  <button
                    key={prod.producto_id}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className="w-full text-left p-3 hover:bg-indigo-500/10 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-mono font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {prod.sku_base}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                        {prod.nombre || 'Sin descripción'}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      ID: {prod.producto_id}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

