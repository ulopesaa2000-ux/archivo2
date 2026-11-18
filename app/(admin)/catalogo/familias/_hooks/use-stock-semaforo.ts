// app/(admin)/catalogo/familias/_hooks/use-stock-semaforo.ts
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchStockTotalesPorProductoAction } from '@/modules/catalogo/actions/familias'
import type { FamiliaResumen, StockTotalProducto } from '@/modules/catalogo/queries'
import type { ProductListItem } from './familias-types'

interface UseStockSemaforoProps {
  familias: FamiliaResumen[]
  loadedProducts: Record<string, ProductListItem[]>
  pinnedFamilies: string[]
  inspectedProductId: number | null
}

export function useStockSemaforo({
  familias,
  loadedProducts,
  pinnedFamilies,
  inspectedProductId,
}: UseStockSemaforoProps) {
  const [modoStock, setModoStock] = useState(false)
  const [stockMap, setStockMap] = useState<Record<number, StockTotalProducto>>({})
  const [loadingStock, setLoadingStock] = useState(false)
  const stockCacheRef = useRef<Record<number, StockTotalProducto>>({})

  const collectAllLoadedProductIds = useCallback(() => {
    const ids = new Set<number>()
    familias.forEach((f) => f.skus?.forEach((s) => ids.add(s.id)))
    Object.values(loadedProducts).forEach((arr) => arr.forEach((p) => ids.add(p.id)))
    return Array.from(ids)
  }, [familias, loadedProducts])

  const asegurarStock = useCallback(async (productoIds: number[]) => {
    const faltantes = Array.from(
      new Set(productoIds.filter((id) => id > 0 && stockCacheRef.current[id] === undefined))
    )
    if (faltantes.length === 0) return

    setLoadingStock(true)
    try {
      const CHUNK = 500
      const nuevo: Record<number, StockTotalProducto> = {}
      for (let i = 0; i < faltantes.length; i += CHUNK) {
        const chunk = faltantes.slice(i, i + CHUNK)
        const res = await fetchStockTotalesPorProductoAction(chunk)
        Object.assign(nuevo, res)
      }
      stockCacheRef.current = { ...stockCacheRef.current, ...nuevo }
      setStockMap((prev) => ({ ...prev, ...nuevo }))
    } catch (err) {
      console.error('Error cargando stock global:', err)
      toast.error('No se pudo cargar el stock de los SKUs')
    } finally {
      setLoadingStock(false)
    }
  }, [])

  const toggleModoStock = useCallback(
    async (activo: boolean) => {
      setModoStock(activo)
      if (activo) {
        await asegurarStock(collectAllLoadedProductIds())
      }
    },
    [asegurarStock, collectAllLoadedProductIds]
  )

  const invalidateAndReloadStock = useCallback(
    async (ids: number[]) => {
      ids.forEach((id) => {
        delete stockCacheRef.current[id]
      })
      setStockMap({ ...stockCacheRef.current })
      await asegurarStock(ids)
    },
    [asegurarStock]
  )

  // Cargar stock cuando se activa modoStock o cambian familias/productos cargados
  useEffect(() => {
    if (modoStock) {
      void asegurarStock(collectAllLoadedProductIds())
    }
  }, [modoStock, pinnedFamilies, familias, loadedProducts, asegurarStock, collectAllLoadedProductIds])

  useEffect(() => {
    if (inspectedProductId && modoStock) {
      void asegurarStock([inspectedProductId])
    }
  }, [inspectedProductId, modoStock, asegurarStock])

  // Inactivo = rosa · 0 cajas = rojo · 1-4 cajas = amarillo · 5+ = normal. Retorna '' si normal.
  const clasesSemaforoSku = useCallback(
    (productoId: number): string => {
      const st = stockMap[productoId]
      if (!st) return ''
      if (st.cajas <= 0) return 'bg-red-600 dark:bg-red-600 text-white border-red-700 dark:border-red-500 font-bold'
      if (st.cajas < 5) {
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      }
      return ''
    },
    [stockMap]
  )

  const claseTextoSku = useCallback(
    (productoId: number): string => {
      if (!modoStock) return ''
      const st = stockMap[productoId]
      if (!st) return ''
      if (st.cajas <= 0) return 'text-red-600 dark:text-red-400'
      if (st.cajas < 5) return 'text-amber-700 dark:text-amber-300'
      return ''
    },
    [modoStock, stockMap]
  )

  const tituloStockSku = useCallback(
    (productoId: number): string | undefined => {
      if (!modoStock) return undefined
      const st = stockMap[productoId]
      if (!st) return 'Stock: cargando…'
      return `Stock total: ${st.cajas} cajas${st.piezas > 0 ? ` · ${st.piezas} pzs` : ''}`
    },
    [modoStock, stockMap]
  )

  return {
    modoStock,
    stockMap,
    loadingStock,
    asegurarStock,
    toggleModoStock,
    invalidateAndReloadStock,
    clasesSemaforoSku,
    claseTextoSku,
    tituloStockSku,
  }
}
