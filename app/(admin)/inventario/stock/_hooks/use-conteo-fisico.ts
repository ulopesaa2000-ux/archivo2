// app/(admin)/inventario/stock/_hooks/use-conteo-fisico.ts
'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import type { BodegaRow } from '@/lib/types/tables'
import type { ProductoBusqueda } from '@/modules/inventario/types'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'
import {
  LOCAL_STORAGE_CONTEO_FISICO_KEY,
  type CandidatoSkuSimple,
  type EstadoConteoFisico,
  type HojaConteoFisico,
  type RenglonConteoFisico,
} from '@/modules/inventario/conteo-fisico-types'
import {
  actualizarBorradorHojaConteoAction,
  guardarHojaConteoOcrAction,
} from '@/modules/inventario/conteo-fisico-actions'
import {
  getCatalogoOcrIndexado,
  getCatalogoOcrSync,
} from '@/components/admin/ocr-sync/_hooks/ocr-catalogo-cache'
import {
  buscarEnCatalogoLocal,
  type CatalogoSkuIndexado,
} from '@/lib/inventario/sku-matcher'
import {
  aplicarReemplazoMasivo,
  detectarSugerenciasReemplazo,
  evaluarRenglonContraCatalogo,
  normalizarTextoSkuConteo,
  previsualizarReemplazo,
  recalcularResumenHoja,
  sincronizarHojasConCatalogo,
  type PreviewReemplazo,
  type ReglaReemplazo,
} from '@/lib/inventario/conteo-fisico-matcher'

export type FiltroEstadoConteo = 'todos' | 'propuestas' | 'sin_match' | 'con_formula'

export interface RenglonAplanado extends RenglonConteoFisico {
  hoja_id: string
  hoja_numero: number
  hoja_comprobante_url?: string
}

interface UseConteoFisicoParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  onIrAConciliacion: (bodegaId: number, filas: ImportFilaValida[], propuestaDbIds?: string[]) => void
  onResetVisor?: () => void
}

