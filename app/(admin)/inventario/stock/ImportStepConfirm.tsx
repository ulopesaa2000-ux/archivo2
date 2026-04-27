// app/(admin)/inventario/stock/ImportStepConfirm.tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, FileCheck, AlertCircle, Warehouse } from 'lucide-react'
import { crearAjustesImportAction } from '@/modules/inventario/import-actions'
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
  onSuccess: (notas: NotaBodegaResult[], totalProductos: number) => void
  onBack: () => void
}

export function ImportStepConfirm({ filas, modo, onSuccess, onBack }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
      const result = await crearAjustesImportAction(filas, modo)
      if (result.success && result.notas) {
        onSuccess(result.notas, result.productos_procesados ?? 0)
      } else {
        setError(result.error ?? 'Error desconocido al crear las notas de ajuste.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">3. Confirmar importacion</h3>
        <p className="text-sm text-muted-foreground">
          Revisa el resumen antes de aplicar {esMultiBodega ? 'los ajustes' : 'el ajuste'}.
        </p>
      </div>

      {esMultiBodega && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <Warehouse className="size-4" />
          Se crearan {grupos.length} notas de ajuste (una por bodega)
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.bodega_id} className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Warehouse className="size-3.5 text-muted-foreground" />
            {g.bodega_nombre}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Productos</span>
            <span className="font-medium">{g.filas.length}</span>
          </div>
          {g.cajasPos > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entradas (+)</span>
              <span className="font-medium text-emerald-700">+{g.cajasPos} cajas</span>
            </div>
          )}
          {g.cajasNeg < 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salidas (-)</span>
              <span className="font-medium text-red-700">{g.cajasNeg} cajas</span>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total productos</span>
          <span className="font-medium">{totalProductos}</span>
        </div>
        {totalCajasPos > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total entradas</span>
            <span className="font-medium text-emerald-700">+{totalCajasPos} cajas</span>
          </div>
        )}
        {totalCajasNeg < 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total salidas</span>
            <span className="font-medium text-red-700">{totalCajasNeg} cajas</span>
          </div>
        )}
    <div className="flex justify-between text-sm border-t pt-2">
      <span className="text-muted-foreground">Tipo de nota</span>
      <span className="font-medium">Ajuste (AJU)</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Modo</span>
      <span className="font-medium">{modo === 'absoluto' ? 'Inventario total' : 'Ajuste delta'}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Confirmacion</span>
      <span className="font-medium">Automatica</span>
    </div>
  </div>

  <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
    {esMultiBodega
      ? `Se crearan ${grupos.length} notas de ajuste (una por bodega) y se confirmaran automaticamente. El stock se actualizara de inmediato.`
      : 'Se creara una nota de ajuste y se confirmara automaticamente. El stock se actualizara de inmediato.'}
    {modo === 'absoluto' && ' En modo inventario total, se calcula la diferencia entre el valor del CSV y el stock actual, y solo se ajustan los productos con diferencias.'}
    {' '}Esta accion no se puede deshacer desde este dialogo.
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
            {filas.map((f, i) => (
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
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>Atras</Button>
        <Button onClick={handleConfirm} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <><Loader2 className="size-3.5 animate-spin" /> Procesando...</>
          ) : (
            <><FileCheck className="size-3.5" /> Confirmar importacion</>
          )}
        </Button>
      </div>
    </div>
  )
}
