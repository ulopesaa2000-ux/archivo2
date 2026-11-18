// app/(admin)/ordenes-b2b/orden-rapida/_hooks/use-orden-config.ts
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { PersonaRow } from '@/lib/types/tables'
import type { CatalogoColorOrdenRapida, DbProductoData, SkuProbable } from '@/modules/ordenes-b2b/actions'
import { obtenerColoresActivosAction, verificarSkusEnBDAction } from '@/modules/ordenes-b2b/actions'
import { seedColoresPorConfirmar } from '@/lib/orden-rapida-colores'
import type { CatalogColor } from '@/lib/color-match'
import { detectProductAttributesFromText } from '@/modules/catalogo/utils/detector'
import {
  adaptarN8nAWizard,
  aplicarDatosDbAProducto,
  createDebugInfo,
  parseContainerCode,
  resolverParserSelector,
  unwrapN8nResponse,
} from './orden-rapida-n8n'
import type {
  CatalogItemOption,
  ColorPorConfirmar,
  ContainerMock,
  N8nDebugInfo,
  WizardParsedData,
  WizardProducto,
  WizardProductoSnapshot,
  WizardWarning,
  WizardCaja,
} from './orden-rapida-types'

interface UseOrdenConfigProps {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  contenedores: ContainerMock[]
  marcas: CatalogItemOption[]
  generos: CatalogItemOption[]
  edades: CatalogItemOption[]
  tipos_prenda: CatalogItemOption[]
  onHydrateAfterParse: (payload: {
    wizardData: WizardParsedData
    enrichedProductos: WizardProducto[]
    enrichedCajas: WizardCaja[]
  }) => void
  onApplyColorSeed: (catalogo: CatalogoColorOrdenRapida[], colores: ColorPorConfirmar[]) => void
  onApplyDbVerification: (result: {
    allMatched: Set<string>
    probables: SkuProbable[]
    skuN8nMap: Record<string, string>
    productosMap?: Record<string, DbProductoData>
    skuMap?: Record<string, string>
  }) => void
  onCheckingDbSkusChange: (checking: boolean) => void
  onResetParsedChildren: () => void
}

