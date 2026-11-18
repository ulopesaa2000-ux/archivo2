// app/(admin)/catalogo/familias/_hooks/use-directorio.ts
'use client'

import { useState, useMemo, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  compactBlockToTens,
  detectDenseBlocks,
  FAMILIA_GAP_MIN_DEFAULT,
  generateIntermediateCodeV2,
  parseFamiliaCode,
  type EstrategiaCodigo,
} from '@/lib/utils/familia-codigo'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import { getVisibleProductsInFamily, type ProductListItem } from './familias-types'

interface UseDirectorioProps {
  initialFamilias: FamiliaResumen[]
  familias: FamiliaResumen[]
  setFamilias: Dispatch<SetStateAction<FamiliaResumen[]>>
  loadedProducts: Record<string, ProductListItem[]>
  setLoadedProducts: Dispatch<SetStateAction<Record<string, ProductListItem[]>>>
  loadingProducts: Record<string, boolean>
  stagedMoves: Record<number, string>
  setStagedMoves: Dispatch<SetStateAction<Record<number, string>>>
  stagedRenames: Record<string, string>
  setStagedRenames: Dispatch<SetStateAction<Record<string, string>>>
  selectedProductIds: Record<number, boolean>
  setSelectedProductIds: Dispatch<SetStateAction<Record<number, boolean>>>
  netCounts: Record<string, number>
  netSkusMap: Record<string, FamiliaResumenSku[]>
  autoRenames: Record<string, string>
  loadProductsForFamily: (familyCode: string, force?: boolean) => Promise<void>
  mostrarInactivos: boolean
  setHighlightedFamily: Dispatch<SetStateAction<string | null>>
}

