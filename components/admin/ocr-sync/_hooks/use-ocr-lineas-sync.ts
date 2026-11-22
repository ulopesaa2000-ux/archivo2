// components/admin/ocr-sync/_hooks/use-ocr-lineas-sync.ts
'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  sincronizarLineasOcrAction,
  actualizarPropuestaOcrLineasAction,
} from '@/modules/inventario/actions'
import { compactarSkuOcr } from '@/lib/inventario/sku-ocr'
import {
  buscarEnCatalogoLocal,
  type CatalogoSkuIndexado,
} from '@/lib/inventario/sku-matcher'
import type {
  NotaOcrCandidatoSku,
  NotaOcrPropuestaLineRaw,
  NotaOcrLineaSincronizada,
  DraftProducto,
  ProductoBusqueda,
} from '@/modules/inventario/types'
import {
  getCatalogoOcrIndexado,
  getCatalogoOcrSync,
} from './ocr-catalogo-cache'
import {
  buildUpdatedRawOcrLineas,
  hidratarLineasOptimistas,
  mapInitialOcrLineas,
  sincronizarBatchLocal,
  toSincronizadaFromLocal,
} from './ocr-sync-local'

interface UseOcrLineasSyncParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  ocrProposalId?: string
  initialLineas: NotaOcrPropuestaLineRaw[]
  bodegaOrigenId?: number | null
  onApplyToDraft: (newProducts: DraftProducto[], updatedRawLineas: NotaOcrPropuestaLineRaw[]) => void
  onResetVisor: () => void
}

