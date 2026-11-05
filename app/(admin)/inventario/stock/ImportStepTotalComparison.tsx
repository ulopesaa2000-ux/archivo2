// app/(admin)/inventario/stock/ImportStepTotalComparison.tsx
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  generarConciliacionInventarioTotal,
  type ResumenConciliacionBodega,
  type FilaConciliacionTotal,
} from '@/modules/inventario/import-queries'
import {
  aplicarConciliacionInventarioTotalAction,
  type ImportFilaValida,
  type NotaBodegaResult,
} from '@/modules/inventario/import-actions'
import { compareFamiliaAsc, compareSkuAsc } from '@/lib/inventario/familias-orden'
import type { BodegaRow } from '@/lib/types/tables'
import {
  Loader2,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Warehouse,
  CheckSquare,
  Square,
  ArrowUpDown,
  SlidersHorizontal,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

type OrdenTipo = 'familia' | 'sku' | 'diferencia'
type FiltroResultado = 'todos' | 'diferencias' | 'match' | 'solo_fisico'

type Props = {
  filasValidas: ImportFilaValida[]
  bodegaDefaultId: number
  bodegas: BodegaRow[]
  onSuccess: (notas: NotaBodegaResult[], totalProductos: number) => void
  onBack: () => void
}

export function ImportStepTotalComparison({
  filasValidas,
  bodegaDefaultId,
  bodegas,
  onSuccess,
  onBack,
}: Props) {
  // Detectar bodegas involucradas
  const bodegasInvolucradas = useMemo(() => {
    const ids = Array.from(new Set(filasValidas.map((f) => f.bodega_id)))
    return bodegas.filter((b) => ids.includes(b.id))
  }, [filasValidas, bodegas])

  const [bodegaActivaId, setBodegaActivaId] = useState<number>(() => {
    if (bodegaDefaultId > 0 && bodegasInvolucradas.some((b) => b.id === bodegaDefaultId)) {
      return bodegaDefaultId
    }
    return bodegasInvolucradas[0]?.id || (bodegas[0]?.id ?? 0)
  })

  const [resumen, setResumen] = useState<ResumenConciliacionBodega | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, startApplyTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Mapa de IDs seleccionados de "SOLO SISTEMA" para mandar a cero (INICIALMENTE VACÍO / DESMARCADOS)
  const [selectedZeroMap, setSelectedZeroMap] = useState<Record<number, boolean>>({})

  // Controles de visualización y orden
  const [orden, setOrden] = useState<OrdenTipo>('familia')
  const [busqueda, setBusqueda] = useState('')
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultado>('todos')

  // Cargar conciliación al montar o al cambiar de bodega
  useEffect(() => {
    let cancel = false

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const filasBodega = filasValidas
          .filter((f) => f.bodega_id === bodegaActivaId)
          .map((f) => ({
            producto_id: f.producto_id,
            sku: f.sku,
            cajas: f.cajas,
          }))

        const res = await generarConciliacionInventarioTotal(bodegaActivaId, filasBodega)
        if (!cancel) {
          setResumen(res)
          // Reiniciar selección de cero (desmarcados por defecto)
          setSelectedZeroMap({})
        }
      } catch (err: any) {
        if (!cancel) {
          setError(err.message || 'Error al generar conciliación de inventario.')
        }
      } finally {
        if (!cancel) setIsLoading(false)
      }
    }

    if (bodegaActivaId > 0) {
      loadData()
    }

    return () => {
      cancel = true
    }
  }, [bodegaActivaId, filasValidas])

  // Manejo de checkboxes para lista amarilla "SOLO SISTEMA"
  const handleToggleZero = (productoId: number) => {
    setSelectedZeroMap((prev) => ({
      ...prev,
      [productoId]: !prev[productoId],
    }))
  }

  const handleSelectAllZero = (select: boolean) => {
    if (!resumen) return
    const next: Record<number, boolean> = {}
    if (select) {
      resumen.filas_solo_sistema.forEach((f) => {
        next[f.producto_id] = true
      })
    }
    setSelectedZeroMap(next)
  }

  const totalSoloSistema = resumen?.filas_solo_sistema.length ?? 0
  const marcadosZeroCount = useMemo(() => {
    if (!resumen) return 0
    return resumen.filas_solo_sistema.filter((f) => selectedZeroMap[f.producto_id]).length
  }, [resumen, selectedZeroMap])

  const todosZeroMarcados = totalSoloSistema > 0 && marcadosZeroCount === totalSoloSistema

  // Cajas que se mandarán a cero de la lista amarilla
  const cajasSoloSistemaMarcadas = useMemo(() => {
    if (!resumen) return 0
    return resumen.filas_solo_sistema
      .filter((f) => selectedZeroMap[f.producto_id])
      .reduce((a, f) => a + f.stock_sistema, 0)
  }, [resumen, selectedZeroMap])

  // Cajas no marcadas de SOLO SISTEMA que se conservarán
  const cajasSoloSistemaConservadas = useMemo(() => {
    if (!resumen) return 0
    return resumen.filas_solo_sistema
      .filter((f) => !selectedZeroMap[f.producto_id])
      .reduce((a, f) => a + f.stock_sistema, 0)
  }, [resumen, selectedZeroMap])

  // Total de cajas proyectado resultante tras el ajuste
  const totalCajasProyectado = (resumen?.total_cajas_fisico ?? 0) + cajasSoloSistemaConservadas

  // Filtrado y ordenamiento de la tabla superior (Comparación)
  const filasComparacionFiltradas = useMemo(() => {
    if (!resumen) return []
    let list = [...resumen.filas_comparacion]

    // Filtro por búsqueda de texto (SKU, Familia, Nombre, Descripción)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim()
      list = list.filter(
        (f) =>
          f.sku.toLowerCase().includes(q) ||
          (f.familia && f.familia.toLowerCase().includes(q)) ||
          (f.descripcion && f.descripcion.toLowerCase().includes(q)) ||
          (f.nombre && f.nombre.toLowerCase().includes(q))
      )
    }

    // Filtro por tipo de resultado
    if (filtroResultado === 'diferencias') {
      list = list.filter((f) => f.resultado === 'DIFERENCIA_POS' || f.resultado === 'DIFERENCIA_NEG')
    } else if (filtroResultado === 'match') {
      list = list.filter((f) => f.resultado === 'MATCH')
    } else if (filtroResultado === 'solo_fisico') {
      list = list.filter((f) => f.resultado === 'SOLO_FISICO')
    }

    // Ordenamiento
    if (orden === 'familia') {
      list.sort((a, b) => {
        const famDiff = compareFamiliaAsc(a.familia || '', b.familia || '')
        if (famDiff !== 0) return famDiff
        return compareSkuAsc(a.sku, b.sku)
      })
    } else if (orden === 'sku') {
      list.sort((a, b) => compareSkuAsc(a.sku, b.sku))
    } else if (orden === 'diferencia') {
      list.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    }

    return list
  }, [resumen, busqueda, filtroResultado, orden])

  // Filtrado y ordenamiento de la lista amarilla (SOLO SISTEMA)
  const filasSoloSistemaFiltradas = useMemo(() => {
    if (!resumen) return []
    let list = [...resumen.filas_solo_sistema]

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim()
      list = list.filter(
        (f) =>
          f.sku.toLowerCase().includes(q) ||
          (f.familia && f.familia.toLowerCase().includes(q)) ||
          (f.descripcion && f.descripcion.toLowerCase().includes(q)) ||
          (f.nombre && f.nombre.toLowerCase().includes(q))
      )
    }

    if (orden === 'familia') {
      list.sort((a, b) => {
        const famDiff = compareFamiliaAsc(a.familia || '', b.familia || '')
        if (famDiff !== 0) return famDiff
        return compareSkuAsc(a.sku, b.sku)
      })
    } else if (orden === 'sku') {
      list.sort((a, b) => compareSkuAsc(a.sku, b.sku))
    } else if (orden === 'diferencia') {
      list.sort((a, b) => b.stock_sistema - a.stock_sistema)
    }

    return list
  }, [resumen, busqueda, orden])

  // Descarga de reporte Excel completo como comprobante
  const handleExportExcel = async () => {
    if (!resumen) return

    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Conciliación Inventario')

      // Fila de título
      sheet.addRow([`COMPROBANTE DE AUDITORÍA Y CONCILIACIÓN DE INVENTARIO - BODEGA: ${resumen.bodega_nombre.toUpperCase()}`])
      sheet.mergeCells('A1:G1')
      const titleCell = sheet.getCell('A1')
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

      // Resumen ejecutivo
      sheet.addRow([])
      sheet.addRow([
        'Fecha auditoría:',
        new Date().toLocaleDateString('es-MX'),
        'Stock Sistema inicial:',
        resumen.total_cajas_sistema,
        'Conteo Físico subido:',
        resumen.total_cajas_fisico,
      ])
      sheet.addRow([
        'Orden aplicado:',
        orden === 'familia' ? 'Por Familia' : orden === 'sku' ? 'Alfabético por SKU' : 'Por Diferencia',
        'Diferencia neta:',
        resumen.diferencia_neta,
        'Cajas mandadas a cero:',
        cajasSoloSistemaMarcadas,
      ])
      sheet.addRow([])

      // Encabezados de tabla
      sheet.addRow([
        'SKU / Código',
        'Familia',
        'Descripción Producto',
        'Conteo Físico',
        'Stock Sistema',
        'Delta / Diferencia',
        'Resultado / Estado',
      ])

      const headerRowIndex = 6
      const headerRow = sheet.getRow(headerRowIndex)
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      // 1. Agregar filas de la Comparación
      filasComparacionFiltradas.forEach((f) => {
        const row = sheet.addRow([
          f.sku,
          f.familia || '—',
          f.descripcion || f.nombre || '—',
          f.conteo_fisico,
          f.stock_sistema,
          f.delta > 0 ? `+${f.delta}` : f.delta,
          f.resultado_texto,
        ])

        if (f.resultado === 'MATCH') {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } } // Verde claro
          row.font = { color: { argb: '1E4620' } }
        } else if (f.resultado === 'SOLO_FISICO') {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } } // Azul claro
          row.font = { color: { argb: '075985' }, bold: true }
        } else {
          // DIFERENCIA
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } } // Ámbar claro
          row.font = { color: { argb: '92400E' }, bold: true }
        }
      })

      // 2. Agregar separador y filas de "SOLO SISTEMA"
      if (filasSoloSistemaFiltradas.length > 0) {
        sheet.addRow([])
        const sepRow = sheet.addRow([
          'CÓDIGOS EN SISTEMA NO ENCONTRADOS EN CONTEO FÍSICO (LISTA AMARILLA)',
          '',
          '',
          '',
          '',
          '',
          '',
        ])
        sheet.mergeCells(`A${sepRow.number}:G${sepRow.number}`)
        sepRow.font = { bold: true, color: { argb: '78350F' } }
        sepRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FDE68A' } }

        filasSoloSistemaFiltradas.forEach((f) => {
          const isZero = selectedZeroMap[f.producto_id]
          const estadoTexto = isZero ? `${f.resultado_texto} (MANDAR A CERO)` : `${f.resultado_texto} (CONSERVAR)`

          const row = sheet.addRow([
            f.sku,
            f.familia || '—',
            f.descripcion || f.nombre || '—',
            0,
            f.stock_sistema,
            isZero ? -f.stock_sistema : 0,
            estadoTexto,
          ])

          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF9C3' } } // Amarillo pastel
          row.font = { color: { argb: '854D0E' }, bold: isZero }
        })
      }

      // Anchos de columnas
      sheet.columns.forEach((column) => {
        column.width = 22
      })
      sheet.getColumn(1).width = 25 // SKU
      sheet.getColumn(2).width = 16 // Familia
      sheet.getColumn(3).width = 34 // Nombre
      sheet.getColumn(4).width = 15 // Físico
      sheet.getColumn(5).width = 15 // Sistema
      sheet.getColumn(6).width = 18 // Delta
      sheet.getColumn(7).width = 30 // Resultado

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprobante_conciliacion_${resumen.bodega_nombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Comprobante Excel descargado exitosamente')
    } catch (err: any) {
      console.error('Error al generar Excel:', err)
      toast.error(`Error al generar Excel: ${err.message}`)
    }
  }

  // Aplicar ajuste y crear notas ENT / SAL
  const handleAplicarAjuste = () => {
    if (!resumen) return

    setError(null)
    startApplyTransition(async () => {
      try {
        // Filas de comparación que requieren movimiento
        const filasAjuste = resumen.filas_comparacion
          .filter((f) => f.delta !== 0)
          .map((f) => ({
            producto_id: f.producto_id,
            sku: f.sku,
            delta: f.delta,
          }))

        // Filas de solo sistema marcadas para mandar a cero
        const soloSistemaCero = resumen.filas_solo_sistema
          .filter((f) => selectedZeroMap[f.producto_id])
          .map((f) => ({
            producto_id: f.producto_id,
            sku: f.sku,
            stock_actual: f.stock_sistema,
          }))

        if (filasAjuste.length === 0 && soloSistemaCero.length === 0) {
          toast.info('No hay diferencias de stock que requieran ajuste. El inventario ya coincide.')
          onSuccess([], 0)
          return
        }

        const res = await aplicarConciliacionInventarioTotalAction(
          resumen.bodega_id,
          resumen.bodega_nombre,
          filasAjuste,
          soloSistemaCero
        )

        if (!res.success) {
          setError(res.error || 'Error al aplicar el ajuste de inventario.')
          return
        }

        toast.success('Ajuste de inventario aplicado exitosamente')
        onSuccess(res.notas || [], res.productos_procesados || 0)
      } catch (err: any) {
        setError(err.message || 'Error inesperado al aplicar el ajuste.')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-semibold text-base">Generando conciliación de inventario...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Consultando existencias del sistema en la bodega y cotejando con el conteo físico.
          </p>
        </div>
      </div>
    )
  }

  if (error || !resumen) {
    return (
      <div className="space-y-4 py-6">
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium">
          {error || 'No se pudo cargar la información de conciliación.'}
        </div>
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Volver a comprobar códigos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de bodegas si hay más de una involucrada */}
      {bodegasInvolucradas.length > 1 && (
        <div className="flex items-center gap-2 border-b pb-3">
          <Warehouse className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bodega a auditar:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {bodegasInvolucradas.map((b) => (
              <Button
                key={b.id}
                size="sm"
                variant={b.id === bodegaActivaId ? 'default' : 'outline'}
                onClick={() => setBodegaActivaId(b.id)}
                className="h-7 text-xs font-medium"
              >
                {b.nombre}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen Global Sustitutivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Stock Sistema
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">
            {resumen.total_cajas_sistema.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">cajas</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {resumen.filas_comparacion.length + resumen.filas_solo_sistema.length} productos registrados
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-sm border-blue-200/50 bg-blue-50/20 dark:bg-blue-950/10">
          <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Conteo Físico
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">
            {resumen.total_cajas_fisico.toLocaleString()} <span className="text-xs font-normal text-blue-500">cajas</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {resumen.filas_comparacion.length} productos contados
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Diferencia Neta
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              resumen.diferencia_neta > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : resumen.diferencia_neta < 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {resumen.diferencia_neta > 0 ? `+${resumen.diferencia_neta}` : resumen.diferencia_neta}{' '}
            <span className="text-xs font-normal text-muted-foreground">cajas</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {resumen.conteo_match} match · {resumen.conteo_diferencias} dif.
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-sm border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-950/20">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Nuevo Stock Estimado
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-800 dark:text-emerald-300">
            {totalCajasProyectado.toLocaleString()} <span className="text-xs font-normal text-emerald-600">cajas</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {marcadosZeroCount > 0 ? `${marcadosZeroCount} a cero (-${cajasSoloSistemaMarcadas} cjs)` : 'Sin enviar a cero'}
          </div>
        </div>
      </div>

      {/* Barra de Herramientas: Buscador, Ordenamiento y Exportar Excel */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/40 p-2.5 rounded-lg border">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por SKU, Familia o Nombre..."
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>

        {/* Filtros Rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <SlidersHorizontal className="size-3" /> Ver:
          </span>
          <Button
            size="sm"
            variant={filtroResultado === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltroResultado('todos')}
            className="h-7 text-xs px-2.5"
          >
            Todos ({resumen.filas_comparacion.length})
          </Button>
          <Button
            size="sm"
            variant={filtroResultado === 'diferencias' ? 'default' : 'outline'}
            onClick={() => setFiltroResultado('diferencias')}
            className="h-7 text-xs px-2.5 text-amber-700 dark:text-amber-400"
          >
            Diferencias ({resumen.conteo_diferencias})
          </Button>
          <Button
            size="sm"
            variant={filtroResultado === 'match' ? 'default' : 'outline'}
            onClick={() => setFiltroResultado('match')}
            className="h-7 text-xs px-2.5 text-emerald-700 dark:text-emerald-400"
          >
            Match ({resumen.conteo_match})
          </Button>
          <Button
            size="sm"
            variant={filtroResultado === 'solo_fisico' ? 'default' : 'outline'}
            onClick={() => setFiltroResultado('solo_fisico')}
            className="h-7 text-xs px-2.5 text-blue-700 dark:text-blue-400"
          >
            Solo Físico ({resumen.conteo_solo_fisico})
          </Button>
        </div>

        {/* Ordenamiento y Exportar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="size-3" /> Orden:
            </span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenTipo)}
              className="h-8 rounded-md border bg-background px-2.5 text-xs font-medium"
            >
              <option value="familia">Familia (Canónico A→Z)</option>
              <option value="sku">Alfabético por SKU</option>
              <option value="diferencia">Mayor Diferencia</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Download className="size-3.5 text-emerald-600" />
            Descargar Reporte Excel
          </Button>
        </div>
      </div>

      {/* ── TABLA PRINCIPAL: COMPARACIÓN DE CÓDIGOS DEL CONTEO FÍSICO ── */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-emerald-400" />
            <span>COMPARATIVA DE CÓDIGOS CONTADOS ({filasComparacionFiltradas.length})</span>
          </div>
          <span className="text-slate-300 font-normal">
            Bodega: <span className="font-semibold text-white">{resumen.bodega_nombre}</span>
          </span>
        </div>

        <div className="max-h-[380px] overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-200 dark:bg-slate-900 sticky top-0 z-20 border-b-2 border-slate-300 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 shadow-sm">
              <tr>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-left w-12">#</th>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-left">SKU / Código</th>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-left">Familia</th>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-center w-28">Conteo Físico</th>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-center w-28">Sistema</th>
                <th className="bg-slate-200 dark:bg-slate-900 px-3 py-2 text-center w-40">Resultado / Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filasComparacionFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron códigos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filasComparacionFiltradas.map((f, idx) => {
                  let rowBg = ''
                  let badgeVariant = ''

                  if (f.resultado === 'MATCH') {
                    rowBg = 'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/70'
                    badgeVariant = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300'
                  } else if (f.resultado === 'SOLO_FISICO') {
                    rowBg = 'bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-50/70'
                    badgeVariant = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300'
                  } else {
                    rowBg = 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70'
                    badgeVariant = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 font-bold'
                  }

                  return (
                    <tr key={f.producto_id} className={`transition-colors ${rowBg}`}>
                      <td className="px-3 py-2 text-muted-foreground text-[11px]">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-bold text-foreground">
                        {f.sku}
                        {(f.descripcion || f.nombre) && (
                          <div className="font-sans text-[11px] font-normal text-muted-foreground truncate max-w-xs">
                            {f.descripcion || f.nombre}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground font-semibold">
                        {f.familia || '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-sm text-blue-700 dark:text-blue-400">
                        {f.conteo_fisico}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                        {f.stock_sistema}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeVariant}`}
                        >
                          {f.resultado_texto}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── LISTA AMARILLA: CÓDIGOS EN SISTEMA NO INCLUIDOS EN CONTEO FÍSICO ── */}
      {resumen.filas_solo_sistema.length > 0 && (
        <div className="rounded-xl border border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 overflow-hidden shadow-sm">
          {/* Encabezado con advertencia y checkbox maestro */}
          <div className="bg-amber-200/70 dark:bg-amber-900/50 px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b border-amber-300 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400" />
              <div>
                <span className="font-bold text-amber-950 dark:text-amber-100 text-sm">
                  CÓDIGOS EN SISTEMA NO ENCONTRADOS EN CONTEO FÍSICO ({resumen.filas_solo_sistema.length} PRODUCTOS)
                </span>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Estos códigos tienen existencias en sistema pero no vinieron en tu lista. ¿Deseas mandarlos a cero?
                </p>
              </div>
            </div>

            {/* Checkbox Maestro */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectAllZero(!todosZeroMarcados)}
                className="h-8 text-xs font-bold border-amber-600/50 bg-amber-100/60 hover:bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
              >
                {todosZeroMarcados ? (
                  <>
                    <Square className="size-4 mr-1.5" />
                    Desmarcar todos
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-4 mr-1.5" />
                    Marcar todos para mandar a cero
                  </>
                )}
              </Button>
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-900 border-amber-400 font-semibold">
                {marcadosZeroCount} de {totalSoloSistema} marcados
              </Badge>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-amber-300 dark:bg-amber-950 sticky top-0 z-20 border-b-2 border-amber-500 font-bold text-amber-950 dark:text-amber-100 shadow-sm">
                <tr>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-center w-12">Mandar a 0</th>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-left">SKU / Código</th>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-left">Familia</th>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-center w-28">Conteo Físico</th>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-center w-28">Sistema Actual</th>
                  <th className="bg-amber-300 dark:bg-amber-950 px-3 py-2 text-center w-48">Resultado / Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
                {filasSoloSistemaFiltradas.map((f) => {
                  const isChecked = !!selectedZeroMap[f.producto_id]

                  return (
                    <tr
                      key={f.producto_id}
                      onClick={() => handleToggleZero(f.producto_id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-200/50 dark:bg-amber-900/40 font-semibold'
                          : 'hover:bg-amber-100/40 dark:hover:bg-amber-900/20 text-muted-foreground'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleZero(f.producto_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-foreground">
                        {f.sku}
                        {(f.descripcion || f.nombre) && (
                          <div className="font-sans text-[11px] font-normal text-muted-foreground truncate max-w-xs">
                            {f.descripcion || f.nombre}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground font-semibold">
                        {f.familia || '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-sm text-slate-400">
                        0
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-sm text-amber-900 dark:text-amber-300">
                        {f.stock_sistema}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isChecked
                              ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}
                        >
                          {isChecked ? `Salida por -${f.stock_sistema} (a cero)` : `${f.resultado_texto} (Conservar)`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botones de Navegación y Confirmación */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t">
        <Button variant="outline" onClick={onBack} disabled={isApplying}>
          <ArrowLeft className="size-4 mr-2" />
          Volver a comprobar códigos
        </Button>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAplicarAjuste}
            disabled={isApplying}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm"
          >
            {isApplying ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creando notas y aplicando ajuste...
              </>
            ) : (
              <>
                Aplicar Ajuste de Inventario
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

