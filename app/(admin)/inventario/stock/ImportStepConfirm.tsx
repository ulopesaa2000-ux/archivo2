// app/(admin)/inventario/stock/ImportStepConfirm.tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, FileCheck, AlertCircle, Warehouse, RotateCcw } from 'lucide-react'
import { crearAjustesImportAction } from '@/modules/inventario/import-actions'
import { resetStockCeroAction, resetStockCeroBodegaAction } from '@/modules/config/inventory-reset-actions'
import type { ImportFilaValida, NotaBodegaResult, ModoAjuste } from '@/modules/inventario/import-actions'

type GrupoBodega = {
  bodega_id: number
  bodega_nombre: string
  filas: ImportFilaValida[]
  cajasPos: number
  cajasNeg: number
}

type Props = {
  filas: ImportFilaValida[]
  modo: ModoAjuste
  bodegaDefaultId?: number
  onSuccess: (notas: NotaBodegaResult[], totalProductos: number) => void
  onBack: () => void
}

export function ImportStepConfirm({ filas, modo, bodegaDefaultId = 0, onSuccess, onBack }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isTodasBodegas = bodegaDefaultId === 0
  // Desactivado por default según requerimiento
  const [resetStockPrevio, setResetStockPrevio] = useState<boolean>(false)
  const [progressStatus, setProgressStatus] = useState<string | null>(null)

  const CHUNK_SIZE = 500

  const grupos = useMemo(() => {
    const map = new Map<number, GrupoBodega>()
    for (const f of filas) {
      if (!map.has(f.bodega_id)) {
        map.set(f.bodega_id, { bodega_id: f.bodega_id, bodega_nombre: f.bodega_nombre, filas: [], cajasPos: 0, cajasNeg: 0 })
      }
      const g = map.get(f.bodega_id)!
      g.filas.push(f)
      if (f.cajas > 0) g.cajasPos += f.cajas
      if (f.cajas < 0) g.cajasNeg += f.cajas
    }
    return [...map.values()]
  }, [filas])

  const totalCajasPos = grupos.reduce((a, g) => a + g.cajasPos, 0)
  const totalCajasNeg = grupos.reduce((a, g) => a + g.cajasNeg, 0)
  const totalProductos = filas.length
  const esMultiBodega = grupos.length > 1

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      // Paso 1: Reiniciar stock a 0 si la casilla está activada
      if (resetStockPrevio) {
        if (isTodasBodegas && grupos.length === 0) {
          setProgressStatus('Reiniciando el stock en 0 para todas las bodegas...')
          const resetRes = await resetStockCeroAction()
          if (!resetRes.success) {
            setError(resetRes.error || 'Error al poner en stock 0 las bodegas.')
            setProgressStatus(null)
            return
          }
        } else {
          for (const g of grupos) {
            setProgressStatus(`Reiniciando existencias a 0 en bodega '${g.bodega_nombre}' (ID: ${g.bodega_id})...`)
            const resetRes = await resetStockCeroBodegaAction(g.bodega_id)
            if (!resetRes.success) {
              setError(resetRes.error || `Error al reiniciar stock de la bodega ${g.bodega_nombre}.`)
              setProgressStatus(null)
              return
            }
          }
        }
        await new Promise((res) => setTimeout(res, 300))
      }

      // Paso 2: Procesamiento por lotes de 500 filas
      const totalChunks = Math.ceil(filas.length / CHUNK_SIZE)
      const todasNotas: NotaBodegaResult[] = []
      let totalProcesadosSum = 0

      // Si se reinició el stock a 0, la importación se ejecuta sumando las existencias directas
      const modoParaImport: ModoAjuste = resetStockPrevio ? 'delta' : modo

      for (let i = 0; i < totalChunks; i++) {
        const chunkFilas = filas.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        const numActual = i + 1

        setProgressStatus(
          totalChunks > 1
            ? `Procesando lote ${numActual} de ${totalChunks} (${chunkFilas.length} productos)...`
            : `Creando notas y actualizando existencias...`
        )

        const result = await crearAjustesImportAction(chunkFilas, modoParaImport)

        if (!result.success) {
          setError(result.error ?? `Error procesando el lote ${numActual}.`)
          setProgressStatus(null)
          return
        }

        if (result.notas) {
          todasNotas.push(...result.notas)
        }
        totalProcesadosSum += result.productos_procesados ?? 0
      }

      // Consolidar notas repetidas por bodega si aplica
      const notasMap = new Map<number, NotaBodegaResult>()
      for (const n of todasNotas) {
        if (!notasMap.has(n.bodega_id)) {
          notasMap.set(n.bodega_id, { ...n })
        } else {
          const ex = notasMap.get(n.bodega_id)!
          ex.productos_procesados += n.productos_procesados
        }
      }

      onSuccess([...notasMap.values()], totalProcesadosSum)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">3. Confirmar importación</h3>
        <p className="text-sm text-muted-foreground">
          Revisa el resumen antes de aplicar {esMultiBodega ? 'los ajustes' : 'el ajuste'}.
        </p>
      </div>

      {/* Casilla de Reinicio de Stock a 0 (desactivada por default) */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={resetStockPrevio}
            onChange={(e) => setResetStockPrevio(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
            disabled={isPending}
          />
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-sm text-amber-950 dark:text-amber-200">
              <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              {grupos.length === 1
                ? `Poner en stock 0 la bodega '${grupos[0]?.bodega_nombre}' (ID: ${grupos[0]?.bodega_id}) antes de importar`
                : `Poner en stock 0 las ${grupos.length} bodegas involucradas antes de importar`}
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
              {grupos.length === 1
                ? `Establece a 0 todas las existencias de '${grupos[0]?.bodega_nombre}' antes de registrar las nuevas cantidades del archivo. Los productos no presentes en el archivo quedarán con 0 existencias.`
                : `Establece a 0 todas las existencias en las ${grupos.length} bodegas (${grupos.map((g) => g.bodega_nombre).join(', ')}) antes de registrar las nuevas cantidades.`}
            </p>
          </div>
        </label>
      </div>

      {esMultiBodega && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-xs text-blue-800 dark:text-blue-300">
          <Warehouse className="size-4 shrink-0" />
          Se crearán notas de ajuste por bodega. Las {filas.length} filas se procesarán en lotes de {CHUNK_SIZE}.
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total productos a procesar</span>
          <span className="font-bold">{totalProductos}</span>
        </div>
        {totalCajasPos > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total cajas entradas (+)</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">+{totalCajasPos} cajas</span>
          </div>
        )}
        {totalCajasNeg < 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total cajas salidas (-)</span>
            <span className="font-medium text-red-700 dark:text-red-400">{totalCajasNeg} cajas</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t pt-2">
          <span className="text-muted-foreground">Tipo de nota</span>
          <span className="font-medium">Ajuste (AJU)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Modo seleccionado</span>
          <span className="font-medium">{modo === 'global' ? 'Corte Global (Matriz SKU x Bodega)' : modo === 'absoluto' ? 'Inventario total' : 'Ajuste delta'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reinicio previo a 0</span>
          <span className={`font-semibold ${resetStockPrevio ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {resetStockPrevio ? 'Sí (Reiniciar a 0)' : 'No (Mantener existencias actuales)'}
          </span>
        </div>
      </div>

      <div className="max-h-40 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Producto</th>
              <th className="px-3 py-2 text-right font-medium">Cajas</th>
              <th className="px-3 py-2 text-left font-medium">Bodega</th>
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, 100).map((f, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 font-mono">{f.sku}</td>
                <td className="px-3 py-1.5">{f.producto_nombre ?? '—'}</td>
                <td className={`px-3 py-1.5 text-right font-mono ${f.cajas > 0 ? 'text-emerald-700' : f.cajas < 0 ? 'text-red-700' : ''}`}>
                  {f.cajas > 0 ? `+${f.cajas}` : f.cajas}
                </td>
                <td className="px-3 py-1.5">{f.bodega_nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length > 100 && (
          <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 border-t">
            ... y {filas.length - 100} productos más
          </div>
        )}
      </div>

      {progressStatus && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 p-4 text-xs font-semibold text-primary animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {progressStatus}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>Atrás</Button>
        <Button onClick={handleConfirm} disabled={isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          {isPending ? (
            <><Loader2 className="size-3.5 animate-spin" /> Procesando...</>
          ) : (
            <><FileCheck className="size-3.5" /> Confirmar e importar</>
          )}
        </Button>
      </div>
    </div>
  )
}