export function useOrdenConfig({
  proveedores,
  clientes,
  contenedores,
  marcas,
  generos,
  edades,
  tipos_prenda,
  onHydrateAfterParse,
  onApplyColorSeed,
  onApplyDbVerification,
  onCheckingDbSkusChange,
  onResetParsedChildren,
}: UseOrdenConfigProps) {
  const [step, setStep] = useState(1)

  const [selectedProveedor, setSelectedProveedor] = useState(() => {
    const p18 = proveedores.find((p) => String(p.id) === '18')
    return p18 ? '18' : proveedores[0] ? String(proveedores[0].id) : ''
  })
  const [selectedCliente, setSelectedCliente] = useState(() => {
    const c27 = clientes.find((c) => String(c.id) === '27')
    return c27 ? '27' : clientes[0] ? String(clientes[0].id) : ''
  })
  const [selectedContenedor, setSelectedContenedor] = useState('new')
  const [newContainerCode, setNewContainerCode] = useState('')
  const [newContainerNumber, setNewContainerNumber] = useState('')

  const [contenedorPopoverOpen, setContenedorPopoverOpen] = useState(false)
  const [contenedorSearch, setContenedorSearch] = useState('')
  const [isSurtidoModalOpen, setIsSurtidoModalOpen] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [parsedData, setParsedData] = useState<WizardParsedData | null>(null)
  const [rawN8nResponse, setRawN8nResponse] = useState<unknown>(null)
  const [debugInfo, setDebugInfo] = useState<N8nDebugInfo | null>(null)
  const [warnings, setWarnings] = useState<WizardWarning[]>([])

  const [selectedParserFormat, setSelectedParserFormat] = useState<string>(() => {
    const p18 = proveedores.find((p) => String(p.id) === '18') || proveedores[0]
    return p18 ? resolverParserSelector(p18.nombre_completo) : 'auto'
  })
  const [isParserGuideOpen, setIsParserGuideOpen] = useState(false)

  const selectedProveedorObj = useMemo(
    () => proveedores.find((p) => String(p.id) === selectedProveedor),
    [proveedores, selectedProveedor]
  )

  const selectedClienteObj = useMemo(
    () => clientes.find((c) => String(c.id) === selectedCliente),
    [clientes, selectedCliente]
  )

  const sortedContenedores = useMemo(
    () =>
      [...contenedores]
        .filter((c) => c.activo !== false)
        .sort((a, b) => {
          const aParsed = parseContainerCode(a.codigo_contenedor)
          const bParsed = parseContainerCode(b.codigo_contenedor)

          if (aParsed.isStandard && bParsed.isStandard) {
            if (bParsed.year !== aParsed.year) {
              return bParsed.year - aParsed.year
            }
            return bParsed.seq - aParsed.seq
          }

          if (aParsed.isStandard && !bParsed.isStandard) return -1
          if (!aParsed.isStandard && bParsed.isStandard) return 1

          return b.codigo_contenedor.localeCompare(a.codigo_contenedor, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        }),
    [contenedores]
  )

  const selectedContenedorObj = useMemo(
    () => sortedContenedores.find((c) => String(c.id) === selectedContenedor),
    [sortedContenedores, selectedContenedor]
  )

  const isContenedorSurtidoLike = useCallback((estado: string | null | undefined) => {
    return estado === 'surtido' || estado === 'completo' || estado === 'cerrado'
  }, [])

  const selectedContenedorEsSurtido = isContenedorSurtidoLike(selectedContenedorObj?.estado)

  const filteredContenedores = useMemo(() => {
    const q = contenedorSearch.trim().toLowerCase()
    if (!q) return sortedContenedores
    return sortedContenedores.filter((c) =>
      `${c.codigo_contenedor} ${c.numero_contenedor ?? ''} ${c.estado ?? ''}`.toLowerCase().includes(q)
    )
  }, [sortedContenedores, contenedorSearch])

  const handleContenedorSelect = useCallback(
    (value: string) => {
      setSelectedContenedor(value)
      setContenedorPopoverOpen(false)
      setContenedorSearch('')
      if (value !== 'new') {
        const picked = sortedContenedores.find((c) => String(c.id) === value)
        if (picked && isContenedorSurtidoLike(picked.estado)) {
          setIsSurtidoModalOpen(true)
        }
      }
    },
    [sortedContenedores, isContenedorSurtidoLike]
  )

  useEffect(() => {
    if (selectedContenedor === 'new' || selectedContenedor === '') return
    const sigueActivo = sortedContenedores.some((c) => String(c.id) === selectedContenedor)
    if (!sigueActivo) {
      setSelectedContenedor('')
      toast.info('El contenedor seleccionado está inactivo: elige uno activo o crea uno nuevo.')
    }
  }, [sortedContenedores, selectedContenedor])

  const handleProveedorChange = useCallback(
    (newProvId: string) => {
      setSelectedProveedor(newProvId)
      const prov = proveedores.find((p) => String(p.id) === newProvId)
      if (prov) {
        setSelectedParserFormat(resolverParserSelector(prov.nombre_completo))
      }
    },
    [proveedores]
  )

  const resetParsedBase = useCallback(() => {
    setParsedData(null)
    setRawN8nResponse(null)
    setDebugInfo(null)
    setWarnings([])
    setProgress(0)
    setProgressMsg('')
    onResetParsedChildren()
  }, [onResetParsedChildren])

  const procesarPackingList = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo Excel primero.')
      return
    }

    const proveedor = proveedores.find((item) => String(item.id) === selectedProveedor)
    const cliente = clientes.find((item) => String(item.id) === selectedCliente)

    if (!proveedor) {
      toast.error('Selecciona proveedor origen.')
      return
    }

    if (!cliente) {
      toast.error('Selecciona cliente B2B destino.')
      return
    }

    setProcessing(true)
    setProgress(10)
    setProgressMsg('Preparando archivo...')

    try {
      const formData = new FormData()
      formData.append('archivo', selectedFile)
      formData.append('proveedor_id', String(proveedor.id))
      formData.append('proveedor', proveedor.nombre_completo ?? 'Auto')
      formData.append('cliente_b2b_id', String(cliente.id))
      formData.append(
        'parser_selector',
        selectedParserFormat === 'auto' ? resolverParserSelector(proveedor.nombre_completo ?? '') : selectedParserFormat
      )
      formData.append('contenedor_id', selectedContenedor === 'new' ? '' : selectedContenedor)
      formData.append('contenedor_codigo', selectedContenedor === 'new' ? newContainerCode.trim() : '')
      formData.append('orden_id', '')
      formData.append('celda_encabezado', '')
      formData.append('columnas_leer', '')
      formData.append('fila_inicio_datos', '')
      formData.append('fila_fin_datos', '')

      setProgress(35)
      setProgressMsg('Enviando a n8n...')

      const response = await fetch('/api/packing/parse', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Error al procesar Packing List.')
      }

      setProgress(70)
      setProgressMsg('Adaptando respuesta de n8n...')

      const payload = unwrapN8nResponse(result.data)
      const nextDebugInfo = createDebugInfo(result.data, payload)
      setRawN8nResponse(payload)
      setDebugInfo(nextDebugInfo)
      const wizardData = adaptarN8nAWizard(payload)

      if (wizardData.productos.length === 0) {
        throw new Error(
          `n8n respondio, pero no se pudieron detectar productos. Productos: ${nextDebugInfo.productosCount}, cajas: ${nextDebugInfo.cajasCount}, detalles: ${nextDebugInfo.detallesCount}.`
        )
      }

      if (wizardData.cajas.length === 0) {
        throw new Error(
          `n8n respondio, pero no se pudieron detectar cajas. Productos: ${nextDebugInfo.productosCount}, cajas: ${nextDebugInfo.cajasCount}, detalles: ${nextDebugInfo.detallesCount}.`
        )
      }

      const uniqueMap = new Map<string, WizardProducto>()
      let duplicatesFound = false

      for (const p of wizardData.productos) {
        const cleanSku = String(p.sku_base || '').trim()
        if (!cleanSku) continue
        const key = cleanSku.toUpperCase()
        if (uniqueMap.has(key)) {
          duplicatesFound = true
          const existing = uniqueMap.get(key)!
          if (!existing.descripcion && p.descripcion) existing.descripcion = p.descripcion
          if (!existing.nombre && p.nombre) existing.nombre = p.nombre
        } else {
          uniqueMap.set(key, { ...p, sku_base: cleanSku })
        }
      }

      const deduplicatedProductos = Array.from(uniqueMap.values())

      if (duplicatesFound) {
        toast.info(
          'Se verificaron los SKUs detectados: las entradas duplicadas fueron unificadas automáticamente para asegurar 1 fila por SKU.'
        )
      }

      const enrichedProductos = deduplicatedProductos.map((p, idx) => {
        const tempId = p.temp_id || `temp_prod_${p.sku_base.toUpperCase()}_${idx}_${Date.now()}`
        const text = `${p.sku_base || ''} ${p.descripcion || p.nombre || ''}`.trim()
        const detected = detectProductAttributesFromText(text, { marcas, generos, edades, tipos_prenda })
        const matchedBrand = marcas.find(
          (m) => (p.marca_id && m.id === p.marca_id) || (p.marca && m.nombre.toUpperCase() === p.marca.toUpperCase())
        )
        const originalSnapshot: WizardProductoSnapshot = {
          sku_base: p.sku_base,
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipo_prenda_id: detected.tipo_prenda_id ?? p.tipo_prenda_id ?? null,
          tipo_prenda: detected.tipo_prenda_nombre ?? p.tipo_prenda ?? '',
          genero_id: detected.genero_id ?? p.genero_id ?? null,
          genero: detected.genero_nombre ?? p.genero ?? '',
          edad_id: detected.edad_id ?? p.edad_id ?? null,
          edad: detected.edad_nombre ?? p.edad ?? '',
          marca_id: matchedBrand ? matchedBrand.id : (detected.marca_id ?? p.marca_id ?? null),
          marca: matchedBrand ? matchedBrand.nombre : (detected.marca_nombre ?? p.marca ?? ''),
          composicion: p.composicion,
          precio_unitario_usd: p.precio_unitario_usd,
        }
        return {
          ...p,
          temp_id: tempId,
          marca_id: originalSnapshot.marca_id,
          marca: originalSnapshot.marca,
          tipo_prenda_id: originalSnapshot.tipo_prenda_id,
          tipo_prenda: originalSnapshot.tipo_prenda,
          genero_id: originalSnapshot.genero_id,
          genero: originalSnapshot.genero,
          edad_id: originalSnapshot.edad_id,
          edad: originalSnapshot.edad,
          packing_original: originalSnapshot,
        }
      })

      const skuToTempIdMap = new Map<string, string>()
      enrichedProductos.forEach((p) => {
        if (p.sku_base && p.temp_id) {
          skuToTempIdMap.set(p.sku_base.trim().toUpperCase(), p.temp_id)
        }
      })

      const enrichedCajas = wizardData.cajas.map((c) => {
        const normSku = (c.sku_base || '').trim().toUpperCase()
        const matchedTempId = normSku ? skuToTempIdMap.get(normSku) : undefined
        return {
          ...c,
          producto_temp_id: matchedTempId || c.producto_temp_id,
        }
      })

      setWarnings(wizardData.warnings)

      void obtenerColoresActivosAction().then((resColores) => {
        const catalogo = resColores.success ? resColores.colores : []
        const seed = seedColoresPorConfirmar(
          wizardData.colores_por_confirmar || [],
          (wizardData.detalles || []) as Array<{ color_raw?: string; codigo_caja_temporal?: string }>,
          catalogo as CatalogColor[]
        )
        onApplyColorSeed(catalogo, seed)
      })

      setParsedData({ ...wizardData, productos: enrichedProductos, cajas: enrichedCajas })
      onHydrateAfterParse({ wizardData, enrichedProductos, enrichedCajas })

      const skusToCheck = enrichedProductos.map((p) => p.sku_base)
      if (skusToCheck.length > 0) {
        onCheckingDbSkusChange(true)
        verificarSkusEnBDAction(skusToCheck, proveedor.nombre_completo, Number(proveedor.id))
          .then((res) => {
            if (res.success && res.skusExistentes) {
              const allMatched = new Set(res.skusExistentes.map((s) => s.toUpperCase()))
              if (res.skuMap) {
                Object.values(res.skuMap).forEach((s) => allMatched.add(s.toUpperCase()))
              }
              const skuN8nMap: Record<string, string> = {}
              for (const p of enrichedProductos) {
                const up = String(p.sku_base || '').trim().toUpperCase()
                if (up && p.sku_raw) skuN8nMap[up] = String(p.sku_raw)
              }
              onApplyDbVerification({
                allMatched,
                probables: res.probables ?? [],
                skuN8nMap,
                productosMap: res.productosMap,
                skuMap: res.skuMap,
              })
            }
          })
          .finally(() => {
            onCheckingDbSkusChange(false)
          })
      }

      setProgress(100)
      setProgressMsg('Archivo procesado correctamente.')
      toast.success('Packing List procesado correctamente.')
    } catch (error) {
      resetParsedBase()
      toast.error(error instanceof Error ? error.message : 'Error desconocido.')
    } finally {
      setProcessing(false)
    }
  }, [
    selectedFile,
    proveedores,
    selectedProveedor,
    clientes,
    selectedCliente,
    selectedParserFormat,
    selectedContenedor,
    newContainerCode,
    marcas,
    generos,
    edades,
    tipos_prenda,
    onHydrateAfterParse,
    onApplyColorSeed,
    onApplyDbVerification,
    onCheckingDbSkusChange,
    resetParsedBase,
  ])

  return {
    step,
    setStep,
    selectedProveedor,
    selectedCliente,
    setSelectedCliente,
    selectedContenedor,
    newContainerCode,
    setNewContainerCode,
    newContainerNumber,
    setNewContainerNumber,
    contenedorPopoverOpen,
    setContenedorPopoverOpen,
    contenedorSearch,
    setContenedorSearch,
    isSurtidoModalOpen,
    setIsSurtidoModalOpen,
    selectedProveedorObj,
    selectedClienteObj,
    sortedContenedores,
    selectedContenedorObj,
    selectedContenedorEsSurtido,
    filteredContenedores,
    handleContenedorSelect,
    selectedFile,
    setSelectedFile,
    fileName,
    setFileName,
    processing,
    progress,
    progressMsg,
    parsedData,
    setParsedData,
    rawN8nResponse,
    debugInfo,
    warnings,
    selectedParserFormat,
    setSelectedParserFormat,
    isParserGuideOpen,
    setIsParserGuideOpen,
    handleProveedorChange,
    procesarPackingList,
    resetParsedBase,
    aplicarDatosDbAProducto,
  }
}
