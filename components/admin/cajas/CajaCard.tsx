// components/admin/cajas/CajaCard.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, X, Check, Loader2, Calculator, Star } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { CAT_TALLAS_MAESTRO } from '@/lib/constants'

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { MultiTagInput } from './MultiTagInput'
import { CajaMatriz, CajaMatrizFallback } from './CajaMatriz'
import { toast } from 'sonner'

// Tipo para fila de detalle editable
type DetalleFila = {
  colorId: number
  colorNombre: string
  cantidades: Record<string, number> // talla -> cantidad
}


interface CajaCardProps {
  caja: SharedCajaData
  layout?: 'horizontal' | 'vertical'
  onRemove?: (id: number) => void
  onDeactivate?: (id: number) => Promise<void>
  onEdit?: (id: number, data: {
    base: Partial<SharedCajaData>
    detalles: { talla_id: number; color_id: number; cantidad: number }[]
  }) => Promise<void>
  isPending?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canEditOrden?: boolean
  // Catálogos disponibles para agregar tallas/colores
  tallasDisponibles?: CatalogoItem[]
  coloresDisponibles?: CatalogoItem[]
  isNew?: boolean // Si es caja nueva (formulario vacío)
  onCreate?: (data: {
    base: Partial<SharedCajaData>
    detalles: { talla_id: number; color_id: number; cantidad: number }[]
  }) => Promise<void>
  edadNombre?: string | null
  // Caja principal
  esPrincipal?: boolean
  onMarcarPrincipal?: (cajaId: number, productoId: number) => Promise<void | { success: boolean; error?: string }>
  productoId?: number
  precioUnitarioUsd?: number | null
  precioEcMxn?: number | null
}


