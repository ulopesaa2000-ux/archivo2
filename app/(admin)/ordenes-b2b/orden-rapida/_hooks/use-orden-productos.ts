// app/(admin)/ordenes-b2b/orden-rapida/_hooks/use-orden-productos.ts
'use client'

import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { PersonaRow } from '@/lib/types/tables'
import {
  buscarSkuEnBDAction,
  obtenerDatosProductosDeBDAction,
  verificarSkusEnBDAction,
  type DbProductoData,
  type SkuProbable,
} from '@/modules/ordenes-b2b/actions'
import { detectProductAttributesFromText, type DetectorCatalogos } from '@/modules/catalogo/utils/detector'
import { aplicarDatosDbAProducto, restaurarDatosPacking } from './orden-rapida-n8n'
import type { CatalogItemOption, WizardCaja, WizardProducto } from './orden-rapida-types'

interface UseOrdenProductosProps {
  proveedores: PersonaRow[]
  selectedProveedor: string
  marcas: CatalogItemOption[]
  generos: CatalogItemOption[]
  edades: CatalogItemOption[]
  tipos_prenda: CatalogItemOption[]
  editableProductos: WizardProducto[]
  setEditableProductos: Dispatch<SetStateAction<WizardProducto[]>>
  setEditableCajas: Dispatch<SetStateAction<WizardCaja[]>>
  setExpandedProducts: Dispatch<SetStateAction<Set<string>>>
}

