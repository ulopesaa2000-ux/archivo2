// app/(admin)/catalogo/[id]/components/TabMedidas.tsx
'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Ruler, Edit2, Check, Loader2, Package, Trash, Sparkles, Wand2, Info } from 'lucide-react'
import type { MedidaResuelta } from '@/modules/catalogo/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CAT_TALLAS_MAESTRO } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { saveMedidasAction } from '@/modules/catalogo/actions'
import { toast } from 'sonner'

type TallaOption = { id: number; nombre: string; codigo: string }
type PuntoOption = { id: number; punto_medida: string }

export function TabMedidas({ 
  medidas, 
  puntosCat,
  productoId,
  edadNombre,
  tipoPrendaNombre
}: { 
  medidas: MedidaResuelta[]
  puntosCat: any[]
  productoId: number
  edadNombre?: string | null
  tipoPrendaNombre?: string | null
}) {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm')
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Estado del editor (columnas = tallas, filas = puntos)
  const [editTallas, setEditTallas] = useState<TallaOption[]>([])
  const [editPuntos, setEditPuntos] = useState<PuntoOption[]>([])
  const [editMatrix, setEditMatrix] = useState<Record<string, Record<string, string>>>({})

  // Estado del Autocompletado
  const [autoFillIncrement, setAutoFillIncrement] = useState('1.5')
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false)

  // Mapa de tipo_prenda a clasificacion
  const prendaClasificacionMap: Record<string, 'SUPERIOR' | 'INFERIOR' | 'AMBAS'> = useMemo(() => ({
    'ABRIGO': 'SUPERIOR',
    'CAMISA/BLUSA': 'SUPERIOR',
    'CAMISA': 'SUPERIOR',
    'CHALECO': 'SUPERIOR',
    'CHAMARRA': 'SUPERIOR',
    'GABARDINA': 'SUPERIOR',
    'PLAYERA': 'SUPERIOR',
    'ROMPEVIENTOS': 'SUPERIOR',
    'SACO': 'SUPERIOR',
    'SUDADERA': 'SUPERIOR',
    'SUETER': 'SUPERIOR',
    'SOBRECAMISA': 'SUPERIOR',
    'PANTALON MAYON': 'INFERIOR',
    'PANTALON': 'INFERIOR',
    'SHORT': 'INFERIOR',
    'FALDA': 'INFERIOR',
    'SET': 'AMBAS',
    'VESTIDO': 'AMBAS'
  }), [])

  // Inicializar estado de edición a partir de los datos existentes
  const initEditData = () => {
    const tSet = new Map<string, TallaOption>()
    const pSet = new Map<string, PuntoOption>()
    const matrix: Record<string, Record<string, string>> = {}

    for (const m of medidas) {
      if (m.talla_codigo) {
        const cat = CAT_TALLAS_MAESTRO.find(c => c.codigo === m.talla_codigo)
        if (cat) tSet.set(m.talla_codigo, { id: cat.id, nombre: cat.nombre, codigo: m.talla_codigo })
      }
      if (m.punto_medida) {
        const pCat = puntosCat.find(p => p.punto_medida === m.punto_medida)
        if (pCat) pSet.set(m.punto_medida, { id: pCat.id, punto_medida: m.punto_medida })
      }

      if (m.punto_medida && m.talla_codigo && m.medida_cm !== null) {
        if (!matrix[m.punto_medida]) matrix[m.punto_medida] = {}
        matrix[m.punto_medida][m.talla_codigo] = String(m.medida_cm)
      }
    }

    setEditTallas(Array.from(tSet.values()).sort((a,b) => a.id - b.id))
    setEditPuntos(Array.from(pSet.values()))
    setEditMatrix(matrix)
  }

  // Toggle Edit Mode
  const toggleEdit = () => {
    if (!isEditing) {
      initEditData()
    }
    setIsEditing(!isEditing)
  }

  // Manejo de valores en la matriz
  const handleMatrixChange = (punto: string, talla: string, val: string) => {
    setEditMatrix((prev) => ({
      ...prev,
      [punto]: {
        ...(prev[punto] || {}),
        [talla]: val,
      },
    }))
  }

  const handleAddTalla = (tallaIdStr: string) => {
    const id = parseInt(tallaIdStr)
    const cat = CAT_TALLAS_MAESTRO.find(c => c.id === id)
    if (cat && !editTallas.some(t => t.id === id)) {
      setEditTallas(prev => [...prev, { id: cat.id, nombre: cat.nombre, codigo: cat.codigo }].sort((a,b) => a.id - b.id))
    }
  }

  const handleAddPunto = (puntoIdStr: string) => {
    const id = parseInt(puntoIdStr)
    const cat = puntosCat.find(p => p.id === id)
    if (cat && !editPuntos.some(p => p.id === id)) {
      setEditPuntos(prev => [...prev, { id: cat.id, punto_medida: cat.punto_medida }])
    }
  }

  const handleRemoveTalla = (tallaCodigo: string) => {
    setEditTallas(prev => prev.filter(t => t.codigo !== tallaCodigo))
  }

  const handleRemovePunto = (puntoMedida: string) => {
    setEditPuntos(prev => prev.filter(p => p.punto_medida !== puntoMedida))
  }

  const handleAutoRecommendTallas = () => {
    if (!edadNombre) return
    const txt = edadNombre.toLowerCase()
    const isInfantil = txt.includes('infantil') || txt.includes('joven') || txt.includes('adolecente')
    
    let sugerencias = isInfantil
      ? ['TALLA 4', 'TALLA 6', 'TALLA 8', 'TALLA 10', 'TALLA 12', 'TALLA 14', 'TALLA 16']
      : ['CHICA', 'MEDIANA', 'GRANDE', 'EXTRA GRANDE']

    const tallasAgregar = CAT_TALLAS_MAESTRO.filter(
      t => sugerencias.includes(t.nombre.toUpperCase()) && !editTallas.some(et => et.id === t.id)
    )

    if (tallasAgregar.length === 0) {
      toast.info('Las tallas recomendadas ya están agregadas o no existen.')
      return
    }

    setEditTallas(prev => [...prev, ...tallasAgregar.map(t => ({ id: t.id, nombre: t.nombre, codigo: t.codigo }))].sort((a,b) => a.id - b.id))
  }

  const handleAutoRecommendPuntos = () => {
    if (!tipoPrendaNombre) return
    const clasificacionPrenda = prendaClasificacionMap[tipoPrendaNombre.toUpperCase()]
    if (!clasificacionPrenda) {
      toast.info('No se encontró clasificación (SUPERIOR/INFERIOR) para este tipo de prenda.')
      return
    }

    const puntosAgregar = puntosCat.filter(p => {
      // Si la prenda es AMBAS, agregamos tanto SUPERIOR como INFERIOR (prácticamente todos los clasificados)
      // Si la prenda es SUPERIOR o INFERIOR, agregamos solo los que coincidan con su clasificación
      if (clasificacionPrenda === 'AMBAS') {
        return (p.clasificacion === 'SUPERIOR' || p.clasificacion === 'INFERIOR') && !editPuntos.some(ep => ep.id === p.id)
      } else {
        return p.clasificacion === clasificacionPrenda && !editPuntos.some(ep => ep.id === p.id)
      }
    })

    if (puntosAgregar.length === 0) {
      toast.info('Los puntos de medida recomendados ya están agregados o no hay disponibles.')
      return
    }

    setEditPuntos(prev => [...prev, ...puntosAgregar.map(p => ({ id: p.id, punto_medida: p.punto_medida }))])
  }

  const handleAutoFillMedidas = () => {
    if (editTallas.length < 2) {
      toast.error('Necesitas al menos dos tallas para autocompletar.')
      return
    }

    const increment = parseFloat(autoFillIncrement)
    if (isNaN(increment)) {
      toast.error('El incremento debe ser un número válido.')
      return
    }

    setEditMatrix(prev => {
      const newMatrix = { ...prev }
      const firstTallaCode = editTallas[0].codigo

      for (const punto of editPuntos) {
        const pm = punto.punto_medida
        const firstValStr = prev[pm]?.[firstTallaCode]
        
        if (firstValStr && !isNaN(Number(firstValStr))) {
          const firstVal = Number(firstValStr)
          
          if (!newMatrix[pm]) newMatrix[pm] = {}
          
          for (let i = 1; i < editTallas.length; i++) {
            const tallaCode = editTallas[i].codigo
            const calculatedVal = firstVal + (increment * i)
            newMatrix[pm][tallaCode] = calculatedVal.toString()
          }
        }
      }
      return newMatrix
    })

    setIsAutoFillOpen(false)
    toast.success(`Medidas autocompletadas (+${increment}cm por talla)`)
  }

  const handleSave = () => {
    startTransition(async () => {
      const payload: { talla_id: number; punto_medida_id: number; medida_cm: number }[] = []
      
      for (const punto of editPuntos) {
        for (const talla of editTallas) {
          const val = editMatrix[punto.punto_medida]?.[talla.codigo]
          if (val && !isNaN(Number(val))) {
            const numVal = Number(val)
            if (numVal > 0) {
              payload.push({
                talla_id: talla.id,
                punto_medida_id: punto.id,
                medida_cm: numVal
              })
            }
          }
        }
      }

      const res = await saveMedidasAction(productoId, payload)
      if (res.success) {
        toast.success('Medidas actualizadas correctamente')
        setIsEditing(false)
      } else {
        toast.error(res.error || 'Error al guardar las medidas')
      }
    })
  }

  // Pivotar para la vista de lectura (igual que antes)
  const viewData = useMemo(() => {
    const tallasSet = new Set<string>()
    const puntosSet = new Set<string>()
    const data: Record<string, Record<string, number | null>> = {}

    for (const m of medidas) {
      const talla = m.talla_codigo ?? '—'
      const punto = m.punto_medida ?? '—'
      tallasSet.add(talla)
      puntosSet.add(punto)
      if (!data[punto]) data[punto] = {}
      data[punto][talla] = unit === 'cm' ? m.medida_cm : m.medida_ft
    }

    return {
      tallas: Array.from(tallasSet),
      puntos: Array.from(puntosSet),
      data
    }
  }, [medidas, unit])

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row justify-between items-center bg-muted/40 py-3 px-5 border-b">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold tracking-tight uppercase">Medidas del Producto</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={toggleEdit}
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Editar Medidas
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={toggleEdit}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Guardar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-6">
        {isEditing ? (
          <div className={cn(
            "p-5 rounded-xl border-2 shadow-sm space-y-4 transition-all",
            "border-zinc-300 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-950/40"
          )}>
            {/* Header del bloque Matriz */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Matriz de Medidas (en centímetros)
                </h4>
                {editTallas.length > 1 && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Info className="h-3 w-3 text-blue-500" />
                    Rellena la primera columna de la talla más chica para autocompletar las demás.
                  </p>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-4 bg-muted/20 p-2 rounded-lg border">
                
                {editTallas.length > 1 && editPuntos.length > 0 && (
                  <Popover open={isAutoFillOpen} onOpenChange={setIsAutoFillOpen}>
                    <PopoverTrigger className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), "h-8 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800")}>
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Autocompletar
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4" align="end">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-blue-500" />
                            Autocompletar Medidas
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Agrega automáticamente esta cantidad de centímetros extra por cada talla adicional hacia la derecha, tomando como base la primera columna ({editTallas[0]?.codigo}).
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label htmlFor="increment" className="text-xs">Aumento por talla (cm)</Label>
                            <Input 
                              id="increment" 
                              type="number" 
                              step="0.5" 
                              value={autoFillIncrement} 
                              onChange={(e) => setAutoFillIncrement(e.target.value)} 
                              className="h-8 mt-1"
                            />
                          </div>
                          <Button onClick={handleAutoFillMedidas} size="sm" className="mt-5 bg-blue-600 hover:bg-blue-700 text-white">
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground whitespace-nowrap">Agregar Talla:</Label>
                  <Select value={""} onValueChange={(val) => val && handleAddTalla(val)}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CAT_TALLAS_MAESTRO
                        .filter(t => !editTallas.some(et => et.id === t.id))
                        .map(t => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.nombre}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  {edadNombre && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAutoRecommendTallas} 
                      className="h-8 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Sugerir
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground whitespace-nowrap">Agregar Punto:</Label>
                  <Select value={""} onValueChange={(val) => val && handleAddPunto(val)}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Seleccionar punto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {puntosCat
                        .filter(p => !editPuntos.some(ep => ep.id === p.id))
                        .map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.punto_medida}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  {tipoPrendaNombre && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAutoRecommendPuntos} 
                      className="h-8 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Sugerir
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {editTallas.length > 0 || editPuntos.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border bg-background/50">
                <table className="text-[11px] border-collapse w-full">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="border px-3 py-3 text-left font-bold text-muted-foreground uppercase w-48">
                        <span className="text-[10px] tracking-widest">Punto \ Talla</span>
                      </th>
                      {editTallas.map((talla) => (
                        <th key={talla.codigo} className="border px-2 py-3 text-center font-semibold text-foreground min-w-[80px] relative group">
                          <span className="text-sm">{talla.codigo}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTalla(talla.codigo)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                            title="Eliminar talla"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {editPuntos.map((punto) => (
                      <tr key={punto.id} className="group hover:bg-muted/20 transition-colors">
                        <td className="border px-3 py-2 font-medium text-foreground flex items-center justify-between">
                          <span>{punto.punto_medida}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePunto(punto.punto_medida)}
                            className="w-6 h-6 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            title="Eliminar punto de medida"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </td>
                        {editTallas.map((talla) => (
                          <td key={talla.codigo} className="border px-2 py-2">
                            <Input
                              type="number"
                              step="0.5"
                              value={editMatrix[punto.punto_medida]?.[talla.codigo] || ''}
                              onChange={(e) => handleMatrixChange(punto.punto_medida, talla.codigo, e.target.value)}
                              className="w-full h-8 text-center text-sm tabular-nums border-0 bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary p-1"
                              placeholder="—"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {editPuntos.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Ruler className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Agrega puntos de medida para configurar la tabla</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center text-muted-foreground border border-dashed rounded-lg">
                <Ruler className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Agrega Tallas y Puntos de Medida para configurar la tabla</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {medidas.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Ruler className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Sin medidas configuradas.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button variant={unit === 'cm' ? 'default' : 'outline'} size="sm" onClick={() => setUnit('cm')}>CM</Button>
                  <Button variant={unit === 'ft' ? 'default' : 'outline'} size="sm" onClick={() => setUnit('ft')}>Pulgadas</Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="text-sm border-collapse w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="font-bold text-left p-3 min-w-[150px] uppercase text-[10px] tracking-wider text-muted-foreground">Punto de Medida</th>
                        {viewData.tallas.map((t) => (
                          <th key={t} className="font-bold text-center p-2 min-w-[80px] uppercase text-[10px] tracking-wider border-l text-muted-foreground">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewData.puntos.map((punto) => (
                        <tr key={punto} className="hover:bg-muted/10">
                          <td className="p-3 font-semibold text-xs border-r">{punto}</td>
                          {viewData.tallas.map((t) => (
                            <td key={t} className="p-2 text-center text-xs tabular-nums border-r">
                              {viewData.data[punto]?.[t] !== undefined && viewData.data[punto]?.[t] !== null ? (
                                <span className="font-medium text-foreground">{viewData.data[punto]?.[t]} {unit}</span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