export function useDirectorio({
  initialFamilias,
  familias,
  setFamilias,
  loadedProducts,
  setLoadedProducts,
  loadingProducts,
  stagedMoves,
  setStagedMoves,
  stagedRenames,
  setStagedRenames,
  selectedProductIds,
  setSelectedProductIds,
  netCounts,
  netSkusMap,
  autoRenames,
  loadProductsForFamily,
  mostrarInactivos,
  setHighlightedFamily,
}: UseDirectorioProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [leftSearchQuery, setLeftSearchQuery] = useState('')
  const [activeDirTab, setActiveDirTab] = useState<'cards' | 'skus'>('skus')
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({})
  const [isSinAsignarCollapsed, setIsSinAsignarCollapsed] = useState(false)
  const [isBandejaCollapsed, setIsBandejaCollapsed] = useState(false)

  // Modal: Renombrar familia
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  // Modal: Crear familia intermedia
  const [isCreateIntermediateDialogOpen, setIsCreateIntermediateDialogOpen] = useState(false)
  const [refFamilyName, setRefFamilyName] = useState('')
  const [newFamilyInput, setNewFamilyInput] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])

  const handleToggleExpandFamily = useCallback(
    (familyCode: string) => {
      const isExpanded = !expandedFamilies[familyCode]
      if (isExpanded) {
        void loadProductsForFamily(familyCode)
      }
      setExpandedFamilies((prev) => ({
        ...prev,
        [familyCode]: !prev[familyCode],
      }))
    },
    [expandedFamilies, loadProductsForFamily]
  )

  const handleGoToFamilyInList = useCallback(
    (familyName: string) => {
      setSearchQuery('')
      setHighlightedFamily(familyName)

      if (activeDirTab === 'cards') {
        setExpandedFamilies((prev) => ({ ...prev, [familyName]: true }))
        void loadProductsForFamily(familyName)
      }

      setTimeout(() => {
        const el =
          activeDirTab === 'cards'
            ? document.getElementById(`family-item-card-${familyName}`)
            : document.getElementById(`family-item-${familyName}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 120)
    },
    [activeDirTab, loadProductsForFamily]
  )

  const handleScrollToHighlightedFamily = useCallback(
    (familyName: string) => {
      if (!familyName) return

      if (activeDirTab === 'cards') {
        setExpandedFamilies((prev) => ({ ...prev, [familyName]: true }))
        void loadProductsForFamily(familyName)
      }

      setTimeout(() => {
        const el =
          activeDirTab === 'cards'
            ? document.getElementById(`family-item-card-${familyName}`)
            : document.getElementById(`family-item-${familyName}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
          }, 1500)
        } else {
          toast.info(`Mostrando familia ${familyName}...`)
          setSearchQuery('')
          setTimeout(() => {
            const retryEl =
              activeDirTab === 'cards'
                ? document.getElementById(`family-item-card-${familyName}`)
                : document.getElementById(`family-item-${familyName}`)
            if (retryEl) {
              retryEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 150)
        }
      }, 100)
    },
    [activeDirTab, loadProductsForFamily]
  )

  const unassignedProducts = useMemo(
    () =>
      getVisibleProductsInFamily({
        familyCode: 'F000-000C',
        loadedProducts,
        stagedMoves,
        mostrarInactivos,
      }),
    [loadedProducts, stagedMoves, mostrarInactivos]
  )

  const filteredUnassigned = useMemo(() => {
    const q = leftSearchQuery.toLowerCase()
    return unassignedProducts.filter(
      (p) =>
        !q ||
        p.sku_base.toLowerCase().includes(q) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.nombre && p.nombre.toLowerCase().includes(q))
    )
  }, [unassignedProducts, leftSearchQuery])

  // Colapsar automáticamente "Sin Asignar" si quedó vacío tras cargar
  useEffect(() => {
    const hasLoaded = loadedProducts['F000-000C'] !== undefined
    const isLoading = !!loadingProducts['F000-000C']
    if (hasLoaded && !isLoading && unassignedProducts.length === 0) {
      setIsSinAsignarCollapsed(true)
    }
  }, [unassignedProducts.length, loadingProducts, loadedProducts])

  const filteredActiveFamiliesList = useMemo(() => {
    const visibleFamilies = familias.filter((f) => {
      if (!f.familia || f.familia === 'F000-000C' || f.familia === 'null') return false
      const net = netCounts[f.familia] ?? 0
      if (net <= 0) return false
      if (!mostrarInactivos && f.skus && f.skus.length > 0) {
        const netSkus = netSkusMap[f.familia] || []
        if (netSkus.length === 0) return false
      }
      return true
    })

    const stagedTargets = Array.from(new Set(Object.values(stagedMoves))).filter(
      (dest) => dest && dest !== 'F000-000C' && dest !== 'null'
    )

    const combined: FamiliaResumen[] = [...visibleFamilies]
    stagedTargets.forEach((targetName) => {
      if ((netCounts[targetName] ?? 0) <= 0) return
      if (!combined.some((f) => f.familia === targetName)) {
        combined.push({
          familia: targetName,
          total_productos: 0,
          es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z]$/i.test(targetName),
          descripcion: 'Nueva familia en borrador',
          skus: [],
        })
      }
    })

    combined.sort((a, b) => (a.familia || '').localeCompare(b.familia || '', 'es', { sensitivity: 'base' }))

    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return combined

    return combined.filter((f) => {
      const name = (f.familia || '').toLowerCase()
      const description = (f.descripcion || '').toLowerCase()
      return words.every(
        (word) =>
          name.includes(word) ||
          description.includes(word) ||
          (f.familia && netSkusMap[f.familia] && netSkusMap[f.familia].some((sku) => sku.sku_base.toLowerCase().includes(word))) ||
          (f.skus && f.skus.some((sku) => sku.sku_base.toLowerCase().includes(word)))
      )
    })
  }, [familias, netCounts, mostrarInactivos, netSkusMap, stagedMoves, searchQuery])

  // Palabras clave para familia intermedia
  const getKeywordsFromFamily = useCallback(
    (familyName: string): string[] => {
      const products = loadedProducts[familyName] || []
      if (products.length === 0) return []

      const textParts: string[] = []
      products.forEach((p) => {
        if (p.nombre) textParts.push(p.nombre)
        if (p.descripcion) textParts.push(p.descripcion)
      })

      const combinedText = textParts.join(' ').toLowerCase()
      const stopWords = new Set([
        'de', 'con', 'el', 'la', 'para', 'un', 'una', 'y', 'en', 'los', 'las', 'del',
        'al', 'o', 'a', 'sin', 'por', 'como', 'su', 'sus', 'es', 'son', 'se', 'pzs', 'pz',
      ])

      const words = combinedText
        .split(/[^a-záéíóúüñ0-9]+/i)
        .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))

      const freq: Record<string, number> = {}
      words.forEach((w) => {
        freq[w] = (freq[w] || 0) + 1
      })

      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word.toUpperCase())
        .slice(0, 10)
    },
    [loadedProducts]
  )

  useEffect(() => {
    if (refFamilyName) {
      setSuggestedKeywords(getKeywordsFromFamily(refFamilyName))
    } else {
      setSuggestedKeywords([])
    }
  }, [refFamilyName, getKeywordsFromFamily])

  const getTargetSuffixForNewFamily = useCallback(() => {
    const selectedCount = Object.values(selectedProductIds).filter(Boolean).length
    return selectedCount >= 2 ? 'A' : 'B'
  }, [selectedProductIds])

  const getIntermediateDetail = useCallback(
    (refCode: string): { codigo: string; estrategia: EstrategiaCodigo; requiereCompactar: boolean } => {
      const vistos = new Set<string>()
      const todas: string[] = []
      for (const f of familias) {
        if (f.familia && !vistos.has(f.familia)) {
          vistos.add(f.familia)
          todas.push(f.familia)
        }
      }
      for (const dest of Object.values(stagedMoves)) {
        if (dest && !vistos.has(dest) && parseFamiliaCode(dest)) {
          vistos.add(dest)
          todas.push(dest)
        }
      }
      todas.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

      const idx = todas.findIndex((f) => f === refCode)
      if (idx === -1) {
        return generateIntermediateCodeV2(refCode, undefined, getTargetSuffixForNewFamily(), FAMILIA_GAP_MIN_DEFAULT)
      }

      const prefix = refCode.substring(0, 4)
      let nextFamilyCode: string | undefined
      for (let i = idx + 1; i < todas.length; i++) {
        if (todas[i].startsWith(prefix) && parseFamiliaCode(todas[i])) {
          nextFamilyCode = todas[i]
          break
        }
      }

      return generateIntermediateCodeV2(refCode, nextFamilyCode, getTargetSuffixForNewFamily(), FAMILIA_GAP_MIN_DEFAULT)
    },
    [familias, stagedMoves, getTargetSuffixForNewFamily]
  )

  const getIntermediateCodeSuggestion = useCallback(
    (refCode: string) => getIntermediateDetail(refCode).codigo,
    [getIntermediateDetail]
  )

  const getDenseBlockForRef = useCallback(
    (refCode: string) => {
      const parsed = parseFamiliaCode(refCode)
      if (!parsed) return null
      const vistos = new Set<string>()
      const delPrefijo: string[] = []
      const push = (c: string | null | undefined) => {
        if (!c || vistos.has(c)) return
        const p = parseFamiliaCode(c)
        if (p && p.prefijo === parsed.prefijo && p.ext === null) {
          vistos.add(c)
          delPrefijo.push(c)
        }
      }
      for (const f of familias) push(f.familia)
      for (const dest of Object.values(stagedMoves)) push(dest)
      if (!vistos.has(refCode) && parsed.ext === null) {
        vistos.add(refCode)
        delPrefijo.push(refCode)
      }
      const bloques = detectDenseBlocks(delPrefijo, 4)
      return bloques.find((b) => b.miembros.includes(refCode) || b.prefijo === parsed.prefijo) ?? null
    },
    [familias, stagedMoves]
  )

  const handleCompactDenseBlock = useCallback(() => {
    if (!refFamilyName) return
    const bloque = getDenseBlockForRef(refFamilyName)
    if (!bloque) {
      toast.info('No hay bloque denso para compactar en este prefijo')
      return
    }
    const res = compactBlockToTens(bloque, FAMILIA_GAP_MIN_DEFAULT)
    if (!res.cupo) {
      toast.warning('El bloque no cabe en decenas: usa overflow A1 o crea un prefijo nuevo')
      return
    }
    const entries = Object.entries(res.renames)
    if (entries.length === 0) {
      toast.info('El bloque ya está en decenas limpias')
      return
    }
    setStagedRenames((prev) => {
      const next = { ...prev }
      for (const [oldName, newName] of entries) {
        for (const k of Object.keys(next)) {
          if (next[k] === oldName) next[k] = newName
        }
        if (next[oldName]) {
          delete next[oldName]
        }
        next[oldName] = newName
      }
      return next
    })
    setFamilias((prev) =>
      prev.map((f) => {
        const nuevo = res.renames[f.familia || '']
        return nuevo ? { ...f, familia: nuevo } : f
      })
    )
    toast.success(`Bloque compactado a decenas: ${entries.length} familia(s) reubicadas en borrador`)
  }, [refFamilyName, getDenseBlockForRef, setStagedRenames, setFamilias])

  const handleConfirmCreateIntermediate = useCallback(() => {
    const code = newFamilyInput.trim()
    if (!code) {
      toast.warning('Ingresa un código para la nueva familia')
      return
    }

    const selectedIds = Object.entries(selectedProductIds)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => parseInt(id, 10))

    if (selectedIds.length === 0) {
      toast.warning('No hay productos seleccionados para mover')
      return
    }

    setStagedMoves((prev) => {
      const next = { ...prev }
      selectedIds.forEach((id) => {
        next[id] = code
      })
      return next
    })

    if (!familias.some((f) => f.familia === code)) {
      setFamilias((prev) => [
        ...prev,
        {
          familia: code,
          total_productos: selectedIds.length,
          es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z]$/i.test(code),
          descripcion: refFamilyName ? familias.find((f) => f.familia === refFamilyName)?.descripcion || '' : '',
          skus: [],
        },
      ])
    }

    const movedProductsList: ProductListItem[] = []
    selectedIds.forEach((id) => {
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find((p) => p.id === id)
        if (found) {
          movedProductsList.push({ ...found, familia: code })
        }
      }
    })

    setLoadedProducts((prev) => ({
      ...prev,
      [code]: movedProductsList,
    }))

    setSelectedProductIds({})
    setIsCreateIntermediateDialogOpen(false)
    setRefFamilyName('')
    setExpandedFamilies((prev) => ({ ...prev, [code]: true }))
    toast.success(`Familia "${code}" creada localmente en borrador`)
  }, [
    newFamilyInput,
    selectedProductIds,
    setStagedMoves,
    familias,
    setFamilias,
    refFamilyName,
    loadedProducts,
    setLoadedProducts,
    setSelectedProductIds,
  ])

  const handleStageRename = useCallback(() => {
    if (!renameTarget) return
    const newName = renameInput.trim()
    if (!newName) {
      toast.warning('El nuevo nombre no puede estar vacío')
      return
    }

    if (newName === renameTarget) {
      setIsRenameModalOpen(false)
      return
    }

    setStagedRenames((prev) => ({
      ...prev,
      [renameTarget]: newName,
    }))
    setIsRenameModalOpen(false)
    toast.success(`Preparado para renombrar "${renameTarget}" a "${newName}"`)
  }, [renameTarget, renameInput, setStagedRenames])

  const handleOpenRenameModal = useCallback(
    (name: string) => {
      setRenameTarget(name)
      setRenameInput(stagedRenames[name] || name)
      setIsRenameModalOpen(true)
    },
    [stagedRenames]
  )

  return {
    searchQuery,
    setSearchQuery,
    leftSearchQuery,
    setLeftSearchQuery,
    activeDirTab,
    setActiveDirTab,
    expandedFamilies,
    handleToggleExpandFamily,
    handleGoToFamilyInList,
    handleScrollToHighlightedFamily,
    isSinAsignarCollapsed,
    setIsSinAsignarCollapsed,
    isBandejaCollapsed,
    setIsBandejaCollapsed,
    unassignedProducts,
    filteredUnassigned,
    filteredActiveFamiliesList,
    // Create intermediate modal
    isCreateIntermediateDialogOpen,
    setIsCreateIntermediateDialogOpen,
    refFamilyName,
    setRefFamilyName,
    newFamilyInput,
    setNewFamilyInput,
    suggestedKeywords,
    getIntermediateDetail,
    getIntermediateCodeSuggestion,
    getDenseBlockForRef,
    handleCompactDenseBlock,
    handleConfirmCreateIntermediate,
    // Rename modal
    isRenameModalOpen,
    setIsRenameModalOpen,
    renameTarget,
    renameInput,
    setRenameInput,
    handleStageRename,
    handleOpenRenameModal,
    autoRenames,
    initialFamilias,
  }
}
