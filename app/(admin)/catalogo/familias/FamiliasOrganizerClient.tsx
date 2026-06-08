// app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx
'use client'

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
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'motion/react'
import { fetchProductosPorFamilia, type FamiliaResumen } from '@/modules/catalogo/queries'
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

  // --- Estados de Colapso de Paneles ---
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isRightDirCollapsed, setIsRightDirCollapsed] = useState(false)
  const [isRightDestCollapsed, setIsRightDestCollapsed] = useState(false)

  // --- Estado de Pestaña del Directorio ---
  const [activeDirTab, setActiveDirTab] = useState<'list' | 'skus'>('list')

  // --- Sugeridor de Familias Intermedias ---
  const [isIntermediateMode, setIsIntermediateMode] = useState(false)
  const [refFamilyName, setRefFamilyName] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])

  const hasPendingChanges = Object.keys(stagedMoves).length > 0 || Object.keys(stagedRenames).length > 0

  // --- Efecto: Cargar F000-000C por defecto ---
  useEffect(() => {
    loadProductsForFamily('F000-000C')
  }, [])

  // --- Efecto: Sincronizar familias iniciales ---
  useEffect(() => {
    setFamilias(initialFamilias)
  }, [initialFamilias])

  // --- Cargar productos de una familia bajo demanda ---
  const loadProductsForFamily = async (familyCode: string) => {
    if (loadedProducts[familyCode] || loadingProducts[familyCode]) return

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
  };

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
        loadProductsForFamily('F000-000C')
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
      (f.skus && f.skus.some(sku => sku.toLowerCase().includes(word)))
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
      (f.skus && f.skus.some(sku => sku.toLowerCase().includes(word)))
    )
  })

  // --- Resolver familia y productos de forma combinada (incluyendo staged changes) ---
  const getVisibleProductsInFamily = (familyCode: string): ProductListItem[] => {
    const originalProds = loadedProducts[familyCode] || []
    return originalProds.map(p => {
      // Si el producto se movió localmente a otra familia, reflejarlo
      const currentDest = stagedMoves[p.id]
      return {
        ...p,
        familia: currentDest !== undefined ? currentDest : p.familia,
      }
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
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Familias Agrupadas', {
        views: [{ showGridLines: true }]
      })

      // Definir columnas y anchos de columnas
      worksheet.columns = [
        { header: 'DESCRIPCION', key: 'descripcion', width: 55 },
        { header: 'ESTILO', key: 'estilo', width: 18 },
        { header: 'FAMILIA', key: 'familia', width: 18 },
      ]

      const thinStyle: ExcelJS.BorderStyle = 'thin'
      const mediumStyle: ExcelJS.BorderStyle = 'medium'

      // Estilo para la fila de encabezados (Fila 1)
      const headerRow = worksheet.getRow(1)
      headerRow.height = 28
      headerRow.eachCell((cell) => {
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

      sorted.forEach((f) => {
        const name = f.familia || 'Sin Clasificar'
        const desc = f.descripcion || ''
        const skusList = f.skus || []

        if (skusList.length === 0) {
          // Si no tiene SKUs asignados, creamos una sola fila
          const row = worksheet.addRow({
            descripcion: desc,
            estilo: '',
            familia: name,
          })
          row.height = 24
          
          for (let c = 1; c <= 3; c++) {
            const cell = row.getCell(c)
            cell.font = { name: 'Calibri', size: 10.5 }
            cell.border = thinBorder
            if (c === 1) {
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }
          }
          currentRow++
        } else {
          const startMerge = currentRow
          skusList.forEach((sku, idx) => {
            const row = worksheet.addRow({
              descripcion: idx === 0 ? desc : '',
              estilo: sku,
              familia: name,
            })
            row.height = 24

            for (let c = 1; c <= 3; c++) {
              const cell = row.getCell(c)
              cell.font = { name: 'Calibri', size: 10.5 }
              cell.border = thinBorder
              if (c === 1) {
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
              } else if (c === 2) {
                cell.font = { name: 'Calibri', size: 10.5, bold: true }
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              } else if (c === 3) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
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
    } catch (err) {
      console.error('Error al exportar reporte Excel:', err)
      toast.error('Ocurrió un error al exportar a Excel', { id: toastId })
    }
  }

  // --- Variables calculadas dinámicamente ---
  const netCounts = getNetProductCounts()
  const autoRenames = getAutoSuffixRenames(netCounts)

  const destProducts = getDestinationProducts()
  const totalDestCount = destProducts.original.length + destProducts.staged.length

  return (
    <div className="relative space-y-6">
      {/* ── BARRA DE ACCIONES SUPERIOR (Sticky Action Bar) ────────────────── */}
      <AnimatePresence>
        {hasPendingChanges && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-14 z-30 flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 backdrop-blur supports-[backdrop-filter]:bg-amber-500/5 shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Tienes cambios pendientes de guardar en borrador. 
                <span className="ml-2 font-mono text-xs px-2 py-0.5 bg-amber-500/20 rounded-md text-amber-700 dark:text-amber-400">
                  {Object.keys(stagedMoves).length} movimientos, {Object.keys(stagedRenames).length} renombrados
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                className="border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-200"
              >
                Descartar Cambios
              </Button>
              <Button
                size="sm"
                onClick={() => setIsConfirmModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                Guardar Cambios
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end mb-2">
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          className="border-green-600/30 hover:bg-green-500/10 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center gap-2"
          size="sm"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
          Exportar a Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── COLUMNA IZQUIERDA (Bandeja de Trabajo / Lista a la Mano) ──── */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="shadow-sm">
            <CardHeader
              className="pb-3 border-b flex flex-row items-center justify-between cursor-pointer select-none"
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            >
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Bandeja de Trabajo (Lista a la Mano)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Productos organizados en los grupos activos listos para transferir.
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Badge variant="outline" className="font-mono text-xs">
                  {pinnedFamilies.length} Familia(s)
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                  className="h-7 w-7 p-0"
                >
                  {isLeftPanelCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {!isLeftPanelCollapsed && (
              <CardContent className="p-0">
                {pinnedFamilies.map((familyCode) => {
                  const isDefault = familyCode === 'F000-000C'
                  const products = getVisibleProductsInFamily(familyCode)
                  const visibleInGroup = products.filter(p => p.familia === familyCode)
                  const isLoading = loadingProducts[familyCode]
                  
                  // Buscar si la familia tiene un nombre renombrado en borrador
                  const renombradoLocal = stagedRenames[familyCode] || autoRenames[familyCode]
                  const displayName = renombradoLocal ? `${familyCode} → ${renombradoLocal}` : familyCode

                  const allSelected = visibleInGroup.length > 0 && visibleInGroup.every(p => selectedProductIds[p.id])
                  const someSelected = visibleInGroup.some(p => selectedProductIds[p.id]) && !allSelected

                  return (
                    <div
                      key={familyCode}
                      className={cn(
                        "border-b last:border-0 p-4 transition-colors",
                        !isDefault && "bg-primary/[0.02] border-l-4 border-l-primary"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {!isDefault && (
                            <div className="text-xs font-semibold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md border border-primary/20 flex items-center gap-1">
                              <Pin className="h-3 w-3" />
                              Agregada
                            </div>
                          )}
                          <h3 className="font-mono font-bold text-sm text-foreground flex items-center gap-2">
                            {displayName}
                            {renombradoLocal && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
                                {stagedRenames[familyCode] ? 'Renombrado local' : 'Auto Sufijo'}
                              </Badge>
                            )}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            ({visibleInGroup.length} productos disponibles)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {puedeEditar && !isDefault && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setRenameTarget(familyCode)
                                setRenameInput(stagedRenames[familyCode] || familyCode)
                                setIsRenameModalOpen(true)
                              }}
                              title="Renombrar esta familia"
                            >
                              <FolderEdit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                          )}
                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => unpinFamily(familyCode)}
                              title="Quitar de la bandeja"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const familyInfo = familias.find(f => f.familia === familyCode)
                        return familyInfo?.descripcion ? (
                          <p className="text-xs text-muted-foreground italic mb-3 pl-1">
                            Descripción general: {familyInfo.descripcion}
                          </p>
                        ) : null
                      })()}

                      {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Cargando productos de la familia...
                        </div>
                      ) : visibleInGroup.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4 text-center bg-muted/10 rounded-lg border border-dashed">
                          {products.length > 0 ? (
                            <span className="italic flex items-center gap-1.5 justify-center">
                              Todos los productos de este grupo fueron movidos en borrador.
                            </span>
                          ) : (
                            'No hay productos en esta familia.'
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Selector para todo el grupo */}
                          {puedeEditar && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-muted/20 rounded-md border text-xs text-muted-foreground mb-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => toggleSelectAllInFamily(familyCode, products)}
                              />
                              <span>Seleccionar todos los de esta familia</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {visibleInGroup.map((p) => {
                              const isSelected = !!selectedProductIds[p.id]
                              const hasMovePending = stagedMoves[p.id] !== undefined
                              
                              return (
                                <div
                                  key={p.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg border bg-card transition-all hover:bg-accent/30",
                                    isSelected && "border-primary bg-primary/[0.01]",
                                    hasMovePending && "border-amber-500/30 bg-amber-500/[0.01]"
                                  )}
                                >
                                  {puedeEditar && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSelectProduct(p.id)}
                                    />
                                  )}
                                  
                                  {p.imagen_principal ? (
                                    <img
                                      src={p.imagen_principal}
                                      alt={p.sku_base}
                                      className="h-10 w-10 object-cover rounded bg-muted border"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 bg-muted border rounded flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                                      NO IMG
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-xs font-bold text-foreground truncate">
                                        {p.sku_base}
                                      </span>
                                      {p.precio_ec && (
                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                          ${p.precio_ec}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {p.descripcion ?? 'Sin descripción'}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ── COLUMNA DERECHA (Directorio Alfabético y Destino) ─────────── */}
        <div className="lg:col-span-6 space-y-6">
          {/* Directorio de Selección / Pinning */}
          <Card className="shadow-sm">
            <CardHeader
              className="pb-3 border-b flex flex-row items-center justify-between cursor-pointer select-none"
              onClick={() => setIsRightDirCollapsed(!isRightDirCollapsed)}
            >
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                Directorio Alfabético de Familias
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsRightDirCollapsed(!isRightDirCollapsed)}
                className="h-7 w-7 p-0"
              >
                {isRightDirCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {!isRightDirCollapsed && (
              <CardContent className="p-4 space-y-4">
                {/* Selector de Pestañas */}
                <div className="flex border-b gap-4 mb-2 text-xs font-semibold text-muted-foreground select-none">
                  <button
                    type="button"
                    onClick={() => setActiveDirTab('list')}
                    className={cn(
                      "pb-2 border-b-2 px-1 transition-all",
                      activeDirTab === 'list'
                        ? "border-primary text-foreground font-bold"
                        : "border-transparent hover:text-foreground"
                    )}
                  >
                    Listado de Familias
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDirTab('skus')}
                    className={cn(
                      "pb-2 border-b-2 px-1 transition-all",
                      activeDirTab === 'skus'
                        ? "border-primary text-foreground font-bold"
                        : "border-transparent hover:text-foreground"
                    )}
                  >
                    Detalle por SKUs (Puro SKU)
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeDirTab === 'list' ? "Buscar familia..." : "Buscar por SKU o familia..."}
                    className="pl-8 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <ScrollArea className="h-[520px] pr-2">
                  {activeDirTab === 'list' ? (
                    filteredFamiliesList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No se encontraron familias.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {filteredFamiliesList.map((f) => {
                          const name = f.familia || 'Sin Clasificar'
                          const isPinned = pinnedFamilies.includes(name)
                          const renombradoLocal = stagedRenames[name] || autoRenames[name]
                          const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name
                          
                          return (
                            <button
                              key={name}
                              onClick={() => pinFamily(name)}
                              disabled={isPinned}
                              className={cn(
                                "w-full text-left flex flex-col p-1.5 px-2.5 rounded-lg border border-transparent transition-colors",
                                isPinned
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "hover:bg-accent text-foreground hover:border-border"
                              )}
                            >
                              <div className="w-full flex items-center justify-between font-mono text-xs font-bold mb-0.5">
                                <span className="truncate pr-2 flex items-center gap-2">
                                  {displayName}
                                  {renombradoLocal && (
                                    <Badge variant="outline" className="text-[9px] scale-90 border-amber-500/30 text-amber-600 font-sans">
                                      {stagedRenames[name] ? 'Manual' : 'Sufijo'}
                                    </Badge>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary" className="text-[10px] font-sans">
                                    {f.total_productos}
                                  </Badge>
                                  {isPinned ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                                  )}
                                </div>
                              </div>
                              {f.descripcion && (
                                <p className="text-[11px] text-muted-foreground truncate w-full italic font-sans">
                                  {f.descripcion}
                                </p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    filteredFamiliesList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No se encontraron familias.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredFamiliesList.map((f) => {
                          const name = f.familia || 'Sin Clasificar'
                          const isPinned = pinnedFamilies.includes(name)
                          const renombradoLocal = stagedRenames[name] || autoRenames[name]
                          const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name
                          
                          return (
                            <div
                              key={name}
                              className={cn(
                                "p-2 px-2.5 rounded-lg border bg-card/50 space-y-1 border-border/80 transition-all",
                                isPinned && "opacity-60 border-dashed"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                                  {displayName}
                                  {renombradoLocal && (
                                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 font-sans">
                                      {stagedRenames[name] ? 'Manual' : 'Sufijo'}
                                    </Badge>
                                  )}
                                </span>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => pinFamily(name)}
                                  disabled={isPinned}
                                  className="h-6 text-[10px] px-2 py-0"
                                >
                                  {isPinned ? 'Agregada' : 'Trabajar'}
                                </Button>
                              </div>
                              {f.descripcion && (
                                <p className="text-[10px] text-muted-foreground italic leading-normal truncate">
                                  {f.descripcion}
                                </p>
                              )}
                              {f.skus && f.skus.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {f.skus.map(sku => {
                                    const match = searchQuery && searchQuery.split(/\s+/).filter(Boolean).some(w => sku.toLowerCase().includes(w.toLowerCase()))
                                    return (
                                      <Badge
                                        key={sku}
                                        variant={match ? "default" : "secondary"}
                                        className={cn(
                                          "font-mono text-[11px] py-0.5 px-2 transition-colors border shadow-sm rounded-md tracking-wide",
                                          match 
                                            ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-750 dark:border-indigo-400 font-bold" 
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/80 font-semibold"
                                        )}
                                      >
                                        {sku}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}
                </ScrollArea>
              </CardContent>
            )}
          </Card>

          {/* Espacio de Trabajo de Destino */}
          <Card className="shadow-sm border-primary/10">
            <CardHeader
              className="pb-3 border-b bg-primary/[0.01] flex flex-row items-center justify-between cursor-pointer select-none"
              onClick={() => setIsRightDestCollapsed(!isRightDestCollapsed)}
            >
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  Familia de Destino
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecciona dónde colocar los productos elegidos.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsRightDestCollapsed(!isRightDestCollapsed)}
                className="h-7 w-7 p-0"
              >
                {isRightDestCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {!isRightDestCollapsed && (
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Modo de selección:</span>
                    <button
                      onClick={() => {
                        setIsNewFamilyMode(!isNewFamilyMode)
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {isNewFamilyMode ? 'Elegir existente' : 'Crear nueva familia'}
                    </button>
                  </div>

                  {isNewFamilyMode ? (
                    <div className="space-y-3">
                      {/* Sugeridor de Familias Intermedias */}
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="intermediate-mode"
                          checked={isIntermediateMode}
                          onCheckedChange={(checked) => {
                            setIsIntermediateMode(!!checked)
                            if (!checked) {
                              setRefFamilyName('')
                            }
                          }}
                        />
                        <label
                          htmlFor="intermediate-mode"
                          className="text-xs text-muted-foreground font-semibold cursor-pointer select-none"
                        >
                          Crear familia intermedia después de una existente
                        </label>
                      </div>

                      {isIntermediateMode && (
                        <div className="space-y-2.5 p-3 bg-muted/20 border border-dashed rounded-lg">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                              Seleccionar familia de referencia:
                            </label>
                            <select
                              className="w-full h-8 rounded border border-input bg-background text-foreground dark:bg-zinc-900 px-2.5 py-0.5 text-xs outline-none focus:border-ring"
                              value={refFamilyName}
                              onChange={(e) => handleSelectRefFamily(e.target.value)}
                            >
                              <option value="" className="bg-background text-foreground dark:bg-zinc-900">-- Selecciona --</option>
                              {familias
                                .filter(f => f.familia && /^F\d{3}-\d{3}[AB]$/i.test(f.familia))
                                .map(f => (
                                  <option key={f.familia} value={f.familia!} className="bg-background text-foreground dark:bg-zinc-900">
                                    {f.familia} {f.descripcion ? `- ${f.descripcion.substring(0, 25)}...` : ''}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {refFamilyName && (
                            <div className="space-y-2 border-t pt-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground text-[11px]">Código sugerido:</span>
                                {(() => {
                                  const suggestion = getIntermediateCodeSuggestion(refFamilyName)
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setNewFamilyInput(suggestion)}
                                      className="font-mono font-bold text-primary hover:underline text-xs"
                                      title="Hacer clic para usar este código"
                                    >
                                      {suggestion}
                                    </button>
                                  )
                                })()}
                              </div>

                              {suggestedKeywords.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground block font-medium">
                                    Palabras clave de referencia:
                                  </span>
                                  <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
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
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">Nombre de la nueva familia:</label>
                        <Input
                          placeholder="Ej. F324-010B o Jeans Caballero Slim"
                          value={newFamilyInput}
                          onChange={(e) => setNewFamilyInput(e.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-foreground">Familia destino existente:</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar familia de destino..."
                          className="pl-8 h-9"
                          value={destSearchQuery}
                          onChange={(e) => setDestSearchQuery(e.target.value)}
                        />
                      </div>

                      <ScrollArea className="h-[220px] border rounded-lg p-2 bg-muted/5">
                        {(() => {
                          const list = [...filteredDestFamiliesList]
                          if (destFamilyName && !list.some(f => f.familia === destFamilyName)) {
                            const original = familias.find(f => f.familia === destFamilyName)
                            if (original) {
                              list.push(original)
                            }
                          }

                          if (list.length === 0) {
                            return (
                              <p className="text-xs text-muted-foreground text-center py-8">
                                No se encontraron familias.
                              </p>
                            )
                          }

                          return (
                            <div className="space-y-1">
                              {list.map((f) => {
                                const name = f.familia || 'Sin Clasificar'
                                const isSelected = destFamilyName === name
                                
                                return (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                      setDestFamilyName(name)
                                      loadProductsForFamily(name)
                                    }}
                                    className={cn(
                                      "w-full text-left flex flex-col p-2.5 rounded-lg border transition-all",
                                      isSelected
                                        ? "bg-primary/10 border-primary text-foreground font-semibold"
                                        : "border-transparent hover:bg-accent text-foreground hover:border-border"
                                    )}
                                  >
                                    <div className="w-full flex items-center justify-between font-mono text-xs font-bold mb-1">
                                      <span className="truncate pr-2">{name}</span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary" className="text-[10px] font-sans">
                                          {f.total_productos}
                                        </Badge>
                                        {isSelected && (
                                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                        )}
                                      </div>
                                    </div>
                                    {f.descripcion && (
                                      <p className="text-[11px] text-muted-foreground truncate w-full italic font-sans">
                                        {f.descripcion}
                                      </p>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </ScrollArea>
                    </div>
                  )}

                  {!isNewFamilyMode && destFamilyName && (
                    (() => {
                      const selectedFamily = familias.find(f => f.familia === destFamilyName)
                      return selectedFamily?.descripcion ? (
                        <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded border border-dashed mt-2 leading-relaxed">
                          <strong>Descripción destino:</strong> {selectedFamily.descripcion}
                        </p>
                      ) : null
                    })()
                  )}

                  {puedeEditar && (
                    <Button
                      onClick={handleStageMove}
                      className="w-full bg-primary hover:bg-primary/90 mt-2 text-primary-foreground"
                      size="sm"
                    >
                      Mover Seleccionados
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Vista previa de productos en la familia de destino */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Vista Previa Destino:</span>
                    <Badge variant="outline">{totalDestCount} pzs</Badge>
                  </div>

                  <ScrollArea className="h-[250px] border rounded-lg p-2 bg-muted/10">
                    {totalDestCount === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                        <HelpCircle className="h-8 w-8 opacity-40 mb-2" />
                        <p className="text-xs italic">
                          Selecciona un destino y mueve productos para previsualizarlos aquí.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Mostrar los productos que ya estaban originalmente */}
                        {destProducts.original.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-card border text-xs">
                            <span className="font-mono font-medium truncate pr-2">{p.sku_base}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">Original</span>
                          </div>
                        ))}
                        
                        {/* Mostrar los productos movidos localmente en borrador (resaltados) */}
                        {destProducts.staged.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-1.5 rounded bg-amber-500/10 border border-amber-500/40 text-xs text-amber-900 dark:text-amber-300 font-semibold animate-pulse"
                          >
                            <span className="font-mono truncate pr-2">{p.sku_base}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] bg-amber-500/20 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono text-[9px]">
                                Borrador
                              </span>
                              <button
                                onClick={() => handleCancelStagedMove(p.id)}
                                className="text-amber-600 hover:text-red-500 transition-colors p-0.5"
                                title="Cancelar reubicación"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* ── MODAL DE CONFIRMACIÓN DE CAMBIOS (Dialog) ──────────────────── */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Confirmar Reacomodo de Familias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Se realizarán los siguientes cambios en la base de datos de Supabase. Por favor, revísalos con cuidado antes de confirmar:
            </p>

            <ScrollArea className="max-h-[300px] border rounded-lg p-3 bg-muted/20">
              <div className="space-y-4 text-sm">
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
                      {/* Agrupar por destino para mostrar bonito */}
                      {Object.entries(
                        Object.entries(stagedMoves).reduce((acc, [prodIdStr, destFamily]) => {
                          const finalDest = getFinalFamilyName(destFamily, autoRenames)
                          if (!acc[finalDest]) acc[finalDest] = []
                          const prodId = parseInt(prodIdStr, 10)
                          // Buscar el SKU del producto
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
            <p className="text-muted-foreground">
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