export function CajaCard({
  caja,
  layout = 'horizontal',
  onRemove,
  onDeactivate,
  onEdit,
  isPending = false,
  canEdit = true,
  canDelete = true,
  canEditOrden = true,
  tallasDisponibles = [],
  coloresDisponibles = [],
  isNew = false,
  onCreate,
  edadNombre,
  esPrincipal = false,
  onMarcarPrincipal,
  productoId,
  precioUnitarioUsd,
  precioEcMxn,
}: CajaCardProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMarkingPrincipal, setIsMarkingPrincipal] = useState(false)
  const [showMarkPrincipalModal, setShowMarkPrincipalModal] = useState(false)
  const isVertical = layout === 'vertical'

  // Estado temporal para edición de datos base
  const [editData, setEditData] = useState<any>({
    codigo_caja: caja.codigo_caja || '',
    nombre_pack: caja.nombre_pack || '',
    cantidad_cajas: caja.cantidad_cajas ?? '',
    piezas_por_caja: caja.piezas_por_caja || 1,
    cbm: caja.cbm || '',
    peso_bruto_kg: caja.peso_bruto_kg || '',
    peso_neto: caja.peso_neto || '',
    largo_cm: caja.largo_cm || '',
    ancho_cm: caja.ancho_cm || '',
    alto_cm: caja.alto_cm || '',
    costo_total_caja: caja.costo_total_caja || 1,
    tallas_summary: caja.tallas ? caja.tallas.split('|').filter(Boolean).map((t) => {
      const cat = CAT_TALLAS_MAESTRO.find((ct) => ct.codigo === t || ct.nombre === t)
      return {
        id: cat?.id ?? t,
        label: cat?.nombre ?? t,
        value: cat?.codigo ?? t,
      }
    }) : [],
    colores_summary: caja.colores ? Array.from(new Set(caja.colores.split('|').filter(Boolean).map(c => c.trim()))).map(c => ({ id: c, label: c, value: c })) : [],
  })

  // Convertir contenidoMap a formato editable de filas
  const initialFilas = useMemo((): DetalleFila[] => {
    if (!caja.contenidoMap || !caja.contenidoMap.colores.length) return []

    return caja.contenidoMap.colores.map((colorNombre, idx) => {
      // Buscar el color_id correspondiente
      const colorCat = coloresDisponibles.find(c => c.nombre === colorNombre)
      return {
        colorId: colorCat?.id || idx + 1,
        colorNombre,
        cantidades: { ...caja.contenidoMap!.matriz[colorNombre] }
      }
    })
  }, [caja.contenidoMap, coloresDisponibles])

  // Estado para tallas en edición (array de {id, nombre})
  const [editTallas, setEditTallas] = useState<CatalogoItem[]>(() => {
    if (!caja.contenidoMap || !caja.contenidoMap.tallas.length) return []
    return caja.contenidoMap.tallas.map((tallaNombre, idx) => {
      const tallaCat = tallasDisponibles.find(t => t.nombre === tallaNombre)
      return { id: tallaCat?.id || idx + 1, nombre: tallaNombre }
    })
  })

  // Estado para filas/colores en edición
  const [editFilas, setEditFilas] = useState<DetalleFila[]>(initialFilas)

  // Estados para selección de nueva talla/color
  const [selectedTallaId, setSelectedTallaId] = useState<string>('')
  const [selectedColorId, setSelectedColorId] = useState<string>('')

  // Si es modo orden, calculamos el total real de piezas
  const totalPiezasCalculado = caja.cantidad_cajas
    ? (caja.contenidoMap?.totalPiezas || caja.piezas_por_caja || 0) * caja.cantidad_cajas
    : (caja.contenidoMap?.totalPiezas || caja.piezas_por_caja || 0)

  // Calcular totales en tiempo real durante edición
  const totalesEdicion = useMemo(() => {
    const totalPorFila: Record<string, number> = {}
    const totalPorColumna: Record<string, number> = {}
    let totalGeneral = 0

    editFilas.forEach(fila => {
      let sumaFila = 0
      editTallas.forEach(talla => {
        const cantidad = fila.cantidades[talla.nombre] || 0
        sumaFila += cantidad
        totalPorColumna[talla.nombre] = (totalPorColumna[talla.nombre] || 0) + cantidad
      })
      totalPorFila[fila.colorNombre] = sumaFila
      totalGeneral += sumaFila
    })

    return { totalPorFila, totalPorColumna, totalGeneral }
  }, [editFilas, editTallas])

  // Sincronizar piezas_por_caja con el total de la matriz automáticamente
  useEffect(() => {
    if (totalesEdicion.totalGeneral > 0) {
      setEditData((prev: any) => {
        if (prev.piezas_por_caja !== totalesEdicion.totalGeneral) {
          return { ...prev, piezas_por_caja: totalesEdicion.totalGeneral }
        }
        return prev
      })
    }
  }, [totalesEdicion.totalGeneral])

  // Sincronizar automáticamente el resumen con la matriz en tiempo de edición
  useEffect(() => {
    if (editTallas.length > 0) {
      const syncTallas = editTallas.map(t => {
        const cat = tallasDisponibles.find(ct => ct.id === t.id)
        return {
          id: t.id,
          label: t.nombre,
          value: cat?.codigo || t.nombre
        }
      })
      setEditData((prev: any) => {
        const isSame = JSON.stringify(prev.tallas_summary) === JSON.stringify(syncTallas)
        return isSame ? prev : { ...prev, tallas_summary: syncTallas }
      })
    }
  }, [editTallas, tallasDisponibles])

  useEffect(() => {
    if (editFilas.length > 0) {
      const syncColores = editFilas.map(f => ({
        id: f.colorId,
        label: f.colorNombre,
        value: f.colorNombre
      }))
      setEditData((prev: any) => {
        const isSame = JSON.stringify(prev.colores_summary) === JSON.stringify(syncColores)
        return isSame ? prev : { ...prev, colores_summary: syncColores }
      })
    }
  }, [editFilas])

  // Handlers para edición
  const handleDiscard = () => {
    if (isNew && onCreate) {
      // Si es nueva y cancelamos, llamamos onRemove para quitarla de la lista
      onRemove?.(caja.id)
    } else {
      // Resetear a valores originales
      setEditData({
        codigo_caja: caja.codigo_caja || '',
        nombre_pack: caja.nombre_pack || '',
        cantidad_cajas: caja.cantidad_cajas ?? '',
        piezas_por_caja: caja.piezas_por_caja || 1,
        cbm: caja.cbm || '',
        peso_bruto_kg: caja.peso_bruto_kg || '',
        peso_neto: caja.peso_neto || '',
        largo_cm: caja.largo_cm || '',
        ancho_cm: caja.ancho_cm || '',
        alto_cm: caja.alto_cm || '',
        costo_total_caja: caja.costo_total_caja || 1,
        tallas_summary: caja.tallas ? caja.tallas.split('|').filter(Boolean).map((t) => {
          const cat = CAT_TALLAS_MAESTRO.find((ct) => ct.codigo === t || ct.nombre === t)
          return {
            id: cat?.id ?? t,
            label: cat?.nombre ?? t,
            value: cat?.codigo ?? t,
          }
        }) : [],
        colores_summary: caja.colores ? Array.from(new Set(caja.colores.split('|').filter(Boolean).map(c => c.trim()))).map(c => ({ id: c, label: c, value: c })) : [],
      })
      setEditTallas(() => {
        if (!caja.contenidoMap || !caja.contenidoMap.tallas.length) return []
        return caja.contenidoMap.tallas.map((tallaNombre, idx) => {
          const tallaCat = tallasDisponibles.find(t => t.nombre === tallaNombre)
          return { id: tallaCat?.id || idx + 1, nombre: tallaNombre }
        })
      })
      setEditFilas(initialFilas)
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Preparar datos de detalles
      const detalles: { talla_id: number; color_id: number; cantidad: number }[] = []

      editFilas.forEach(fila => {
        editTallas.forEach(talla => {
          const cantidad = fila.cantidades[talla.nombre] || 0
          if (cantidad > 0) {
            const realTalla = tallasDisponibles.find(t => t.nombre === talla.nombre)
            const realColor = coloresDisponibles.find(c => c.nombre === fila.colorNombre)
            detalles.push({
              talla_id: realTalla?.id ?? talla.id,
              color_id: realColor?.id ?? fila.colorId,
              cantidad
            })
          }
        })
      })

      const basePayload = { ...editData } as Record<string, any>;
      
      // Sincronizar piezas_por_caja con los detalles si están configurados
      if (detalles.length > 0) {
        basePayload.piezas_por_caja = detalles.reduce((sum, d) => sum + d.cantidad, 0)
      }

      // Convertir tags de resumen a strings piped
      if (editTallas.length > 0) {
        basePayload.tallas = editTallas.map(t => {
          const cat = tallasDisponibles.find(ct => ct.id === t.id)
          return cat?.codigo || t.nombre
        }).join('|')
      } else {
        basePayload.tallas = editData.tallas_summary.map((t: any) => t.value).join('|')
      }

      if (editFilas.length > 0) {
        basePayload.colores = editFilas.map(f => f.colorNombre).join('|')
      } else {
        basePayload.colores = editData.colores_summary.map((c: any) => c.label).join('|')
      }
      
      // Limpiar campos de UI que no van a la BD
      delete basePayload.tallas_summary
      delete basePayload.colores_summary

      for (const k in basePayload) {
        if (basePayload[k] === '') basePayload[k] = null;
      }

      const payload = {
        base: basePayload,
        detalles
      }

      if (isNew && onCreate) {
        await onCreate(payload)
      } else if (onEdit) {
        await onEdit(caja.id, payload)
      }
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error guardando caja:', error)
      alert(error?.message || 'Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  // Handlers para los Tags de Resumen (Top)
  const handleAddTallaSummary = (option: any) => {
    if (editData.tallas_summary.some((t: any) => t.id === option.id)) return
    setEditData({ ...editData, tallas_summary: [...editData.tallas_summary, option] })
  }

  const handleRemoveTallaSummary = (id: string | number) => {
    setEditData({ ...editData, tallas_summary: editData.tallas_summary.filter((t: any) => t.id !== id) })
  }

  const handleAddColorSummary = (option: any) => {
    if (editData.colores_summary.some((c: any) => c.id === option.id)) return
    setEditData({ ...editData, colores_summary: [...editData.colores_summary, option] })
  }

  const handleRemoveColorSummary = (id: string | number) => {
    setEditData({ ...editData, colores_summary: editData.colores_summary.filter((c: any) => c.id !== id) })
  }

  // Handlers para la Matriz (Dropdowns)
  const handleAddTallaMatrix = (tallaId: string) => {
    const talla = tallasDisponibles.find(t => t.id === Number(tallaId))
    if (!talla) return
    if (editTallas.some(t => t.id === talla.id)) return

    setEditTallas([...editTallas, talla])
    setEditFilas(prev => prev.map(fila => ({
      ...fila,
      cantidades: { ...fila.cantidades, [talla.nombre]: 1 }
    })))
    setSelectedTallaId('')
  }

  const handleAddColorMatrix = (colorId: string | number) => {
    const color = coloresDisponibles.find(c => c.id === Number(colorId))
    if (!color) return
    if (editFilas.some(f => f.colorId === color.id)) return

    const nuevaFila: DetalleFila = {
      colorId: color.id,
      colorNombre: color.nombre,
      cantidades: {}
    }
    editTallas.forEach(t => { nuevaFila.cantidades[t.nombre] = 1 })

    setEditFilas([...editFilas, nuevaFila])
    setSelectedColorId('')
  }

  const handleRemoveTalla = (id: number | string) => {
    const tallaId = typeof id === 'string' ? parseInt(id) : id
    const talla = editTallas.find(t => t.id === tallaId)
    if (!talla) return

    setEditTallas(editTallas.filter(t => t.id !== tallaId))

    // Eliminar esta talla de todas las filas
    setEditFilas(prev => prev.map(fila => {
      const { [talla.nombre]: _, ...rest } = fila.cantidades
      return { ...fila, cantidades: rest }
    }))
  }

  const handleRemoveColor = (colorId: number | string) => {
    setEditFilas(editFilas.filter(f => f.colorId !== colorId))
  }

  const handleCantidadChange = (colorId: number | string, tallaNombre: string, valor: string) => {
    const cantidad = parseInt(valor) || 0
    setEditFilas(prev => prev.map(fila =>
      fila.colorId === colorId
        ? { ...fila, cantidades: { ...fila.cantidades, [tallaNombre]: cantidad } }
        : fila
    ))
  }

  const handleAutoRecommendTallas = () => {
    if (!edadNombre) return
    const txt = edadNombre.toLowerCase()
    const isInfantil = txt.includes('infantil') || txt.includes('joven') || txt.includes('adolecente')
    
    let sugerencias = isInfantil
      ? ['TALLA 4', 'TALLA 6', 'TALLA 8', 'TALLA 10', 'TALLA 12', 'TALLA 14', 'TALLA 16', '4', '6', '8', '10', '12', '14', '16']
      : ['CHICA', 'MEDIANA', 'GRANDE', 'EXTRA GRANDE', 'CH', 'M', 'G', 'EG', 'XG', 'S', 'L', 'XL']

    const tallasAgregar = tallasDisponibles.filter(
      t => sugerencias.includes(t.nombre.toUpperCase()) && !editTallas.some(et => et.id === t.id)
    )

    if (tallasAgregar.length === 0) {
      toast.info('Las tallas recomendadas ya están agregadas o no existen.')
      return
    }

    setEditTallas(prev => [...prev, ...tallasAgregar])

    setEditFilas(prev => prev.map(fila => {
      const nuevasCantidades = { ...fila.cantidades }
      tallasAgregar.forEach(t => { nuevasCantidades[t.nombre] = 1 })
      return { ...fila, cantidades: nuevasCantidades }
    }))
  }

  const handleAutoFillFila = (colorId: number) => {
    if (editTallas.length < 2) {
      toast.error('Necesitas al menos dos tallas para autocompletar.')
      return
    }

    setEditFilas(prev => prev.map(fila => {
      if (fila.colorId !== colorId) return fila

      const firstTallaNombre = editTallas[0].nombre
      const firstVal = fila.cantidades[firstTallaNombre] || 0
      
      const newCantidades = { ...fila.cantidades }
      for (let i = 1; i < editTallas.length; i++) {
        newCantidades[editTallas[i].nombre] = firstVal
      }
      return { ...fila, cantidades: newCantidades }
    }))
    
    toast.success('Fila autocompletada.')
  }

  // Mapeo para MultiTagInput
  const tallaTags = useMemo(() => editTallas.map(t => {
    const cat = tallasDisponibles.find(ct => ct.id === t.id)
    return { id: t.id, label: t.nombre, value: cat?.codigo || t.nombre }
  }), [editTallas, tallasDisponibles])

  const colorTags = useMemo(() => editFilas.map(f => ({
    id: f.colorId,
    label: f.colorNombre,
    value: f.colorNombre
  })), [editFilas])

  const tallaOptions = useMemo(() => CAT_TALLAS_MAESTRO.map(t => ({
    id: t.id,
    label: t.nombre,
    value: t.codigo
  })), [])

  const colorOptions = useMemo(() => coloresDisponibles.map(c => ({
    id: c.id,
    label: c.nombre,
    value: c.nombre
  })), [coloresDisponibles])

  return (
    <Card className={cn("overflow-hidden transition-all border-l-4", isEditing ? "border-l-primary" : "border-l-transparent")}>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {isEditing ? (
                <>
                  <Input
                    value={editData.codigo_caja}
                    onChange={(e) => setEditData({ ...editData, codigo_caja: e.target.value })}
                    className="h-8 w-40 font-mono text-sm"
                    placeholder="Código caja"
                  />
                  <Input
                    value={editData.nombre_pack}
                    onChange={(e) => setEditData({ ...editData, nombre_pack: e.target.value })}
                    className="h-8 w-48 text-sm"
                    placeholder="Nombre pack"
                  />
                </>
              ) : (
                <>
                  <span className="font-mono text-primary font-bold">📦 {caja.codigo_caja}</span>
                  {caja.nombre_pack && (
                    <Badge variant="secondary" className="font-medium">{caja.nombre_pack}</Badge>
                  )}
                  {caja.producto_sku && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{caja.producto_sku}</Badge>
                  )}
                  {esPrincipal && (
                    <Badge variant="default" className="bg-amber-400 text-amber-900 hover:bg-amber-400 gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      PRINCIPAL
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && (
              <>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setIsEditing(true)}
                    title="Editar configuración">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(caja.id)}
                    disabled={isPending}
                    title="Eliminar vinculación">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {canDelete && onDeactivate && !onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeactivateModal(true)}
                    disabled={isPending}
                    title="Desactivar caja (Eliminar)">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {canEdit && !esPrincipal && onMarcarPrincipal && productoId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowMarkPrincipalModal(true)}
                    disabled={isMarkingPrincipal}
                    title="Marcar como caja principal para generar variantes">
                    {isMarkingPrincipal ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Star className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </>
            )}
            
            {isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  title="Descartar cambios">
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  title="Guardar cambios">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Modo Edición - Formulario de datos base */}
        {isEditing ? (
          <div className="space-y-4">
            <div className={cn("grid gap-4", isVertical ? "grid-cols-2" : "grid-cols-2 md:grid-cols-5")}>
              {caja.cantidad_cajas !== undefined && caja.cantidad_cajas !== null && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Cantidad cajas</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editData.cantidad_cajas}
                    onChange={(e) => setEditData({ ...editData, cantidad_cajas: e.target.value ? parseInt(e.target.value) : '' })}
                    className="h-9 text-sm tabular-nums"
                    disabled={!canEditOrden}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Piezas por caja </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editData.piezas_por_caja}
                  onChange={(e) => setEditData({ ...editData, piezas_por_caja: e.target.value ? parseInt(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">CBM (m³)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    value={editData.cbm}
                    onChange={(e) => setEditData({ ...editData, cbm: e.target.value ? parseFloat(e.target.value) : '' })}
                    className={cn("h-9 text-sm tabular-nums", Number(editData.largo_cm) > 0 && Number(editData.ancho_cm) > 0 && Number(editData.alto_cm) > 0 ? "pr-8" : "")}
                  />
                  {(Number(editData.largo_cm) > 0 && Number(editData.ancho_cm) > 0 && Number(editData.alto_cm) > 0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0.5 top-0.5 h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => {
                        const calculatedCbm = (Number(editData.largo_cm) * Number(editData.ancho_cm) * Number(editData.alto_cm)) / 1000000;
                        setEditData({ ...editData, cbm: Number(calculatedCbm.toFixed(3)) });
                      }}
                      title="Calcular CBM automáticamente desde L×A×A"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso Bruto (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.peso_bruto_kg}
                  onChange={(e) => setEditData({ ...editData, peso_bruto_kg: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso Neto (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.peso_neto}
                  onChange={(e) => setEditData({ ...editData, peso_neto: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Costo ($)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.costo_total_caja}
                    onChange={(e) => setEditData({ ...editData, costo_total_caja: e.target.value ? parseFloat(e.target.value) : '' })}
                    className="h-9 text-sm tabular-nums pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0.5 top-0.5 h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => {
                      if (!editData.piezas_por_caja || Number(editData.piezas_por_caja) <= 0) {
                        alert("Por favor ingresa primero las Piezas por Caja.")
                        return
                      }
                      
                      const tieneUsd = precioUnitarioUsd != null && precioUnitarioUsd > 0
                      const tieneMxn = precioEcMxn != null && precioEcMxn > 0

                      if (!tieneUsd && !tieneMxn) {
                        alert("Esta línea de producto no tiene un Precio Unitario (P.Unit) registrado en la orden ni un Precio EC en el catálogo base.")
                        return
                      }

                      const pz = Number(editData.piezas_por_caja)
                      let costoCalculado = 0

                      if (tieneUsd) {
                        // ESCENARIO A: Cálculo basado en COSTO USD
                        const tcInput = window.prompt("Se detectó COSTO USD. Ingresa el Tipo de Cambio (MXN por USD):", "17.5")
                        if (!tcInput) return
                        const tc = parseFloat(tcInput)
                        if (isNaN(tc) || tc <= 0) {
                          alert("Tipo de cambio inválido.")
                          return
                        }

                        const gananciaInput = window.prompt("Ingresa el % de ganancia extra (ej. 20 para 20%):", "20")
                        if (!gananciaInput) return
                        const ganancia = parseFloat(gananciaInput)
                        if (isNaN(ganancia) || ganancia < 0) {
                          alert("Porcentaje de ganancia inválido.")
                          return
                        }
                        
                        costoCalculado = (precioUnitarioUsd * pz * tc) * (1 + (ganancia / 100))
                      } else {
                        // ESCENARIO B: Cálculo basado en PRECIO EC (Venta MXN)
                        const descInput = window.prompt(`Se utilizará el Precio EC ($${precioEcMxn} MXN) como referencia. Ingresa el % de descuento mayorista para estimar el costo de pieza (ej. 30 para 30% de descuento, o 0 para usar el precio completo):`, "30")
                        if (descInput === null) return
                        const desc = parseFloat(descInput)
                        if (isNaN(desc) || desc < 0 || desc > 100) {
                          alert("Porcentaje de descuento inválido.")
                          return
                        }
                        costoCalculado = (precioEcMxn! * pz) * (1 - (desc / 100))
                      }

                      setEditData({ ...editData, costo_total_caja: Number(costoCalculado.toFixed(2)) })
                    }}
                    title="Auto-calcular Costo: (Precio USD × Pz × TC) + Ganancia"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Largo (cm)</Label>
                <Input
                  type="number"
                  value={editData.largo_cm}
                  onChange={(e) => setEditData({ ...editData, largo_cm: e.target.value ? parseInt(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Ancho (cm)</Label>
                <Input
                  type="number"
                  value={editData.ancho_cm}
                  onChange={(e) => setEditData({ ...editData, ancho_cm: e.target.value ? parseInt(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Alto (cm)</Label>
                <Input
                  type="number"
                  value={editData.alto_cm}
                  onChange={(e) => setEditData({ ...editData, alto_cm: e.target.value ? parseInt(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="p-5 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/50 shadow-sm space-y-4 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MultiTagInput 
                  label="Tallas de Caja (Resumen)"
                  placeholder="Buscar talla en catálogo..."
                  options={tallaOptions}
                  selectedValues={editData.tallas_summary}
                  onAdd={handleAddTallaSummary}
                  onRemove={handleRemoveTallaSummary}
                  freeText={false}
                />
                <MultiTagInput 
                  label="Colores de Caja (Resumen)"
                  placeholder="Colores separados por | o Enter..."
                  options={colorOptions}
                  selectedValues={editData.colores_summary}
                  onAdd={handleAddColorSummary}
                  onRemove={handleRemoveColorSummary}
                  freeText={true}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Modo Vista - KPIs Logísticos */
          <div className={cn(
            "grid gap-6",
            isVertical ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7"
          )}>
            {caja.cantidad_cajas !== undefined && caja.cantidad_cajas !== null && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Cantidad cajas</span>
                <p className="font-black text-xl tabular-nums leading-none">{caja.cantidad_cajas ?? 1}</p>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Pz / caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">{caja.piezas_por_caja ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">CBM / caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">{caja.cbm != null ? roundTo(caja.cbm, 6) : '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso bruto/caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {caja.peso_bruto_kg ? `${roundTo(caja.peso_bruto_kg, 3)} kg` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso neto/caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {caja.peso_neto ? `${roundTo(caja.peso_neto, 3)} kg` : '—'}
              </p>
            </div>
            {caja.costo_total_caja !== undefined && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Costo Caja</span>
                <p className="font-semibold text-foreground text-sm tabular-nums">
                  {formatCurrency(caja.costo_total_caja)}
                </p>
              </div>
            )}
            {caja.largo_cm && caja.ancho_cm && caja.alto_cm && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Dimensiones</span>
                <p className="font-semibold text-foreground text-[11px] tabular-nums leading-tight">
                  {caja.largo_cm}×{caja.ancho_cm}×{caja.alto_cm} cm
                </p>
              </div>
            )}
            <div className={cn(
              "space-y-1 p-2 rounded-md border",
              isVertical ? "bg-primary/10 border-primary/20 col-span-2" : "bg-primary/5 border-primary/10"
            )}>
              <span className={cn(
                "uppercase font-black tracking-widest block",
                isVertical ? "text-[8px] text-primary" : "text-[9px] text-primary/70"
              )}>Total Pz (est.)</span>
              <p className="font-black text-xl text-primary tabular-nums leading-none">{totalPiezasCalculado}</p>
            </div>
          </div>
        )}

        {/* Matriz de contenido - delegado a CajaMatriz */}
        {(caja.contenidoMap || isEditing) ? (
          <CajaMatriz
            isEditing={isEditing}
            isVertical={isVertical}
            contenidoMap={caja.contenidoMap}
            editTallas={editTallas}
            editFilas={editFilas}
            totalesEdicion={totalesEdicion}
            selectedTallaId={selectedTallaId}
            selectedColorId={selectedColorId}
            tallasDisponibles={tallasDisponibles}
            coloresDisponibles={coloresDisponibles}
            edadNombre={edadNombre}
            onAddTallaMatrix={handleAddTallaMatrix}
            onAddColorMatrix={handleAddColorMatrix}
            onRemoveTalla={handleRemoveTalla}
            onRemoveColor={handleRemoveColor}
            onCantidadChange={handleCantidadChange}
            onAutoRecommendTallas={handleAutoRecommendTallas}
            onAutoFillFila={handleAutoFillFila}
          />
        ) : (
          <CajaMatrizFallback tallas={caja.tallas} colores={caja.colores} />
        )}
      </CardContent>

      <ConfirmDeleteModal
        isOpen={showDeactivateModal}
        onOpenChange={setShowDeactivateModal}
        title="¿Desactivar caja?"
        elementName={`Caja: ${caja.codigo_caja} ${caja.nombre_pack ? `(${caja.nombre_pack})` : ''}`}
        onConfirm={async () => {
          if (onDeactivate) {
            await onDeactivate(caja.id)
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={showMarkPrincipalModal}
        onOpenChange={setShowMarkPrincipalModal}
        title="Marcar como caja principal"
        description="Solo una caja puede ser principal por producto. Si ya existe una caja principal marcada, será reemplazada automáticamente. La caja principal se utiliza para generar variantes de ecommerce (talla × color)."
        elementName={`Caja: ${caja.codigo_caja} ${caja.nombre_pack ? `(${caja.nombre_pack})` : ''}`}
        onConfirm={async () => {
          if (!onMarcarPrincipal || !productoId) return
          setIsMarkingPrincipal(true)
          try {
            const res = await onMarcarPrincipal(caja.id, productoId)
            if (res && typeof res === 'object' && 'success' in res && !res.success) {
              toast.error(res.error ?? 'No se pudo marcar la caja como principal')
            } else {
              // Éxito: mostrar toast principal
              toast.success(
                <div className="space-y-1.5">
                  <p className="font-medium">Caja <span className="font-mono">{caja.codigo_caja}</span> marcada como principal</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Si había otra caja principal, fue reemplazada automáticamente.
                    Ve al tab <strong className="text-foreground">Variantes</strong> y presiona <strong className="text-foreground">Generar desde caja</strong> para sincronizar las combinaciones de ecommerce.
                  </p>
                </div>,
                { duration: 6000 }
              )
              // Si hay warning (caja sin detalles), mostrar advertencia adicional
              if (res && typeof res === 'object' && 'error' in res && res.error) {
                toast.warning(res.error, { duration: 8000 })
              }
            }
          } catch (err) {
            toast.error('Error al marcar la caja como principal')
          } finally {
            setIsMarkingPrincipal(false)
            setShowMarkPrincipalModal(false)
          }
        }}
      />
    </Card>
  )
}