export function useOrdenProductos({
  proveedores,
  selectedProveedor,
  marcas,
  generos,
  edades,
  tipos_prenda,
  editableProductos,
  setEditableProductos,
  setEditableCajas,
  setExpandedProducts,
}: UseOrdenProductosProps) {
  const [dbSkusSet, setDbSkusSet] = useState<Set<string>>(new Set())
  const [isCheckingDbSkus, setIsCheckingDbSkus] = useState(false)
  const [isSyncingDbProducts, setIsSyncingDbProducts] = useState(false)
  const [probablesDb, setProbablesDb] = useState<SkuProbable[]>([])
  const [vinculosDb, setVinculosDb] = useState<Record<string, { dbId: number; dbSku: string }>>({})
  const [skuN8nPorSku, setSkuN8nPorSku] = useState<Record<string, string>>({})
  const [alertaAmbarOpen, setAlertaAmbarOpen] = useState(false)

  const [deleteProductModal, setDeleteProductModal] = useState<{ open: boolean; index: number; sku: string } | null>(
    null
  )
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newSku, setNewSku] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newMarca, setNewMarca] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  const [buscandoDb, setBuscandoDb] = useState<Set<string>>(new Set())
  const [editandoSku, setEditandoSku] = useState<string | null>(null)

  const probablesSinResolver = useMemo(
    () => probablesDb.filter((p) => !vinculosDb[String(p.inputSku).trim().toUpperCase()]),
    [probablesDb, vinculosDb]
  )

  const detectorCatalogos: DetectorCatalogos = useMemo(
    () => ({ marcas, generos, edades, tipos_prenda }),
    [marcas, generos, edades, tipos_prenda]
  )

  const resetProductosState = useCallback(() => {
    setEditableProductos([])
    setDbSkusSet(new Set())
    setProbablesDb([])
    setVinculosDb({})
    setSkuN8nPorSku({})
    setBuscandoDb(new Set())
    setEditandoSku(null)
  }, [setEditableProductos])

  const applyDbVerification = useCallback(
    ({
      allMatched,
      probables,
      skuN8nMap,
      productosMap,
      skuMap,
    }: {
      allMatched: Set<string>
      probables: SkuProbable[]
      skuN8nMap: Record<string, string>
      productosMap?: Record<string, DbProductoData>
      skuMap?: Record<string, string>
    }) => {
      setDbSkusSet(allMatched)
      setProbablesDb(probables)
      setSkuN8nPorSku((prev) => ({ ...prev, ...skuN8nMap }))
      setVinculosDb((prev) => {
        const validos = new Set([...probables.map((p) => String(p.inputSku).trim().toUpperCase()), ...allMatched])
        const next: Record<string, { dbId: number; dbSku: string }> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (validos.has(k)) next[k] = v
        }
        return next
      })

      if (productosMap && Object.keys(productosMap).length > 0) {
        setEditableProductos((prev) =>
          prev.map((p) => {
            const dbData = productosMap[p.sku_base.toUpperCase()]
            if (dbData && !p.force_new) {
              return aplicarDatosDbAProducto(p, dbData, { marcas, generos, edades, tipos_prenda })
            }
            return p
          })
        )
      } else if (skuMap && Object.keys(skuMap).length > 0) {
        setEditableProductos((prev) =>
          prev.map((p) => {
            const matchedDbSku = skuMap[p.sku_base.toUpperCase()]
            if (matchedDbSku && !p.force_new) {
              return { ...p, es_nuevo: false }
            }
            return p
          })
        )
      }
    },
    [marcas, generos, edades, tipos_prenda, setEditableProductos]
  )

  const handleConfirmDeleteProduct = useCallback(() => {
    if (!deleteProductModal) return
    const { sku, index } = deleteProductModal
    setEditableProductos((prev) => prev.filter((_, i) => i !== index))
    setEditableCajas((prev) => prev.filter((c) => String(c.sku_base || '').trim().toUpperCase() !== sku.toUpperCase()))
    toast.success(`Producto "${sku}" y sus cajas asociadas fueron eliminados de la revisión.`)
    setDeleteProductModal(null)
  }, [deleteProductModal, setEditableProductos, setEditableCajas])

  const handleAddProduct = useCallback(() => {
    const cleanSku = newSku.trim()
    if (!cleanSku) {
      toast.error('El SKU base es obligatorio.')
      return
    }
    const skuUpper = cleanSku.toUpperCase()
    if (editableProductos.some((p) => p.sku_base.toUpperCase() === skuUpper)) {
      toast.error(`El SKU "${cleanSku}" ya existe en la lista.`)
      return
    }

    const newProd: WizardProducto = {
      temp_id: `temp_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sku_base: cleanSku,
      sku_raw: cleanSku,
      nombre: newDesc.trim() || cleanSku,
      descripcion: newDesc.trim(),
      marca: newMarca.trim() || 'General',
      precio_unitario_usd: Number(newPrecio) || 0,
      precio_yuan: 0,
      estado_temporal: 'nuevo_manual',
      es_nuevo: true,
    }

    setEditableProductos((prev) => [...prev, newProd])
    setIsAddProductOpen(false)
    setNewSku('')
    setNewDesc('')
    setNewMarca('')
    setNewPrecio('')

    const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
    void verificarSkusEnBDAction(
      [cleanSku],
      proveedorActual?.nombre_completo,
      proveedorActual ? Number(proveedorActual.id) : null
    ).then((res) => {
      if (res.success && res.skusExistentes.length > 0) {
        setDbSkusSet((prev) => new Set([...Array.from(prev), cleanSku.toUpperCase()]))
        if (res.productosMap && res.productosMap[cleanSku.toUpperCase()]) {
          const dbData = res.productosMap[cleanSku.toUpperCase()]
          setDbSkusSet((prev) => new Set([...Array.from(prev), String(dbData.sku_base).toUpperCase()]))
          setEditableProductos((prev) =>
            prev.map((p) =>
              p.sku_base.toUpperCase() === cleanSku.toUpperCase()
                ? aplicarDatosDbAProducto(p, dbData, { marcas, generos, edades, tipos_prenda })
                : p
            )
          )
        } else if (res.skuMap && res.skuMap[cleanSku.toUpperCase()]) {
          const matchedDbSku = res.skuMap[cleanSku.toUpperCase()]
          setDbSkusSet((prev) => new Set([...Array.from(prev), matchedDbSku.toUpperCase()]))
          setEditableProductos((prev) =>
            prev.map((p) => (p.sku_base.toUpperCase() === cleanSku.toUpperCase() ? { ...p, es_nuevo: false } : p))
          )
        }
      }
      if (res.success && (res.probables ?? []).length > 0) {
        setProbablesDb((prev) => {
          const sin = new Set(prev.map((p) => String(p.inputSku).trim().toUpperCase()))
          const nuevos = (res.probables ?? []).filter((p) => !sin.has(String(p.inputSku).trim().toUpperCase()))
          return [...prev, ...nuevos]
        })
      }
    })

    toast.success(`Producto "${cleanSku}" agregado manualmente.`)
  }, [
    newSku,
    newDesc,
    newMarca,
    newPrecio,
    editableProductos,
    setEditableProductos,
    proveedores,
    selectedProveedor,
    marcas,
    generos,
    edades,
    tipos_prenda,
  ])

  const handleSyncProductsFromDb = useCallback(async () => {
    const skus = editableProductos.map((p) => p.sku_base).filter(Boolean)
    if (skus.length === 0) {
      toast.info('No hay productos en la lista para sincronizar.')
      return
    }

    setIsSyncingDbProducts(true)
    try {
      const selectedProveedorId = selectedProveedor ? Number(selectedProveedor) : null
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)

      // Usa exactamente la misma verificación estricta (100% exacto/normalizado) que al recibir el JSON inicial
      const res = await verificarSkusEnBDAction(skus, proveedorActual?.nombre_completo, selectedProveedorId)

      if (res.success) {
        const nextMatched = new Set<string>(
          (res.skusExistentes || []).map((s) => String(s).trim().toUpperCase())
        )
        if (res.skuMap) {
          Object.values(res.skuMap).forEach((s) => nextMatched.add(String(s).trim().toUpperCase()))
        }
        setDbSkusSet((prev) => new Set([...Array.from(prev), ...Array.from(nextMatched)]))
        setProbablesDb(res.probables ?? [])

        let syncCount = 0
        setEditableProductos((prev) =>
          prev.map((item) => {
            if (item.force_new) return item
            const key = item.sku_base.trim().toUpperCase()
            const dbProd = res.productosMap?.[key]
            if (dbProd) {
              syncCount++
              return aplicarDatosDbAProducto(item, dbProd, { marcas, generos, edades, tipos_prenda })
            }
            return item
          })
        )
        const probCount = (res.probables ?? []).length
        if (syncCount > 0) {
          toast.success(
            probCount > 0
              ? `Se sincronizaron ${syncCount} producto(s) exactos (${probCount} parecido(s) disponibles para revisar).`
              : `Se sincronizaron ${syncCount} producto(s) exactos con la base de datos.`
          )
        } else if (probCount > 0) {
          toast.info(`Sin coincidencias exactas. Hay ${probCount} sugerencia(s) parecida(s) para revisar manualmente.`)
        } else {
          toast.info('Ninguno de los SKUs de la lista tiene coincidencia exacta en la base de datos.')
        }
      } else {
        toast.error('Error al consultar productos de la base de datos')
      }
    } catch {
      toast.error('Error inesperado al sincronizar productos desde BD')
    } finally {
      setIsSyncingDbProducts(false)
    }
  }, [editableProductos, selectedProveedor, proveedores, setEditableProductos, marcas, generos, edades, tipos_prenda])

  const handleAutoDetectProduct = useCallback(
    (index: number) => {
      const prod = editableProductos[index]
      if (!prod) return
      const text = `${prod.sku_base || ''} ${prod.descripcion || prod.nombre || ''}`.trim()
      if (!text) {
        toast.info('Ingresa una descripción o SKU para autodetectar atributos.')
        return
      }

      const detected = detectProductAttributesFromText(text, detectorCatalogos)
      if (detected.detectedCount === 0) {
        toast.info('No se detectaron coincidencias en el texto (Prenda, Género o Marca).')
        return
      }

      setEditableProductos((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item
          return {
            ...item,
            ...(detected.tipo_prenda_id
              ? { tipo_prenda_id: detected.tipo_prenda_id, tipo_prenda: detected.tipo_prenda_nombre }
              : {}),
            ...(detected.genero_id ? { genero_id: detected.genero_id, genero: detected.genero_nombre } : {}),
            ...(detected.edad_id ? { edad_id: detected.edad_id, edad: detected.edad_nombre } : {}),
            ...(detected.marca_id ? { marca_id: detected.marca_id, marca: detected.marca_nombre } : {}),
          }
        })
      )

      const parts: string[] = []
      if (detected.tipo_prenda_nombre) parts.push(`Prenda: ${detected.tipo_prenda_nombre}`)
      if (detected.genero_nombre) parts.push(`Género: ${detected.genero_nombre}`)
      if (detected.marca_nombre) parts.push(`Marca: ${detected.marca_nombre}`)
      toast.success(`Atributos detectados (${detected.detectedCount}): ${parts.join(', ')}`)
    },
    [editableProductos, detectorCatalogos, setEditableProductos]
  )

  const handleAutoDetectAllProducts = useCallback(() => {
    let updatedCount = 0
    setEditableProductos((prev) =>
      prev.map((item) => {
        const text = `${item.sku_base || ''} ${item.descripcion || item.nombre || ''}`.trim()
        if (!text) return item
        const detected = detectProductAttributesFromText(text, detectorCatalogos)
        if (detected.detectedCount > 0) {
          updatedCount++
          return {
            ...item,
            ...(detected.tipo_prenda_id
              ? { tipo_prenda_id: detected.tipo_prenda_id, tipo_prenda: detected.tipo_prenda_nombre }
              : {}),
            ...(detected.genero_id ? { genero_id: detected.genero_id, genero: detected.genero_nombre } : {}),
            ...(detected.edad_id ? { edad_id: detected.edad_id, edad: detected.edad_nombre } : {}),
            ...(detected.marca_id ? { marca_id: detected.marca_id, marca: detected.marca_nombre } : {}),
          }
        }
        return item
      })
    )
    if (updatedCount > 0) {
      toast.success(`Atributos detectados y actualizados en ${updatedCount} producto${updatedCount > 1 ? 's' : ''}`)
    } else {
      toast.info('No se detectaron nuevos atributos en las descripciones de la lista.')
    }
  }, [detectorCatalogos, setEditableProductos])

  const handleSincronizarProbable = useCallback(
    async (prob: SkuProbable) => {
      const up = String(prob.inputSku).trim().toUpperCase()
      const dbSkuUp = String(prob.dbSku).trim().toUpperCase()

      let dbData = prob.dbData
      if (!dbData) {
        try {
          const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
          const res = await buscarSkuEnBDAction(
            prob.dbSku,
            proveedorActual?.nombre_completo,
            proveedorActual ? Number(proveedorActual.id) : null
          )
          if (res.success && res.exacto) {
            dbData = res.exacto
          }
        } catch {
          // Si falla la consulta, al menos vinculamos el SKU
        }
      }

      const linkEntry = { dbId: prob.dbId, dbSku: prob.dbSku }
      setVinculosDb((prev) => ({
        ...prev,
        [up]: linkEntry,
        [dbSkuUp]: linkEntry,
      }))

      const matchedTempIds = new Set<string>()
      setEditableProductos((prev) =>
        prev.map((p) => {
          const pSkuUp = String(p.sku_base || '').trim().toUpperCase()
          const pOrigUp = String(p.packing_original?.sku_base || '').trim().toUpperCase()
          if (pSkuUp === up || pSkuUp === dbSkuUp || pOrigUp === up) {
            if (p.temp_id) matchedTempIds.add(p.temp_id)
            if (dbData) {
              return aplicarDatosDbAProducto(p, dbData, { marcas, generos, edades, tipos_prenda })
            }
            return { ...p, sku_base: prob.dbSku, es_nuevo: false, force_new: false }
          }
          return p
        })
      )
      setEditableCajas((prev) =>
        prev.map((c) => {
          const cSku = String(c.sku_base || '').trim().toUpperCase()
          if (cSku === up || (c.producto_temp_id && matchedTempIds.has(c.producto_temp_id))) {
            return { ...c, sku_base: prob.dbSku }
          }
          return c
        })
      )
      toast.success(`"${prob.inputSku}" sincronizado con ${prob.dbSku}.`)
    },
    [setEditableProductos, setEditableCajas, marcas, generos, edades, tipos_prenda, proveedores, selectedProveedor]
  )

  const handleQuitarVinculo = useCallback(
    (inputSku: string) => {
      const up = String(inputSku).trim().toUpperCase()
      let origSkuRestore: string | null = null
      const matchedTempIds = new Set<string>()

      setVinculosDb((prev) => {
        const next: Record<string, { dbId: number; dbSku: string }> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (k !== up && String(v.dbSku).trim().toUpperCase() !== up) {
            next[k] = v
          }
        }
        return next
      })
      setEditableProductos((prev) =>
        prev.map((p) => {
          if (
            String(p.sku_base || '').trim().toUpperCase() === up ||
            (p.db_sincronizado && String(p.db_sincronizado.sku_base).toUpperCase() === up)
          ) {
            if (p.temp_id) matchedTempIds.add(p.temp_id)
            if (p.packing_original?.sku_base) origSkuRestore = p.packing_original.sku_base
            return restaurarDatosPacking(p)
          }
          return p
        })
      )
      setEditableCajas((prev) =>
        prev.map((c) => {
          const cSku = String(c.sku_base || '').trim().toUpperCase()
          if ((cSku === up || (c.producto_temp_id && matchedTempIds.has(c.producto_temp_id))) && origSkuRestore) {
            return { ...c, sku_base: origSkuRestore }
          }
          return c
        })
      )
      toast.info(`Vínculo de "${inputSku}" removido. Restaurado a nuevo.`)
    },
    [setEditableProductos, setEditableCajas]
  )

  const commitSkuEdit = useCallback(
    (producto: WizardProducto, index: number, newSkuVal: string) => {
      const oldSku = producto.sku_base
      const targetTempId = producto.temp_id
      setEditandoSku(null)
      if (newSkuVal === oldSku) return
      setEditableProductos((prev) =>
        prev.map((item, itemIndex) => (itemIndex === index ? { ...item, sku_base: newSkuVal } : item))
      )
      setEditableCajas((prev) =>
        prev.map((c) => {
          if ((targetTempId && c.producto_temp_id === targetTempId) || (oldSku && c.sku_base === oldSku)) {
            return { ...c, sku_base: newSkuVal, producto_temp_id: targetTempId || c.producto_temp_id }
          }
          return c
        })
      )
      const oldUp = String(oldSku || '').trim().toUpperCase()
      const newUp = String(newSkuVal || '').trim().toUpperCase()
      if (oldUp === newUp || !newUp) return
      setVinculosDb((prev) => {
        if (!(oldUp in prev)) return prev
        const next = { ...prev }
        delete next[oldUp]
        return next
      })
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
      void verificarSkusEnBDAction(
        [newSkuVal],
        proveedorActual?.nombre_completo,
        proveedorActual ? Number(proveedorActual.id) : null
      ).then((res) => {
        if (!res.success) return
        setDbSkusSet((prev) => {
          const next = new Set(prev)
          next.delete(oldUp)
          for (const s of res.skusExistentes) next.add(String(s).toUpperCase())
          if (res.skuMap) Object.values(res.skuMap).forEach((s) => next.add(String(s).toUpperCase()))
          return next
        })
        setProbablesDb((prev) => {
          const sin = new Set([oldUp, newUp])
          const base = prev.filter((p) => !sin.has(String(p.inputSku).trim().toUpperCase()))
          return [...base, ...(res.probables ?? [])]
        })
        if (res.productosMap && res.productosMap[newUp]) {
          const dbProd = res.productosMap[newUp]
          setEditableProductos((prev) =>
            prev.map((item) =>
              item.temp_id === targetTempId || item.sku_base.toUpperCase() === newUp
                ? aplicarDatosDbAProducto(item, dbProd, { marcas, generos, edades, tipos_prenda })
                : item
            )
          )
          toast.success(`"${newSkuVal}" encontrado en BD. Datos vinculados.`)
        } else if (res.skusExistentes.length > 0) {
          toast.success(`"${newSkuVal}" encontrado en BD. Vinculado.`)
        }
      })
    },
    [
      setEditableProductos,
      setEditableCajas,
      proveedores,
      selectedProveedor,
      marcas,
      generos,
      edades,
      tipos_prenda,
    ]
  )

  const handleBuscarSkuEnBD = useCallback(
    async (producto: WizardProducto, index: number) => {
      const rowKey = producto.temp_id || String(producto.sku_base || '').trim().toUpperCase() || `idx-${index}`
      const skuActual = String(producto.sku_base || '').trim()
      if (!skuActual || buscandoDb.has(rowKey)) return
      setBuscandoDb((prev) => new Set(prev).add(rowKey))
      try {
        const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
        const res = await buscarSkuEnBDAction(
          skuActual,
          proveedorActual?.nombre_completo,
          proveedorActual ? Number(proveedorActual.id) : null
        )
        const up = skuActual.toUpperCase()
        if (res.exacto) {
          const ex = res.exacto
          const targetSku = String(ex.sku_base || ex.dbSku || skuActual)
          setDbSkusSet((prev) => new Set([...prev, up, targetSku.toUpperCase()]))
          setProbablesDb((prev) => prev.filter((p) => String(p.inputSku).trim().toUpperCase() !== up))
          setEditableProductos((prev) =>
            prev.map((p) =>
              (p.temp_id || String(p.sku_base || '')) === (producto.temp_id || String(producto.sku_base || ''))
                ? aplicarDatosDbAProducto(p, ex, { marcas, generos, edades, tipos_prenda })
                : p
            )
          )
          toast.success(
            ex.mismaPersona === false
              ? `"${skuActual}" existe en BD como ${ex.dbSku || ex.sku_base} (otro proveedor). Vinculado.`
              : `"${skuActual}" encontrado en BD (${ex.metodo}). Vinculado.`
          )
        } else if (res.probables.length > 0) {
          setProbablesDb((prev) => {
            const base = prev.filter((p) => String(p.inputSku).trim().toUpperCase() !== up)
            const nuevos = res.probables.filter(
              (r) => !base.some((b) => String(b.inputSku).trim().toUpperCase() === up && b.dbId === r.dbId)
            )
            return [...base, ...nuevos]
          })
          toast.info(`"${skuActual}" sin exacto: ${res.probables.length} parecido(s) en BD. Elige uno con Sincronizar.`)
        } else {
          toast.info(
            `Sin coincidencias en BD para "${skuActual}" (motivo: ${res.motivo ?? 'SIN_CANDIDATOS'}). Se guardará como nuevo.`
          )
        }
      } catch {
        toast.error('Error al buscar el SKU en la base de datos.')
      } finally {
        setBuscandoDb((prev) => {
          const next = new Set(prev)
          next.delete(rowKey)
          return next
        })
      }
    },
    [
      buscandoDb,
      proveedores,
      selectedProveedor,
      setEditableProductos,
      marcas,
      generos,
      edades,
      tipos_prenda,
    ]
  )

  return {
    dbSkusSet,
    setDbSkusSet,
    isCheckingDbSkus,
    setIsCheckingDbSkus,
    isSyncingDbProducts,
    probablesDb,
    setProbablesDb,
    vinculosDb,
    skuN8nPorSku,
    alertaAmbarOpen,
    setAlertaAmbarOpen,
    probablesSinResolver,
    deleteProductModal,
    setDeleteProductModal,
    isAddProductOpen,
    setIsAddProductOpen,
    newSku,
    setNewSku,
    newDesc,
    setNewDesc,
    newMarca,
    setNewMarca,
    newPrecio,
    setNewPrecio,
    buscandoDb,
    editandoSku,
    setEditandoSku,
    setExpandedProducts,
    resetProductosState,
    applyDbVerification,
    handleConfirmDeleteProduct,
    handleAddProduct,
    handleSyncProductsFromDb,
    handleAutoDetectProduct,
    handleAutoDetectAllProducts,
    handleSincronizarProbable,
    handleQuitarVinculo,
    commitSkuEdit,
    handleBuscarSkuEnBD,
  }
}
