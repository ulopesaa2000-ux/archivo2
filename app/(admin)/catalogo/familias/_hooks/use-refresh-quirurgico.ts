// app/(admin)/catalogo/familias/_hooks/use-refresh-quirurgico.ts
'use client'

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { fetchProductosPorFamiliaAction, fetchResumenFamiliasAction } from '@/modules/catalogo/actions/familias'
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

  // Ajuste de viewport a pantalla completa al montar el módulo (anula padding/max-width del wrapper en AdminLayoutClient)
  useEffect(() => {
    const container = document.getElementById('familias-organizer-container')
    const wrapper = container?.parentElement as HTMLElement | null
    const main = container?.closest('main') as HTMLElement | null
    if (!main) return

    const prevMain = {
      overflow: main.style.overflow,
      padding: main.style.padding,
      minHeight: main.style.minHeight,
    }
    const prevWrapper = wrapper
      ? {
          overflow: wrapper.style.overflow,
          padding: wrapper.style.padding,
          maxWidth: wrapper.style.maxWidth,
          margin: wrapper.style.margin,
          width: wrapper.style.width,
          height: wrapper.style.height,
        }
      : null

    main.style.overflow = 'hidden'
    main.style.padding = '0px'
    main.style.minHeight = '0px'

    if (wrapper && wrapper !== main) {
      wrapper.style.overflow = 'hidden'
      wrapper.style.padding = '0px'
      wrapper.style.maxWidth = 'none'
      wrapper.style.margin = '0px'
      wrapper.style.width = '100%'
      wrapper.style.height = '100%'
    }

    return () => {
      main.style.overflow = prevMain.overflow
      main.style.padding = prevMain.padding
      main.style.minHeight = prevMain.minHeight
      if (wrapper && prevWrapper && wrapper !== main) {
        wrapper.style.overflow = prevWrapper.overflow
        wrapper.style.padding = prevWrapper.padding
        wrapper.style.maxWidth = prevWrapper.maxWidth
        wrapper.style.margin = prevWrapper.margin
        wrapper.style.width = prevWrapper.width
        wrapper.style.height = prevWrapper.height
      }
    }
  }, [])

  // Refresh completo del directorio + entidades visibles sin borrar borrador/bandeja (AGENTS.md 3.7.6)
  const handleRefreshInfo = useCallback(async () => {
    if (refreshingInfo) return
    setRefreshingInfo(true)
    const toastId = toast.loading('Trayendo datos completos del catálogo...')
    try {
      const prevIds = new Set((loadedProducts['F000-000C'] || []).map((p) => p.id))
      const extras = Array.from(
        new Set([
          ...pinnedFamilies.filter((f) => f !== 'F000-000C'),
          ...(highlightedFamily && highlightedFamily !== 'F000-000C' ? [highlightedFamily] : []),
        ])
      )

      const [familiasFrescas, frescos] = await Promise.all([
        fetchResumenFamiliasAction(),
        fetchProductosPorFamiliaAction('F000-000C') as Promise<ProductListItem[]>,
        ...extras.map((f) => loadProductsForFamily(f, true)),
      ])

      // Conservar familias creadas localmente en borrador que aún tienen movimientos pendientes
      const draftDestinations = new Set(Object.values(stagedMoves))
      setFamilias((prev) => {
        const freshKeys = new Set(familiasFrescas.map((f) => f.familia))
        const draftsPendientes = prev.filter(
          (f) => f.familia && draftDestinations.has(f.familia) && !freshKeys.has(f.familia)
        )
        return draftsPendientes.length > 0 ? [...familiasFrescas, ...draftsPendientes] : familiasFrescas
      })

      setLoadedProducts((prev) => ({ ...prev, ['F000-000C']: frescos }))
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
      if (nuevos.length > 0) {
        toast.success(`${nuevos.length} nuevo(s) sin asignar · actualizado ${hora}`, { id: toastId })
      } else {
        toast.success(`Catálogo actualizado (${familiasFrescas.length} familias) · ${hora}`, { id: toastId })
      }
    } catch (err) {
      console.error('Error al refrescar información:', err)
      toast.error('No se pudo refrescar la información', { id: toastId })
    } finally {
      setRefreshingInfo(false)
    }
  }, [
    refreshingInfo,
    loadedProducts,
    setFamilias,
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
