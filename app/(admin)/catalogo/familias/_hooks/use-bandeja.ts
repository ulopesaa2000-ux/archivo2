// app/(admin)/catalogo/familias/_hooks/use-bandeja.ts
'use client'

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { checkSkuExistsAction, createProductAction } from '@/modules/catalogo/actions'
import { fetchProductosPorFamiliaAction } from '@/modules/catalogo/actions/familias'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import { buildInitialProductsMap, type ProductListItem } from './familias-types'

export interface DragTooltipState {
  text: string
  x: number
  y: number
}

interface UseBandejaProps {
  familias: FamiliaResumen[]
  setFamilias: Dispatch<SetStateAction<FamiliaResumen[]>>
  highlightedFamily: string | null
  setIsRightPanelOpen: Dispatch<SetStateAction<boolean>>
}

export function useBandeja({
  familias,
  setFamilias,
  highlightedFamily,
  setIsRightPanelOpen,
}: UseBandejaProps) {
  const [pinnedFamilies, setPinnedFamilies] = useState<string[]>(['F000-000C'])
  const [loadedProducts, setLoadedProducts] = useState<Record<string, ProductListItem[]>>(() =>
    buildInitialProductsMap(familias)
  )
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({})

  // Quick Create Product modal state
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false)
  const [newProductSku, setNewProductSku] = useState('')
  const [newProductNombre, setNewProductNombre] = useState('')
  const [newProductDescripcion, setNewProductDescripcion] = useState('')
  const [newProductFamilia, setNewProductFamilia] = useState('')
  const [newProductPzCaja, setNewProductPzCaja] = useState('1')
  const [newProductPrecio, setNewProductPrecio] = useState('')
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [skuChecking, setSkuChecking] = useState(false)
  const [skuValidationError, setSkuValidationError] = useState<string | null>(null)

  // Drag & Drop state
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null)
  const [dragTooltip, setDragTooltip] = useState<DragTooltipState | null>(null)

  // Product Inspector state
  const [inspectedProduct, setInspectedProduct] = useState<ProductListItem | null>(null)
  const [loadingInspection, setLoadingInspection] = useState(false)
  const [imagenExpandida, setImagenExpandida] = useState(false)

  const loadProductsForFamily = useCallback(
    async (familyCode: string, force = false) => {
      if (!force && loadedProducts[familyCode]) return
      setLoadingProducts((prev) => ({ ...prev, [familyCode]: true }))
      try {
        const res = await fetchProductosPorFamiliaAction(familyCode)
        setLoadedProducts((prev) => ({ ...prev, [familyCode]: res as ProductListItem[] }))
      } catch (err) {
        console.error(`Error cargando productos para ${familyCode}:`, err)
      } finally {
        setLoadingProducts((prev) => ({ ...prev, [familyCode]: false }))
      }
    },
    [loadedProducts]
  )

  const pinFamily = useCallback(
    (familyCode: string) => {
      if (pinnedFamilies.includes(familyCode)) {
        toast.info(`La familia ${familyCode} ya está en tu bandeja de trabajo`)
        return
      }
      setPinnedFamilies((prev) => [...prev, familyCode])
      void loadProductsForFamily(familyCode)
      toast.success(`Familia ${familyCode} agregada a la bandeja de trabajo`)
    },
    [pinnedFamilies, loadProductsForFamily]
  )

  const unpinFamily = useCallback((familyCode: string) => {
    if (familyCode === 'F000-000C') {
      toast.warning('La familia por defecto F000-000C no se puede remover de la bandeja')
      return
    }
    setPinnedFamilies((prev) => prev.filter((f) => f !== familyCode))
  }, [])

  // Product Inspector lookup (mantiene Supabase client fuera de _components/ por Regla 3.7.1)
  const handleInspectProduct = useCallback(
    async (productId: number, skuBase: string, description: string | null) => {
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find((p) => p.id === productId)
        if (found) {
          setInspectedProduct(found)
          setIsRightPanelOpen(true)
          return
        }
      }

      for (const f of familias) {
        const foundSku = f.skus?.find((s) => s.id === productId)
        if (foundSku) {
          const item: ProductListItem = {
            id: productId,
            sku_base: skuBase,
            nombre: null,
            descripcion: description,
            familia: f.familia,
            precio_ec: null,
            pz_en_caja: null,
            activo: foundSku.activo ?? true,
            imagen_principal: foundSku.imagen_principal ?? null,
          }
          setInspectedProduct(item)
          setIsRightPanelOpen(true)
          return
        }
      }

      setLoadingInspection(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: imgData } = await supabase
          .from('producto_imagenes')
          .select('url')
          .eq('producto_id', productId)
          .eq('es_principal', true)
          .maybeSingle()

        setInspectedProduct({
          id: productId,
          sku_base: skuBase,
          nombre: null,
          descripcion: description,
          familia: null,
          precio_ec: null,
          pz_en_caja: null,
          activo: true,
          imagen_principal: imgData?.url ?? null,
        })
      } catch (err) {
        console.error('Error fetching image for inspection:', err)
        setInspectedProduct({
          id: productId,
          sku_base: skuBase,
          nombre: null,
          descripcion: description,
          familia: null,
          precio_ec: null,
          pz_en_caja: null,
          activo: true,
          imagen_principal: null,
        })
      } finally {
        setLoadingInspection(false)
        setIsRightPanelOpen(true)
      }
    },
    [loadedProducts, familias, setIsRightPanelOpen]
  )

  const handleOpenCreateProductModal = useCallback(
    (defaultFamily?: string) => {
      setNewProductSku('')
      setNewProductNombre('')
      setNewProductDescripcion('')
      setNewProductFamilia(defaultFamily || highlightedFamily || 'F000-000C')
      setNewProductPzCaja('1')
      setNewProductPrecio('')
      setSkuValidationError(null)
      setIsCreateProductModalOpen(true)
    },
    [highlightedFamily]
  )

  const handleValidateSku = useCallback(async (sku: string) => {
    const cleanSku = sku.trim().toUpperCase()
    if (!cleanSku) {
      setSkuValidationError(null)
      return
    }
    setSkuChecking(true)
    try {
      const exists = await checkSkuExistsAction(cleanSku)
      if (exists) {
        setSkuValidationError('Este SKU ya existe en el catálogo.')
      } else {
        setSkuValidationError(null)
      }
    } catch {
      setSkuValidationError(null)
    } finally {
      setSkuChecking(false)
    }
  }, [])

  const handleCreateProductSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const cleanSku = newProductSku.trim().toUpperCase()
      if (!cleanSku) {
        toast.warning('Ingresa un SKU base válido')
        return
      }
      if (skuValidationError) {
        toast.error('El SKU ya existe. Elige otro.')
        return
      }

      setIsCreatingProduct(true)
      try {
        const formData = new FormData()
        formData.append('sku_base', cleanSku)
        formData.append('nombre', newProductNombre.trim())
        formData.append('descripcion', newProductDescripcion.trim())
        formData.append('familia', newProductFamilia.trim() || 'F000-000C')
        formData.append('pz_en_caja', newProductPzCaja || '1')
        if (newProductPrecio) {
          formData.append('precio_ec', newProductPrecio)
        }

        const res = await createProductAction(formData)
        if (!res.success || !res.id) {
          toast.error(res.error || 'Error al crear el producto')
          return
        }

        toast.success(`Producto ${cleanSku} creado exitosamente`)
        setIsCreateProductModalOpen(false)

        const targetFam = newProductFamilia.trim() || 'F000-000C'
        const newSkuItem: FamiliaResumenSku = {
          id: res.id,
          sku_base: cleanSku,
          descripcion: newProductDescripcion.trim() || newProductNombre.trim() || null,
          activo: true,
          imagen_principal: null,
        }

        const newListItem: ProductListItem = {
          id: res.id,
          sku_base: cleanSku,
          nombre: newProductNombre.trim() || null,
          descripcion: newProductDescripcion.trim() || null,
          familia: targetFam,
          precio_ec: newProductPrecio ? parseFloat(newProductPrecio) : null,
          pz_en_caja: parseInt(newProductPzCaja, 10) || 1,
          activo: true,
          imagen_principal: null,
        }

        setLoadedProducts((prev) => {
          const list = [...(prev[targetFam] || [])]
          return { ...prev, [targetFam]: [newListItem, ...list] }
        })

        setFamilias((prev) => {
          let famExists = false
          const nextFamilias = prev.map((f) => {
            if (f.familia === targetFam) {
              famExists = true
              return {
                ...f,
                total_productos: f.total_productos + 1,
                skus: [newSkuItem, ...(f.skus || [])],
              }
            }
            return f
          })

          if (!famExists) {
            nextFamilias.push({
              familia: targetFam,
              total_productos: 1,
              es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z](\d+)?$/i.test(targetFam),
              descripcion: newProductDescripcion.trim() || null,
              skus: [newSkuItem],
            })
          }
          return nextFamilias
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear producto'
        toast.error(message)
      } finally {
        setIsCreatingProduct(false)
      }
    },
    [
      newProductSku,
      newProductNombre,
      newProductDescripcion,
      newProductFamilia,
      newProductPzCaja,
      newProductPrecio,
      skuValidationError,
      setFamilias,
    ]
  )

  const handleDragStart = useCallback((e: React.DragEvent, prodId: number, skuBase?: string) => {
    setDraggedProductId(prodId)
    e.dataTransfer.setData('text/plain', prodId.toString())
    e.dataTransfer.effectAllowed = 'move'

    if (skuBase) {
      // Cápsula limpia para que el navegador no capture capas/scroll de fondo al arrastrar
      const ghost = document.createElement('div')
      ghost.className =
        'fixed -top-[9999px] -left-[9999px] pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/50 bg-card text-foreground font-mono text-xs font-bold shadow-md'
      ghost.textContent = skuBase
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 16, 14)
      setTimeout(() => ghost.remove(), 0)

      setDragTooltip({ text: `Mover ${skuBase}`, x: e.clientX + 14, y: e.clientY + 14 })
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedProductId(null)
    setDragTooltip(null)
  }, [])

  const handleGlobalMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggedProductId !== null && dragTooltip) {
        setDragTooltip((prev) => (prev ? { ...prev, x: e.clientX + 14, y: e.clientY + 14 } : null))
      }
    },
    [draggedProductId, dragTooltip]
  )

  return {
    pinnedFamilies,
    setPinnedFamilies,
    loadedProducts,
    setLoadedProducts,
    loadingProducts,
    setLoadingProducts,
    loadProductsForFamily,
    pinFamily,
    unpinFamily,
    // Inspector
    inspectedProduct,
    setInspectedProduct,
    loadingInspection,
    imagenExpandida,
    setImagenExpandida,
    handleInspectProduct,
    // Create product modal
    isCreateProductModalOpen,
    setIsCreateProductModalOpen,
    newProductSku,
    setNewProductSku,
    newProductNombre,
    setNewProductNombre,
    newProductDescripcion,
    setNewProductDescripcion,
    newProductFamilia,
    setNewProductFamilia,
    newProductPzCaja,
    setNewProductPzCaja,
    newProductPrecio,
    setNewProductPrecio,
    isCreatingProduct,
    skuChecking,
    skuValidationError,
    handleOpenCreateProductModal,
    handleValidateSku,
    handleCreateProductSubmit,
    // Drag & Drop
    draggedProductId,
    setDraggedProductId,
    dragTooltip,
    setDragTooltip,
    handleDragStart,
    handleDragEnd,
    handleGlobalMouseMove,
  }
}
