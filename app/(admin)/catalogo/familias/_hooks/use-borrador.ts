// app/(admin)/catalogo/familias/_hooks/use-borrador.ts
'use client'

import { useState, useEffect, useRef, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { moverProductosDeFamiliaAction, renombrarFamiliaAction } from '@/modules/catalogo/actions'
import {
  clearBandejaCache,
  clearBorradorCache,
  loadBandejaCache,
  loadBorradorCache,
  saveBandejaCache,
  saveBorradorCache,
} from '@/lib/familias/draft-cache'
import { getNetProductCounts as calcularConteosNetos } from '@/lib/familias/net-counts'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import {
  buildNetSkusForFamilies,
  computeAutoSuffixRenames,
  getFinalFamilyName,
  type ProductListItem,
} from './familias-types'

interface UseBorradorProps {
  initialFamilias: FamiliaResumen[]
  familias: FamiliaResumen[]
  setFamilias: Dispatch<SetStateAction<FamiliaResumen[]>>
  loadedProducts: Record<string, ProductListItem[]>
  setLoadedProducts: Dispatch<SetStateAction<Record<string, ProductListItem[]>>>
  setPinnedFamilies: Dispatch<SetStateAction<string[]>>
  loadProductsForFamily: (familyName: string, force?: boolean) => Promise<void>
  mostrarInactivos: boolean
  puedeEditar: boolean
  startTransition: (callback: () => void) => void
  onRefreshRoute: () => void
  onResetFiltersAfterPersist: () => void
}

export function useBorrador({
  initialFamilias,
  familias,
  setFamilias,
  loadedProducts,
  setLoadedProducts,
  setPinnedFamilies,
  loadProductsForFamily,
  mostrarInactivos,
  puedeEditar,
  startTransition,
  onRefreshRoute,
  onResetFiltersAfterPersist,
}: UseBorradorProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, boolean>>({})
  const [stagedMoves, setStagedMoves] = useState<Record<number, string>>({})
  const [stagedRenames, setStagedRenames] = useState<Record<string, string>>({})
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const cacheListaRef = useRef(false)

  // Restauración de caché local de borrador y bandeja al montar (AGENTS.md 3.7.5)
  useEffect(() => {
    try {
      let movesRestaurados: Record<number, string> = {}
      const borrador = loadBorradorCache()
      if (borrador) {
        if (Object.keys(borrador.stagedMoves).length > 0) {
          movesRestaurados = borrador.stagedMoves
          setStagedMoves(borrador.stagedMoves)
        }
        if (Object.keys(borrador.stagedRenames).length > 0) {
          setStagedRenames(borrador.stagedRenames)
        }
        if (borrador.draftFamilies.length > 0) {
          const conMovimientos = new Set(Object.values(movesRestaurados))
          const drafts = borrador.draftFamilies.filter((d) => conMovimientos.has(d))
          setFamilias((prev) => {
            const keys = new Set(prev.map((f) => f.familia))
            const faltantes = drafts
              .filter((d) => !keys.has(d))
              .map((d) => ({
                familia: d,
                total_productos: 0,
                es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z](\d+)?$/i.test(d),
                descripcion: 'Nueva familia en borrador',
                skus: [] as FamiliaResumenSku[],
              }))
            return faltantes.length > 0 ? [...prev, ...faltantes] : prev
          })
        }
        if (Object.keys(borrador.stagedMoves).length > 0 || Object.keys(borrador.stagedRenames).length > 0) {
          toast.info('Borrador local restaurado (pendiente de guardar en BD)')
        }
      }

      const bandeja = loadBandejaCache()
      if (bandeja) {
        const pendientes = bandeja.ids.filter((id) => movesRestaurados[id] === undefined)
        if (pendientes.length > 0) {
          setSelectedProductIds(Object.fromEntries(pendientes.map((id) => [id, true])) as Record<number, boolean>)
          const snap = bandeja.snapshot.filter((s) => pendientes.includes(s.id))
          if (snap.length > 0) {
            setLoadedProducts((prev) => {
              const next = { ...prev }
              for (const s of snap) {
                const key = s.familia || 'F000-000C'
                const list = [...(next[key] || [])]
                if (!list.some((p) => p.id === s.id)) {
                  list.push({
                    id: s.id,
                    sku_base: s.sku_base,
                    nombre: null,
                    descripcion: s.descripcion,
                    familia: s.familia,
                    precio_ec: null,
                    pz_en_caja: null,
                    activo: true,
                    imagen_principal: null,
                  })
                }
                next[key] = list
              }
              return next
            })
          }
          toast.info(`${pendientes.length} producto(s) restaurados en Reasignación`)
        }
      }
    } finally {
      cacheListaRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistir borrador en caché local tras la restauración inicial
  useEffect(() => {
    if (!cacheListaRef.current) return
    const drafts = familias
      .map((f) => f.familia)
      .filter((f): f is string => !!f && !initialFamilias.some((i) => i.familia === f))
    saveBorradorCache({ stagedMoves, stagedRenames, draftFamilies: drafts })
  }, [stagedMoves, stagedRenames, familias, initialFamilias])

  // Persistir bandeja de reasignación en caché local
  useEffect(() => {
    if (!cacheListaRef.current) return
    const ids = Object.entries(selectedProductIds)
      .filter(([, v]) => v)
      .map(([id]) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id))
    const snapshot: { id: number; sku_base: string; descripcion: string | null; familia: string | null }[] = []
    for (const id of ids) {
      let item: { sku_base: string; descripcion: string | null; familia: string | null } | null = null
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find((p) => p.id === id)
        if (found) {
          item = {
            sku_base: found.sku_base,
            descripcion: found.descripcion ?? null,
            familia: found.familia ?? null,
          }
          break
        }
      }
      if (!item) {
        for (const f of familias) {
          const s = f.skus?.find((x) => x.id === id)
          if (s) {
            item = { sku_base: s.sku_base, descripcion: s.descripcion ?? null, familia: f.familia ?? null }
            break
          }
        }
      }
      if (item) snapshot.push({ id, ...item })
    }
    saveBandejaCache({ ids, snapshot })
  }, [selectedProductIds, loadedProducts, familias])

  const getNetProductCounts = useCallback((): Record<string, number> => {
    return calcularConteosNetos(
      familias.map((f) => ({
        familia: f.familia || '',
        total: f.total_productos,
        esDraft: !!f.familia && !initialFamilias.some((i) => i.familia === f.familia),
      })),
      stagedMoves,
      (prodId: number) => {
        for (const [fam, prods] of Object.entries(loadedProducts)) {
          if (prods.some((p) => p.id === prodId)) return fam
        }
        return null
      }
    )
  }, [familias, initialFamilias, stagedMoves, loadedProducts])

  const netCounts = useMemo(() => getNetProductCounts(), [getNetProductCounts])

  const autoRenames = useMemo(
    () => computeAutoSuffixRenames(netCounts, stagedRenames),
    [netCounts, stagedRenames]
  )

  const netSkusMap = useMemo(
    () =>
      buildNetSkusForFamilies({
        familias,
        stagedMoves,
        loadedProducts,
        mostrarInactivos,
      }),
    [familias, stagedMoves, loadedProducts, mostrarInactivos]
  )

  const hasPendingChanges = Object.keys(stagedMoves).length > 0 || Object.keys(stagedRenames).length > 0

  const selectedProducts = useMemo(() => {
    const selectedIds = Object.entries(selectedProductIds)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => parseInt(id, 10))
    const list: ProductListItem[] = []
    selectedIds.forEach((id) => {
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find((p) => p.id === id)
        if (found) {
          list.push(found)
          return
        }
      }
      for (const f of familias) {
        const skuFound = f.skus?.find((s) => s.id === id)
        if (skuFound) {
          list.push({
            id,
            sku_base: skuFound.sku_base,
            nombre: null,
            descripcion: skuFound.descripcion || null,
            familia: f.familia || 'F000-000C',
            precio_ec: null,
            pz_en_caja: null,
            activo: skuFound.activo ?? true,
            imagen_principal: skuFound.imagen_principal ?? null,
          })
          return
        }
      }
    })
    return list
  }, [selectedProductIds, loadedProducts, familias])

  const toggleSelectProduct = useCallback((productId: number) => {
    setSelectedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }, [])

  const toggleSelectAllInFamily = useCallback(
    (familyCode: string, products: ProductListItem[]) => {
      const visibleProducts = products.filter((p) => (stagedMoves[p.id] ?? p.familia) === familyCode)
      const allSelected = visibleProducts.every((p) => selectedProductIds[p.id])

      const nextSelection = { ...selectedProductIds }
      visibleProducts.forEach((p) => {
        nextSelection[p.id] = !allSelected
      })
      setSelectedProductIds(nextSelection)
    },
    [stagedMoves, selectedProductIds]
  )

  const handleCancelStagedMove = useCallback(
    (productId: number) => {
      const nextMoves = { ...stagedMoves }
      delete nextMoves[productId]
      setStagedMoves(nextMoves)
      toast.info('Se canceló el movimiento en borrador para el producto')
    },
    [stagedMoves]
  )

  const handleDiscardChanges = useCallback(() => {
    clearBorradorCache()
    clearBandejaCache()
    setStagedMoves({})
    setStagedRenames({})
    setSelectedProductIds({})
    onResetFiltersAfterPersist()
    setFamilias(initialFamilias)
    toast.info('Se descartaron todos los cambios locales')
  }, [initialFamilias, setFamilias, onResetFiltersAfterPersist])

  const handleOlvidarBandeja = useCallback(() => {
    clearBandejaCache()
    setSelectedProductIds({})
    toast.info('Bandeja de reasignación olvidada')
  }, [])

  const handleOlvidarBorrador = useCallback(() => {
    clearBorradorCache()
    setStagedMoves({})
    setStagedRenames({})
    setFamilias(initialFamilias)
    toast.info('Borrador guardado olvidado')
  }, [initialFamilias, setFamilias])

  const handleConfirmPersist = useCallback(() => {
    if (!puedeEditar) {
      toast.error('No tienes permisos de edición en el catálogo')
      return
    }

    startTransition(async () => {
      const movesByFamily: Record<string, number[]> = {}
      Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
        const prodId = parseInt(prodIdStr, 10)
        const finalDestFamily = getFinalFamilyName(destFamily, stagedRenames, autoRenames)
        if (!movesByFamily[finalDestFamily]) {
          movesByFamily[finalDestFamily] = []
        }
        movesByFamily[finalDestFamily].push(prodId)
      })

      try {
        const allRenames = { ...stagedRenames, ...autoRenames }
        for (const [oldName, newName] of Object.entries(allRenames)) {
          const res = await renombrarFamiliaAction(oldName, newName)
          if (!res.success) {
            throw new Error(`Error al renombrar ${oldName}: ${res.error}`)
          }
        }

        for (const [destFamily, ids] of Object.entries(movesByFamily)) {
          const res = await moverProductosDeFamiliaAction(ids, destFamily)
          if (!res.success) {
            throw new Error(`Error al mover productos a ${destFamily}: ${res.error}`)
          }
        }

        toast.success('¡Todos los cambios fueron guardados con éxito en la base de datos!')
        clearBorradorCache()
        clearBandejaCache()
        setStagedMoves({})
        setStagedRenames({})
        onResetFiltersAfterPersist()
        setIsConfirmModalOpen(false)
        onRefreshRoute()

        setLoadedProducts({})
        setPinnedFamilies(['F000-000C'])
        await loadProductsForFamily('F000-000C', true)
      } catch (err: unknown) {
        console.error('Error al guardar cambios de familias:', err)
        const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado al guardar los cambios'
        toast.error(message)
      }
    })
  }, [
    puedeEditar,
    startTransition,
    stagedMoves,
    stagedRenames,
    autoRenames,
    onResetFiltersAfterPersist,
    onRefreshRoute,
    setLoadedProducts,
    setPinnedFamilies,
    loadProductsForFamily,
  ])

  return {
    selectedProductIds,
    setSelectedProductIds,
    stagedMoves,
    setStagedMoves,
    stagedRenames,
    setStagedRenames,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    netCounts,
    autoRenames,
    netSkusMap,
    hasPendingChanges,
    selectedProducts,
    toggleSelectProduct,
    toggleSelectAllInFamily,
    handleCancelStagedMove,
    handleDiscardChanges,
    handleOlvidarBandeja,
    handleOlvidarBorrador,
    handleConfirmPersist,
  }
}
