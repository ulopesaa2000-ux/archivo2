// app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react/no-unescaped-entities, @next/next/no-img-element */

import { useState, useEffect, useTransition, useRef } from 'react'
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
  Printer,
  GripVertical,
  Package,
  History,
  Save,
  Info,
  ArrowRightLeft,
  ExternalLink,
  Maximize2,
  Minimize2,
  Boxes,
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'motion/react'
import { fetchProductosPorFamilia, fetchStockTotalesPorProducto, type FamiliaResumen, type FamiliaResumenSku, type StockTotalProducto } from '@/modules/catalogo/queries'
import { moverProductosDeFamiliaAction, renombrarFamiliaAction, createProductAction, checkSkuExistsAction } from '@/modules/catalogo/actions'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { cn } from '@/lib/utils'
import {
  generateIntermediateCodeV2,
  detectDenseBlocks,
  compactBlockToTens,
  parseFamiliaCode,
  FAMILIA_GAP_MIN_DEFAULT,
  type EstrategiaCodigo,
} from '@/lib/utils/familia-codigo'

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

  // --- Modo Stock: semáforo en cápsulas SKU + total global en inspector ---
  // OFF por defecto (rendimiento): al activarse trae el stock global de lo cargado.
  const [modoStock, setModoStock] = useState(false)
  const [stockMap, setStockMap] = useState<Record<number, StockTotalProducto>>({})
  const [loadingStock, setLoadingStock] = useState(false)
  const stockCacheRef = useRef<Record<number, StockTotalProducto>>({})

  // --- Helper para construir la caché inicial de productos precargados por el servidor ---
  const buildInitialProductsMap = (famList: FamiliaResumen[]): Record<string, ProductListItem[]> => {
    const map: Record<string, ProductListItem[]> = {}
    for (const f of famList) {
      const famKey = f.familia || 'F000-000C'
      if (f.skus && f.skus.length > 0) {
        map[famKey] = f.skus.map(s => ({
          id: s.id,
          sku_base: s.sku_base,
          nombre: null,
          descripcion: s.descripcion,
          familia: f.familia,
          precio_ec: null,
          pz_en_caja: null,
          activo: s.activo ?? true,
          imagen_principal: s.imagen_principal ?? null,
        }))
      }
    }
    return map
  }

  // --- Bandeja de Trabajo (Bandeja Izquierda) ---
  const [pinnedFamilies, setPinnedFamilies] = useState<string[]>(['F000-000C'])
  const [loadedProducts, setLoadedProducts] = useState<Record<string, ProductListItem[]>>(() => buildInitialProductsMap(initialFamilias))
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({})

  // --- Modal de Crear / Agregar Producto Directo en Familias ---
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

  const handleOpenCreateProductModal = (defaultFamily?: string) => {
    setNewProductSku('')
    setNewProductNombre('')
    setNewProductDescripcion('')
    setNewProductFamilia(defaultFamily || highlightedFamily || 'F000-000C')
    setNewProductPzCaja('1')
    setNewProductPrecio('')
    setSkuValidationError(null)
    setIsCreateProductModalOpen(true)
  }

  const handleValidateSku = async (sku: string) => {
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
  }

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
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

      // Actualizar loadedProducts y familias en memoria
      setLoadedProducts(prev => {
        const list = [...(prev[targetFam] || [])]
        return { ...prev, [targetFam]: [newListItem, ...list] }
      })

      setFamilias(prev => {
        let famExists = false
        const nextFamilias = prev.map(f => {
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
    } catch (err: any) {
      toast.error(err.message || 'Error al crear producto')
    } finally {
      setIsCreatingProduct(false)
    }
  }

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
  const [highlightedFamily, setHighlightedFamily] = useState<string | null>(null)

  // --- Ubicar familia en la lista general eliminando el filtro de búsqueda ---
  const handleGoToFamilyInList = (familyName: string) => {
    setSearchQuery('')
    setHighlightedFamily(familyName)
    
    // Si estamos en vista tarjetas, expandirla y cargar sus productos
    if (activeDirTab === 'cards') {
      setExpandedFamilies(prev => ({ ...prev, [familyName]: true }))
      loadProductsForFamily(familyName)
    }

    // Scroll suave hasta el elemento después de que el DOM pinte todas las familias
    setTimeout(() => {
      const el = activeDirTab === 'cards' 
        ? document.getElementById(`family-item-card-${familyName}`)
        : document.getElementById(`family-item-${familyName}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)
  }

  // --- Hacer scroll directo a la familia ubicada manteniendo o ajustando la vista ---
  const handleScrollToHighlightedFamily = (familyName: string) => {
    if (!familyName) return
    
    // Si estamos en vista tarjetas, expandirla y cargar sus productos
    if (activeDirTab === 'cards') {
      setExpandedFamilies(prev => ({ ...prev, [familyName]: true }))
      loadProductsForFamily(familyName)
    }

    setTimeout(() => {
      const el = activeDirTab === 'cards' 
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
          const retryEl = activeDirTab === 'cards' 
            ? document.getElementById(`family-item-card-${familyName}`)
            : document.getElementById(`family-item-${familyName}`)
          if (retryEl) {
            retryEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
      }
    }, 100)
  }

  // --- Estado ocultable de las secciones del sidebar ---
  const [isSinAsignarCollapsed, setIsSinAsignarCollapsed] = useState(false)
  const [isBandejaCollapsed, setIsBandejaCollapsed] = useState(false)

  // --- Tooltip flotante durante Drag ---
  const [dragTooltip, setDragTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  // --- Estados de Inspección ---
  const [inspectedProduct, setInspectedProduct] = useState<ProductListItem | null>(null)
  const [loadingInspection, setLoadingInspection] = useState(false)
  // --- Foto ampliada 3:4 en inspector (persiste al cambiar de SKU/modelo) ---
  const [imagenExpandida, setImagenExpandida] = useState(false)

  const handleInspectProduct = async (productId: number, skuBase: string, description: string | null) => {
    // 1. Buscar en loadedProducts precargado
    for (const prods of Object.values(loadedProducts)) {
      const found = prods.find(p => p.id === productId)
      if (found) {
        setInspectedProduct(found)
        setIsRightPanelOpen(true)
        return
      }
    }

    // 2. Buscar en familias precargadas por el servidor
    for (const f of familias) {
      const foundSku = f.skus?.find(s => s.id === productId)
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
          imagen_principal: foundSku.imagen_principal ?? null
        }
        setInspectedProduct(item)
        setIsRightPanelOpen(true)
        return
      }
    }

    // 3. Fallback: Si no estuviera en memoria, consultar imagen en Supabase
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

    // 3. Ordenar alfabéticamente los SKUs de cada familia por sku_base
    Object.keys(netSkus).forEach(famKey => {
      netSkus[famKey].sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))
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
      // Si el modo stock está activo, traer el stock de lo recién cargado
      if (modoStock) {
        void asegurarStock(prods.map(p => p.id))
      }
    } catch (err) {
      console.error('Error al cargar productos de familia:', err)
      toast.error(`No se pudieron cargar los productos de la familia ${familyCode}`)
    } finally {
      setLoadingProducts(prev => ({ ...prev, [familyCode]: false }))
    }
  }

  // --- Trae el stock global faltante para una lista de ids (con caché, sin refetch) ---
  const asegurarStock = async (ids: number[]) => {
    const faltantes = Array.from(new Set(ids.filter(n => Number.isFinite(n)))).filter(id => !(id in stockCacheRef.current))
    if (faltantes.length === 0) return

    setLoadingStock(true)
    try {
      const nuevos = await fetchStockTotalesPorProducto(faltantes)
      // ids sin fila en inventario_stock = 0 explícito (para no volver a pedirlos)
      const completos: Record<number, StockTotalProducto> = {}
      for (const id of faltantes) completos[id] = nuevos[id] || { cajas: 0, piezas: 0 }
      stockCacheRef.current = { ...stockCacheRef.current, ...completos }
      setStockMap({ ...stockCacheRef.current })
    } catch (err) {
      console.error('Error al cargar stock:', err)
      toast.error('No se pudo cargar el stock')
    } finally {
      setLoadingStock(false)
    }
  }

  // --- Toggle modo stock: al activarse trae el stock de todo lo cargado en vista ---
  const toggleModoStock = async (activo: boolean) => {
    setModoStock(activo)
    if (activo) {
      const ids: number[] = []
      for (const prods of Object.values(loadedProducts)) {
        for (const p of prods) ids.push(p.id)
      }
      // La vista Puro SKU renderiza f.skus (puede incluir no cargados en loadedProducts)
      for (const f of familias) {
        for (const s of (f.skus || [])) ids.push(s.id)
      }
      await asegurarStock(ids)
    }
  }

  // --- Clases del semáforo de stock para cápsulas SKU (solo lista de familia) ---
  // Inactivo = rosa · 0 cajas = rojo · 1-4 cajas = amarillo · 5+ = normal. Retorna '' si normal.
  const clasesSemaforoSku = (productoId: number): string => {
    const st = stockMap[productoId]
    if (!st) return ''
    if (st.cajas <= 0) return 'bg-red-600 dark:bg-red-600 text-white border-red-700 dark:border-red-500 font-bold'
    if (st.cajas < 5) return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    return ''
  }

  // --- Texto del SKU en vista tarjetas según semáforo (retorna '' si normal) ---
  const claseTextoSku = (productoId: number): string => {
    if (!modoStock) return ''
    const st = stockMap[productoId]
    if (!st) return ''
    if (st.cajas <= 0) return 'text-red-600 dark:text-red-400'
    if (st.cajas < 5) return 'text-amber-700 dark:text-amber-300'
    return ''
  }

  // --- Texto corto de stock para tooltips de cápsulas ---
  const tituloStockSku = (productoId: number): string | undefined => {
    if (!modoStock) return undefined
    const st = stockMap[productoId]
    if (!st) return 'Stock: cargando…'
    return `Stock total: ${st.cajas} cajas${st.piezas > 0 ? ` · ${st.piezas} pzs` : ''}`
  }

  // --- Fila de stock total global del inspector (solo con modo stock activo) ---
  const renderFilaStockInspector = () => {
    if (!modoStock || !inspectedProduct) return null
    const st = stockMap[inspectedProduct.id]
    const sinStock = !!st && st.cajas <= 0
    const bajoStock = !!st && st.cajas > 0 && st.cajas < 5
    return (
      <div className={cn(
        "mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs bg-card",
        sinStock
          ? "border-red-500/50 bg-red-500/5"
          : bajoStock
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-zinc-200 dark:border-zinc-800"
      )}>
        <Boxes className={cn(
          "h-4 w-4 shrink-0",
          sinStock
            ? "text-red-600 dark:text-red-400"
            : bajoStock
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
        )} />
        {!st ? (
          <span className="text-muted-foreground flex items-center gap-1.5">
            {loadingStock && <Loader2 className="h-3 w-3 animate-spin" />}
            {loadingStock ? 'Cargando stock…' : 'Sin dato de stock'}
          </span>
        ) : (
          <span className="text-foreground">
            Stock total:{' '}
            <strong className={cn(
              sinStock
                ? "text-red-600 dark:text-red-400"
                : bajoStock
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-foreground"
            )}>
              {st.cajas} {st.cajas === 1 ? 'caja' : 'cajas'}
            </strong>
            {st.piezas > 0 && (
              <span className="text-muted-foreground"> · {st.piezas} pzs sueltas</span>
            )}
          </span>
        )}
      </div>
    )
  }

  // --- Efecto: al cambiar el producto inspeccionado, traer su stock ---
  // El modo amplio/retraído de la foto se conserva entre SKUs (no se resetea).
  useEffect(() => {
    if (modoStock && inspectedProduct) {
      void asegurarStock([inspectedProduct.id])
    }
  }, [inspectedProduct?.id, modoStock])

  // --- Efecto: Sincronizar familias iniciales si cambian los props ---
  useEffect(() => {
    setFamilias(initialFamilias)
    setLoadedProducts(prev => ({
      ...buildInitialProductsMap(initialFamilias),
      ...prev,
    }))
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

  // --- Resolver familia y productos de forma combinada (incluyendo staged changes) ordenados por sku_base ---
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
      .sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))
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
    // V2: acepta extensión infinita F###-###A1 (preserva el ext al cambiar A/B)
    const regex = /^(F\d{3}-\d{3})([AB])(\d+)?$/i

    Object.entries(netCounts).forEach(([familyCode, finalCount]) => {
      // Si la familia fue renombrada explícitamente, omitir
      if (stagedRenames[familyCode]) return

      const match = familyCode.match(regex)
      if (match) {
        const base = match[1]
        const currentSuffix = match[2].toUpperCase()
        const ext = match[3] ?? ''

        // Regla: B = sola (1 producto), A = agrupada (2 o más)
        let targetSuffix = currentSuffix
        if (finalCount === 1) {
          targetSuffix = 'B'
        } else if (finalCount >= 2) {
          targetSuffix = 'A'
        }

        if (currentSuffix !== targetSuffix) {
          autoRenames[familyCode] = `${base}${targetSuffix}${ext}`
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

  // --- Algoritmo V2: bisección con mitad del rango + overflow infinito A1, A2... ---
  // familia es solo un string en productos.familia: todo el orden lo hace la plataforma.
  // Nunca genera "1000": tope en 999 y luego F###-999A1, A2... (orden alfabético garantizado).
  const getTargetSuffixForNewFamily = (): string => {
    const selectedCount = Object.values(selectedProductIds).filter(Boolean).length
    return selectedCount >= 2 ? 'A' : 'B'
  }

  const generateIntermediateCode = (prevCode: string, nextCode?: string): string => {
    return generateIntermediateCodeV2(prevCode, nextCode, getTargetSuffixForNewFamily(), FAMILIA_GAP_MIN_DEFAULT).codigo
  }

  // --- Obtener el código intermedio sugerido basado en referencia ---
  // Incluye borradores locales (stagedMoves) para no sugerir un código ya ocupado en memoria.
  const getIntermediateDetail = (refCode: string): { codigo: string; estrategia: EstrategiaCodigo; requiereCompactar: boolean } => {
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

    const idx = todas.findIndex(f => f === refCode)
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
  }

  const getIntermediateCodeSuggestion = (refCode: string): string => {
    return getIntermediateDetail(refCode).codigo
  }

  // --- Bloque denso alrededor de la referencia (para el botón Compactar a decenas) ---
  const getDenseBlockForRef = (refCode: string) => {
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
    return bloques.find(b => b.miembros.includes(refCode) || b.prefijo === parsed.prefijo) ?? null
  }

  const ESTRATEGIA_LABEL: Record<EstrategiaCodigo, string> = {
    'decena-limpia': 'Decena limpia',
    'mitad-rango': 'Mitad del rango',
    'unidad': 'Hueco unidad',
    'overflow-extendido': 'Overflow A1',
    'bloque-lleno': 'Bloque lleno',
  }

  const handleCompactDenseBlock = () => {
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
    // Como familia es solo un string, compactar = renombrar strings en borrador
    setStagedRenames(prev => {
      const next = { ...prev }
      for (const [oldName, newName] of entries) {
        // Resolver cadena de renames previos que apunten a oldName
        for (const k of Object.keys(next)) {
          if (next[k] === oldName) next[k] = newName
        }
        // Si oldName ya era destino de un rename, mover la llave original
        const originalKey = Object.keys(next).find(k => k === oldName)
        if (originalKey) {
          delete next[originalKey]
        }
        next[oldName] = newName
      }
      return next
    })
    setFamilias(prev =>
      prev.map(f => {
        const nuevo = res.renames[f.familia || '']
        return nuevo ? { ...f, familia: nuevo } : f
      }),
    )
    toast.success(`Bloque compactado a decenas: ${entries.length} familia(s) reubicadas en borrador`)
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

  // --- Exportar Familias Agrupadas a Excel con ExcelJS (2 Hojas con formato imprimible fiel a StockMatrix) ---
  const handleExportToExcel = async () => {
    const toastId = toast.loading('Generando reporte de Excel...')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // 1. Obtener bodegas activas y existencias de stock en paralelo
      const [bodegasRes, stockRes] = await Promise.all([
        supabase
          .from('bodegas')
          .select('id, nombre, es_virtual, activa')
          .eq('activa', true),
        supabase
          .from('inventario_stock')
          .select('producto_id, bodega_id, cajas, piezas_sueltas')
      ])

      if (bodegasRes.error) {
        throw new Error(`Error al obtener bodegas: ${bodegasRes.error.message}`)
      }

      // Separar y ordenar bodegas: normales primero, virtuales al final
      const normalBodegas = (bodegasRes.data || [])
        .filter(b => !b.es_virtual)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

      const virtualBodegas = (bodegasRes.data || [])
        .filter(b => b.es_virtual)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

      const sortedBodegas = [...normalBodegas, ...virtualBodegas]

      // Mapear stock real por producto y bodega, y total general por producto
      const stockPorProductoYBodega: Record<number, Record<number, number>> = {}
      const totalStockPorProducto: Record<number, number> = {}

      for (const st of stockRes.data || []) {
        if (!stockPorProductoYBodega[st.producto_id]) {
          stockPorProductoYBodega[st.producto_id] = {}
        }
        const cajas = st.cajas ?? 0
        stockPorProductoYBodega[st.producto_id][st.bodega_id] = (stockPorProductoYBodega[st.producto_id][st.bodega_id] || 0) + cajas
        totalStockPorProducto[st.producto_id] = (totalStockPorProducto[st.producto_id] || 0) + cajas
      }

      // Helper para detectar familias no asignadas
      function isUnassignedFamily(fam: string | null | undefined): boolean {
        if (!fam) return true
        const norm = fam.trim().toUpperCase()
        return (
          norm === 'F000-000C' ||
          norm === 'F000-000' ||
          norm === 'SIN FAMILIA' ||
          norm === 'SIN ASIGNAR' ||
          norm === 'SIN CLASIFICAR' ||
          norm === '—' ||
          norm === '-' ||
          norm === 'NULL' ||
          norm === 'UNDEFINED'
        )
      }

      // Ordenar familias alfabéticamente enviando F000-000 / F000-000C / Sin Familia al final
      const sorted = [...familias].sort((a, b) => {
        const famA = a.familia || 'SIN FAMILIA'
        const famB = b.familia || 'SIN FAMILIA'
        const aUn = isUnassignedFamily(famA)
        const bUn = isUnassignedFamily(famB)
        if (aUn && !bUn) return 1
        if (!aUn && bUn) return -1
        return famA.localeCompare(famB, 'es', { sensitivity: 'base' })
      })

      const workbook = new ExcelJS.Workbook()

      const thinStyle: ExcelJS.BorderStyle = 'thin'
      const mediumStyle: ExcelJS.BorderStyle = 'medium'

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        left: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        bottom: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
        right: { style: thinStyle, color: { argb: 'FFD3D3D3' } },
      }

      const borderHeader: Partial<ExcelJS.Borders> = {
        top: { style: thinStyle, color: { argb: 'FF8596B0' } },
        left: { style: thinStyle, color: { argb: 'FF8596B0' } },
        bottom: { style: mediumStyle, color: { argb: 'FF475569' } },
        right: { style: thinStyle, color: { argb: 'FF8596B0' } },
      }

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

      const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long' }).toUpperCase()
      const anioActual = new Date().getFullYear()

      // ─── FUNCIÓN PARA CONSTRUIR CADA HOJA ─────────────────────────────────────
      const buildSheet = (worksheet: ExcelJS.Worksheet, isBlanco: boolean) => {
        // Configuración de página lista para la impresora de oficina.
        // Papel carta (Letter) horizontal a tamaño real 100%: la hoja física
        // es carta, así la impresora no reescala nada.
        // printTitlesRow 3:3 repite el encabezado en cada hoja impresa.
        // Sin "Ajustar a 1 página": con ajuste activo Excel ignora los saltos
        // manuales, por eso se imprime a tamaño real para que los cortes
        // inteligentes entre familias sí se respeten.
        worksheet.pageSetup = {
          orientation: 'landscape',
          // 1 = Letter/carta (OOXML ST_PaperSize). El enum de ExcelJS no trae
          // Letter, por eso se castea; a runtime se escribe paperSize="1".
          paperSize: 1 as ExcelJS.PaperSize, // Letter / carta
          fitToPage: false,
          horizontalCentered: true,
          margins: {
            left: 0.2, right: 0.2,
            top: 0.5, bottom: 0.5,
            header: 0.2, footer: 0.2
          },
          printTitlesRow: '3:3'
        }
        worksheet.headerFooter = {
          oddHeader: '&C&9INVENTARIO GLOBAL - &D',
          oddFooter: '&CPágina &P de &N',
        }
        // Congelar encabezado en pantalla (no afecta impresión)
        worksheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: true }]

        // Ajuste de texto DESCRIPCION: Excel no hace autofit en celdas
        // combinadas, por eso se estima la altura manualmente para que el
        // texto largo salga en varias líneas y no se recorte arriba/abajo.
        // Capacidad conservadora (mayúsculas + negrita son más anchas) y
        // envoltura por palabras como hace Excel (no parte palabras).
        const CHARS_POR_LINEA_DESC = 40 // width 50, Calibri 9.5 bold
        const ALTO_LINEA = 16
        const PADDING_VERTICAL = 18 // 9px arriba + 9px abajo
        const ALTO_MIN_FILA = 30
        function estimarLineas(texto: string): number {
          const t = (texto || '').trim().replace(/\s+/g, ' ')
          if (!t) return 1
          const palabras = t.split(' ')
          let lineas = 1
          let usada = 0
          for (const p of palabras) {
            if (p.length > CHARS_POR_LINEA_DESC) {
              // Palabra larguísima: ocupa sus propias líneas
              if (usada > 0) {
                lineas += 1
                usada = 0
              }
              lineas += Math.ceil(p.length / CHARS_POR_LINEA_DESC) - 1
              usada = p.length % CHARS_POR_LINEA_DESC
              continue
            }
            const conEspacio = usada === 0 ? p.length : usada + 1 + p.length
            if (conEspacio <= CHARS_POR_LINEA_DESC) {
              usada = conEspacio
            } else {
              lineas += 1
              usada = p.length
            }
          }
          // Colchón de 1 línea cuando el texto envuelve, para que el
          // ajuste nunca quede al ras del borde superior/inferior
          return Math.max(1, lineas + (lineas > 1 ? 1 : 0))
        }
        function alturaParaBloque(descUpper: string, numFilas: number): number {
          const total = estimarLineas(descUpper) * ALTO_LINEA + PADDING_VERTICAL
          return Math.max(ALTO_MIN_FILA, Math.ceil(total / Math.max(1, numFilas)))
        }
        // Corte de página inteligente: nunca partir una celda combinada.
        // Se acumula la altura usada en la página y, si la próxima familia
        // ya no cabe, se inserta el salto ANTES de ella con addPageBreak().
        // Carta horizontal a 100%: ~440pt útiles ≈ 13-15 filas por página.
        const PRESUPUESTO_PAGINA_PT = 440
        let usadoEnPagina = 0
        function pedirSaltoSiNoCabe(altoBloque: number, filaAnterior: number): boolean {
          if (filaAnterior < 4 || altoBloque <= 0) return false
          if (usadoEnPagina > 0 && usadoEnPagina + altoBloque > PRESUPUESTO_PAGINA_PT) {
            try {
              worksheet.getRow(filaAnterior).addPageBreak()
            } catch {
              // Si ExcelJS no puede insertar el salto, se sigue sin romper nada
            }
            usadoEnPagina = 0
            return true
          }
          return false
        }

        // Estructura de Columnas idéntica al formato imprimible de StockMatrix:
        // Col 1: DESCRIPCION
        // Col 2: ESTILO (SKU)
        // Col 3 a (2+N): BODEGAS
        // Col (3+N): GLOBAL
        // Col (4+N): FAMILIA (al final después de totales)
        const columnsList = [
          { header: 'DESCRIPCION', key: 'descripcion', width: 50 },
          { header: 'ESTILO', key: 'estilo', width: 18 },
        ]

        sortedBodegas.forEach(b => {
          columnsList.push({
            header: b.nombre.toUpperCase(),
            key: `b_${b.id}`,
            width: 8.5
          })
        })

        columnsList.push({
          header: 'GLOBAL',
          key: 'global',
          width: 12
        })

        columnsList.push({
          header: 'FAMILIA',
          key: 'familia',
          width: 18
        })

        worksheet.columns = columnsList
        const totalCols = columnsList.length
        const startBodegaCol = 3
        const globalCol = 3 + sortedBodegas.length
        const famCol = globalCol + 1

        // Fila 1: Título superior centrado
        const row1 = worksheet.getRow(1)
        row1.height = 40
        worksheet.mergeCells(1, 1, 1, totalCols)
        const titleCell = worksheet.getCell(1, 1)
        titleCell.value = isBlanco
          ? `INVENTARIO GLOBAL (FORMATO BLANCO)  ${mesActual} ${anioActual}`
          : `INVENTARIO GLOBAL CON EXISTENCIAS  ${mesActual} ${anioActual}`
        titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF5' } }

        // Fila 2: Separador
        worksheet.getRow(2).height = 8

        // Fila 3: Encabezados de Columna (compacto pero repetido en cada página)
        const headerRow = worksheet.getRow(3)
        headerRow.height = 64

        // 1. DESCRIPCION
        const cDesc = headerRow.getCell(1)
        cDesc.value = 'DESCRIPCION'
        cDesc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
        cDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }
        cDesc.alignment = { horizontal: 'center', vertical: 'middle' }
        cDesc.border = borderHeader

        // 2. ESTILO
        const cEstilo = headerRow.getCell(2)
        cEstilo.value = 'ESTILO'
        cEstilo.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
        cEstilo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        cEstilo.alignment = { horizontal: 'center', vertical: 'middle' }
        cEstilo.border = borderHeader

        // 3 a N: BODEGAS
        sortedBodegas.forEach((b, idx) => {
          const cell = headerRow.getCell(startBodegaCol + idx)
          cell.value = b.nombre.toUpperCase()
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF000000' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: b.es_virtual ? 'FFFCE4D6' : 'FFDDEBF7' }
          }
          cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
          cell.border = borderHeader
        })

        // GLOBAL (Total de cajas)
        const cGlobal = headerRow.getCell(globalCol)
        cGlobal.value = 'GLOBAL'
        cGlobal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } }
        cGlobal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        cGlobal.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
        cGlobal.border = borderHeader

        // FAMILIA (Al final después de totales)
        const cFam = headerRow.getCell(famCol)
        cFam.value = 'FAMILIA'
        cFam.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } }
        cFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        cFam.alignment = { horizontal: 'center', vertical: 'middle' }
        cFam.border = borderHeader

        // Filas de datos
        let currentRow = 4
        let realFamiliesCount = 0

        sorted.forEach((f) => {
          const name = f.familia || 'Sin Clasificar'
          const isUnassigned = isUnassignedFamily(f.familia)
          if (!isUnassigned) realFamiliesCount++

          // Filtrar skus según stagedMoves y mostrarInactivos
          const skusList = (f.skus || []).filter(s => {
            const currentDest = stagedMoves[s.id]
            const isHere = currentDest !== undefined ? currentDest === f.familia : true
            if (!isHere) return false
            return mostrarInactivos || s.activo !== false
          })

          // Incorporar staged moves hacia esta familia
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

          // Ordenar siempre los modelos alfabéticamente por SKU
          skusList.sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))

          // Tomar la descripción de la familia a partir del primer SKU alfabético con descripción
          const primerSkuConDesc = skusList.find(s => s.descripcion && s.descripcion.trim()) || skusList[0]
          const desc = primerSkuConDesc?.descripcion || f.descripcion || ''
          // Altura dinámica con ajuste de texto: la descripción larga se reparte
          // en varias líneas dentro de la celda combinada en vez de recortarse
          const descUpperFam = (desc || '').toUpperCase()
          const altoPorFilaFam = isUnassigned
            ? ALTO_MIN_FILA
            : alturaParaBloque(descUpperFam, skusList.length)

          // Familias normales (combinadas): si el bloque entero ya no cabe,
          // moverlo íntegro a la próxima página en vez de partirlo a la mitad
          if (!isUnassigned && skusList.length > 0) {
            const altoBloqueFam = altoPorFilaFam * skusList.length
            pedirSaltoSiNoCabe(altoBloqueFam, currentRow - 1)
          }

          if (skusList.length > 0) {
            const startMerge = currentRow
            const startColLetter = getColumnLetter(startBodegaCol)
            const endColLetter = getColumnLetter(startBodegaCol + sortedBodegas.length - 1)

            skusList.forEach((sku, idx) => {
              const totalCajas = totalStockPorProducto[sku.id] ?? 0
              const esStockCero = totalCajas === 0
              // Sin asignar: cada fila tiene su propia descripción -> altura por fila
              // Familias normales: altura repartida del bloque combinado
              const textoFila = isUnassigned
                ? ((sku.descripcion || desc) || '').toUpperCase()
                : descUpperFam
              const altoFila = isUnassigned
                ? Math.max(ALTO_MIN_FILA, estimarLineas(textoFila) * ALTO_LINEA + PADDING_VERTICAL)
                : altoPorFilaFam
              // Sin asignar (filas independientes): salto por fila si ya no cabe
              if (isUnassigned) {
                pedirSaltoSiNoCabe(altoFila, currentRow - 1)
              }

              const rowValues: any = {
                descripcion: isUnassigned ? textoFila : (idx === 0 ? descUpperFam : ''),
                estilo: sku.sku_base,
                familia: isUnassigned ? (sku.sku_base || 'F000-000C') : (idx === 0 ? name : ''),
              }

              // Existencias por bodega
              sortedBodegas.forEach(b => {
                if (isBlanco) {
                  rowValues[`b_${b.id}`] = ''
                } else {
                  const val = stockPorProductoYBodega[sku.id]?.[b.id] ?? 0
                  rowValues[`b_${b.id}`] = val > 0 ? val : ''
                }
              })

              // Suma global horizontal
              rowValues['global'] = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` }

              const row = worksheet.addRow(rowValues)
              row.height = altoFila

              for (let c = 1; c <= totalCols; c++) {
                const cell = row.getCell(c)
                cell.font = { name: 'Calibri', size: 10 }
                cell.border = thinBorder

                if (c === 1) {
                  // DESCRIPCION
                  cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
                  cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E293B' } }
                } else if (c === 2) {
                  // ESTILO (SKU)
                  cell.alignment = { horizontal: 'center', vertical: 'middle' }

                  // SEÑALAMIENTO VISUAL EN HOJA 2: ROJO CLARO PARA STOCK CERO
                  if (!isBlanco && esStockCero) {
                    cell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFFEE2E2' } // Rojo claro suave
                    }
                    cell.font = {
                      name: 'Calibri',
                      size: 10.5,
                      bold: true,
                      color: { argb: 'FF991B1B' } // Texto rojo oscuro para legibilidad
                    }
                  } else {
                    cell.font = {
                      name: 'Calibri',
                      size: 10.5,
                      bold: true,
                      color: { argb: sku.activo === false ? 'FFFF0000' : 'FF0F172A' }
                    }
                  }
                } else if (c === globalCol) {
                  // GLOBAL
                  cell.alignment = { horizontal: 'center', vertical: 'middle' }
                  cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFDC2626' } }
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
                } else if (c === famCol) {
                  // FAMILIA
                  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                  cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } }
                } else {
                  // BODEGAS
                  cell.alignment = { horizontal: 'center', vertical: 'middle' }
                  cell.font = { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF000000' } }
                }
              }

              if (isUnassigned) usadoEnPagina += altoFila
              currentRow++
            })

            const endMerge = currentRow - 1
            if (!isUnassigned) usadoEnPagina += altoPorFilaFam * skusList.length

            // Combinar verticalmente DESCRIPCION y FAMILIA solo para familias normales con > 1 estilo
            if (!isUnassigned && endMerge > startMerge) {
              worksheet.mergeCells(startMerge, 1, endMerge, 1)
              const mergedDesc = worksheet.getCell(startMerge, 1)
              mergedDesc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

              worksheet.mergeCells(startMerge, famCol, endMerge, famCol)
              const mergedFam = worksheet.getCell(startMerge, famCol)
              mergedFam.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

              for (let r = startMerge; r <= endMerge; r++) {
                worksheet.getCell(r, 1).border = thinBorder
                worksheet.getCell(r, famCol).border = thinBorder
              }
            }

            // Borde inferior separador de familia
            const lastRow = worksheet.getRow(endMerge)
            for (let c = 1; c <= totalCols; c++) {
              lastRow.getCell(c).border = {
                ...lastRow.getCell(c).border,
                bottom: { style: 'medium', color: { argb: 'FF475569' } }
              }
            }
          }
        })

        // Filas finales de Resumen (TOTAL CAJAS y BODEGAS)
        // Si el resumen ya no cabe, mandarlo íntegro a la próxima página
        pedirSaltoSiNoCabe(26 + 64, currentRow - 1)
        currentRow++
        const totalsRowIdx = currentRow
        const namesRowIdx = currentRow + 1

        const totalsRow = worksheet.getRow(totalsRowIdx)
        const namesRow = worksheet.getRow(namesRowIdx)

        totalsRow.height = 26
        namesRow.height = 64

        // Etiquetas TOTAL CAJAS en Col 1 y 2
        worksheet.mergeCells(totalsRowIdx, 1, totalsRowIdx, 2)
        const cellTotalesLabel = worksheet.getCell(totalsRowIdx, 1)
        cellTotalesLabel.value = 'TOTAL CAJAS'
        cellTotalesLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
        cellTotalesLabel.alignment = { horizontal: 'right', vertical: 'middle' }
        cellTotalesLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

        // Etiquetas BODEGAS en Col 1 y 2
        worksheet.mergeCells(namesRowIdx, 1, namesRowIdx, 2)
        const cellBodegasLabel = worksheet.getCell(namesRowIdx, 1)
        cellBodegasLabel.value = 'BODEGAS'
        cellBodegasLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } }
        cellBodegasLabel.alignment = { horizontal: 'right', vertical: 'middle' }
        cellBodegasLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }

        const borderResumen: Partial<ExcelJS.Borders> = {
          top: { style: 'medium', color: { argb: 'FF475569' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        }

        cellTotalesLabel.border = borderResumen
        worksheet.getCell(totalsRowIdx, 2).border = borderResumen

        const borderNamesBottom: Partial<ExcelJS.Borders> = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        }

        cellBodegasLabel.border = borderNamesBottom
        worksheet.getCell(namesRowIdx, 2).border = borderNamesBottom

        // Fórmulas de suma por columna y repetición de nombres de bodega
        sortedBodegas.forEach((b, idx) => {
          const colNumber = startBodegaCol + idx
          const colLetter = getColumnLetter(colNumber)

          // Fila TOTAL CAJAS
          const sumCell = worksheet.getCell(totalsRowIdx, colNumber)
          sumCell.value = { formula: `=SUM(${colLetter}4:${colLetter}${totalsRowIdx - 2})` }
          sumCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
          sumCell.alignment = { horizontal: 'center', vertical: 'middle' }
          sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
          sumCell.border = borderResumen

          // Fila BODEGAS
          const nameCell = worksheet.getCell(namesRowIdx, colNumber)
          nameCell.value = b.nombre.toUpperCase()
          nameCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } }
          nameCell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom', wrapText: false }
          nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
          nameCell.border = borderNamesBottom
        })

        // Suma global en columna GLOBAL
        const globalColLetter = getColumnLetter(globalCol)
        const globalSumCell = worksheet.getCell(totalsRowIdx, globalCol)
        globalSumCell.value = { formula: `=SUM(${globalColLetter}4:${globalColLetter}${totalsRowIdx - 2})` }
        globalSumCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFDC2626' } }
        globalSumCell.alignment = { horizontal: 'center', vertical: 'middle' }
        globalSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        globalSumCell.border = borderResumen

        const globalNameCell = worksheet.getCell(namesRowIdx, globalCol)
        globalNameCell.value = 'TOTAL'
        globalNameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } }
        globalNameCell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
        globalNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        globalNameCell.border = borderNamesBottom

        // Columna FAMILIA en totales
        const cTotFam = worksheet.getCell(totalsRowIdx, famCol)
        cTotFam.value = `${realFamiliesCount} FAMILIAS`
        cTotFam.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } }
        cTotFam.alignment = { horizontal: 'center', vertical: 'middle' }
        cTotFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        cTotFam.border = borderResumen

        const cFootFam = worksheet.getCell(namesRowIdx, famCol)
        cFootFam.value = 'FAMILIA'
        cFootFam.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } }
        cFootFam.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
        cFootFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        cFootFam.border = borderNamesBottom
      }

      // ── CONSTRUIR HOJA 1: FORMATO BLANCO (Impresión Física) ──
      const sheetBlanco = workbook.addWorksheet('Formato Blanco', {
        views: [{ showGridLines: true }]
      })
      buildSheet(sheetBlanco, true)

      // ── CONSTRUIR HOJA 2: CON EXISTENCIAS Y SEÑALAMIENTO VISUAL ROJO CLARO ──
      const sheetStock = workbook.addWorksheet('Stock con Señalamiento', {
        views: [{ showGridLines: true }]
      })
      buildSheet(sheetStock, false)

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

      toast.success('¡Reporte exportado con éxito (2 hojas)!', { id: toastId })
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
                                  src={getSmartImagenUrl(p.imagen_principal, 'thumbnail')}
                                  alt={p.sku_base}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-8 w-8 object-cover rounded bg-muted border shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
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
          {/* Barra de Herramientas Superior del Workspace (flujo responsive automático) */}
          <div className="p-2 bg-card border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-x-2.5 gap-y-1 shrink-0">
            {/* Grupo 1: Buscador (arriba) + Ubicando familia (abajo) — único bloque apilado */}
            <div className="flex flex-col gap-1 flex-[1_1_220px] min-w-[200px] max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar familias, productos o SKUs..."
                  className="pl-8 pr-7 h-8 w-full text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {highlightedFamily && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 animate-in fade-in duration-200 self-start transition-colors group">
                  <button
                    type="button"
                    onClick={() => handleScrollToHighlightedFamily(highlightedFamily)}
                    className="flex items-center gap-1 text-[11px] truncate max-w-[180px] hover:underline cursor-pointer"
                    title="Clic para ir y hacer scroll hasta esta familia"
                  >
                    <span>Ubicando:</span>
                    <span className="font-mono font-bold text-blue-800 dark:text-blue-200">{highlightedFamily}</span>
                    <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setHighlightedFamily(null)
                    }}
                    className="p-0.5 hover:bg-blue-500/30 rounded text-blue-600 dark:text-blue-400 transition-colors ml-0.5 cursor-pointer"
                    title="Quitar destacado de esta familia"
                  >
                    <X className="h-3 w-3 shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* Grupo 2: Selector de Vistas + Exportar Excel (compacto, en fila) */}
            <div className="flex flex-row flex-wrap items-center gap-1 shrink-0">
              {/* Selector de Pestaña de Vista */}
              <div className="flex bg-muted p-0.5 rounded-lg text-xs shrink-0">
                <button
                  onClick={() => setActiveDirTab('cards')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all font-medium text-xs text-center whitespace-nowrap",
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
                    "px-2.5 py-1 rounded-md transition-all font-medium text-xs text-center whitespace-nowrap",
                    activeDirTab === 'skus'
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Vista Puro SKU
                </button>
              </div>

              {/* Botón Exportar Excel (análisis en computadora, sin cambios) */}
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="h-8 border-green-600/30 hover:bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center gap-1.5 text-xs shrink-0"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>Exportar Excel</span>
              </Button>

              {/* Botón Vista de impresión (solo para imprimir en carta / PDF) */}
              <Link href="/print/inventario/familias" target="_blank">
                <Button
                  variant="outline"
                  className="h-8 border-blue-600/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 text-xs shrink-0"
                  size="sm"
                  title="Abrir vista de impresión en carta horizontal (papel o PDF)"
                >
                  <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Vista de impresión</span>
                </Button>
              </Link>
            </div>

            {/* Grupo 3: Cambios + checks (compacto, en fila, arriba a la derecha) */}
            <div className="flex flex-row flex-wrap items-center justify-end gap-1 shrink-0 ms-auto self-start">
              {/* Botón de Cambios Adaptativo */}
              <Button
                variant="ghost"
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className="h-8 text-xs flex items-center gap-1.5 bg-muted/40 hover:bg-muted"
                size="sm"
                title="Historial de cambios pendientes"
              >
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Cambios</span>
                <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-muted text-foreground">
                  ({Object.keys(stagedMoves).length})
                </span>
                {isRightPanelOpen ? (
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-muted-foreground" />
                )}
              </Button>

              {/* Checkbox Mostrar Inactivos (ocultable si no cabe) */}
              <div className="hidden sm:flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border text-xs shrink-0">
                <Checkbox
                  id="mostrar-inactivos"
                  checked={mostrarInactivos}
                  onCheckedChange={(checked) => setMostrarInactivos(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <label
                  htmlFor="mostrar-inactivos"
                  className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none hover:text-foreground whitespace-nowrap"
                >
                  <span className="hidden lg:inline">Mostrar inactivos (Andrés Mendoza)</span>
                  <span className="lg:hidden">Inactivos</span>
                </label>
              </div>

              {/* Checkbox Modo Stock (semáforo en cápsulas + total en inspector) */}
              <div className="hidden sm:flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border text-xs shrink-0">
                <Checkbox
                  id="modo-stock"
                  checked={modoStock}
                  onCheckedChange={(checked) => toggleModoStock(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <label
                  htmlFor="modo-stock"
                  className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none hover:text-foreground whitespace-nowrap"
                >
                  <span className="hidden lg:inline">Modo stock (semáforo)</span>
                  <span className="lg:hidden">Stock</span>
                </label>
                {loadingStock && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
            </div>
          </div>

          {/* Leyenda del semáforo (visible con modo stock; advertencia si ambos modos activos) */}
          {modoStock && (
            <div className="px-6 pt-2">
              <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-muted/40 px-3 py-2">
                <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Stock global:
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" /> 0 cajas
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> 1–4 cajas
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" /> 5+ cajas
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-300 inline-block" /> Inactivo
                </span>
                {mostrarInactivos && (
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    Ambos modos activos: el rosa marca inactivos y el semáforo aplica solo a activos.
                  </span>
                )}
              </div>
            </div>
          )}

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
                      const isHighlighted = highlightedFamily === name
                      const renombradoLocal = stagedRenames[name] || autoRenames[name]
                      const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name
                      const skus = netSkusMap[name] || []
                      const primerSkuConDesc = skus.find(s => s.descripcion && s.descripcion.trim()) || skus[0]
                      const displayedFamilyDesc = primerSkuConDesc?.descripcion || f.descripcion

                      return (
                        <div key={name} id={`family-item-${name}`} className="space-y-2">
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add(
                                isHighlighted ? 'border-blue-500' : isNewDraftFamily ? 'border-amber-500' : 'border-primary',
                                isHighlighted ? 'bg-blue-500/10' : isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.03]'
                              )
                              setDragTooltip(prev => prev ? { ...prev, text: `Mover a ${name}` } : null)
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'border-amber-500', 'bg-amber-500/10', 'border-blue-500', 'bg-blue-500/10')
                            }}
                            onDrop={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'border-amber-500', 'bg-amber-500/10', 'border-blue-500', 'bg-blue-500/10')
                              handleDropOnFamily(e, name)
                            }}
                            className={cn(
                              "p-3 rounded-lg border space-y-1 transition-all animate-in fade-in duration-300",
                              isHighlighted
                                ? "border-blue-500 bg-blue-500/[0.08] dark:bg-blue-500/[0.14] ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                                : isNewDraftFamily
                                  ? "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] shadow-xs"
                                  : "bg-card border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span className={cn(
                                  isHighlighted
                                    ? "text-blue-700 dark:text-blue-300 font-extrabold"
                                    : isNewDraftFamily && "text-amber-800 dark:text-amber-300 font-extrabold"
                                )}>
                                  {displayName}
                                </span>
                                {isHighlighted && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-sans font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-500/25 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setHighlightedFamily(null)
                                    }}
                                    title="Clic para quitar el destacado"
                                  >
                                    <span>Ubicada en lista</span>
                                    <X className="h-2.5 w-2.5 shrink-0" />
                                  </Badge>
                                )}
                                {isNewDraftFamily && !isHighlighted && (
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
                              <div className="flex items-center gap-2 shrink-0">
                                {searchQuery.trim() !== '' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGoToFamilyInList(name)
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-all hover:scale-105 active:scale-95 shrink-0"
                                    title="Quitar filtro de búsqueda y ver esta familia en la lista general"
                                  >
                                    <span>Ir a lista</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
                                <Badge
                                  variant={isHighlighted || isNewDraftFamily ? "outline" : "secondary"}
                                  className={cn(
                                    "font-mono text-[10px] py-0 px-2 shrink-0",
                                    isHighlighted
                                      ? "border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                                      : isNewDraftFamily && "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                  )}
                                >
                                  {skus.length} {isNewDraftFamily ? 'en borrador' : `de ${f.total_productos}`}
                                </Badge>
                              </div>
                            </div>
                            {displayedFamilyDesc && (
                              <p className="text-xs text-muted-foreground italic">
                                {displayedFamilyDesc}
                              </p>
                            )}
                            {skus.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t mt-1.5 border-dashed border-zinc-200 dark:border-zinc-800">
                                {skus.map(sku => {
                                  const match = searchQuery && searchQuery.split(/\s+/).filter(Boolean).some(w => sku.sku_base.toLowerCase().includes(w.toLowerCase()))
                                  const semaforo = sku.activo === false ? '' : (modoStock ? clasesSemaforoSku(sku.id) : '')
                                  return (
                                    <Badge
                                      key={sku.id}
                                      variant={match ? "default" : "secondary"}
                                      draggable="true"
                                      onDragStart={(e) => handleDragStart(e, sku.id, sku.sku_base)}
                                      onDragEnd={handleDragEnd}
                                      onClick={() => handleInspectProduct(sku.id, sku.sku_base, sku.descripcion)}
                                      title={tituloStockSku(sku.id)}
                                      className={cn(
                                        "font-mono text-xs py-0.5 px-2 transition-colors border shadow-sm rounded-md tracking-wide cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 duration-75 select-none",
                                        sku.activo === false
                                          ? "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-900"
                                          : semaforo !== ''
                                            ? semaforo
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
                                isHighlighted
                                  ? "text-blue-700/80 dark:text-blue-300/80 border-blue-500/30 bg-blue-500/5"
                                  : isNewDraftFamily
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
                      const isHighlighted = highlightedFamily === name
                      const products = getVisibleProductsInFamily(name)
                      const visibleInGroup = products.filter(p => p.familia === name)
                      const isExpanded = !!expandedFamilies[name]
                      const isLoading = loadingProducts[name]

                      const renombradoLocal = stagedRenames[name] || autoRenames[name]
                      const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name

                      return (
                        <div key={name} id={`family-item-card-${name}`} className="space-y-2">
                          {/* Tarjeta de la Familia */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add(
                                isHighlighted ? 'border-blue-500' : isNewDraftFamily ? 'border-amber-500' : 'border-primary',
                                isHighlighted ? 'bg-blue-500/10' : isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.01]'
                              )
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.01]', 'border-amber-500', 'bg-amber-500/10', 'border-blue-500', 'bg-blue-500/10')
                            }}
                            onDrop={(e) => {
                              e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.01]', 'border-amber-500', 'bg-amber-500/10', 'border-blue-500', 'bg-blue-500/10')
                              handleDropOnFamily(e, name)
                            }}
                            className={cn(
                              "rounded-lg p-4 transition-all shadow-xs family-card flex flex-col border duration-300",
                              isHighlighted
                                ? "border-blue-500 bg-blue-500/[0.08] dark:bg-blue-500/[0.14] ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                                : isNewDraftFamily
                                  ? "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] shadow-xs"
                                  : "bg-card border-zinc-200 dark:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2 select-none gap-2">
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
                                  <span className={cn(
                                    isHighlighted
                                      ? "text-blue-700 dark:text-blue-300 font-extrabold"
                                      : isNewDraftFamily && "text-amber-800 dark:text-amber-300 font-extrabold"
                                  )}>
                                    {displayName}
                                  </span>
                                  {isHighlighted && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-sans font-semibold shrink-0 flex items-center gap-1 cursor-pointer hover:bg-blue-500/25 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setHighlightedFamily(null)
                                      }}
                                      title="Clic para quitar el destacado"
                                    >
                                      <span>Ubicada en lista</span>
                                      <X className="h-2.5 w-2.5 shrink-0" />
                                    </Badge>
                                  )}
                                  {isNewDraftFamily && !isHighlighted && (
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
                                  variant={isHighlighted || isNewDraftFamily ? "outline" : "secondary"}
                                  className={cn(
                                    "font-mono text-[10px] py-0 px-2 shrink-0",
                                    isHighlighted
                                      ? "border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                                      : isNewDraftFamily && "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                  )}
                                >
                                  {visibleInGroup.length} {isNewDraftFamily ? 'en borrador' : `de ${f.total_productos}`}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {searchQuery.trim() !== '' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGoToFamilyInList(name)
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-all hover:scale-105 active:scale-95 shrink-0"
                                    title="Quitar filtro de búsqueda y ver esta familia en la lista general"
                                  >
                                    <span>Ir a lista</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
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

                            {(() => {
                              const skusOfFam = netSkusMap[name] || []
                              const primerConDesc = visibleInGroup.find(p => p.descripcion && p.descripcion.trim()) || skusOfFam.find(s => s.descripcion && s.descripcion.trim())
                              const descToShow = primerConDesc?.descripcion || f.descripcion
                              if (!descToShow) return null
                              return (
                                <p className="text-xs text-muted-foreground italic mb-2 pl-6">
                                  Descripción genérica: {descToShow}
                                </p>
                              )
                            })()}

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
                                              src={getSmartImagenUrl(p.imagen_principal, 'thumbnail')}
                                              alt={p.sku_base}
                                              loading="lazy"
                                              decoding="async"
                                              className="h-7 w-7 object-cover rounded bg-muted border shrink-0"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                              }}
                                            />
                                          ) : (
                                            <div className="h-7 w-7 bg-muted border rounded flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                                              NO IMG
                                            </div>
                                          )}

                                          <div className="min-w-0 flex-1">
                                            <div
                                              className={cn(
                                                "font-mono text-xs font-bold truncate tracking-wide flex items-center gap-1",
                                                p.activo === false
                                                  ? "text-pink-600 dark:text-pink-400"
                                                  : claseTextoSku(p.id)
                                              )}
                                              title={tituloStockSku(p.id)}
                                            >
                                              {p.sku_base}
                                              {p.activo === false && <span className="text-[8px] bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-1 py-0.2 rounded font-sans uppercase shrink-0 font-bold border border-pink-200 dark:border-pink-900">Inactivo</span>}
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
              <>
              <div 
                draggable="true"
                onDragStart={(e) => handleDragStart(e, inspectedProduct.id, inspectedProduct.sku_base)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all duration-200 bg-zinc-950",
                  imagenExpandida ? "aspect-[3/4]" : "aspect-[4/3]"
                )}
              >
                {/* Imagen de Fondo */}
                {inspectedProduct.imagen_principal ? (
                  <img
                    src={getSmartImagenUrl(inspectedProduct.imagen_principal, 'card_lg')}
                    alt={inspectedProduct.sku_base}
                    decoding="async"
                    className={cn(
                      "w-full h-full transition-all duration-300",
                      imagenExpandida ? "object-contain" : "object-cover group-hover:scale-105"
                    )}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Package className="h-10 w-10 opacity-30 animate-pulse" />
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-50">Sin Imagen</span>
                  </div>
                )}

                {/* Gradiente oscuro superior e inferior para mejorar contraste */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none transition-opacity duration-200",
                  imagenExpandida && "opacity-0"
                )} />

                {/* Botón Expandir / Retraer foto 3:4 (izquierda del cerrar) */}
                <button
                  onClick={() => setImagenExpandida(v => !v)}
                  className="absolute top-3 right-12 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-20 backdrop-blur-xs shadow-md border border-white/10"
                  title={imagenExpandida ? "Retraer foto a 4:3" : "Ampliar foto a 3:4"}
                >
                  {imagenExpandida ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>

                {/* Botón de Cerrar (Top Right) */}
                <button
                  onClick={() => setInspectedProduct(null)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-20 backdrop-blur-xs shadow-md border border-white/10"
                  title="Cerrar vista previa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Contenido en Overlay (Top Left) */}
                <div className={cn(
                  "absolute top-3 left-3 flex flex-col gap-1.5 items-start max-w-[85%] z-10 pointer-events-none transition-opacity duration-200",
                  imagenExpandida && "opacity-0"
                )}>
                  {/* Badge de SKU con botón de enlace a pestaña nueva */}
                  <div className="bg-black/75 dark:bg-zinc-950/85 backdrop-blur-xs border border-white/10 rounded px-2.5 py-1 shadow-md flex items-center gap-1.5 pointer-events-auto">
                    <span className="font-mono text-xs font-bold text-white tracking-wider select-all">
                      {inspectedProduct.sku_base}
                    </span>
                    <a
                      href={`/catalogo/${inspectedProduct.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                      className="text-white/70 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer"
                      title={`Abrir detalle de ${inspectedProduct.sku_base} en nueva pestaña`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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

              {/* Fila de stock total global (solo con modo stock activo) */}
              {renderFilaStockInspector()}
              </>
            ) : (
              <div className="text-center py-8 text-[11px] text-muted-foreground italic border border-dashed rounded border-zinc-200 dark:border-zinc-800 bg-muted/10">
                Haz clic en un SKU para ver su imagen e info
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
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
          </div>

          {hasPendingChanges && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-card space-y-2 shrink-0 sticky bottom-0 z-10 shadow-md">
              <Button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 h-9 text-xs shadow-xs"
              >
                <Save className="h-4 w-4" />
                Confirmar Cambios
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* ── DIALOG DE CREACIÓN / AGREGAR PRODUCTO DIRECTO EN FAMILIAS ── */}
      <Dialog open={isCreateProductModalOpen} onOpenChange={setIsCreateProductModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agregar Producto a Familia
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateProductSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>SKU Base *</span>
                {skuChecking && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Verificando...</span>}
              </label>
              <Input
                placeholder="Ej. K24, F320-001, etc."
                value={newProductSku}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  setNewProductSku(val)
                }}
                onBlur={(e) => handleValidateSku(e.target.value)}
                className="h-9 font-mono text-xs uppercase"
                required
              />
              {skuValidationError && (
                <p className="text-[11px] text-destructive font-medium">{skuValidationError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nombre / Título (opcional)</label>
              <Input
                placeholder="Ej. Playera Básica Cuello Redondo"
                value={newProductNombre}
                onChange={(e) => setNewProductNombre(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Descripción (opcional)</label>
              <Input
                placeholder="Ej. Playera de algodón peinado manga corta"
                value={newProductDescripcion}
                onChange={(e) => setNewProductDescripcion(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Familia Asignada</label>
              <Input
                placeholder="Ej. F000-000C o nombre de familia"
                value={newProductFamilia}
                onChange={(e) => setNewProductFamilia(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Piezas por Caja</label>
                <Input
                  type="number"
                  min="1"
                  value={newProductPzCaja}
                  onChange={(e) => setNewProductPzCaja(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Precio EC ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProductPrecio}
                  onChange={(e) => setNewProductPrecio(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateProductModalOpen(false)}
                disabled={isCreatingProduct}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingProduct || skuChecking || !!skuValidationError}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {isCreatingProduct && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Crear Producto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Código sugerido:</span>
                <span className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-sans',
                      getIntermediateDetail(refFamilyName).estrategia === 'overflow-extendido' ||
                      getIntermediateDetail(refFamilyName).estrategia === 'bloque-lleno'
                        ? 'border-amber-500/40 text-amber-600'
                        : 'border-primary/30 text-primary',
                    )}
                    title="Estrategia usada: mitad del rango, decena limpia u overflow A1"
                  >
                    {ESTRATEGIA_LABEL[getIntermediateDetail(refFamilyName).estrategia]}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setNewFamilyInput(getIntermediateCodeSuggestion(refFamilyName))}
                    className="font-mono font-bold text-primary hover:underline text-xs"
                    title="Restablecer código sugerido"
                  >
                    {getIntermediateCodeSuggestion(refFamilyName)}
                  </button>
                </span>
              </div>
              {getIntermediateDetail(refFamilyName).requiereCompactar && (
                <p className="text-[11px] leading-normal text-amber-600 dark:text-amber-400">
                  Quedan menos de {FAMILIA_GAP_MIN_DEFAULT} huecos libres o el bloque está lleno.
                  Se usó overflow infinito (…A1, A2…). Si son familias seguidas, compacta a decenas para
                  liberar 9 espacios entre cada una (solo renombra el texto de familia, sin tocar inventario).
                </p>
              )}
              {getDenseBlockForRef(refFamilyName) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompactDenseBlock}
                  className="w-full h-8 text-[11px] font-semibold"
                  title="Reubica el bloque denso a decenas limpias dejando 9 huecos libres entre familias"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  Compactar bloque a decenas ({getDenseBlockForRef(refFamilyName)?.miembros.length} fams)
                </Button>
              )}

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
                placeholder="Ej. F324-005A, F426-999A1 o Abrigos Premium"
                value={newFamilyInput}
                onChange={(e) => setNewFamilyInput(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">
                Si el bloque 900–999 se llena, usa overflow infinito …A1, A2… (mantiene el orden alfabético).
              </p>
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
        <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Confirmar Reacomodo de Familias</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex flex-col space-y-3 py-1 overflow-hidden">
            <p className="text-xs text-muted-foreground leading-normal shrink-0">
              Se realizarán los siguientes cambios en la base de datos de Supabase. Por favor, revísalos con cuidado antes de confirmar:
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto max-h-[55vh] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-muted/10 space-y-4 text-xs pr-2">
              {/* Mostrar renombrados */}
              {(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                    Renombrar Familias ({Object.keys(stagedRenames).length + Object.keys(autoRenames).length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Explícitos */}
                    {Object.entries(stagedRenames).map(([oldName, newName]) => (
                      <div key={oldName} className="flex items-center justify-between gap-2 text-xs font-mono bg-card border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg shadow-xs">
                        <span className="text-muted-foreground line-through text-[11px] truncate">{oldName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-bold truncate">{newName}</span>
                        <Badge variant="outline" className="ml-auto text-[9px] shrink-0">Manual</Badge>
                      </div>
                    ))}
                    {/* Automáticos */}
                    {Object.entries(autoRenames).map(([oldName, newName]) => (
                      <div key={oldName} className="flex items-center justify-between gap-2 text-xs font-mono bg-amber-500/[0.03] border border-amber-500/25 p-2.5 rounded-lg shadow-xs">
                        <span className="text-muted-foreground line-through text-[11px] truncate">{oldName}</span>
                        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-300 font-bold truncate">{newName}</span>
                        <Badge variant="outline" className="ml-auto text-[9px] border-amber-500/30 text-amber-600 font-sans shrink-0">Auto Sufijo</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mostrar movimientos de productos */}
              {Object.keys(stagedMoves).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                    Reubicar Productos ({Object.keys(stagedMoves).length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      <div key={destFamily} className="bg-card border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg text-xs space-y-1.5 shadow-xs flex flex-col">
                        <div className="font-semibold text-foreground flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-1.5 mb-1">
                          <span className="text-muted-foreground text-[11px]">Destino:</span>
                          <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20 text-[11px] font-bold px-2 py-0.5">
                            {destFamily}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {skus.map(sku => (
                            <Badge key={sku} variant="secondary" className="font-mono text-[10px] px-1.5 py-0.5 bg-muted text-foreground">
                              {sku}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 mt-2 flex items-center justify-end">
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
              className="bg-primary text-primary-foreground font-semibold"
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