export function useConteoFisico({
  open,
  onOpenChange,
  bodegas,
  bodegaActivaId,
  onIrAConciliacion,
  onResetVisor,
}: UseConteoFisicoParams) {
  const [hojas, setHojas] = useState<HojaConteoFisico[]>([])
  const [procesando, setProcesando] = useState(false)
  const [progresoTexto, setProgresoTexto] = useState('')
  const [guardandoNube, setGuardandoNube] = useState(false)
  const [isSyncingCatalogo, setIsSyncingCatalogo] = useState(false)
  const [catalogoIndexado, setCatalogoIndexado] = useState<CatalogoSkuIndexado[]>(
    () => getCatalogoOcrSync() ?? []
  )

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroHoja, setFiltroHoja] = useState<number | 'todas'>('todas')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoConteo>('todos')
  const [bodegaDestinoId, setBodegaDestinoId] = useState<number>(() => {
    if (bodegaActivaId && bodegaActivaId > 0) return bodegaActivaId
    return bodegas[0]?.id ?? 0
  })

  const [selectedTarget, setSelectedTarget] = useState<{ hojaId: string; renglonId: string } | null>(null)
  const [activeFotoHojaId, setActiveFotoHojaId] = useState<string | null>(null)
  const [panelLateralAbierto, setPanelLateralAbierto] = useState(false)
  const [buscadorFlotanteAbierto, setBuscadorFlotanteAbierto] = useState(false)
  const [resumenColapsado, setResumenColapsado] = useState(false)
  const [fotoVisorUrl, setFotoVisorUrl] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [replaceOpen, setReplaceOpen] = useState(false)
  const [reglaReemplazo, setReglaReemplazoState] = useState<ReglaReemplazo>({
    buscar: '',
    reemplazar: '',
    modo: 'prefijo',
    alcance: 'sin_match',
  })
  const [previewReemplazo, setPreviewReemplazo] = useState<PreviewReemplazo | null>(null)
  const [previewDesactualizado, setPreviewDesactualizado] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState<HojaConteoFisico[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const rowInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const liveSyncTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const hojasRef = useRef<HojaConteoFisico[]>([])

  useEffect(() => {
    hojasRef.current = hojas
  }, [hojas])

  const guardarBorrador = useCallback((nuevasHojas: HojaConteoFisico[]) => {
    setHojas(nuevasHojas)
    hojasRef.current = nuevasHojas
    try {
      if (nuevasHojas.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_CONTEO_FISICO_KEY)
      } else {
        const estado: EstadoConteoFisico = {
          version: 'v1',
          fecha_actualizacion: new Date().toISOString(),
          hojas: nuevasHojas,
        }
        localStorage.setItem(LOCAL_STORAGE_CONTEO_FISICO_KEY, JSON.stringify(estado))
      }
    } catch (e) {
      console.warn('Error al guardar en localStorage:', e)
    }
  }, [])

  // Cargar borrador de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CONTEO_FISICO_KEY)
      if (raw) {
        const parsed: EstadoConteoFisico = JSON.parse(raw)
        if (parsed.version === 'v1' && Array.isArray(parsed.hojas) && parsed.hojas.length > 0) {
          const reparadas = parsed.hojas.map((h) => ({
            ...h,
            resumen: recalcularResumenHoja(h.renglones || []),
          }))
          setHojas(reparadas)
          hojasRef.current = reparadas
        }
      }
    } catch (e) {
      console.warn('Error al cargar borrador de conteo físico:', e)
    }
  }, [])

  // Al abrir modal: hidratar catálogo 0 ms y sincronizar borradores existentes
  useEffect(() => {
    if (!open) return
    let cancelled = false

    const applySync = (cat: CatalogoSkuIndexado[]) => {
      if (cancelled || cat.length === 0) return
      setCatalogoIndexado(cat)
      if (hojasRef.current.length > 0) {
        const synced = sincronizarHojasConCatalogo(hojasRef.current, cat)
        guardarBorrador(synced)
      }
    }

    const cached = getCatalogoOcrSync()
    if (cached && cached.length > 0) {
      applySync(cached)
      return
    }

    setIsSyncingCatalogo(true)
    void getCatalogoOcrIndexado()
      .then((fresh) => {
        applySync(fresh)
      })
      .catch((err) => {
        console.warn('No se pudo cargar catálogo OCR cacheado:', err)
      })
      .finally(() => {
        if (!cancelled) setIsSyncingCatalogo(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, guardarBorrador])

  const resincronizarCatalogo = useCallback(async () => {
    setIsSyncingCatalogo(true)
    try {
      const fresh = await getCatalogoOcrIndexado(true)
      setCatalogoIndexado(fresh)
      if (hojasRef.current.length > 0) {
        const synced = sincronizarHojasConCatalogo(hojasRef.current, fresh)
        guardarBorrador(synced)
      }
      toast.success(`Catálogo actualizado (${fresh.length} SKUs) y renglones re-evaluados`)
    } catch (err: any) {
      toast.error('Error actualizando catálogo: ' + (err?.message || 'desconocido'))
    } finally {
      setIsSyncingCatalogo(false)
    }
  }, [guardarBorrador])

  const limpiarTodo = useCallback(() => {
    if (hojasRef.current.length === 0) return
    if (confirm('¿Deseas vaciar la mesa de trabajo de este conteo?')) {
      guardarBorrador([])
      setUndoSnapshot(null)
      setSelectedTarget(null)
      setActiveFotoHojaId(null)
      toast.info('Borrador local limpiado')
    }
  }, [guardarBorrador])

  const handleHojasSeleccionadasFromNube = useCallback(
    (seleccionadas: HojaConteoFisico[]) => {
      const idsExistentes = new Set(hojasRef.current.map((h) => h.propuesta_db_id || h.id))
      const nuevas = seleccionadas.filter((h) => !idsExistentes.has(h.propuesta_db_id || h.id))
      if (nuevas.length === 0) {
        toast.info('Las hojas seleccionadas ya estaban en la mesa de trabajo.')
        return
      }
      const activeCat = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      const combinadasBase = [...hojasRef.current, ...nuevas].map((h, idx) => {
        const numHoja = idx + 1
        const renglones = (h.renglones || []).map((r) => ({ ...r, numero_hoja: numHoja }))
        return {
          ...h,
          numero_hoja: numHoja,
          renglones,
          resumen: recalcularResumenHoja(renglones),
        }
      })
      const combinadas =
        activeCat.length > 0 ? sincronizarHojasConCatalogo(combinadasBase, activeCat) : combinadasBase
      guardarBorrador(combinadas)
      setFiltroHoja('todas')
      toast.success(`Se agregaron ${nuevas.length} hoja(s) desde la nube (${combinadas.length} en mesa).`)
    },
    [catalogoIndexado, guardarBorrador]
  )

  const handleGuardarBorradorNube = useCallback(async () => {
    if (hojasRef.current.length === 0) return
    setGuardandoNube(true)
    try {
      let guardadas = 0
      const hojasActualizadas = [...hojasRef.current]
      for (let i = 0; i < hojasActualizadas.length; i++) {
        const h = hojasActualizadas[i]
        if (h.propuesta_db_id) {
          const res = await actualizarBorradorHojaConteoAction(h.propuesta_db_id, h.renglones, h.resumen)
          if (res.success) guardadas++
        } else {
          const res = await guardarHojaConteoOcrAction(h, bodegaDestinoId)
          if (res.success) {
            h.propuesta_db_id = res.data.propuestaId
            guardadas++
          }
        }
      }
      guardarBorrador(hojasActualizadas)
      toast.success(`Borrador guardado en la nube (${guardadas} hojas actualizadas).`)
    } catch (err: any) {
      toast.error('Error al guardar en la nube: ' + err.message)
    } finally {
      setGuardandoNube(false)
    }
  }, [bodegaDestinoId, guardarBorrador])

  const procesarArchivos = useCallback(
    async (archivos: FileList | null) => {
      if (!archivos || archivos.length === 0) return
      const listaArchivos = Array.from(archivos)
      setProcesando(true)

      const numHojaInicial = hojasRef.current.length + 1
      const totalNuevas = listaArchivos.length
      const acumuladorHojas: HojaConteoFisico[] = [...hojasRef.current]

      for (let i = 0; i < listaArchivos.length; i++) {
        const file = listaArchivos[i]
        const numActual = numHojaInicial + i
        setProgresoTexto(`Digitalizando Hoja ${i + 1} de ${totalNuevas}: ${file.name}...`)

        const formData = new FormData()
        formData.append('foto', file)
        formData.append('numero_hoja', String(numActual))
        formData.append('total_hojas', String(numHojaInicial + totalNuevas - 1))
        if (bodegaDestinoId) formData.append('bodega_id', String(bodegaDestinoId))

        try {
          const res = await fetch('/api/inventario/conteo-fisico/ocr', { method: 'POST', body: formData })
          const data = await res.json()
          if (!res.ok || !data.ok) {
            throw new Error(data.error || `Error en servidor (${res.status})`)
          }
          const hoja: HojaConteoFisico = data.hoja
          hoja.preview_data_url = URL.createObjectURL(file)
          hoja.numero_hoja = numActual
          hoja.renglones = (hoja.renglones || []).map((r) => ({ ...r, numero_hoja: numActual }))
          hoja.resumen = recalcularResumenHoja(hoja.renglones)
          acumuladorHojas.push(hoja)
        } catch (err: any) {
          toast.error(`Error en Hoja ${numActual}: ${err.message}`)
        }
      }

      guardarBorrador(acumuladorHojas)
      setFiltroHoja('todas')
      setProcesando(false)
      setProgresoTexto('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      toast.success(`Se procesaron y consolidaron ${acumuladorHojas.length} hojas.`)
    },
    [bodegaDestinoId, guardarBorrador]
  )

  const actualizarRenglon = useCallback(
    (hojaId: string, renglonId: string, updater: (r: RenglonConteoFisico) => RenglonConteoFisico) => {
      const next = hojasRef.current.map((h) => {
        if (h.id !== hojaId) return h
        const renglones = h.renglones.map((r) => (r.id === renglonId ? updater(r) : r))
        return { ...h, renglones, resumen: recalcularResumenHoja(renglones) }
      })
      guardarBorrador(next)
    },
    [guardarBorrador]
  )

  const handleCambiarCajas = useCallback(
    (hojaId: string, renglonId: string, nuevasCajas: number) => {
      actualizarRenglon(hojaId, renglonId, (r) => ({
        ...r,
        cajas: isNaN(nuevasCajas) ? 0 : Math.max(0, nuevasCajas),
        modificado_manualmente: true,
      }))
    },
    [actualizarRenglon]
  )

  const handleCambiarSku = useCallback(
    (hojaId: string, renglonId: string, nuevoSku: string) => {
      const key = `${hojaId}:${renglonId}`
      actualizarRenglon(hojaId, renglonId, (r) => ({
        ...r,
        sku_candidato: nuevoSku.toUpperCase(),
        modificado_manualmente: false,
      }))

      if (liveSyncTimerRef.current[key]) clearTimeout(liveSyncTimerRef.current[key])
      const activeCat = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      if (activeCat.length === 0) return

      liveSyncTimerRef.current[key] = setTimeout(() => {
        actualizarRenglon(hojaId, renglonId, (r) =>
          evaluarRenglonContraCatalogo(r, activeCat, {
            textoOverride: nuevoSku.toUpperCase(),
            forzarReevaluacion: true,
          })
        )
      }, 100)
    },
    [actualizarRenglon, catalogoIndexado]
  )

  const handleBlurSku = useCallback(
    (hojaId: string, renglonId: string) => {
      const activeCat = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      actualizarRenglon(hojaId, renglonId, (r) => {
        const compacto = normalizarTextoSkuConteo(r.sku_candidato)
        if (activeCat.length > 0 && !r.modificado_manualmente) {
          return evaluarRenglonContraCatalogo(r, activeCat, {
            textoOverride: compacto,
            forzarReevaluacion: true,
          })
        }
        return compacto === r.sku_candidato ? r : { ...r, sku_candidato: compacto }
      })
    },
    [actualizarRenglon, catalogoIndexado]
  )

  const handleAceptarPropuesta = useCallback(
    (hojaId: string, renglonId: string) => {
      let acceptedSku: string | null = null
      actualizarRenglon(hojaId, renglonId, (r) => {
        if (!r.propuesta_producto_id || !r.propuesta_sku) return r
        acceptedSku = r.propuesta_sku
        return {
          ...r,
          producto_id: r.propuesta_producto_id,
          sku_match: r.propuesta_sku,
          descripcion: r.propuesta_descripcion ?? null,
          familia: r.propuesta_familia ?? null,
          es_propuesta: false,
          propuesta_producto_id: null,
          propuesta_sku: null,
          propuesta_descripcion: null,
          propuesta_familia: null,
          modificado_manualmente: true,
        }
      })
      if (acceptedSku) toast.success(`Propuesta aceptada: ${acceptedSku}`)
    },
    [actualizarRenglon]
  )

  const handleAceptarPropuestasAltas = useCallback(() => {
    let count = 0
    const next = hojasRef.current.map((h) => {
      const renglones = h.renglones.map((r) => {
        const alta =
          !r.producto_id &&
          r.es_propuesta &&
          !!r.propuesta_producto_id &&
          !!r.propuesta_sku &&
          (r.match_score ?? 0) >= 0.9
        if (!alta) return r
        count++
        return {
          ...r,
          producto_id: r.propuesta_producto_id!,
          sku_match: r.propuesta_sku!,
          descripcion: r.propuesta_descripcion ?? null,
          familia: r.propuesta_familia ?? null,
          es_propuesta: false,
          propuesta_producto_id: null,
          propuesta_sku: null,
          propuesta_descripcion: null,
          propuesta_familia: null,
          modificado_manualmente: true,
        }
      })
      return { ...h, renglones }
    })
    if (count > 0) {
      guardarBorrador(next)
      toast.success(`${count} propuesta(s) ≥90% confirmadas`)
    }
  }, [guardarBorrador])

  const handleSeleccionarCandidato = useCallback(
    (hojaId: string, renglonId: string, c: CandidatoSkuSimple) => {
      actualizarRenglon(hojaId, renglonId, (r) => ({
        ...r,
        producto_id: c.producto_id,
        sku_match: c.sku,
        descripcion: c.nombre,
        familia: c.familia ?? null,
        match_score: c.score,
        metodo_match: c.metodo ?? 'CANDIDATO',
        es_propuesta: false,
        propuesta_producto_id: null,
        propuesta_sku: null,
        propuesta_descripcion: null,
        propuesta_familia: null,
        modificado_manualmente: true,
      }))
      toast.success(`Producto vinculado: ${c.sku}`)
    },
    [actualizarRenglon]
  )

  const handleDesvincularProducto = useCallback(
    (hojaId: string, renglonId: string) => {
      actualizarRenglon(hojaId, renglonId, (r) => ({
        ...r,
        producto_id: null,
        sku_match: null,
        descripcion: null,
        familia: null,
        es_propuesta: false,
        propuesta_producto_id: null,
        propuesta_sku: null,
        propuesta_descripcion: null,
        propuesta_familia: null,
        match_score: 0,
        metodo_match: null,
        modificado_manualmente: false,
      }))
    },
    [actualizarRenglon]
  )

  const handleEliminarRenglon = useCallback(
    (hojaId: string, renglonId: string) => {
      const next = hojasRef.current.map((h) => {
        if (h.id !== hojaId) return h
        const filtered = h.renglones.filter((r) => r.id !== renglonId)
        return { ...h, renglones: filtered, resumen: recalcularResumenHoja(filtered) }
      })
      guardarBorrador(next)
      toast.info('Renglón eliminado')
    },
    [guardarBorrador]
  )

  const handleAgregarRenglonManual = useCallback(
    (hojaId: string, columna: 1 | 2 = 1) => {
      const targetHoja = hojasRef.current.find((h) => h.id === hojaId) || hojasRef.current[0]
      if (!targetHoja) return
      const nuevoRenglon: RenglonConteoFisico = {
        id: `manual_${Date.now()}`,
        numero_hoja: targetHoja.numero_hoja,
        columna,
        renglon: targetHoja.renglones.length + 1,
        estilo_raw: '',
        sku_candidato: '',
        cajas_raw: '1',
        cajas: 1,
        confianza: 1,
        modificado_manualmente: false,
      }
      const next = hojasRef.current.map((h) => {
        if (h.id !== targetHoja.id) return h
        const renglones = [...h.renglones, nuevoRenglon]
        return { ...h, renglones, resumen: recalcularResumenHoja(renglones) }
      })
      guardarBorrador(next)
      const key = `${targetHoja.id}:${nuevoRenglon.id}`
      setSelectedTarget({ hojaId: targetHoja.id, renglonId: nuevoRenglon.id })
      setTimeout(() => rowInputRefs.current[key]?.focus(), 30)
      toast.success('Renglón manual agregado')
    },
    [guardarBorrador]
  )

  const handleSearchChange = useCallback(
    async (q: string) => {
      setSearchTerm(q)
      if (q.trim().length < 1) {
        setSearchResults([])
        return
      }
      const activeCat = catalogoIndexado.length > 0 ? catalogoIndexado : getCatalogoOcrSync() ?? []
      if (activeCat.length > 0) {
        const locales: ProductoBusqueda[] = buscarEnCatalogoLocal(q, activeCat, 15).map((item) => ({
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
      const catItem = catalogoIndexado.find((c) => c.id === prod.id)
      if (selectedTarget) {
        actualizarRenglon(selectedTarget.hojaId, selectedTarget.renglonId, (r) => ({
          ...r,
          producto_id: prod.id,
          sku_match: prod.sku_base,
          descripcion: prod.descripcion ?? prod.nombre ?? '',
          familia: catItem?.familia ?? r.familia ?? null,
          match_score: 1.0,
          metodo_match: 'MANUAL',
          es_propuesta: false,
          propuesta_producto_id: null,
          propuesta_sku: null,
          propuesta_descripcion: null,
          propuesta_familia: null,
          modificado_manualmente: true,
        }))
        toast.success(`Vinculado a ${prod.sku_base}`)
      } else if (hojasRef.current[0]) {
        const target = hojasRef.current[0]
        const nuevo: RenglonConteoFisico = {
          id: `manual_${Date.now()}`,
          numero_hoja: target.numero_hoja,
          columna: 1,
          renglon: target.renglones.length + 1,
          estilo_raw: prod.sku_base,
          sku_candidato: prod.sku_base,
          cajas_raw: '1',
          cajas: 1,
          confianza: 1,
          producto_id: prod.id,
          sku_match: prod.sku_base,
          descripcion: prod.descripcion ?? prod.nombre ?? '',
          familia: catItem?.familia ?? null,
          match_score: 1,
          metodo_match: 'MANUAL',
          modificado_manualmente: true,
        }
        const next = hojasRef.current.map((h, idx) =>
          idx === 0
            ? { ...h, renglones: [...h.renglones, nuevo], resumen: recalcularResumenHoja([...h.renglones, nuevo]) }
            : h
        )
        guardarBorrador(next)
        toast.success(`Se agregó ${prod.sku_base}`)
      }
      setSearchTerm('')
      setSearchResults([])
    },
    [actualizarRenglon, catalogoIndexado, guardarBorrador, selectedTarget]
  )

  const handleOpenSearchForRow = useCallback(
    (hojaId: string, renglonId: string, query: string) => {
      setSelectedTarget({ hojaId, renglonId })
      setActiveFotoHojaId(hojaId)
      setBuscadorFlotanteAbierto(true)
      void handleSearchChange(query)
      setTimeout(() => searchInputRef.current?.focus(), 40)
    },
    [handleSearchChange]
  )

  const handleSelectRow = useCallback(
    (hojaId: string, renglonId: string) => {
      setSelectedTarget({ hojaId, renglonId })
      setActiveFotoHojaId(hojaId)
      if (!buscadorFlotanteAbierto) return
      const hoja = hojasRef.current.find((h) => h.id === hojaId)
      const renglon = hoja?.renglones.find((r) => r.id === renglonId)
      const cadena = (renglon?.sku_candidato || renglon?.estilo_raw || '').trim()
      void handleSearchChange(cadena)
    },
    [buscadorFlotanteAbierto, handleSearchChange]
  )

  const handleToggleBuscadorFlotante = useCallback(() => {
    setBuscadorFlotanteAbierto((prev) => {
      const next = !prev
      if (next) {
        if (selectedTarget) {
          const hoja = hojasRef.current.find((h) => h.id === selectedTarget.hojaId)
          const renglon = hoja?.renglones.find((r) => r.id === selectedTarget.renglonId)
          const cadena = (renglon?.sku_candidato || renglon?.estilo_raw || '').trim()
          if (cadena) void handleSearchChange(cadena)
        }
        setTimeout(() => searchInputRef.current?.focus(), 40)
      }
      return next
    })
  }, [handleSearchChange, selectedTarget])

  // Renglones aplanados y filtros
  const todosLosRenglones = useMemo<RenglonAplanado[]>(() => {
    return hojas.flatMap((h) =>
      (h.renglones || []).map((r) => ({
        ...r,
        hoja_id: h.id,
        hoja_numero: Number(r.numero_hoja || h.numero_hoja || 1),
        hoja_comprobante_url: h.comprobante_url || h.preview_data_url,
      }))
    )
  }, [hojas])

  const handleEnterOnRow = useCallback(
    (hojaId: string, renglonId: string) => {
      const idx = todosLosRenglones.findIndex((r) => r.hoja_id === hojaId && r.id === renglonId)
      const current = idx >= 0 ? todosLosRenglones[idx] : null
      if (current && !current.producto_id && current.es_propuesta && current.propuesta_producto_id) {
        handleAceptarPropuesta(hojaId, renglonId)
      }
      const next =
        todosLosRenglones.find((r, i) => i > idx && !r.producto_id) ??
        todosLosRenglones.find((r, i) => i !== idx && !r.producto_id)
      if (next) {
        setSelectedTarget({ hojaId: next.hoja_id, renglonId: next.id })
        setActiveFotoHojaId(next.hoja_id)
        rowInputRefs.current[`${next.hoja_id}:${next.id}`]?.focus()
      }
    },
    [handleAceptarPropuesta, todosLosRenglones]
  )

  const renglonesBaseFiltroHoja = useMemo(() => {
    if (filtroHoja === 'todas') return todosLosRenglones
    return todosLosRenglones.filter((r) => Number(r.hoja_numero) === Number(filtroHoja))
  }, [todosLosRenglones, filtroHoja])

  const contadoresFiltro = useMemo(() => {
    let sinMatch = 0
    let propuestas = 0
    let confirmados = 0
    let conFormula = 0
    renglonesBaseFiltroHoja.forEach((r) => {
      if (r.producto_id) confirmados++
      else if (r.es_propuesta && r.propuesta_producto_id) propuestas++
      else sinMatch++
      const raw = String(r.cajas_raw || '')
      if (raw.includes('+') || raw.includes('.')) conFormula++
    })
    return { total: renglonesBaseFiltroHoja.length, confirmados, propuestas, sinMatch, conFormula }
  }, [renglonesBaseFiltroHoja])

  const renglonesFiltrados = useMemo(() => {
    return renglonesBaseFiltroHoja.filter((r) => {
      if (filtroEstado === 'propuestas' && (r.producto_id || !r.es_propuesta)) return false
      if (filtroEstado === 'sin_match' && (r.producto_id || r.es_propuesta)) return false
      if (filtroEstado === 'con_formula' && !r.cajas_raw.includes('+') && !r.cajas_raw.includes('.'))
        return false
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase()
        const mSku = (r.sku_match || r.sku_candidato || '').toLowerCase().includes(q)
        const mRaw = (r.estilo_raw || '').toLowerCase().includes(q)
        const mProp = (r.propuesta_sku || '').toLowerCase().includes(q)
        const mDesc = (r.descripcion || r.propuesta_descripcion || '').toLowerCase().includes(q)
        if (!mSku && !mRaw && !mProp && !mDesc) return false
      }
      return true
    })
  }, [renglonesBaseFiltroHoja, filtroEstado, filtroTexto])

  const resumenGlobal = useMemo(() => {
    let totalCajas = 0
    let totalRenglones = 0
    let confirmados = 0
    let propuestas = 0
    let propuestasAltas = 0
    let sinMatch = 0
    hojas.forEach((h) => {
      h.renglones.forEach((r) => {
        totalCajas += r.cajas
        totalRenglones++
        if (r.producto_id) confirmados++
        else if (r.es_propuesta && r.propuesta_producto_id) {
          propuestas++
          if ((r.match_score ?? 0) >= 0.9) propuestasAltas++
        } else sinMatch++
      })
    })
    return { totalCajas, totalRenglones, totalHojas: hojas.length, confirmados, propuestas, propuestasAltas, sinMatch }
  }, [hojas])

  // Buscar y Reemplazar Excel (evaluación bajo demanda por botón Buscar / Enter)
  const setReglaReemplazo = useCallback((next: ReglaReemplazo) => {
    setReglaReemplazoState(next)
    if (!next.buscar.trim()) {
      setPreviewReemplazo(null)
      setPreviewDesactualizado(false)
    } else {
      setPreviewDesactualizado(true)
    }
  }, [])

  const handleBuscarReemplazo = useCallback(
    (reglaOverride?: ReglaReemplazo) => {
      const target = reglaOverride ?? reglaReemplazo
      if (reglaOverride) setReglaReemplazoState(reglaOverride)
      if (!target.buscar.trim()) {
        setPreviewReemplazo(null)
        setPreviewDesactualizado(false)
        return
      }
      const res = previsualizarReemplazo(hojasRef.current, target, catalogoIndexado, filtroHoja)
      setPreviewReemplazo(res)
      setPreviewDesactualizado(false)
    },
    [catalogoIndexado, filtroHoja, reglaReemplazo]
  )

  const sugerenciasReemplazo = useMemo(
    () => (replaceOpen ? detectarSugerenciasReemplazo(hojas, catalogoIndexado) : []),
    [replaceOpen, hojas, catalogoIndexado]
  )

  const handleAplicarReemplazo = useCallback(() => {
    if (!reglaReemplazo.buscar.trim()) return
    const snapshot = hojasRef.current
    const res = aplicarReemplazoMasivo(snapshot, reglaReemplazo, catalogoIndexado, filtroHoja)
    if (res.totalAfectados === 0) {
      toast.info('Ningún renglón coincidió con ese patrón')
      return
    }
    setUndoSnapshot(snapshot)
    setPreviewReemplazo(null)
    setPreviewDesactualizado(false)
    guardarBorrador(res.hojas)
    toast.success(
      `Reemplazo aplicado en ${res.totalAfectados} renglones (+${res.nuevosConfirmados} confirmados, +${res.nuevasPropuestas} propuestas)`
    )
  }, [catalogoIndexado, filtroHoja, guardarBorrador, reglaReemplazo])

  const handleDeshacerReemplazo = useCallback(() => {
    if (!undoSnapshot) return
    guardarBorrador(undoSnapshot)
    setUndoSnapshot(null)
    toast.info('Se deshizo el último reemplazo masivo')
  }, [guardarBorrador, undoSnapshot])

  const activeHojaInfo = useMemo(() => {
    const targetId = activeFotoHojaId || selectedTarget?.hojaId
    return (targetId ? hojas.find((h) => h.id === targetId) : hojas[0]) ?? hojas[0] ?? null
  }, [activeFotoHojaId, hojas, selectedTarget])

  const activeComprobanteUrl = activeHojaInfo?.comprobante_url || activeHojaInfo?.preview_data_url || null

  const selectedIndexDisplay = useMemo(() => {
    if (!selectedTarget) return null
    const found = todosLosRenglones.find(
      (r) => r.hoja_id === selectedTarget.hojaId && r.id === selectedTarget.renglonId
    )
    return found ? `H${found.hoja_numero}-${found.columna === 1 ? 'Izq' : 'Der'} R${found.renglon}` : null
  }, [selectedTarget, todosLosRenglones])

  const consolidadoPorSku = useMemo(() => {
    const map = new Map<
      string,
      { sku: string; producto_id: number | null; descripcion: string | null; familia: string | null; cajas: number; apariciones: number }
    >()
    todosLosRenglones.forEach((r) => {
      const key = (r.sku_match || r.sku_candidato || r.estilo_raw || '').trim().toUpperCase()
      if (!key) return
      const existing = map.get(key)
      if (existing) {
        existing.cajas += r.cajas
        existing.apariciones += 1
      } else {
        map.set(key, {
          sku: key,
          producto_id: r.producto_id || null,
          descripcion: r.descripcion || null,
          familia: r.familia || null,
          cajas: r.cajas,
          apariciones: 1,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.sku.localeCompare(b.sku))
  }, [todosLosRenglones])

  const descargarReporteExcel = useCallback(async () => {
    if (hojasRef.current.length === 0) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'inv-tienda ERP'
      wb.created = new Date()

      const ws1 = wb.addWorksheet('Consolidado SKU')
      ws1.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'SKU / Código', key: 'sku', width: 20 },
        { header: 'Descripción', key: 'descripcion', width: 35 },
        { header: 'Familia', key: 'familia', width: 18 },
        { header: 'Total Cajas Físicas', key: 'cajas', width: 18 },
        { header: 'Apariciones en Libreta', key: 'apariciones', width: 22 },
        { header: 'Estado Catálogo', key: 'estado', width: 18 },
      ]
      consolidadoPorSku.forEach((c, idx) => {
        ws1.addRow({
          idx: idx + 1,
          sku: c.sku,
          descripcion: c.descripcion || 'Sin match',
          familia: c.familia || '—',
          cajas: c.cajas,
          apariciones: c.apariciones,
          estado: c.producto_id ? 'EN CATÁLOGO' : 'NO ENCONTRADO',
        })
      })

      const ws2 = wb.addWorksheet('Detalle de Hojas')
      ws2.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'Hoja', key: 'hoja', width: 12 },
        { header: 'Columna', key: 'columna', width: 14 },
        { header: 'Renglón', key: 'renglon', width: 10 },
        { header: 'Escrito en Hoja (Raw)', key: 'estilo_raw', width: 22 },
        { header: 'SKU Normalizado', key: 'sku_candidato', width: 20 },
        { header: 'Cajas Anotadas', key: 'cajas_raw', width: 16 },
        { header: 'Cajas Calculadas', key: 'cajas', width: 16 },
        { header: 'Confianza IA', key: 'confianza', width: 14 },
        { header: 'SKU Sistema', key: 'sku_match', width: 20 },
        { header: 'Descripción Sistema', key: 'descripcion', width: 35 },
      ]
      todosLosRenglones.forEach((r, idx) => {
        ws2.addRow({
          idx: idx + 1,
          hoja: `Hoja ${r.hoja_numero}`,
          columna: r.columna === 1 ? 'Izquierda' : 'Derecha',
          renglon: r.renglon,
          estilo_raw: r.estilo_raw,
          sku_candidato: r.sku_candidato,
          cajas_raw: r.cajas_raw,
          cajas: r.cajas,
          confianza: `${Math.round(r.confianza * 100)}%`,
          sku_match: r.sku_match || '—',
          descripcion: r.descripcion || '—',
        })
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Conteo_Fisico_Libreta_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte Excel descargado correctamente')
    } catch (err: any) {
      toast.error('Error al generar archivo Excel: ' + err.message)
    }
  }, [consolidadoPorSku, todosLosRenglones])

  const handleContinuarConciliacion = useCallback(() => {
    if (hojasRef.current.length === 0) {
      toast.error('No hay hojas escaneadas para conciliar')
      return
    }
    const bodegaSel = bodegas.find((b) => b.id === bodegaDestinoId)
    const itemsValidos: ImportFilaValida[] = []
    let omitidosSinMatch = 0

    consolidadoPorSku.forEach((c) => {
      if (c.producto_id && c.cajas > 0) {
        itemsValidos.push({
          producto_id: c.producto_id,
          sku: c.sku,
          producto_nombre: c.descripcion || null,
          cajas: c.cajas,
          bodega_id: bodegaDestinoId,
          bodega_nombre: bodegaSel?.nombre || 'Bodega',
        })
      } else {
        omitidosSinMatch++
      }
    })

    if (itemsValidos.length === 0) {
      toast.error('Ningún producto coincide con el catálogo. Asigna los SKUs antes de continuar.')
      return
    }
    if (omitidosSinMatch > 0) {
      toast.warning(
        `Se enviaron ${itemsValidos.length} productos válidos. ${omitidosSinMatch} sin match fueron excluidos.`
      )
    }
    const propuestaDbIds = hojasRef.current.map((h) => h.propuesta_db_id).filter(Boolean) as string[]
    onOpenChange(false)
    onIrAConciliacion(bodegaDestinoId, itemsValidos, propuestaDbIds)
  }, [bodegaDestinoId, bodegas, consolidadoPorSku, onIrAConciliacion, onOpenChange])

  return {
    hojas,
    procesando,
    progresoTexto,
    guardandoNube,
    isSyncingCatalogo,
    isCatalogoReady: catalogoIndexado.length > 0,
    filtroTexto,
    setFiltroTexto,
    filtroHoja,
    setFiltroHoja,
    filtroEstado,
    setFiltroEstado,
    bodegaDestinoId,
    setBodegaDestinoId,
    selectedTarget,
    setSelectedTarget,
    selectedIndexDisplay,
    activeFotoHojaId,
    setActiveFotoHojaId,
    activeHojaInfo,
    activeComprobanteUrl,
    panelLateralAbierto,
    setPanelLateralAbierto,
    buscadorFlotanteAbierto,
    setBuscadorFlotanteAbierto,
    resumenColapsado,
    setResumenColapsado,
    fotoVisorUrl,
    setFotoVisorUrl,
    searchTerm,
    searchResults,
    isSearching,
    replaceOpen,
    setReplaceOpen,
    reglaReemplazo,
    setReglaReemplazo,
    previewReemplazo,
    previewDesactualizado,
    sugerenciasReemplazo,
    canUndoReemplazo: Boolean(undoSnapshot),
    fileInputRef,
    cameraInputRef,
    searchInputRef,
    rowInputRefs,
    contadoresFiltro,
    renglonesFiltrados,
    resumenGlobal,
    limpiarTodo,
    resincronizarCatalogo,
    handleHojasSeleccionadasFromNube,
    handleGuardarBorradorNube,
    procesarArchivos,
    handleCambiarCajas,
    handleCambiarSku,
    handleBlurSku,
    handleEnterOnRow,
    handleAceptarPropuesta,
    handleAceptarPropuestasAltas,
    handleSeleccionarCandidato,
    handleDesvincularProducto,
    handleEliminarRenglon,
    handleAgregarRenglonManual,
    handleSearchChange,
    handleSelectSearchResult,
    handleOpenSearchForRow,
    handleSelectRow,
    handleToggleBuscadorFlotante,
    handleBuscarReemplazo,
    handleAplicarReemplazo,
    handleDeshacerReemplazo,
    descargarReporteExcel,
    handleContinuarConciliacion,
    onResetVisor,
  }
}
