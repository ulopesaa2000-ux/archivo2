// app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities, @next/next/no-img-element */

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Trash2,
  FolderOpen,
  ArrowRight,
  Pin,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  FolderEdit,
  Loader2,
  HelpCircle,
  FileSpreadsheet,
  GripVertical,
  Package,
  History,
  Save,
  Info,
  ArrowRightLeft,
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'motion/react'
import { fetchProductosPorFamilia, type FamiliaResumen, type FamiliaResumenSku } from '@/modules/catalogo/queries'
import { moverProductosDeFamiliaAction, renombrarFamiliaAction } from '@/modules/catalogo/actions'
import { cn } from '@/lib/utils'

interface ProductListItem {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  precio_ec: number | null
  pz_en_caja: number | null
  activo: boolean | null
  imagen_principal: string | null
}

interface FamiliasOrganizerClientProps {
  initialFamilias: FamiliaResumen[]
  puedeEditar: boolean
}

export function FamiliasOrganizerClient({
  initialFamilias,
  puedeEditar,
}: FamiliasOrganizerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // --- Listados de Familias y buscador ---
  const [familias, setFamilias] = useState<FamiliaResumen[]>(initialFamilias)
  const [searchQuery, setSearchQuery] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  // --- Bandeja de Trabajo (Bandeja Izquierda) ---
  const [pinnedFamilies, setPinnedFamilies] = useState<string[]>(['F000-000C'])
  const [loadedProducts, setLoadedProducts] = useState<Record<string, ProductListItem[]>>({})
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({})

  // --- Selección de productos ---
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, boolean>>({})

  // --- Familia de Destino (Columna Derecha) ---
  const [destFamilyName, setDestFamilyName] = useState<string>('')
  const [destSearchQuery, setDestSearchQuery] = useState('')
  const [isNewFamilyMode, setIsNewFamilyMode] = useState(false)
  const [newFamilyInput, setNewFamilyInput] = useState('')

  // --- Cambios en Borrador (Staged Changes) ---
  // Mapea: productId -> nuevaFamilia
  const [stagedMoves, setStagedMoves] = useState<Record<number, string>>({})
  // Mapea: originalFamilyName -> nuevaFamilia
  const [stagedRenames, setStagedRenames] = useState<Record<string, string>>({})

  // --- Estados de Modales ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  // --- Estados del Rediseño 3 Columnas y Drag & Drop ---
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null)
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({})
  const [leftSearchQuery, setLeftSearchQuery] = useState('')
  const [isCreateIntermediateDialogOpen, setIsCreateIntermediateDialogOpen] = useState(false)
  const [activeDirTab, setActiveDirTab] = useState<'cards' | 'skus'>('skus')

  // --- Estado ocultable de las secciones del sidebar ---
  const [isSinAsignarCollapsed, setIsSinAsignarCollapsed] = useState(false)
  const [isBandejaCollapsed, setIsBandejaCollapsed] = useState(false)

  // --- Tooltip flotante durante Drag ---
  const [dragTooltip, setDragTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  // --- Estados de Inspección ---
  const [inspectedProduct, setInspectedProduct] = useState<ProductListItem | null>(null)
  const [loadingInspection, setLoadingInspection] = useState(false)

  const handleInspectProduct = async (productId: number, skuBase: string, description: string | null) => {
    setLoadingInspection(true)
    
    // 1. Check if the product is already in our loadedProducts cache
    let cachedProduct: ProductListItem | undefined
    for (const prods of Object.values(loadedProducts)) {
      const found = prods.find(p => p.id === productId)
      if (found) {
        cachedProduct = found
        break
      }
    }

    if (cachedProduct) {
      setInspectedProduct(cachedProduct)
      setLoadingInspection(false)
      setIsRightPanelOpen(true)
      return
    }

    // 2. If not, fetch its image from Supabase
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data: imgData } = await supabase
        .from('producto_imagenes')
        .select('url')
        .eq('producto_id', productId)
        .eq('es_principal', true)
        .maybeSingle()

      const newItem: ProductListItem = {
        id: productId,
        sku_base: skuBase,
        nombre: null,
        descripcion: description,
        familia: null,
        precio_ec: null,
        pz_en_caja: null,
        activo: true,
        imagen_principal: imgData?.url ?? null
      }
      
      setInspectedProduct(newItem)
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
        imagen_principal: null
      })
    } finally {
      setLoadingInspection(false)
      setIsRightPanelOpen(true)
    }
  }

  // --- Sugeridor de Familias Intermedias ---
  const [isIntermediateMode, setIsIntermediateMode] = useState(false)
  const [refFamilyName, setRefFamilyName] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])

  const hasPendingChanges = Object.keys(stagedMoves).length > 0 || Object.keys(stagedRenames).length > 0

  // --- Obtener la lista de SKUs netos/virtuales de cada familia (con stagedMoves aplicados) ---
  const getNetSkusForFamilies = (): Record<string, FamiliaResumenSku[]> => {
    const netSkus: Record<string, FamiliaResumenSku[]> = {}

    // 1. Inicializar con los SKUs originales de la base de datos
    familias.forEach(f => {
      const familyKey = f.familia || 'null'
      const originalSkus = f.skus ? [...f.skus] : []
      // Filtrar por activo si mostrarInactivos es false
      netSkus[familyKey] = mostrarInactivos ? originalSkus : originalSkus.filter(s => s.activo !== false)
    })

    // 2. Aplicar los staged moves
    Object.entries(stagedMoves).forEach(([prodIdStr, targetFamily]) => {
      const prodId = parseInt(prodIdStr, 10)
      const targetKey = targetFamily || 'null'

      // Buscar la información del producto
      let foundSku: FamiliaResumenSku | undefined

      // A. Buscar en los skus de las familias originales
      for (const f of familias) {
        const item = f.skus?.find(s => s.id === prodId)
        if (item) {
          foundSku = item
          break
        }
      }

      // B. Si no está ahí, buscar en la caché de productos cargados
      if (!foundSku) {
        for (const prods of Object.values(loadedProducts)) {
          const item = prods.find(p => p.id === prodId)
          if (item) {
            foundSku = {
              id: item.id,
              sku_base: item.sku_base,
              descripcion: item.descripcion || null,
              activo: item.activo
            }
            break
          }
        }
      }

      // C. Si no está en ninguna parte, usar un fallback temporal
      if (!foundSku) {
        foundSku = {
          id: prodId,
          sku_base: `ID #${prodId}`,
          descripcion: null,
          activo: true
        }
      }

      // Quitar el producto de cualquier lista donde esté asignado originalmente
      Object.keys(netSkus).forEach(famKey => {
        netSkus[famKey] = netSkus[famKey].filter(s => s.id !== prodId)
      })

      // Agregar el producto al destino
      if (!netSkus[targetKey]) {
        netSkus[targetKey] = []
      }
      if (foundSku) {
        if (mostrarInactivos || foundSku.activo !== false) {
          if (!netSkus[targetKey].some(s => s.id === prodId)) {
            netSkus[targetKey].push(foundSku)
          }
        }
      }
    })

    return netSkus
  }

  // --- Cargar productos de una familia bajo demanda ---
  async function loadProductsForFamily(familyCode: string, forceReload = false) {
    if (!forceReload && (loadedProducts[familyCode] || loadingProducts[familyCode])) return

    setLoadingProducts(prev => ({ ...prev, [familyCode]: true }))
    try {
      const prods = await fetchProductosPorFamilia(familyCode)
      setLoadedProducts(prev => ({ ...prev, [familyCode]: prods }))
    } catch (err) {
      console.error('Error al cargar productos de familia:', err)
      toast.error(`No se pudieron cargar los productos de la familia ${familyCode}`)
    } finally {
      setLoadingProducts(prev => ({ ...prev, [familyCode]: false }))
    }
  }

  // --- Efecto: Cargar F000-000C por defecto ---
  useEffect(() => {
    loadProductsForFamily('F000-000C', true)
  }, [])

  // --- Efecto: Sincronizar familias iniciales ---
  useEffect(() => {
    setFamilias(initialFamilias)
    loadProductsForFamily('F000-000C', true)
  }, [initialFamilias])

  // --- Efecto: Ajustar layout para ocupar 100% de la pantalla (sin márgenes ni paddings) ---
  useEffect(() => {
    const pageWrapper = document.getElementById('familias-organizer-container')?.parentElement
    const mainWrapper = pageWrapper?.parentElement

    if (pageWrapper) {
      const origClasses = pageWrapper.className
      pageWrapper.classList.remove('p-6', 'max-w-[1600px]', 'mx-auto')
      pageWrapper.classList.add('p-0', 'max-w-none', 'w-full', 'h-full')
      
      let origMainClasses = ''
      if (mainWrapper) {
        origMainClasses = mainWrapper.className
        mainWrapper.classList.remove('overflow-auto')
        mainWrapper.classList.add('overflow-hidden', 'h-full')
      }

      return () => {
        pageWrapper.className = origClasses
        if (mainWrapper && origMainClasses) {
          mainWrapper.className = origMainClasses
        }
      }
    }
  }, [])

  // --- Manejo de Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, productId: number, skuLabel?: string) => {
    setDraggedProductId(productId)
    e.dataTransfer.setData('text/plain', productId.toString())
    e.dataTransfer.effectAllowed = 'move'
    setDragTooltip({ text: skuLabel ? `Moviendo ${skuLabel}...` : 'Moviendo producto...', x: e.clientX + 14, y: e.clientY + 14 })
  }

  const handleDragEnd = () => {
    setDraggedProductId(null)
    setDragTooltip(null)
  }

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (draggedProductId !== null && dragTooltip) {
      setDragTooltip(prev => prev ? { ...prev, x: e.clientX + 14, y: e.clientY + 14 } : null)
    }
  }

  const handleDropOnFamily = (e: React.DragEvent, targetFamily: string) => {
    e.preventDefault()
    // Limpiar clases de hover en el elemento destino
    e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'bg-primary/[0.01]')
    setDraggedProductId(null)
    setDragTooltip(null)

    const prodIdStr = e.dataTransfer.getData('text/plain') || (draggedProductId ? draggedProductId.toString() : '')
    if (!prodIdStr) return

    const prodId = parseInt(prodIdStr, 10)
    
    // Obtener la familia actual del producto
    let originalFamily: string | null = null
    for (const [fam, prods] of Object.entries(loadedProducts)) {
      const found = prods.find(p => p.id === prodId)
      if (found) {
        originalFamily = fam
        break
      }
    }

    const currentFamily = stagedMoves[prodId] !== undefined ? stagedMoves[prodId] : originalFamily
    if (currentFamily === targetFamily) return

    // Registrar movimiento
    setStagedMoves(prev => ({
      ...prev,
      [prodId]: targetFamily
    }))

    // Cargar productos de destino
    loadProductsForFamily(targetFamily)

    // Mover localmente en la caché de productos para feedback inmediato
    let productToMove: ProductListItem | undefined
    for (const prods of Object.values(loadedProducts)) {
      const found = prods.find(p => p.id === prodId)
      if (found) {
        productToMove = found
        break
      }
    }

    if (productToMove) {
      if (loadedProducts[targetFamily]) {
        const alreadyInDest = loadedProducts[targetFamily].some(p => p.id === prodId)
        if (!alreadyInDest) {
          setLoadedProducts(prev => ({
            ...prev,
            [targetFamily]: [...(prev[targetFamily] || []), { ...productToMove!, familia: targetFamily }]
          }))
        }
      }
    }

    // Deseleccionar producto
    setSelectedProductIds(prev => ({ ...prev, [prodId]: false }))
    toast.success(`Producto reubicado localmente a "${targetFamily}"`)
  }

  const handleDropOnBandeja = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
    setDraggedProductId(null)
    setDragTooltip(null)

    const prodIdStr = e.dataTransfer.getData('text/plain') || (draggedProductId ? draggedProductId.toString() : '')
    if (!prodIdStr) return

    const prodId = parseInt(prodIdStr, 10)

    // Verificar si el producto ya existe en loadedProducts
    let foundInLoaded = false
    for (const prods of Object.values(loadedProducts)) {
      if (prods.some(p => p.id === prodId)) {
        foundInLoaded = true
        break
      }
    }

    // Si no está en loadedProducts (ej. viene de un badge en Vista Puro SKU),
    // crear un ProductListItem sintético a partir de familias[].skus[]
    if (!foundInLoaded) {
      let syntheticProduct: ProductListItem | null = null
      for (const f of familias) {
        const sku = f.skus?.find(s => s.id === prodId)
        if (sku) {
          syntheticProduct = {
            id: prodId,
            sku_base: sku.sku_base,
            nombre: null,
            descripcion: sku.descripcion || null,
            familia: f.familia || 'F000-000C',
            precio_ec: null,
            pz_en_caja: null,
            activo: true,
            imagen_principal: null
          }
          break
        }
      }

      if (syntheticProduct) {
        const famKey = syntheticProduct.familia || 'F000-000C'
        setLoadedProducts(prev => ({
          ...prev,
          [famKey]: [...(prev[famKey] || []), syntheticProduct!]
        }))
      }
    }

    setSelectedProductIds(prev => ({
      ...prev,
      [prodId]: true
    }))
    toast.info('Producto agregado a la bandeja de reasignación')
  }

  const handleDropOnInsertionZone = (e: React.DragEvent, prevFamilyCode: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
    setDraggedProductId(null)
    setDragTooltip(null)

    const prodIdStr = e.dataTransfer.getData('text/plain') || (draggedProductId ? draggedProductId.toString() : '')
    if (!prodIdStr) return

    const prodId = parseInt(prodIdStr, 10)
    const suggestion = getIntermediateCodeSuggestion(prevFamilyCode)
    
    setRefFamilyName(prevFamilyCode)
    setNewFamilyInput(suggestion)
    setIsIntermediateMode(true)
    setIsNewFamilyMode(true)
    
    // Seleccionar el producto que se arrastró
    setSelectedProductIds({ [prodId]: true })
    setIsCreateIntermediateDialogOpen(true)
  }

  const handleConfirmCreateIntermediate = () => {
    const code = newFamilyInput.trim()
    if (!code) {
      toast.warning('Ingresa un código para la nueva familia')
      return
    }

    const selectedIds = Object.entries(selectedProductIds)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id, 10))

    if (selectedIds.length === 0) {
      toast.warning('No hay productos seleccionados para mover')
      return
    }

    // Registrar en stagedMoves
    const nextMoves = { ...stagedMoves }
    selectedIds.forEach(id => {
      nextMoves[id] = code
    })
    setStagedMoves(nextMoves)

    // Registrar familia localmente si no existe
    if (!familias.some(f => f.familia === code)) {
      setFamilias(prev => [
        ...prev,
        {
          familia: code,
          total_productos: selectedIds.length,
          es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z]$/i.test(code),
          descripcion: refFamilyName ? (familias.find(f => f.familia === refFamilyName)?.descripcion || '') : '',
          skus: []
        }
      ])
    }

    // Mover productos localmente en la caché
    const movedProductsList: ProductListItem[] = []
    selectedIds.forEach(id => {
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find(p => p.id === id)
        if (found) {
          movedProductsList.push({ ...found, familia: code })
        }
      }
    })
    
    setLoadedProducts(prev => ({
      ...prev,
      [code]: movedProductsList
    }))

    setSelectedProductIds({})
    setIsCreateIntermediateDialogOpen(false)
    setIsNewFamilyMode(false)
    setIsIntermediateMode(false)
    setRefFamilyName('')
    
    // Expandir la nueva familia automáticamente
    setExpandedFamilies(prev => ({ ...prev, [code]: true }))
    toast.success(`Familia "${code}" creada localmente en borrador`)
  }

  const handleToggleExpandFamily = (familyCode: string) => {
    const isExpanded = !expandedFamilies[familyCode]
    if (isExpanded) {
      loadProductsForFamily(familyCode)
    }
    setExpandedFamilies(prev => ({
      ...prev,
      [familyCode]: !prev[familyCode]
    }))
  }

  // --- Pin/Agregar una familia a la bandeja izquierda ---
  const pinFamily = (familyCode: string) => {
    if (pinnedFamilies.includes(familyCode)) {
      toast.info(`La familia ${familyCode} ya está en tu bandeja de trabajo`)
      return
    }
    setPinnedFamilies(prev => [...prev, familyCode])
    loadProductsForFamily(familyCode)
    toast.success(`Familia ${familyCode} agregada a la bandeja de trabajo`)
  }

  // --- Quitar una familia de la bandeja izquierda ---
  const unpinFamily = (familyCode: string) => {
    if (familyCode === 'F000-000C') {
      toast.warning('La familia por defecto F000-000C no se puede remover de la bandeja')
      return
    }
    setPinnedFamilies(prev => prev.filter(f => f !== familyCode))
  }

  // --- Manejar check de producto ---
  const toggleSelectProduct = (productId: number) => {
    setSelectedProductIds(prev => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // --- Seleccionar todos los productos de un grupo visible ---
  const toggleSelectAllInFamily = (familyCode: string, products: ProductListItem[]) => {
    // Solo contar productos que no hayan sido ya movidos en borrador a otra familia
    const visibleProducts = products.filter(p => (stagedMoves[p.id] ?? p.familia) === familyCode)
    const allSelected = visibleProducts.every(p => selectedProductIds[p.id])

    const nextSelection = { ...selectedProductIds }
    visibleProducts.forEach(p => {
      nextSelection[p.id] = !allSelected
    })
    setSelectedProductIds(nextSelection)
  }

  // --- Realizar movimiento temporal (stage) ---
  const handleStageMove = () => {
    const selectedIds = Object.entries(selectedProductIds)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id, 10))

    if (selectedIds.length === 0) {
      toast.warning('Selecciona al menos un producto de la izquierda para mover')
      return
    }

    const targetFamily = isNewFamilyMode ? newFamilyInput.trim() : destFamilyName
    if (!targetFamily) {
      toast.warning('Selecciona o ingresa una familia de destino')
      return
    }

    // Agregar movimientos a stagedMoves
    const nextMoves = { ...stagedMoves }
    selectedIds.forEach(id => {
      nextMoves[id] = targetFamily
    })

    setStagedMoves(nextMoves)
    setSelectedProductIds({}) // Limpiar selección
    toast.success(`${selectedIds.length} producto(s) preparados para mover a "${targetFamily}"`)
  }

  // --- Cancelar un movimiento específico en borrador ---
  const handleCancelStagedMove = (productId: number) => {
    const nextMoves = { ...stagedMoves }
    delete nextMoves[productId]
    setStagedMoves(nextMoves)
    toast.info('Se canceló el movimiento en borrador para el producto')
  }

  // --- Renombrar familia localmente (stage) ---
  const handleStageRename = () => {
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

    setStagedRenames(prev => ({
      ...prev,
      [renameTarget]: newName,
    }))
    setIsRenameModalOpen(false)
    toast.success(`Preparado para renombrar "${renameTarget}" a "${newName}"`)
  }

  // --- Descartar todos los cambios locales ---
  const handleDiscardChanges = () => {
    setStagedMoves({})
    setStagedRenames({})
    setSelectedProductIds({})
    setDestSearchQuery('')
    setDestFamilyName('')
    setFamilias(initialFamilias)
    toast.info('Se descartaron todos los cambios locales')
  }

  // --- Enviar cambios a la Base de Datos ---
  const handleConfirmPersist = () => {
    if (!puedeEditar) {
      toast.error('No tienes permisos de edición en el catálogo')
      return
    }

    startTransition(async () => {
      // 1. Agrupar productos por familia de destino, aplicando renames finales
      const movesByFamily: Record<string, number[]> = {}
      Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
        const prodId = parseInt(prodIdStr, 10)
        const finalDestFamily = getFinalFamilyName(destFamily, autoRenames)
        if (!movesByFamily[finalDestFamily]) {
          movesByFamily[finalDestFamily] = []
        }
        movesByFamily[finalDestFamily].push(prodId)
      })

      try {
        // Ejecutar renombrados (combinando manuales y automáticos de sufijo)
        const allRenames = { ...stagedRenames, ...autoRenames }
        for (const [oldName, newName] of Object.entries(allRenames)) {
          const res = await renombrarFamiliaAction(oldName, newName)
          if (!res.success) {
            throw new Error(`Error al renombrar ${oldName}: ${res.error}`)
          }
        }

        // Ejecutar movimientos de productos
        for (const [destFamily, ids] of Object.entries(movesByFamily)) {
          const res = await moverProductosDeFamiliaAction(ids, destFamily)
          if (!res.success) {
            throw new Error(`Error al mover productos a ${destFamily}: ${res.error}`)
          }
        }

        toast.success('¡Todos los cambios fueron guardados con éxito en la base de datos!')
        setStagedMoves({})
        setStagedRenames({})
        setDestSearchQuery('')
        setDestFamilyName('')
        setIsConfirmModalOpen(false)
        router.refresh()

        // Recargar familias y vaciar cache local
        setLoadedProducts({})
        setPinnedFamilies(['F000-000C'])
        await loadProductsForFamily('F000-000C', true)
      } catch (err: any) {
        console.error('Error al guardar cambios de familias:', err)
        toast.error(err.message || 'Ocurrió un error inesperado al guardar los cambios')
      }
    })
  }

  // --- Filtrado alfabético de familias para el directorio ---
  const filteredFamiliesList = familias.filter(f => {
    const name = (f.familia || 'Sin Clasificar').toLowerCase()
    const description = (f.descripcion || '').toLowerCase()
    
    // Split query into words, filtering out empty strings
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return true
    
    // Check if ALL words are present in either name, description or any SKU in the family
    return words.every(word => 
      name.includes(word) || 
      description.includes(word) || 
      (f.skus && f.skus.some(sku => sku.sku_base.toLowerCase().includes(word)))
    )
  })

  // --- Filtrado alfabético de familias para la de destino ---
  const filteredDestFamiliesList = familias.filter(f => {
    const name = (f.familia || 'Sin Clasificar').toLowerCase()
    const description = (f.descripcion || '').toLowerCase()
    
    // Split query into words, filtering out empty strings
    const words = destSearchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return true
    
    // Check if ALL words are present in either name, description or any SKU in the family
    return words.every(word => 
      name.includes(word) || 
      description.includes(word) ||
      (f.skus && f.skus.some(sku => sku.sku_base.toLowerCase().includes(word)))
    )
  })

  // --- Resolver familia y productos de forma combinada (incluyendo staged changes) ---
  const getVisibleProductsInFamily = (familyCode: string): ProductListItem[] => {
    const originalProds = loadedProducts[familyCode] || []
    return originalProds
      .map(p => {
        // Si el producto se movió localmente a otra familia, reflejarlo
        const currentDest = stagedMoves[p.id]
        return {
          ...p,
          familia: currentDest !== undefined ? currentDest : p.familia,
        }
      })
      .filter(p => {
        const currentFam = p.familia || 'F000-000C'
        if (currentFam !== familyCode) return false
        return mostrarInactivos || p.activo !== false
      })
  }

  // --- Productos que pertenecen a la familia destino actual en el workspace ---
  const getDestinationProducts = (): { original: ProductListItem[]; staged: ProductListItem[] } => {
    const targetFamilyName = isNewFamilyMode ? newFamilyInput.trim() : destFamilyName
    if (!targetFamilyName) return { original: [], staged: [] }

    // 1. Productos originalmente en esta familia (que no se hayan movido en borrador a otra)
    const originalInDest = (loadedProducts[targetFamilyName] || [])
      .filter(p => !stagedMoves[p.id])
      .map(p => ({ ...p, familia: targetFamilyName }))

    // 2. Productos que se han movido en borrador A esta familia desde otras
    const stagedInDest: ProductListItem[] = []
    Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
      if (destFamily === targetFamilyName) {
        const prodId = parseInt(prodIdStr, 10)
        // Buscar el producto en la caché local
        let foundProd: ProductListItem | undefined
        for (const prods of Object.values(loadedProducts)) {
          const found = prods.find(p => p.id === prodId)
          if (found) {
            foundProd = found
            break
          }
        }
        if (foundProd) {
          stagedInDest.push({ ...foundProd, familia: targetFamilyName })
        }
      }
    })

    return {
      original: originalInDest,
      staged: stagedInDest,
    }
  }

  // --- Calcular los conteos de productos post-movimientos ---
  const getNetProductCounts = (): Record<string, number> => {
    const counts: Record<string, number> = {}

    // 1. Inicializar con los conteos originales de la base de datos
    familias.forEach(f => {
      if (f.familia) {
        counts[f.familia] = f.total_productos
      }
    })

    // 2. Aplicar los cambios de los staged moves
    Object.entries(stagedMoves).forEach(([prodIdStr, targetFamily]) => {
      const prodId = parseInt(prodIdStr, 10)

      // Buscar el producto en la caché local para saber su familia original
      let originalFamily: string | null = null
      for (const [fam, prods] of Object.entries(loadedProducts)) {
        const found = prods.find(p => p.id === prodId)
        if (found) {
          originalFamily = fam
          break
        }
      }

      if (originalFamily && originalFamily !== targetFamily) {
        // Decrementar origen
        if (counts[originalFamily] !== undefined) {
          counts[originalFamily] = Math.max(0, counts[originalFamily] - 1)
        }
        // Incrementar destino
        counts[targetFamily] = (counts[targetFamily] || 0) + 1
      }
    })

    return counts
  }

  // --- Determinar renames automáticos de sufijo (A/B) según conteos finales ---
  const getAutoSuffixRenames = (netCounts: Record<string, number>): Record<string, string> => {
    const autoRenames: Record<string, string> = {}
    const regex = /^(F\d{3}-\d{3})([AB])$/i

    Object.entries(netCounts).forEach(([familyCode, finalCount]) => {
      // Si la familia fue renombrada explícitamente, omitir
      if (stagedRenames[familyCode]) return

      const match = familyCode.match(regex)
      if (match) {
        const base = match[1]
        const currentSuffix = match[2].toUpperCase()

        // Regla: B = sola (1 producto), A = agrupada (2 o más)
        let targetSuffix = currentSuffix
        if (finalCount === 1) {
          targetSuffix = 'B'
        } else if (finalCount >= 2) {
          targetSuffix = 'A'
        }

        if (currentSuffix !== targetSuffix) {
          autoRenames[familyCode] = `${base}${targetSuffix}`
        }
      }
    })

    return autoRenames
  }

  // --- Obtener el nombre final de la familia considerando renames manuales y automáticos ---
  const getFinalFamilyName = (familyName: string, autoRenames: Record<string, string>): string => {
    if (stagedRenames[familyName]) {
      return stagedRenames[familyName]
    }
    if (autoRenames[familyName]) {
      return autoRenames[familyName]
    }
    return familyName
  }

  // --- Extraer palabras clave de productos de una familia ---
  const getKeywordsFromFamily = (familyName: string): string[] => {
    const products = loadedProducts[familyName] || []
    if (products.length === 0) return []

    const textParts: string[] = []
    products.forEach(p => {
      if (p.nombre) textParts.push(p.nombre)
      if (p.descripcion) textParts.push(p.descripcion)
    })

    const combinedText = textParts.join(' ').toLowerCase()
    const stopWords = new Set([
      'de', 'con', 'el', 'la', 'para', 'un', 'una', 'y', 'en', 'los', 'las', 'del',
      'al', 'o', 'a', 'sin', 'por', 'como', 'su', 'sus', 'es', 'son', 'se', 'pzs', 'pz'
    ])

    const words = combinedText.split(/[^a-záéíóúüñ0-9]+/i).filter(w => {
      return w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w)
    })

    const freq: Record<string, number> = {}
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1
    })

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word.toUpperCase())
      .slice(0, 10)
  }

  // --- Manejar la selección de familia de referencia ---
  const handleSelectRefFamily = (name: string) => {
    setRefFamilyName(name)
    loadProductsForFamily(name)
  }

  // --- Algoritmo matemático para sugerir código de familia intermedia F###-### ---
  const generateIntermediateCode = (prevCode: string, nextCode?: string): string => {
    const regex = /^F(\d{3})-(\d{3})([A-Z])$/i
    const matchPrev = prevCode.match(regex)
    if (!matchPrev) return prevCode

    const p1 = matchPrev[1]
    const p2Str = matchPrev[2]
    const p2 = parseInt(p2Str, 10)

    // Se determina el sufijo según la cantidad de productos seleccionados para mover:
    // 1 producto -> B, 2 o más -> A
    const selectedCount = Object.values(selectedProductIds).filter(Boolean).length
    const targetSuffix = selectedCount >= 2 ? 'A' : 'B'

    if (nextCode) {
      const matchNext = nextCode.match(regex)
      if (matchNext && matchNext[1] === p1) {
        const n2 = parseInt(matchNext[2], 10)
        const diff = n2 - p2

        let nextVal = p2 + 10
        if (diff >= 100) {
          nextVal = p2 + 10
        } else if (diff >= 10) {
          nextVal = p2 + 1
        } else {
          nextVal = p2 + 1
        }

        const formattedVal = String(nextVal).padStart(3, '0')
        return `F${p1}-${formattedVal}${targetSuffix}`
      }
    }

    let nextVal = p2 + 100
    if (p2 % 100 !== 0) {
      nextVal = p2 + 10
    }
    if (p2 % 10 !== 0) {
      nextVal = p2 + 1
    }

    const formattedVal = String(nextVal).padStart(3, '0')
    return `F${p1}-${formattedVal}${targetSuffix}`
  }

  // --- Obtener el código intermedio sugerido basado en referencia ---
  const getIntermediateCodeSuggestion = (refCode: string): string => {
    const sorted = [...familias].sort((a, b) => {
      const nameA = a.familia || ''
      const nameB = b.familia || ''
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
    })

    const idx = sorted.findIndex(f => f.familia === refCode)
    if (idx === -1) return refCode

    const prefix = refCode.substring(0, 4)
    let nextFamilyCode: string | undefined

    for (let i = idx + 1; i < sorted.length; i++) {
      const fName = sorted[i].familia || ''
      if (fName.startsWith(prefix)) {
        nextFamilyCode = fName
        break
      }
    }

    return generateIntermediateCode(refCode, nextFamilyCode)
  }

  // --- Efecto: Actualizar palabras clave sugeridas de la familia de referencia ---
  useEffect(() => {
    if (refFamilyName) {
      const keywords = getKeywordsFromFamily(refFamilyName)
      setSuggestedKeywords(keywords)
    } else {
      setSuggestedKeywords([])
    }
  }, [refFamilyName, loadedProducts])

  // --- Exportar Familias Agrupadas a Excel con ExcelJS ---
  const handleExportToExcel = async () => {
    const toastId = toast.loading('Generando reporte de Excel...')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // 1. Obtener todas las bodegas activas
      const { data: bodegas, error: bodegasError } = await supabase
        .from('bodegas')
        .select('id, nombre, es_virtual, activa')
        .eq('activa', true)

      if (bodegasError) {
        throw new Error(`Error al obtener bodegas: ${bodegasError.message}`)
      }

      // Separar y ordenar bodegas: normales primero, virtuales al final
      const normalBodegas = (bodegas || [])
        .filter(b => !b.es_virtual)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

      const virtualBodegas = (bodegas || [])
        .filter(b => b.es_virtual)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

      const sortedBodegas = [...normalBodegas, ...virtualBodegas]

      // 2. Formato en blanco (sin consulta a base de datos de inventario)


      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Familias Agrupadas', {
        views: [{ showGridLines: true }]
      })

      // Definir columnas y anchos de columnas
      const columnsList = [
        { header: 'DESCRIPCION', key: 'descripcion', width: 55 },
        { header: 'ESTILO', key: 'estilo', width: 18 },
        { header: 'FAMILIA', key: 'familia', width: 18 },
      ]

      sortedBodegas.forEach(b => {
        columnsList.push({
          header: b.nombre.toUpperCase(),
          key: `b_${b.id}`,
          width: 12
        })
      })

      columnsList.push({
        header: 'GLOBAL',
        key: 'global',
        width: 14
      })

      worksheet.columns = columnsList

      const thinStyle: ExcelJS.BorderStyle = 'thin'
      const mediumStyle: ExcelJS.BorderStyle = 'medium'

      // Estilo para la fila de encabezados (Fila 1)
      const headerRow = worksheet.getRow(1)
      headerRow.height = 90
      headerRow.eachCell((cell, colNumber) => {
        if (colNumber <= 3) {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB4C6E7' }, // Fondo azul acero claro/celeste
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: thinStyle, color: { argb: 'FF8596B0' } },
            left: { style: thinStyle, color: { argb: 'FF8596B0' } },
            bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
            right: { style: thinStyle, color: { argb: 'FF8596B0' } },
          }
        } else if (colNumber === 3 + sortedBodegas.length + 1) {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Rojo suave
          }
          cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: thinStyle, color: { argb: 'FF8596B0' } },
            left: { style: thinStyle, color: { argb: 'FF8596B0' } },
            bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
            right: { style: thinStyle, color: { argb: 'FF8596B0' } },
          }
        } else {
          const b = sortedBodegas[colNumber - 4]
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: b.es_virtual ? 'FFFCE4D6' : 'FFDDEBF7' }, // Durazno si es virtual, azul claro si es normal
          }
          cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: thinStyle, color: { argb: 'FF8596B0' } },
            left: { style: thinStyle, color: { argb: 'FF8596B0' } },
            bottom: { style: mediumStyle, color: { argb: 'FF8596B0' } },
            right: { style: thinStyle, color: { argb: 'FF8596B0' } },
          }
        }
      })

      // Ordenar las familias de forma alfabética
      const sorted = [...familias].sort((a, b) => {
        const nameA = a.familia || ''
        const nameB = b.familia || ''
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
      })

      let currentRow = 2
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        left: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        bottom: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        right: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
      }

      // Función auxiliar local para obtener letras de columna
      function getColumnLetter(colIndex: number): string {
        let temp = colIndex
        let letter = ''
        while (temp > 0) {
          const modulo = (temp - 1) % 26
          letter = String.fromCharCode(65 + modulo) + letter
          temp = Math.floor((temp - modulo) / 26)
        }
        return letter
      }

      sorted.forEach((f) => {
        const name = f.familia || 'Sin Clasificar'
        const desc = f.descripcion || ''
        
        // Filtrar skus en base a mostrarInactivos
        const skusList = (f.skus || []).filter(s => {
          const currentDest = stagedMoves[s.id]
          const isHere = currentDest !== undefined ? currentDest === f.familia : true
          if (!isHere) return false
          return mostrarInactivos || s.activo !== false
        })

        // Agregar los staged moves que pertenecen a esta familia
        Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
          if (destFamily === f.familia) {
            const prodId = parseInt(prodIdStr, 10)
            if (!skusList.some(s => s.id === prodId)) {
              let foundSku: FamiliaResumenSku | undefined
              for (const origFam of familias) {
                const item = origFam.skus?.find(s => s.id === prodId)
                if (item) {
                  foundSku = item
                  break
                }
              }
              if (!foundSku) {
                for (const prods of Object.values(loadedProducts)) {
                  const item = prods.find(p => p.id === prodId)
                  if (item) {
                    foundSku = {
                      id: item.id,
                      sku_base: item.sku_base,
                      descripcion: item.descripcion || null,
                      activo: item.activo
                    }
                    break
                  }
                }
              }
              if (foundSku && (mostrarInactivos || foundSku.activo !== false)) {
                skusList.push(foundSku)
              }
            }
          }
        })

        if (skusList.length > 0) {
          const startMerge = currentRow
          skusList.forEach((sku, idx) => {
            const rowValues: any = {
              descripcion: idx === 0 ? desc : '',
              estilo: sku.sku_base, // SKU limpio
              familia: name,
            }

            // Existencias por bodega inicializadas vacías (en blanco)
            sortedBodegas.forEach(b => {
              rowValues[`b_${b.id}`] = ''
            })

            // Suma global horizontal
            const startColLetter = getColumnLetter(4)
            const endColLetter = getColumnLetter(4 + sortedBodegas.length - 1)
            rowValues['global'] = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` }

            const row = worksheet.addRow(rowValues)
            row.height = 24

            const maxCols = 3 + sortedBodegas.length + 1
            for (let c = 1; c <= maxCols; c++) {
              const cell = row.getCell(c)
              cell.font = { name: 'Calibri', size: 10.5 }
              cell.border = thinBorder
              
              if (c === 1) {
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
              } else if (c === 2) {
                cell.font = { 
                  name: 'Calibri', 
                  size: 10.5, 
                  bold: true,
                  color: { argb: sku.activo === false ? 'FFFF0000' : 'FF000000' } // Rojo si es inactivo
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              } else if (c === 3) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              } else if (c === maxCols) {
                cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFDC2626' } }
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.font = {
                  name: 'Calibri',
                  size: 10.5,
                  bold: false,
                  color: { argb: 'FF000000' }
                }
              }
            }
            currentRow++
          })
          const endMerge = currentRow - 1

          if (endMerge > startMerge) {
            // Combinar celdas de la descripción para el grupo familiar
            worksheet.mergeCells(`A${startMerge}:A${endMerge}`)
            const mergedCell = worksheet.getCell(`A${startMerge}`)
            mergedCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

            // Reaplicar bordes a las celdas combinadas de la columna A
            for (let r = startMerge; r <= endMerge; r++) {
              worksheet.getCell(`A${r}`).border = thinBorder
            }
          }
        }
      })

      // 3. Bloque de Totales al final
      // 1 espacio de fila vacío después del último producto
      currentRow++

      const totalsRowIdx = currentRow
      const namesRowIdx = currentRow + 1

      const totalsRow = worksheet.getRow(totalsRowIdx)
      const namesRow = worksheet.getRow(namesRowIdx)

      totalsRow.height = 24
      namesRow.height = 24

      // Etiquetas en la columna C (FAMILIA)
      const cellTotalesLabel = worksheet.getCell(totalsRowIdx, 3)
      cellTotalesLabel.value = 'TOTALES:'
      cellTotalesLabel.font = { name: 'Calibri', size: 11, bold: true }
      cellTotalesLabel.alignment = { horizontal: 'right', vertical: 'middle' }

      const cellBodegasLabel = worksheet.getCell(namesRowIdx, 3)
      cellBodegasLabel.value = 'BODEGAS:'
      cellBodegasLabel.font = { name: 'Calibri', size: 11, bold: true }
      cellBodegasLabel.alignment = { horizontal: 'right', vertical: 'middle' }

      // Bordes del bloque de etiquetas en A, B, C
      for (let c = 1; c <= 3; c++) {
        worksheet.getCell(totalsRowIdx, c).border = thinBorder
        worksheet.getCell(namesRowIdx, c).border = thinBorder
      }

      // Fórmulas de suma por columna y repetición de nombres de bodega
      sortedBodegas.forEach((b, idx) => {
        const colNumber = 4 + idx
        const colLetter = getColumnLetter(colNumber)

        // Fila de suma (arriba)
        const sumCell = worksheet.getCell(totalsRowIdx, colNumber)
        sumCell.value = { formula: `=SUM(${colLetter}2:${colLetter}${totalsRowIdx - 2})` }
        sumCell.font = { name: 'Calibri', size: 11, bold: true }
        sumCell.alignment = { horizontal: 'center', vertical: 'middle' }
        sumCell.border = thinBorder

        // Fila de nombre (abajo)
        const nameCell = worksheet.getCell(namesRowIdx, colNumber)
        nameCell.value = b.nombre.toUpperCase()
        nameCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } }
        nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        nameCell.border = thinBorder
        nameCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEAEAEA' }
        }
      })

      // Suma global en columna GLOBAL
      const globalColNumber = 4 + sortedBodegas.length
      const globalColLetter = getColumnLetter(globalColNumber)

      const globalSumCell = worksheet.getCell(totalsRowIdx, globalColNumber)
      globalSumCell.value = { formula: `=SUM(${globalColLetter}2:${globalColLetter}${totalsRowIdx - 2})` }
      globalSumCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } }
      globalSumCell.alignment = { horizontal: 'center', vertical: 'middle' }
      globalSumCell.border = thinBorder

      const globalNameCell = worksheet.getCell(namesRowIdx, globalColNumber)
      globalNameCell.value = 'TOTAL'
      globalNameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } }
      globalNameCell.alignment = { horizontal: 'center', vertical: 'middle' }
      globalNameCell.border = thinBorder
      globalNameCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }
      }

      // Generar buffer y desencadenar descarga en el navegador
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Reporte_Familias_Agrupadas_${new Date().toISOString().slice(0, 10)}.xlsx`
      anchor.click()
      window.URL.revokeObjectURL(url)

      toast.success('¡Reporte exportado con éxito!', { id: toastId })
    } catch (err: any) {
      console.error('Error al exportar reporte Excel:', err)
      toast.error(err.message || 'Ocurrió un error al exportar el reporte Excel', { id: toastId })
    }
  }

  const [trayDestFamily, setTrayDestFamily] = useState('')

  // --- Variables calculadas dinámicamente ---
  const netCounts = getNetProductCounts()
  const autoRenames = getAutoSuffixRenames(netCounts)
  const netSkusMap = getNetSkusForFamilies()

  const destProducts = getDestinationProducts()
  const totalDestCount = destProducts.original.length + destProducts.staged.length

  const unassignedProducts = getVisibleProductsInFamily('F000-000C')
  const filteredUnassigned = unassignedProducts.filter(p => {
    const sku = (p.sku_base || '').toLowerCase()
    const name = (p.nombre || '').toLowerCase()
    const desc = (p.descripcion || '').toLowerCase()
    const query = leftSearchQuery.toLowerCase()
    return sku.includes(query) || name.includes(query) || desc.includes(query)
  })

  const selectedProducts = Object.entries(selectedProductIds)
    .filter(([_, isSelected]) => isSelected)
    .map(([id]) => {
      const prodId = parseInt(id, 10)
      for (const prods of Object.values(loadedProducts)) {
        const found = prods.find(p => p.id === prodId)
        if (found) return found
      }
      return null
    })
    .filter(Boolean) as ProductListItem[]

  // 1. Obtener todas las familias con productos o creadas en la BD
  const existingFamilies = familias.filter(f => f.familia && f.familia !== 'F000-000C' && f.familia !== 'null')

  // 2. Detectar familias de destino en stagedMoves que aún no estén en existingFamilies
  const stagedTargets = Array.from(new Set(Object.values(stagedMoves)))
    .filter(dest => dest && dest !== 'F000-000C' && dest !== 'null')

  const combinedFamiliesList: FamiliaResumen[] = [...existingFamilies]
  stagedTargets.forEach(targetName => {
    if (!combinedFamiliesList.some(f => f.familia === targetName)) {
      combinedFamiliesList.push({
        familia: targetName,
        total_productos: 0,
        es_codigo_raw: /^F[0-9]{3}-[0-9]{3}[A-Z]$/i.test(targetName),
        descripcion: 'Nueva familia en borrador',
        skus: []
      })
    }
  })

  // 3. Ordenar alfabéticamente de forma natural
  combinedFamiliesList.sort((a, b) => (a.familia || '').localeCompare(b.familia || '', 'es', { sensitivity: 'base' }))

  const filteredActiveFamiliesList = combinedFamiliesList.filter(f => {
    const name = (f.familia || '').toLowerCase()
    const description = (f.descripcion || '').toLowerCase()
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return true
    
    return words.every(word => 
      name.includes(word) || 
      description.includes(word) ||
      (netSkusMap[f.familia!] && netSkusMap[f.familia!].some(sku => sku.sku_base.toLowerCase().includes(word))) ||
      (f.skus && f.skus.some(sku => sku.sku_base.toLowerCase().includes(word)))
    )
  })

  // Colapsar automáticamente la pestaña de "Sin Asignar" cuando no tenga productos (0 de 0) y haya terminado de cargar
  useEffect(() => {
    const hasLoaded = loadedProducts['F000-000C'] !== undefined
    const isLoading = !!loadingProducts['F000-000C']
    if (hasLoaded && !isLoading && unassignedProducts.length === 0) {
      setIsSinAsignarCollapsed(true)
    }
  }, [unassignedProducts.length, loadingProducts['F000-000C'], loadedProducts['F000-000C']])

  // Bulk move staged changes trigger
  const handleBulkMoveToFamily = (targetFamily: string) => {
    if (selectedProducts.length === 0) {
      toast.warning('No hay productos seleccionados')
      return
    }
    if (!targetFamily) {
      toast.warning('Selecciona una familia de destino')
      return
    }

    const nextMoves = { ...stagedMoves }
    selectedProducts.forEach(p => {
      nextMoves[p.id] = targetFamily
    })
    setStagedMoves(nextMoves)

    // Cargar destino
    loadProductsForFamily(targetFamily)

    // Actualizar cache local para feedback inmediato
    setLoadedProducts(prev => {
      const updatedDest = [...(prev[targetFamily] || [])]
      selectedProducts.forEach(p => {
        if (!updatedDest.some(item => item.id === p.id)) {
          updatedDest.push({ ...p, familia: targetFamily })
        }
      })
      return {
        ...prev,
        [targetFamily]: updatedDest
      }
    })

    setSelectedProductIds({})
    setTrayDestFamily('')
    toast.success(`Se movieron ${selectedProducts.length} producto(s) a "${targetFamily}"`)
  }

  return (
    <div
      id="familias-organizer-container"
      className="relative h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
      onMouseMove={handleGlobalMouseMove}
    >
      {/* ── TOOLTIP FLOTANTE DURANTE DRAG ─────────────────────────────── */}
      {dragTooltip && draggedProductId !== null && (
        <div
          className="fixed pointer-events-none z-[200] flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium select-none"
          style={{ left: dragTooltip.x, top: dragTooltip.y }}
        >
          <GripVertical className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{dragTooltip.text}</span>
        </div>
      )}
      {/* ── BARRA DE ACCIONES SUPERIOR (Sticky Action Bar) ────────────────── */}
      <AnimatePresence>
        {hasPendingChanges && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-amber-500/10 backdrop-blur shadow-sm shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Cambios pendientes en borrador: 
                <span className="ml-2 font-mono text-xs px-2 py-0.5 bg-amber-500/20 rounded-md text-amber-700 dark:text-amber-400">
                  {Object.keys(stagedMoves).length} movimientos, {Object.keys(stagedRenames).length} renombrados
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={handleDiscardChanges}
                className="h-8 border-amber-500/30 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300"
              >
                Restablecer a Original
              </Button>
              <Button
                size="xs"
                onClick={() => setIsConfirmModalOpen(true)}
                className="h-8 bg-amber-600 hover:bg-amber-500 text-white"
              >
                Guardar Cambios
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENEDOR PRINCIPAL EN 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden bg-card text-foreground w-full h-full">
        
        {/* COLUMNA 1: SIDEBAR IZQUIERDO (Bandejas de Entrada y Control) */}
        {/* COLUMNA 1: SIDEBAR IZQUIERDO (Bandejas de Entrada y Control) */}
        <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-card shrink-0 select-none overflow-hidden">
          {/* SECCIÓN 1: SIN ASIGNAR */}
          <div className={cn(
            "flex flex-col min-h-0 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 overflow-hidden",
            isSinAsignarCollapsed ? "shrink-0" : "flex-1"
          )}>
            {/* Header toggle Sin Asignar */}
            <button
              onClick={() => setIsSinAsignarCollapsed(v => !v)}
              className="w-full p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:bg-muted/30 transition-colors select-none shrink-0"
            >
              <div className="flex items-center gap-2">
                {isSinAsignarCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Sin Asignar</span>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {filteredUnassigned.length} de {unassignedProducts.length}
              </Badge>
            </button>

            {!isSinAsignarCollapsed && (
              <>
                {/* Buscador interno local */}
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar sin asignar..."
                      className="pl-7 h-7 text-xs bg-muted/20"
                      value={leftSearchQuery}
                      onChange={(e) => setLeftSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Listado de Productos Sin Asignar */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2">
                  {loadingProducts['F000-000C'] ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Cargando...
                    </div>
                  ) : filteredUnassigned.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">
                      No hay productos sin asignar.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredUnassigned.map((p) => {
                        const isSelected = !!selectedProductIds[p.id]
                        return (
                          <div
                            key={p.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, p.id, p.sku_base)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border bg-card/50 hover:bg-accent/45 hover:border-primary/40 transition-all cursor-grab group relative",
                              isSelected && "border-primary bg-primary/[0.02]"
                            )}
                          >
                            <div 
                              className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                              onClick={() => {
                                setInspectedProduct(p)
                                setIsRightPanelOpen(true)
                              }}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelectProduct(p.id)}
                                  className="h-3.5 w-3.5 shrink-0"
                                />
                              </div>
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>
                              
                              {p.imagen_principal ? (
                                <img
                                  src={p.imagen_principal}
                                  alt={p.sku_base}
                                  className="h-8 w-8 object-cover rounded bg-muted border shrink-0"
                                />
                              ) : (
                                <div className="h-8 w-8 bg-muted border rounded flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                                  NO IMG
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className={cn(
                                  "font-mono text-xs font-bold truncate tracking-wide flex items-center gap-1",
                                  p.activo === false && "text-red-500 dark:text-red-400"
                                )}>
                                  {p.sku_base}
                                  {p.activo === false && <span className="text-[8px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.2 rounded font-sans uppercase shrink-0 font-bold border border-red-200 dark:border-red-900">Inactivo</span>}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate leading-normal">
                                  {p.descripcion ?? 'Sin descripción'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* SECCIÓN 2: BANDEJA DE REASIGNACIÓN (SELECCIONADOS) — Ocultable */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('ring-1', 'ring-primary/40')
              setDragTooltip(prev => prev ? { ...prev, text: 'Soltar en Bandeja de Reasignación' } : null)
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
              handleDropOnBandeja(e)
              if (isBandejaCollapsed) setIsBandejaCollapsed(false)
            }}
            className={cn(
              "flex flex-col min-h-0 bg-muted/5 border-t border-zinc-200 dark:border-zinc-800 transition-all duration-200 overflow-hidden shrink-0",
              isBandejaCollapsed ? "h-auto" : isSinAsignarCollapsed ? "flex-1" : "h-[220px]"
            )}
          >
            {/* Header con toggle */}
            <button
              onClick={() => setIsBandejaCollapsed(v => !v)}
              className="w-full p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:bg-muted/30 transition-colors select-none shrink-0"
            >
              <div className="flex items-center gap-2">
                {isBandejaCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Reasignación</span>
              </div>
              <Badge
                className={cn(
                  "font-mono text-[10px] transition-colors",
                  selectedProducts.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {selectedProducts.length} de {Object.values(selectedProductIds).filter(Boolean).length === 0 ? 0 : selectedProducts.length}
              </Badge>
            </button>

            {/* Contenido colapsable */}
            {!isBandejaCollapsed && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-2">
                  {selectedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[100px] py-4 text-center text-xs text-muted-foreground border border-dashed border-muted-foreground/25 rounded bg-muted/10">
                      <Info className="h-4 w-4 mb-1 text-muted-foreground/40" />
                      <p className="italic">Arrastre productos aquí</p>
                      <p className="text-[10px]">o marque casillas arriba</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedProducts.map((p) => (
                        <div
                          key={p.id}
                          draggable="true"
                          onDragStart={(e) => {
                            handleDragStart(e, p.id, p.sku_base)
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleInspectProduct(p.id, p.sku_base, p.descripcion)}
                          className="flex items-center justify-between p-1.5 px-2 rounded bg-card border border-zinc-200 dark:border-zinc-800 text-[11px] cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors select-none group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="h-3 w-3 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0" />
                            <span className="font-mono font-bold truncate">{p.sku_base}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelectProduct(p.id)
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
                            title="Quitar de bandeja"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-card space-y-2 shrink-0">
                    <div className="flex gap-1">
                      <select
                        className="flex-1 h-8 rounded border border-input bg-background dark:bg-zinc-900 px-2 py-0.5 text-xs outline-none focus:border-ring"
                        value={trayDestFamily}
                        onChange={(e) => setTrayDestFamily(e.target.value)}
                      >
                        <option value="">-- Mover a familia --</option>
                        {familias
                          .filter(f => f.familia && f.familia !== 'F000-000C' && f.familia !== 'null')
                          .map(f => (
                            <option key={f.familia} value={f.familia!}>
                              {f.familia} {f.descripcion ? `- ${f.descripcion.substring(0, 20)}...` : ''}
                            </option>
                          ))}
                      </select>
                      <Button
                        size="xs"
                        onClick={() => handleBulkMoveToFamily(trayDestFamily)}
                        disabled={!trayDestFamily}
                        className="h-8 px-3"
                      >
                        Mover
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* COLUMNA 2: ÁREA CENTRAL (Workspace Mapeador de Familias) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
          {/* Barra de Herramientas Superior del Workspace */}
          <div className="p-3 bg-card border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar familias, productos o SKUs..."
                  className="pl-8 h-8 w-72 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 bg-muted/40 px-2 py-1 rounded-md border text-xs">
                <Checkbox
                  id="mostrar-inactivos"
                  checked={mostrarInactivos}
                  onCheckedChange={(checked) => setMostrarInactivos(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <label
                  htmlFor="mostrar-inactivos"
                  className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none hover:text-foreground"
                >
                  Mostrar inactivos (Andrés Mendoza)
                </label>
              </div>

              {/* Selector de Pestaña de Vista */}
              <div className="flex bg-muted p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setActiveDirTab('cards')}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all font-medium",
                    activeDirTab === 'cards'
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Vista Tarjetas
                </button>
                <button
                  onClick={() => setActiveDirTab('skus')}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all font-medium",
                    activeDirTab === 'skus'
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Vista Puro SKU
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="h-8 border-green-600/30 hover:bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-1.5"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                Exportar Excel
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className="h-8 text-xs flex items-center gap-1 bg-muted/40 hover:bg-muted"
                size="sm"
              >
                <History className="h-4 w-4 text-muted-foreground" />
                <span>Cambios ({Object.keys(stagedMoves).length})</span>
                {isRightPanelOpen ? (
                  <ChevronRight className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Área Principal de Contenido */}
          <div className="flex-1 overflow-hidden">
            {activeDirTab === 'skus' ? (
              /* VISTA DENSE SKU (PURO SKU) */
              <ScrollArea className="h-full p-6">
                {filteredActiveFamiliesList.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground italic">
                    No se encontraron familias activas.
                  </div>
                ) : (
                  <div className="space-y-2 max-w-4xl mx-auto pb-24">
                    {/* Zona de Inserción inicial */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                        const span = e.currentTarget.querySelector('span')
                        if (span) span.classList.remove('opacity-0')
                        setDragTooltip(prev => prev ? { ...prev, text: '+ Crear nueva familia al inicio' } : null)
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                        const span = e.currentTarget.querySelector('span')
                        if (span) span.classList.add('opacity-0')
                      }}
                      onDrop={(e) => {
                        const span = e.currentTarget.querySelector('span')
                        if (span) span.classList.add('opacity-0')
                        handleDropOnInsertionZone(e, filteredActiveFamiliesList[0].familia!)
                      }}
                      className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                    >
                      <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                        <Plus className="h-4 w-4" /> Crear familia al inicio
                      </span>
                    </div>

                    {filteredActiveFamiliesList.map((f, idx) => {
                      const name = f.familia!
                      const isNewDraftFamily = !initialFamilias.some(initF => initF.familia === name)
                      const renombradoLocal = stagedRenames[name] || autoRenames[name]
                      const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name
                      const skus = netSkusMap[name] || []

                      return (
                        <div key={name} className="space-y-2">
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add(isNewDraftFamily ? 'border-amber-500' : 'border-primary', isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.03]')
                              setDragTooltip(prev => prev ? { ...prev, text: `Mover a ${name}` } : null)
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'border-amber-500', 'bg-amber-500/10')
                            }}
                            onDrop={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'border-amber-500', 'bg-amber-500/10')
                              handleDropOnFamily(e, name)
                            }}
                            className={cn(
                              "p-3 rounded-lg border space-y-1 transition-all animate-in fade-in duration-200",
                              isNewDraftFamily
                                ? "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] shadow-xs"
                                : "bg-card border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span className={cn(isNewDraftFamily && "text-amber-800 dark:text-amber-300 font-extrabold")}>
                                  {displayName}
                                </span>
                                {isNewDraftFamily && (
                                  <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-sans font-semibold">
                                    Nueva Familia
                                  </Badge>
                                )}
                                {renombradoLocal && !isNewDraftFamily && (
                                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 font-sans">
                                    {stagedRenames[name] ? 'Manual' : 'Sufijo'}
                                  </Badge>
                                )}
                              </span>
                              <Badge
                                variant={isNewDraftFamily ? "outline" : "secondary"}
                                className={cn(
                                  "font-mono text-[10px] py-0 px-2 shrink-0",
                                  isNewDraftFamily && "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                )}
                              >
                                {skus.length} {isNewDraftFamily ? 'en borrador' : `de ${f.total_productos}`}
                              </Badge>
                            </div>
                            {f.descripcion && (
                              <p className="text-xs text-muted-foreground italic">
                                {f.descripcion}
                              </p>
                            )}
                            {skus.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t mt-1.5 border-dashed border-zinc-200 dark:border-zinc-800">
                                {skus.map(sku => {
                                  const match = searchQuery && searchQuery.split(/\s+/).filter(Boolean).some(w => sku.sku_base.toLowerCase().includes(w.toLowerCase()))
                                  return (
                                    <Badge
                                      key={sku.id}
                                      variant={match ? "default" : "secondary"}
                                      draggable="true"
                                      onDragStart={(e) => handleDragStart(e, sku.id, sku.sku_base)}
                                      onDragEnd={handleDragEnd}
                                      onClick={() => handleInspectProduct(sku.id, sku.sku_base, sku.descripcion)}
                                      className={cn(
                                        "font-mono text-xs py-0.5 px-2 transition-colors border shadow-sm rounded-md tracking-wide cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 duration-75 select-none",
                                        sku.activo === false
                                          ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
                                          : match 
                                            ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-750 dark:border-indigo-400 font-bold" 
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700/60 font-semibold"
                                      )}
                                    >
                                      {sku.sku_base}
                                      {sku.activo === false && " (I)"}
                                    </Badge>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className={cn(
                                "text-center py-4 text-xs italic border border-dashed rounded",
                                isNewDraftFamily
                                  ? "text-amber-700/80 dark:text-amber-300/80 border-amber-500/30 bg-amber-500/5"
                                  : "text-muted-foreground border-zinc-200 dark:border-zinc-800/40 bg-muted/5"
                              )}>
                                Arrastre productos aquí para asignarlos {isNewDraftFamily ? 'a esta nueva familia' : ''}
                              </div>
                            )}
                          </div>

                          {/* Zona de Inserción intermedia después de esta familia */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                              const span = e.currentTarget.querySelector('span')
                              if (span) span.classList.remove('opacity-0')
                              setDragTooltip(prev => prev ? { ...prev, text: `+ Crear familia entre ${name} y siguiente` } : null)
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                              const span = e.currentTarget.querySelector('span')
                              if (span) span.classList.add('opacity-0')
                            }}
                            onDrop={(e) => {
                              const span = e.currentTarget.querySelector('span')
                              if (span) span.classList.add('opacity-0')
                              handleDropOnInsertionZone(e, name)
                            }}
                            className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                          >
                            <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                              <Plus className="h-4 w-4" /> Crear familia aquí
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            ) : (
              /* VISTA TARJETAS INTERACTIVAS (DRAG & DROP) */
              <ScrollArea className="h-full p-6">
                {filteredActiveFamiliesList.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground italic">
                    No se encontraron familias activas.
                  </div>
                ) : (
                  <div className="space-y-2 max-w-4xl mx-auto pb-24">
                    
                    {/* Zona de Inserción inicial */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                      }}
                      onDrop={(e) => handleDropOnInsertionZone(e, filteredActiveFamiliesList[0].familia!)}
                      className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                    >
                      <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                        <Plus className="h-4 w-4" /> Soltar aquí para crear nueva familia intermedia
                      </span>
                    </div>

                    {filteredActiveFamiliesList.map((f, idx) => {
                      const name = f.familia!
                      const isNewDraftFamily = !initialFamilias.some(initF => initF.familia === name)
                      const products = getVisibleProductsInFamily(name)
                      const visibleInGroup = products.filter(p => p.familia === name)
                      const isExpanded = !!expandedFamilies[name]
                      const isLoading = loadingProducts[name]

                      const renombradoLocal = stagedRenames[name] || autoRenames[name]
                      const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name

                      return (
                        <div key={name} className="space-y-2">
                          {/* Tarjeta de la Familia */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add(isNewDraftFamily ? 'border-amber-500' : 'border-primary', isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.01]')
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.01]', 'border-amber-500', 'bg-amber-500/10')
                            }}
                            onDrop={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.01]', 'border-amber-500', 'bg-amber-500/10')
                              handleDropOnFamily(e, name)
                            }}
                            className={cn(
                              "rounded-lg p-4 transition-all shadow-xs family-card flex flex-col border",
                              isNewDraftFamily
                                ? "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] shadow-xs"
                                : "bg-card border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2 select-none">
                              <div
                                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                onClick={() => handleToggleExpandFamily(name)}
                              >
                                <div className="text-muted-foreground hover:text-foreground shrink-0">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                                <h3 className="font-mono font-bold text-sm text-foreground flex items-center gap-2 truncate">
                                  <span className={cn(isNewDraftFamily && "text-amber-800 dark:text-amber-300 font-extrabold")}>
                                    {displayName}
                                  </span>
                                  {isNewDraftFamily && (
                                    <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-sans font-semibold shrink-0">
                                      Nueva Familia
                                    </Badge>
                                  )}
                                </h3>
                                
                                {renombradoLocal && !isNewDraftFamily && (
                                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 shrink-0 font-sans">
                                    {stagedRenames[name] ? 'Manual' : 'Sufijo'}
                                  </Badge>
                                )}
                                
                                <Badge
                                  variant={isNewDraftFamily ? "outline" : "secondary"}
                                  className={cn(
                                    "font-mono text-[10px] py-0 px-2 shrink-0",
                                    isNewDraftFamily && "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                  )}
                                >
                                  {visibleInGroup.length} {isNewDraftFamily ? 'en borrador' : `de ${f.total_productos}`}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {puedeEditar && (
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => {
                                      setRenameTarget(name)
                                      setRenameInput(stagedRenames[name] || name)
                                      setIsRenameModalOpen(true)
                                    }}
                                    title="Renombrar esta familia"
                                    className="h-7 w-7"
                                  >
                                    <FolderEdit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {f.descripcion && (
                              <p className="text-xs text-muted-foreground italic mb-2 pl-6">
                                Descripción genérica: {f.descripcion}
                              </p>
                            )}

                            {/* Grid de productos si está expandida */}
                            {isExpanded && (
                              <div className="mt-2 pl-6 border-l border-zinc-200 dark:border-zinc-800 ml-2">
                                {isLoading ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    Cargando productos...
                                  </div>
                                ) : visibleInGroup.length === 0 ? (
                                  <div className={cn(
                                    "text-xs py-6 text-center border border-dashed rounded drop-target-area",
                                    isNewDraftFamily
                                      ? "text-amber-700/80 dark:text-amber-300/80 border-amber-500/30 bg-amber-500/5"
                                      : "text-muted-foreground bg-muted/10"
                                  )}>
                                    Arrastre productos aquí para asignarlos {isNewDraftFamily ? 'a esta nueva familia' : ''}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {visibleInGroup.map((p) => {
                                      const isSelected = !!selectedProductIds[p.id]
                                      const hasMovePending = stagedMoves[p.id] !== undefined
                                      
                                      return (
                                        <div
                                          key={p.id}
                                          draggable="true"
                                          onDragStart={(e) => handleDragStart(e, p.id)}
                                          onDragEnd={handleDragEnd}
                                          onClick={() => {
                                            setInspectedProduct(p)
                                            setIsRightPanelOpen(true)
                                          }}
                                          className={cn(
                                            "flex items-center gap-2.5 p-2 rounded border border-zinc-200 dark:border-zinc-800/80 bg-card transition-all hover:bg-accent/40 cursor-grab group relative cursor-pointer",
                                            isSelected && "border-primary bg-primary/[0.01]",
                                            hasMovePending && "border-amber-500/30 bg-amber-500/[0.01]"
                                          )}
                                        >
                                          {puedeEditar && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectProduct(p.id)}
                                                className="h-3.5 w-3.5 shrink-0"
                                              />
                                            </div>
                                          )}

                                          <div 
                                            onClick={(e) => e.stopPropagation()}
                                            className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-20 group-hover:opacity-100 transition-opacity"
                                          >
                                            <GripVertical className="h-3 w-3" />
                                          </div>
                                          
                                          {p.imagen_principal ? (
                                            <img
                                              src={p.imagen_principal}
                                              alt={p.sku_base}
                                              className="h-7 w-7 object-cover rounded bg-muted border shrink-0"
                                            />
                                          ) : (
                                            <div className="h-7 w-7 bg-muted border rounded flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                                              NO IMG
                                            </div>
                                          )}

                                          <div className="min-w-0 flex-1">
                                            <div className={cn(
                                              "font-mono text-xs font-bold truncate tracking-wide flex items-center gap-1",
                                              p.activo === false && "text-red-500 dark:text-red-400"
                                            )}>
                                              {p.sku_base}
                                              {p.activo === false && <span className="text-[8px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.2 rounded font-sans uppercase shrink-0 font-bold border border-red-200 dark:border-red-900">Inactivo</span>}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate leading-normal">
                                              {p.descripcion ?? 'Sin descripción'}
                                            </p>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Zona de Inserción intermedia después de esta familia */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                            }}
                            onDrop={(e) => handleDropOnInsertionZone(e, name)}
                            className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                          >
                            <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                              <Plus className="h-4 w-4" /> Soltar aquí para crear nueva familia intermedia
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </main>

        {/* COLUMNA 3: SIDEBAR DERECHO (Panel de Control Ocultable - stagedMoves) */}
        <aside className={cn(
          "border-l border-zinc-200 dark:border-zinc-800 bg-card flex flex-col h-full transition-all duration-300 overflow-hidden shrink-0",
          isRightPanelOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-l-0"
        )}>
          <div className="p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Cambios</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasPendingChanges && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleDiscardChanges}
                  className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 flex items-center gap-1"
                  title="Restablecer todos los cambios locales"
                >
                  <Trash2 className="h-3 w-3" />
                  Restablecer a Original
                </Button>
              )}
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* INSPECTOR DE PRODUCTO SELECCIONADO (Sticky under Header) */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-muted/5 shrink-0">
            <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
              <Package className="h-3 w-3" />
              Producto Seleccionado
            </h4>
            
            {loadingInspection ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground border rounded bg-card">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Cargando detalles...
              </div>
            ) : inspectedProduct ? (
              <div 
                draggable="true"
                onDragStart={(e) => handleDragStart(e, inspectedProduct.id, inspectedProduct.sku_base)}
                onDragEnd={handleDragEnd}
                className="w-full aspect-[4/3] rounded-lg border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all duration-200 bg-zinc-950"
              >
                {/* Imagen de Fondo */}
                {inspectedProduct.imagen_principal ? (
                  <img
                    src={inspectedProduct.imagen_principal}
                    alt={inspectedProduct.sku_base}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Package className="h-10 w-10 opacity-30 animate-pulse" />
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-50">Sin Imagen</span>
                  </div>
                )}

                {/* Gradiente oscuro superior e inferior para mejorar contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />

                {/* Botón de Cerrar (Top Right) */}
                <button
                  onClick={() => setInspectedProduct(null)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-20 backdrop-blur-xs shadow-md border border-white/10"
                  title="Cerrar vista previa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Contenido en Overlay (Top Left) */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start max-w-[85%] z-10 pointer-events-none">
                  {/* Badge de SKU */}
                  <div className="bg-black/75 dark:bg-zinc-950/85 backdrop-blur-xs border border-white/10 rounded px-2.5 py-1 shadow-md">
                    <span className="font-mono text-xs font-bold text-white tracking-wider select-all pointer-events-auto">
                      {inspectedProduct.sku_base}
                    </span>
                  </div>

                  {/* Detalle / Descripción */}
                  {inspectedProduct.descripcion && (
                    <div className="bg-black/75 dark:bg-zinc-950/85 backdrop-blur-xs border border-white/10 rounded p-2.5 shadow-md">
                      <p className="text-[10px] text-white leading-normal font-medium tracking-wide uppercase select-text pointer-events-auto max-h-[80px] overflow-y-auto pr-1">
                        {inspectedProduct.descripcion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Botón de Acción (Bottom Right) */}
                <div className="absolute bottom-3 right-3 z-10">
                  <Button
                    size="xs"
                    className={cn(
                      "h-8 px-4 font-semibold text-xs rounded shadow-md border backdrop-blur-xs transition-all duration-150",
                      selectedProductIds[inspectedProduct.id]
                        ? "bg-amber-600/90 hover:bg-amber-600 text-white border-amber-500/25"
                        : "bg-black/85 hover:bg-black text-white border-zinc-800/80"
                    )}
                    onClick={() => toggleSelectProduct(inspectedProduct.id)}
                  >
                    {selectedProductIds[inspectedProduct.id] ? 'Deseleccionar' : 'Seleccionar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[11px] text-muted-foreground italic border border-dashed rounded border-zinc-200 dark:border-zinc-800 bg-muted/10">
                Haz clic en un SKU para ver su imagen e info
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {/* Cambios de Renombrar */}
              {(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider">
                    Renombrar Familias ({Object.keys(stagedRenames).length + Object.keys(autoRenames).length})
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(stagedRenames).map(([oldName, newName]) => (
                      <div key={oldName} className="flex flex-col gap-1 text-[11px] font-mono bg-muted/25 border p-2 rounded">
                        <span className="text-muted-foreground line-through text-[10px]">{oldName}</span>
                        <div className="flex items-center gap-1 text-foreground font-semibold">
                          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                          <span>{newName}</span>
                        </div>
                      </div>
                    ))}
                    {Object.entries(autoRenames).map(([oldName, newName]) => (
                      <div key={oldName} className="flex flex-col gap-1 text-[11px] font-mono bg-amber-500/[0.02] border border-amber-500/20 p-2 rounded">
                        <span className="text-muted-foreground line-through text-[10px]">{oldName}</span>
                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                          <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>{newName}</span>
                        </div>
                        <span className="text-[9px] text-amber-600 font-sans italic">Auto Sufijo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auditoría de Movimientos */}
              {Object.keys(stagedMoves).length > 0 ? (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider">
                    Auditoría de Movimientos ({Object.keys(stagedMoves).length})
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(stagedMoves).map(([prodIdStr, destFamily]) => {
                      const prodId = parseInt(prodIdStr, 10)
                      const finalDest = getFinalFamilyName(destFamily, autoRenames)

                      // Encontrar nombre SKU
                      let sku = `ID #${prodId}`
                      for (const prods of Object.values(loadedProducts)) {
                        const found = prods.find(p => p.id === prodId)
                        if (found) { sku = found.sku_base; break }
                      }

                      // Encontrar familia de origen
                      let originFamily = 'Sin Clasificar'
                      for (const f of familias) {
                        if (f.skus?.some(s => s.id === prodId)) {
                          originFamily = f.familia === 'F000-000C' ? 'Sin Asignar' : (f.familia || 'Sin Clasificar')
                          break
                        }
                      }

                      return (
                        <div key={prodIdStr} className="bg-card border border-zinc-200 dark:border-zinc-800 rounded p-2.5 text-[11px]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold text-primary tracking-wide">{sku}</span>
                            <button
                              onClick={() => handleCancelStagedMove(prodId)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded hover:bg-destructive/10"
                              title="Cancelar este movimiento"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] border border-muted-foreground/10">{originFamily}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-primary/20">{finalDest}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                !(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
                  <div className="text-center py-12 text-xs text-muted-foreground italic">
                    No hay cambios locales en borrador.
                  </div>
                )
              )}
            </div>
          </ScrollArea>

          {hasPendingChanges && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-muted/20 space-y-2 shrink-0">
              <Button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 h-9 text-xs"
              >
                <Save className="h-4 w-4" />
                Confirmar Cambios
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* ── DIALOG DE CREACIÓN DE FAMILIA INTERMEDIA ───────────────────── */}
      <Dialog open={isCreateIntermediateDialogOpen} onOpenChange={setIsCreateIntermediateDialogOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Crear Nueva Familia Intermedia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground leading-normal">
              Se creará una familia intermedia a partir de la familia de referencia <span className="font-mono font-bold text-foreground">"{refFamilyName}"</span>.
            </p>

            <div className="space-y-2 p-3 bg-muted/20 border border-dashed rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Código sugerido:</span>
                <button
                  type="button"
                  onClick={() => setNewFamilyInput(getIntermediateCodeSuggestion(refFamilyName))}
                  className="font-mono font-bold text-primary hover:underline text-xs"
                  title="Restablecer código sugerido"
                >
                  {getIntermediateCodeSuggestion(refFamilyName)}
                </button>
              </div>

              {suggestedKeywords.length > 0 && (
                <div className="space-y-1 border-t pt-2 mt-2">
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Palabras clave de la familia anterior:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pt-1">
                    {suggestedKeywords.map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => {
                          const current = newFamilyInput.trim()
                          if (!current.includes(kw)) {
                            setNewFamilyInput(current ? `${current} ${kw}` : kw)
                          }
                        }}
                        className="text-[9px] bg-primary/5 hover:bg-primary/20 border border-primary/20 text-primary rounded px-1.5 py-0.5 font-medium transition-colors"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nombre / Código de la familia:</label>
              <Input
                placeholder="Ej. F324-005A o Abrigos Premium"
                value={newFamilyInput}
                onChange={(e) => setNewFamilyInput(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateIntermediateDialogOpen(false)
                setSelectedProductIds({})
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCreateIntermediate}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Crear y Reubicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIRMACIÓN DE CAMBIOS (Dialog) ──────────────────── */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Confirmar Reacomodo de Familias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-normal">
              Se realizarán los siguientes cambios en la base de datos de Supabase. Por favor, revísalos con cuidado antes de confirmar:
            </p>

            <ScrollArea className="max-h-[300px] border rounded-lg p-3 bg-muted/20">
              <div className="space-y-4 text-xs">
                {/* Mostrar renombrados */}
                {(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                      Renombrar Familias ({Object.keys(stagedRenames).length + Object.keys(autoRenames).length})
                    </h4>
                    <div className="space-y-1">
                      {/* Explícitos */}
                      {Object.entries(stagedRenames).map(([oldName, newName]) => (
                        <div key={oldName} className="flex items-center gap-2 text-xs font-mono bg-card border p-2 rounded">
                          <span className="text-muted-foreground line-through">{oldName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-foreground font-semibold">{newName}</span>
                          <Badge variant="outline" className="ml-auto text-[9px]">Manual</Badge>
                        </div>
                      ))}
                      {/* Automáticos */}
                      {Object.entries(autoRenames).map(([oldName, newName]) => (
                        <div key={oldName} className="flex items-center gap-2 text-xs font-mono bg-card border p-2 rounded border-amber-500/20 bg-amber-500/[0.02]">
                          <span className="text-muted-foreground line-through">{oldName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">{newName}</span>
                          <Badge variant="outline" className="ml-auto text-[9px] border-amber-500/30 text-amber-600 font-sans">Auto Sufijo</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mostrar movimientos de productos */}
                {Object.keys(stagedMoves).length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                      Reubicar Productos ({Object.keys(stagedMoves).length})
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(
                        Object.entries(stagedMoves).reduce((acc, [prodIdStr, destFamily]) => {
                          const finalDest = getFinalFamilyName(destFamily, autoRenames)
                          if (!acc[finalDest]) acc[finalDest] = []
                          const prodId = parseInt(prodIdStr, 10)
                          let sku = `ID #${prodId}`
                          for (const prods of Object.values(loadedProducts)) {
                            const found = prods.find(p => p.id === prodId)
                            if (found) {
                              sku = found.sku_base
                              break
                            }
                          }
                          acc[finalDest].push(sku)
                          return acc
                        }, {} as Record<string, string[]>)
                      ).map(([destFamily, skus]) => (
                        <div key={destFamily} className="bg-card border p-2 rounded text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5 border-b pb-1 mb-1">
                            <span>Destino:</span>
                            <Badge variant="outline" className="font-mono bg-primary/5 text-primary text-[10px] px-1.5">
                              {destFamily}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                            {skus.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isPending}
            >
              Cancelar y Seguir Editando
            </Button>
            <Button
              onClick={handleConfirmPersist}
              disabled={isPending}
              className="bg-primary text-primary-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando en BD...
                </>
              ) : (
                'Confirmar y Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL PARA RENOMBRAR FAMILIA ──────────────────────────────── */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Renombrar Familia de Productos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 text-sm">
            <p className="text-muted-foreground leading-normal">
              Estás renombrando la familia <span className="font-mono font-bold text-foreground">"{renameTarget}"</span>. 
              Esto afectará localmente a todos los productos agrupados bajo este código en la bandeja de trabajo.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nuevo nombre de la familia:</label>
              <Input
                placeholder="Ej. Jeans Caballero Slim Fit"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenameModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleStageRename}
              className="bg-primary text-primary-foreground"
            >
              Renombrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