export function useOcrLineasSync({
  open,
  onOpenChange,
  ocrProposalId,
  initialLineas,
  bodegaOrigenId,
  onApplyToDraft,
  onResetVisor,
}: UseOcrLineasSyncParams) {
  const [lineas, setLineas] = useState<NotaOcrLineaSincronizada[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [catalogoIndexado, setCatalogoIndexado] = useState<CatalogoSkuIndexado[]>(
    () => getCatalogoOcrSync() ?? []
  )
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const rowInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const liveSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!open) {
      if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current)
      return
    }

    let cancelled = false
    const mapped = mapInitialOcrLineas(initialLineas)
    const cachedCat = getCatalogoOcrSync()

    void Promise.resolve().then(async () => {
      if (cancelled) return
      setError(null)
      setSearchTerm('')
      setSearchResults([])
      setSelectedIndex(null)
      onResetVisor()

      if (cachedCat) {
        setCatalogoIndexado(cachedCat)
        setLineas(mapped.length > 0 ? sincronizarBatchLocal(mapped, cachedCat) : [])
        setIsSyncing(false)
        return
      }

      // Hidratación instantánea (0 ms) desde los datos ya procesados por n8n mientras baja el catálogo
      const optimistas = mapped.length > 0 ? hidratarLineasOptimistas(initialLineas) : []
      setLineas(optimistas)
      setIsSyncing(true)

      try {
        const freshCat = await getCatalogoOcrIndexado()
        if (cancelled) return
        setCatalogoIndexado(freshCat)
        setLineas(mapped.length > 0 ? sincronizarBatchLocal(mapped, freshCat) : [])
        setIsSyncing(false)
      } catch {
        if (cancelled) return
        if (mapped.length > 0) {
          const fallbackRes = await sincronizarLineasOcrAction(mapped)
          if (cancelled) return
          if (fallbackRes.success && fallbackRes.data) {
            setLineas(fallbackRes.data)
          } else if (fallbackRes.error) {
            setError(fallbackRes.error)
          }
        }
        setIsSyncing(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, initialLineas, onResetVisor])

  const handleSearchChange = useCallback(
    async (q: string) => {
      setSearchTerm(q)
      if (q.trim().length < 1) {
        setSearchResults([])
        return
      }

      const activeCatalog = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      if (activeCatalog.length > 0) {
        const locales = buscarEnCatalogoLocal(q, activeCatalog, 15).map((item) => ({
          id: item.id,
          sku_base: item.sku_base,
          nombre: item.descripcion ?? '',
          descripcion: item.descripcion,
          pz_en_caja: item.pz_en_caja,
          marca_nombre: item.proveedor_nombre ?? null,
          imagen_url: null,
        }))
        setSearchResults(locales)
        return
      }

      setIsSearching(true)
      try {
        const res = await fetch(`/api/inventario/notas/nueva/search?q=${encodeURIComponent(q)}`)
        setSearchResults(res.ok ? await res.json() : [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [catalogoIndexado]
  )

  const handleSelectSearchResult = useCallback(
    (prod: ProductoBusqueda) => {
      if (selectedIndex !== null && lineas[selectedIndex]) {
        setLineas((prev) =>
          prev.map((l, i) =>
            i === selectedIndex
              ? {
                ...l,
                producto_id: prod.id,
                producto_sku: prod.sku_base,
                producto_nombre: prod.descripcion ?? prod.nombre ?? '',
                producto_pz_en_caja: prod.pz_en_caja ?? null,
                encontrado: true,
                es_propuesta: false,
                propuesta_producto_id: null,
                propuesta_producto_sku: null,
                propuesta_producto_nombre: null,
                propuesta_producto_pz_en_caja: null,
                score: 1.0,
                metodo: 'MANUAL',
                manual: true,
                candidatos_sku: [],
              }
              : l
          )
        )
        toast.success(`Línea #${selectedIndex + 1} vinculada a ${prod.sku_base}`)
      } else {
        setLineas((prev) => [
          ...prev,
          {
            index: prev.length,
            estilo_raw: prod.sku_base,
            cantidad_cajas: 1,
            confianza: 1.0,
            score: 1.0,
            metodo: 'MANUAL',
            producto_id: prod.id,
            producto_sku: prod.sku_base,
            producto_nombre: prod.descripcion ?? prod.nombre ?? '',
            producto_pz_en_caja: prod.pz_en_caja ?? null,
            encontrado: true,
            es_propuesta: false,
            manual: true,
          },
        ])
        toast.success(`Se agregó ${prod.sku_base} a las líneas`)
      }
      setSearchTerm('')
      setSearchResults([])
    },
    [selectedIndex, lineas]
  )

  const handleAcceptProposal = useCallback((index: number) => {
    setLineas((prev) => {
      const target = prev[index]
      if (target?.propuesta_producto_sku) {
        toast.success(`Línea #${index + 1}: ${target.propuesta_producto_sku} aceptada`)
      }
      return prev.map((l, i) =>
        i === index && l.propuesta_producto_id && l.propuesta_producto_sku
          ? {
            ...l,
            producto_id: l.propuesta_producto_id,
            producto_sku: l.propuesta_producto_sku,
            producto_nombre: l.propuesta_producto_nombre ?? '',
            producto_pz_en_caja: l.propuesta_producto_pz_en_caja ?? null,
            encontrado: true,
            es_propuesta: false,
            manual: true,
          }
          : l
      )
    })
  }, [])

  const handleSelectCandidate = useCallback((index: number, candidato: NotaOcrCandidatoSku) => {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
            ...l,
            producto_id: candidato.producto_id,
            producto_sku: candidato.sku_base,
            producto_nombre: candidato.descripcion ?? '',
            producto_pz_en_caja: candidato.pz_en_caja ?? null,
            encontrado: true,
            es_propuesta: false,
            propuesta_producto_id: null,
            propuesta_producto_sku: null,
            propuesta_producto_nombre: null,
            propuesta_producto_pz_en_caja: null,
            score: candidato.score,
            metodo: candidato.metodo,
            manual: true,
          }
          : l
      )
    )
    toast.success(`Línea #${index + 1}: ${candidato.sku_base} seleccionado`)
  }, [])

  const handleClearLineProduct = useCallback((index: number) => {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
            ...l,
            producto_id: null,
            producto_sku: null,
            producto_nombre: null,
            producto_pz_en_caja: null,
            encontrado: false,
            es_propuesta: false,
            propuesta_producto_id: null,
            propuesta_producto_sku: null,
            propuesta_producto_nombre: null,
            propuesta_producto_pz_en_caja: null,
            score: 0,
            metodo: null,
            manual: false,
          }
          : l
      )
    )
  }, [])

  const handleUpdateEstiloRaw = useCallback(
    (index: number, value: string) => {
      setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, estilo_raw: value } : l)))
      if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current)
      const activeCatalog = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      if (activeCatalog.length === 0) return

      liveSyncTimerRef.current = setTimeout(() => {
        setLineas((prev) =>
          prev.map((l, i) => (i === index ? toSincronizadaFromLocal(l, value, activeCatalog) : l))
        )
      }, 100)
    },
    [catalogoIndexado]
  )

  const handleBlurEstiloRaw = useCallback(
    (index: number) => {
      const activeCatalog = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      setLineas((prev) =>
        prev.map((l, i) => {
          if (i !== index) return l
          const compacto = compactarSkuOcr(l.estilo_raw)
          if (compacto === l.estilo_raw) return l
          return activeCatalog.length > 0 && !l.manual
            ? toSincronizadaFromLocal(l, compacto, activeCatalog)
            : { ...l, estilo_raw: compacto }
        })
      )
    },
    [catalogoIndexado]
  )

  const handleUpdateCajas = useCallback((index: number, cajas: number) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, cantidad_cajas: cajas } : l)))
  }, [])

  const handleEnterOnRow = useCallback(
    (idx: number) => {
      const current = lineas[idx]
      if (current && !current.encontrado && current.es_propuesta && current.propuesta_producto_id) {
        handleAcceptProposal(idx)
      }
      const nextIdx = lineas.findIndex((l, i) => i > idx && !l.encontrado)
      const fallbackIdx = nextIdx >= 0 ? nextIdx : lineas.findIndex((l, i) => i !== idx && !l.encontrado)
      if (fallbackIdx >= 0) {
        setSelectedIndex(fallbackIdx)
        rowInputRefs.current[fallbackIdx]?.focus()
      }
    },
    [lineas, handleAcceptProposal]
  )

  const handleAcceptHighConfidenceAll = useCallback(() => {
    let count = 0
    setLineas((prev) =>
      prev.map((l) => {
        const alta =
          !l.encontrado &&
          l.es_propuesta &&
          !!l.propuesta_producto_id &&
          !!l.propuesta_producto_sku &&
          ((l.score ?? 0) >= 0.90 || (l.decider_prob ?? 0) >= 0.80)
        if (!alta) return l
        count += 1
        return {
          ...l,
          producto_id: l.propuesta_producto_id,
          producto_sku: l.propuesta_producto_sku,
          producto_nombre: l.propuesta_producto_nombre ?? '',
          producto_pz_en_caja: l.propuesta_producto_pz_en_caja ?? null,
          encontrado: true,
          es_propuesta: false,
          manual: true,
        }
      })
    )
    if (count > 0) toast.success(`${count} propuesta(s) de alta confianza confirmadas`)
  }, [])

  const handleFilterByPrefix = useCallback(
    (idx: number, prefijo: string) => {
      setSelectedIndex(idx)
      void handleSearchChange(prefijo)
      searchInputRef.current?.focus()
    },
    [handleSearchChange]
  )

  const handleSync = useCallback(async () => {
    setError(null)
    setIsSyncing(true)
    const payload = lineas.map((l, i) => ({
      index: i,
      estilo_raw: compactarSkuOcr(l.estilo_raw),
      cantidad_cajas: l.cantidad_cajas,
      piezas_por_caja: l.piezas_por_caja ?? null,
      piezas_detectadas_ref: l.piezas_detectadas_ref ?? null,
      confianza: l.confianza,
      descripcion_raw: l.descripcion_raw ?? null,
      sku: l.producto_sku ?? null,
      posibles_variantes: l.candidatos_sku?.map((c) => c.sku_base) ?? null,
      decider_prob: l.decider_prob ?? null,
      decider_model: l.decider_model ?? null,
      candidatos_sku: l.candidatos_sku,
      manual: l.manual,
      producto_id: l.producto_id ?? null,
      producto_sku: l.producto_sku ?? null,
      producto_nombre: l.producto_nombre ?? null,
      producto_pz_en_caja: l.producto_pz_en_caja ?? null,
      encontrado: l.encontrado,
      score: l.score ?? null,
      metodo: l.metodo ?? null,
    }))

    try {
      const freshCat = await getCatalogoOcrIndexado(true)
      setCatalogoIndexado(freshCat)
      setLineas(sincronizarBatchLocal(payload, freshCat))
      setIsSyncing(false)
      toast.success('Catálogo actualizado y líneas re-sincronizadas')
    } catch {
      const res = await sincronizarLineasOcrAction(payload)
      setIsSyncing(false)
      if (res.success && res.data) {
        const manuales = lineas.filter((l) => l.manual)
        setLineas(
          res.data.map((nueva) => {
            const manual = manuales.find(
              (m) => m.index === nueva.index || compactarSkuOcr(m.estilo_raw) === compactarSkuOcr(nueva.estilo_raw)
            )
            return manual ? { ...nueva, ...manual, index: nueva.index } : nueva
          })
        )
        toast.success('Líneas sincronizadas con el catálogo')
      } else {
        const msg = res.error ?? 'Error al sincronizar líneas.'
        setError(msg)
        toast.error(msg)
      }
    }
  }, [lineas])

  const handleAddLine = useCallback(() => {
    const newIdx = lineas.length
    setLineas((prev) => [
      ...prev,
      { index: prev.length, estilo_raw: '', cantidad_cajas: 1, confianza: 1.0, encontrado: false },
    ])
    setSelectedIndex(newIdx)
    setTimeout(() => rowInputRefs.current[newIdx]?.focus(), 20)
  }, [lineas.length])

  const handleRemoveLine = useCallback(
    (index: number) => {
      setLineas((prev) => prev.filter((_, i) => i !== index))
      if (selectedIndex === index) setSelectedIndex(null)
    },
    [selectedIndex]
  )

  const handleApply = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const updatedRawLineas = buildUpdatedRawOcrLineas(lineas)

      if (ocrProposalId) {
        const updateRes = await actualizarPropuestaOcrLineasAction(ocrProposalId, updatedRawLineas)
        if (!updateRes.success) {
          const msg = `No se pudo actualizar la propuesta OCR en BD: ${updateRes.error}`
          setError(msg)
          toast.error(msg)
          return
        }
      }

      const confirmadas = lineas.filter((l) => l.encontrado && l.producto_id && l.producto_sku)
      const stockMap = new Map<number, { cajas: number; piezas_sueltas: number }>()

      if (bodegaOrigenId && confirmadas.length > 0) {
        const uniqueIds = Array.from(new Set(confirmadas.map((l) => l.producto_id!)))
        const stockEntries = await Promise.all(
          uniqueIds.map(async (pid) => {
            try {
              const res = await fetch(
                `/api/inventario/notas/nueva/stock?producto_id=${pid}&bodega_id=${bodegaOrigenId}`
              )
              if (res.ok) {
                const s = await res.json()
                return [pid, { cajas: s.cajas ?? 0, piezas_sueltas: s.piezas_sueltas ?? 0 }] as const
              }
            } catch {
              // Ignorar error individual de consulta de stock
            }
            return [pid, { cajas: 0, piezas_sueltas: 0 }] as const
          })
        )
        for (const [pid, st] of stockEntries) stockMap.set(pid, st)
      }

      const draftProducts: DraftProducto[] = confirmadas.map((line) => {
        const st = stockMap.get(line.producto_id!) ?? { cajas: 0, piezas_sueltas: 0 }
        return {
          tempId: crypto.randomUUID(),
          producto_id: line.producto_id!,
          producto_sku: line.producto_sku!,
          producto_nombre: line.producto_nombre ?? null,
          producto_pz_en_caja: line.producto_pz_en_caja ?? null,
          cajas: line.cantidad_cajas,
          piezas_sueltas: 0,
          caja_id: null,
          caja_codigo: null,
          caja_nombre_pack: null,
          stock_origen_cajas: st.cajas,
          stock_origen_piezas: st.piezas_sueltas,
        }
      })

      onApplyToDraft(draftProducts, updatedRawLineas)
      onOpenChange(false)
    })
  }, [lineas, ocrProposalId, bodegaOrigenId, onApplyToDraft, onOpenChange])

  return {
    lineas,
    selectedIndex,
    setSelectedIndex,
    isCatalogoReady: catalogoIndexado.length > 0,
    isPending,
    isSyncing,
    error,
    searchInputRef,
    rowInputRefs,
    searchTerm,
    searchResults,
    isSearching,
    handleSearchChange,
    handleSelectSearchResult,
    handleAcceptProposal,
    handleSelectCandidate,
    handleClearLineProduct,
    handleUpdateEstiloRaw,
    handleBlurEstiloRaw,
    handleUpdateCajas,
    handleEnterOnRow,
    handleAcceptHighConfidenceAll,
    handleFilterByPrefix,
    handleSync,
    handleAddLine,
    handleRemoveLine,
    handleApply,
  }
}
