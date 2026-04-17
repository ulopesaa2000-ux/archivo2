// components/admin/cajas/CajaCard.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Package, X, Check, Loader2, Plus, Trash, Calculator, Sparkles } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { SharedCajaData, SharedCajaContenidoMap } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { ColorCombobox } from './ColorCombobox'

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
  // Catálogos disponibles para agregar tallas/colores
  tallasDisponibles?: CatalogoItem[]
  coloresDisponibles?: CatalogoItem[]
  isNew?: boolean // Si es caja nueva (formulario vacío)
  onCreate?: (data: {
    base: Partial<SharedCajaData>
    detalles: { talla_id: number; color_id: number; cantidad: number }[]
  }) => Promise<void>
  edadNombre?: string | null
}


export function CajaCard({
  caja,
  layout = 'horizontal',
  onRemove,
  onDeactivate,
  onEdit,
  isPending = false,
  canEdit = true,
  tallasDisponibles = [],
  coloresDisponibles = [],
  isNew = false,
  onCreate,
  edadNombre
}: CajaCardProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isVertical = layout === 'vertical'

  // Estado temporal para edición de datos base
  const [editData, setEditData] = useState<any>({
    codigo_caja: caja.codigo_caja || '',
    nombre_pack: caja.nombre_pack || '',
    piezas_por_caja: caja.piezas_por_caja || 1,
    cbm: caja.cbm || '',
    peso_bruto_kg: caja.peso_bruto_kg || '',
    largo_cm: caja.largo_cm || '',
    ancho_cm: caja.ancho_cm || '',
    alto_cm: caja.alto_cm || '',
    costo_total_caja: caja.costo_total_caja || 1,
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
        piezas_por_caja: caja.piezas_por_caja || 1,
        cbm: caja.cbm || '',
        peso_bruto_kg: caja.peso_bruto_kg || '',
        largo_cm: caja.largo_cm || '',
        ancho_cm: caja.ancho_cm || '',
        alto_cm: caja.alto_cm || '',
        costo_total_caja: caja.costo_total_caja || 1,
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
            detalles.push({
              talla_id: talla.id,
              color_id: fila.colorId,
              cantidad
            })
          }
        })
      })

      const basePayload = { ...editData } as Record<string, any>;
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
    } catch (error) {
      console.error('Error guardando caja:', error)
      alert('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTalla = () => {
    if (!selectedTallaId) return
    const talla = tallasDisponibles.find(t => t.id === parseInt(selectedTallaId))
    if (!talla) return

    // Verificar si ya existe
    if (editTallas.some(t => t.id === talla.id)) {
      alert('Esta talla ya está agregada')
      return
    }

    setEditTallas([...editTallas, talla])

    // Inicializar cantidad 1 para esta talla en todas las filas existentes
    setEditFilas(prev => prev.map(fila => ({
      ...fila,
      cantidades: { ...fila.cantidades, [talla.nombre]: 1 }
    })))

    setSelectedTallaId('')
  }

  const handleAddColor = () => {
    if (!selectedColorId) return
    const color = coloresDisponibles.find(c => c.id === parseInt(selectedColorId))
    if (!color) return

    // Verificar si ya existe
    if (editFilas.some(f => f.colorId === color.id)) {
      alert('Este color ya está agregado')
      return
    }

    // Crear nueva fila con cantidades 0 para todas las tallas
    const nuevaFila: DetalleFila = {
      colorId: color.id,
      colorNombre: color.nombre,
      cantidades: {}
    }

    // Inicializar todas las tallas con 1
    editTallas.forEach(talla => {
      nuevaFila.cantidades[talla.nombre] = 1
    })

    setEditFilas([...editFilas, nuevaFila])
    setSelectedColorId('')
  }

  const handleRemoveTalla = (tallaId: number) => {
    const talla = editTallas.find(t => t.id === tallaId)
    if (!talla) return

    setEditTallas(editTallas.filter(t => t.id !== tallaId))

    // Eliminar esta talla de todas las filas
    setEditFilas(prev => prev.map(fila => {
      const { [talla.nombre]: _, ...rest } = fila.cantidades
      return { ...fila, cantidades: rest }
    }))
  }

  const handleRemoveColor = (colorId: number) => {
    setEditFilas(editFilas.filter(f => f.colorId !== colorId))
  }

  const handleCantidadChange = (colorId: number, tallaNombre: string, valor: string) => {
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
      ? ['TALLA 4', 'TALLA 6', 'TALLA 8', 'TALLA 10', 'TALLA 12', 'TALLA 14', 'TALLA 16']
      : ['CHICA', 'MEDIANA', 'GRANDE', 'EXTRA GRANDE']

    const tallasAgregar = tallasDisponibles.filter(
      t => sugerencias.includes(t.nombre.toUpperCase()) && !editTallas.some(et => et.id === t.id)
    )

    if (tallasAgregar.length === 0) {
      alert('Las tallas recomendadas ya están agregadas o no existen en el catálogo maestro.')
      return
    }

    setEditTallas(prev => [...prev, ...tallasAgregar])

    setEditFilas(prev => prev.map(fila => {
      const nuevasCantidades = { ...fila.cantidades }
      tallasAgregar.forEach(t => { nuevasCantidades[t.nombre] = 1 })
      return { ...fila, cantidades: nuevasCantidades }
    }))
  }

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
                </>
              )}
            </CardTitle>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditing(true)}
                  title="Editar configuración">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {onRemove && (
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
                {onDeactivate && !onRemove && (
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
            <div className={cn("grid gap-4", isVertical ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
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
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.peso_bruto_kg}
                  onChange={(e) => setEditData({ ...editData, peso_bruto_kg: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Costo ($)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.costo_total_caja}
                  onChange={(e) => setEditData({ ...editData, costo_total_caja: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="h-9 text-sm tabular-nums"
                />
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
          </div>
        ) : (
          /* Modo Vista - KPIs Logísticos */
          <div className={cn(
            "grid gap-6",
            isVertical ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6"
          )}>
            {caja.cantidad_cajas !== undefined && (
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
              <p className="font-semibold text-foreground text-sm tabular-nums">{caja.cbm ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso bruto/caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {caja.peso_bruto_kg ? `${caja.peso_bruto_kg} kg` : '—'}
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

        {/* Modo Edición - Controles para agregar tallas y colores */}
        {isEditing && (
          <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
            <div className={cn("grid gap-4", isVertical ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
              {/* Agregar Color */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Agregar Color
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ColorCombobox 
                      coloresDisponibles={coloresDisponibles} 
                      selectedColorId={selectedColorId} 
                      onSelect={(val) => setSelectedColorId(val)} 
                      disabledFilas={editFilas.map(f => f.colorId)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddColor}
                    disabled={!selectedColorId}
                    className="h-9 px-3 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="text-xs">Agregar</span>
                  </Button>
                </div>
              </div>

              {/* Agregar Talla */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                    Agregar Talla
                  </Label>
                  {edadNombre && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={handleAutoRecommendTallas} 
                      className="h-4 px-1 text-[9px] uppercase tracking-widest text-primary hover:text-primary/80 hover:bg-primary/10"
                      title="Sugerir tallas según edad del producto"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Auto Recomendado
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={selectedTallaId} onValueChange={(val) => setSelectedTallaId(val || '')}>
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <span className="truncate flex flex-1 text-left">
                        {selectedTallaId
                          ? tallasDisponibles.find(t => t.id.toString() === selectedTallaId)?.nombre
                          : <span className="text-muted-foreground">Seleccionar talla...</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {tallasDisponibles
                        .filter(t => !editTallas.some(et => et.id === t.id))
                        .map(talla => (
                          <SelectItem key={talla.id} value={talla.id.toString()} label={talla.nombre}>
                            {talla.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleAddTalla}
                    disabled={!selectedTallaId}
                    className="h-9 px-3 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="text-xs">Agregar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Matriz de contenido - Modo Vista o Edición */}
        {(caja.contenidoMap || isEditing) ? (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest border-b pb-1">
              {isEditing ? 'Distribución Editable Talla × Color' : `Distribución Talla × Color ${isVertical ? '' : '(por caja)'}`}
            </p>

            {isEditing ? (
              /* Modo Edición - Tabla Editable */
              <div className="overflow-x-auto rounded-lg border bg-background/50">
                <table className="text-[11px] border-collapse w-full">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border px-3 py-3 text-left font-bold text-muted-foreground uppercase w-48">
                        <span className="text-[10px] tracking-widest">COLOR \ TALLA</span>
                      </th>
                      {editTallas.map((talla) => (
                        <th key={talla.id} className="border px-2 py-3 text-center font-semibold text-foreground min-w-[80px] relative group">
                          <span className="text-sm">{talla.nombre}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTalla(talla.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                            title="Eliminar talla"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </th>
                      ))}
                      <th className="border px-3 py-3 text-center font-black bg-muted/60 w-20">
                        <span className="text-[10px] tracking-widest">TOTAL</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {editFilas.map((fila) => (
                      <tr key={fila.colorId} className="group hover:bg-muted/20 transition-colors">
                        <td className="border px-3 py-2 font-medium text-foreground flex items-center justify-between">
                          <span>{fila.colorNombre}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(fila.colorId)}
                            className="w-6 h-6 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar color"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </td>
                        {editTallas.map((talla) => (
                          <td key={talla.id} className="border px-2 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={fila.cantidades[talla.nombre] || ''}
                              onChange={(e) => handleCantidadChange(fila.colorId, talla.nombre, e.target.value)}
                              className="w-full h-8 text-center text-sm tabular-nums border-0 bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary p-1"
                            />
                          </td>
                        ))}
                        <td className="border px-3 py-2 text-center font-bold tabular-nums bg-muted/20 text-primary">
                          {totalesEdicion.totalPorFila[fila.colorNombre] || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border">
                      <td className="border px-3 py-3 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        TOTALES
                      </td>
                      {editTallas.map((talla) => (
                        <td key={talla.id} className="border px-2 py-3 text-center font-bold tabular-nums text-foreground">
                          {totalesEdicion.totalPorColumna[talla.nombre] || 0}
                        </td>
                      ))}
                      <td className="border px-3 py-3 text-center font-black tabular-nums bg-primary text-primary-foreground text-lg">
                        {totalesEdicion.totalGeneral}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {editFilas.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Agrega colores y tallas para configurar la distribución</p>
                  </div>
                )}
              </div>
            ) : (
              /* Modo Vista - Tabla de solo lectura */
              <div className="overflow-x-auto rounded-lg border bg-background/50">
                <table className="text-[11px] border-collapse w-full">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border px-3 py-2 text-left font-bold text-muted-foreground uppercase">Color \ Talla</th>
                      {caja.contenidoMap!.tallas.map((t) => (
                        <th key={t} className="border px-2 py-2 text-center font-bold text-foreground min-w-[45px]">
                          {t}
                        </th>
                      ))}
                      {!isVertical && <th className="border px-3 py-2 text-center font-black bg-muted/60">Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {caja.contenidoMap!.colores.map((color) => {
                      const fila = caja.contenidoMap!.matriz[color] ?? {}
                      const totalFila = Object.values(fila).reduce((a, b) => a + b, 0)
                      return (
                        <tr key={color} className="hover:bg-muted/30 transition-colors">
                          <td className="border px-3 py-2 font-bold text-foreground/80">{color}</td>
                          {caja.contenidoMap!.tallas.map((t) => (
                            <td key={t} className={cn("border px-2 py-2 text-center tabular-nums font-medium", (fila[t] ?? 0) === 0 ? "text-muted-foreground/30" : "text-foreground")}>
                              {fila[t] ?? 0}
                            </td>
                          ))}
                          {!isVertical && (
                            <td className="border px-3 py-2 text-center font-black tabular-nums bg-muted/30 text-primary/80">
                              {totalFila}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td className="border px-3 py-2 font-black uppercase">Total</td>
                      {caja.contenidoMap!.tallas.map((t) => {
                        const totalCol = caja.contenidoMap!.colores.reduce(
                          (sum, col) => sum + (caja.contenidoMap!.matriz[col]?.[t] ?? 0), 0
                        )
                        return (
                          <td key={t} className="border px-2 py-2 text-center font-black tabular-nums text-primary/80">
                            {totalCol}
                          </td>
                        )
                      })}
                      {!isVertical && (
                        <td className="border px-3 py-2 text-center font-black tabular-nums bg-primary text-primary-foreground">
                          {caja.contenidoMap!.totalPiezas}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Fallback simple */
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest border-b pb-1">
              Distribución Talla / Color
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">Tallas</span>
                <div className="flex flex-wrap gap-1">
                  {caja.tallas ? caja.tallas.split(/[|]|,/).map((t) => t.trim()).filter(Boolean).map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] py-0 h-5">{t}</Badge>
                  )) : <span className="text-xs text-muted-foreground italic">No definidas</span>}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">Colores</span>
                <div className="flex flex-wrap gap-1">
                  {caja.colores ? caja.colores.split(/[|]|,/).map((cl) => cl.trim()).filter(Boolean).map((cl, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] py-0 h-5 font-normal">{cl}</Badge>
                  )) : <span className="text-xs text-muted-foreground italic">No definidos</span>}
                </div>
              </div>
            </div>
          </div>
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
    </Card>
  )
}
