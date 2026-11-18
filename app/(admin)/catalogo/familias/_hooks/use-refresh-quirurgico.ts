// app/(admin)/catalogo/familias/_hooks/use-refresh-quirurgico.ts
'use client'

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { fetchProductosPorFamiliaAction } from '@/modules/catalogo/actions/familias'
import type { FamiliaResumen } from '@/modules/catalogo/queries'
import { buildInitialProductsMap, type ProductListItem } from './familias-types'

interface UseRefreshQuirurgicoProps {
  initialFamilias: FamiliaResumen[]
  setFamilias: Dispatch<SetStateAction<FamiliaResumen[]>>
  loadedProducts: Record<string, ProductListItem[]>
  setLoadedProducts: Dispatch<SetStateAction<Record<string, ProductListItem[]>>>
  loadProductsForFamily: (familyCode: string, force?: boolean) => Promise<void>
  pinnedFamilies: string[]
  highlightedFamily: string | null
  stagedMoves: Record<number, string>
  modoStock: boolean
  invalidateAndReloadStock: (ids: number[]) => Promise<void>
  setInspectedProduct: Dispatch<SetStateAction<ProductListItem | null>>
}

export function useRefreshQuirurgico({
  initialFamilias,
  setFamilias,
  loadedProducts,
  setLoadedProducts,
  loadProductsForFamily,
  pinnedFamilies,
  highlightedFamily,
  stagedMoves,
  modoStock,
  invalidateAndReloadStock,
  setInspectedProduct,
}: UseRefreshQuirurgicoProps) {
  const [refreshingInfo, setRefreshingInfo] = useState(false)
  const [ultimoRefresh, setUltimoRefresh] = useState<string | null>(null)

  // Mantener sincronizado el estado cuando initialFamilias cambia desde servidor
  useEffect(() => {
    setFamilias(initialFamilias)
    const serverInitialMap = buildInitialProductsMap(initialFamilias)
    setLoadedProducts((prev) => ({
      ...prev,
      ...serverInitialMap,
    }))
  }, [initialFamilias, setFamilias, setLoadedProducts])

  // Ajuste de viewport a pantalla completa al montar el módulo
  useEffect(() => {
    const container = document.getElementById('familias-organizer-container')
    const main = container?.closest('main') as HTMLElement | null
    if (!main) return

    const prevStyle = {
      overflow: main.style.overflow,
      padding: main.style.padding,
      height: main.style.height,
    }
    const prevParentOverflow = main.parentElement ? main.parentElement.style.overflow : ''

    main.style.overflow = 'hidden'
    main.style.padding = '0px'
    main.style.height = '100%'
    if (main.parentElement) {
      main.parentElement.style.overflow = 'hidden'
    }

    return () => {
      main.style.overflow = prevStyle.overflow
      main.style.padding = prevStyle.padding
      main.style.height = prevStyle.height
      if (main.parentElement) {
        main.parentElement.style.overflow = prevParentOverflow
      }
    }
  }, [])

  // Refresh quirúrgico (AGENTS.md 3.7.6): solo recarga entidades visibles sin borrar borrador/bandeja
  const handleRefreshInfo = useCallback(async () => {
    if (refreshingInfo) return
    setRefreshingInfo(true)
    try {
      const prevIds = new Set((loadedProducts['F000-000C'] || []).map((p) => p.id))
      const frescos = (await fetchProductosPorFamiliaAction('F000-000C')) as ProductListItem[]
      setLoadedProducts((prev) => ({ ...prev, ['F000-000C']: frescos }))
      const extras = Array.from(
        new Set([
          ...pinnedFamilies.filter((f) => f !== 'F000-000C'),
          ...(highlightedFamily && highlightedFamily !== 'F000-000C' ? [highlightedFamily] : []),
        ])
      )
      await Promise.all(extras.map((f) => loadProductsForFamily(f, true)))
      const nuevos = frescos.filter((p) => !prevIds.has(p.id) && stagedMoves[p.id] === undefined)
      if (modoStock) {
        const ids: number[] = [...frescos.map((p) => p.id)]
        for (const f of extras) {
          for (const p of loadedProducts[f] || []) ids.push(p.id)
        }
        await invalidateAndReloadStock(ids)
      }
      const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      setUltimoRefresh(hora)
      if (nuevos.length > 0) toast.success(`${nuevos.length} nuevo(s) sin asignar · actualizado ${hora}`)
      else toast.success(`Información actualizada ${hora}`)
    } catch (err) {
      console.error('Error al refrescar información:', err)
      toast.error('No se pudo refrescar la información')
    } finally {
      setRefreshingInfo(false)
    }
  }, [
    refreshingInfo,
    loadedProducts,
    setLoadedProducts,
    pinnedFamilies,
    highlightedFamily,
    loadProductsForFamily,
    stagedMoves,
    modoStock,
    invalidateAndReloadStock,
  ])

  const handleDescripcionSaved = useCallback(
    (productId: number, descripcion: string | null) => {
      setLoadedProducts((prev) => {
        const next = { ...prev }
        for (const [key, prods] of Object.entries(next)) {
          if (prods.some((p) => p.id === productId)) {
            next[key] = prods.map((p) => (p.id === productId ? { ...p, descripcion } : p))
          }
        }
        return next
      })
      setFamilias((prev) =>
        prev.map((f) => ({
          ...f,
          skus: (f.skus || []).map((s) => (s.id === productId ? { ...s, descripcion } : s)),
        }))
      )
      setInspectedProduct((prev) => (prev && prev.id === productId ? { ...prev, descripcion } : prev))
    },
    [setLoadedProducts, setFamilias, setInspectedProduct]
  )

  return {
    refreshingInfo,
    ultimoRefresh,
    handleRefreshInfo,
    handleDescripcionSaved,
  }
}
