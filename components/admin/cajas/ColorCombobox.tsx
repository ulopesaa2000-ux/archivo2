'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Plus, Loader2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { createColorAction } from '@/modules/catalogo/actions'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'

interface ColorComboboxProps {
  coloresDisponibles: CatalogoItem[]
  selectedColorId: string
  onSelect: (val: string) => void
  disabledFilas: number[] // IDs ya agregados
}

// Algoritmo de sugerencia
function inferirHexYCodigo(nombre: string) {
  const norm = nombre.trim().toUpperCase()
  // Asignar código: tomar primeras 3 letras (o consonantes)
  let codigoSugerido = norm.replace(/[^A-Z]/g, '').slice(0, 3)
  if (codigoSugerido.length < 2) codigoSugerido = 'COL'

  // Asignar HEX base simple
  const map: Record<string, string> = {
    'ROJO': '#FF0000',
    'AZUL': '#0000FF',
    'VERDE': '#00FF00',
    'AMARILLO': '#FFFF00',
    'BLANCO': '#FFFFFF',
    'NEGRO': '#000000',
    'GRIS': '#808080',
    'NARANJA': '#FFA500',
    'ROSA': '#FFC0CB',
    'MORADO': '#800080',
    'VINO': '#800000',
    'CAFE': '#8B4513',
    'BEIGE': '#F5F5DC',
    'AQUA': '#00FFFF',
    'MARINO': '#000080',
    'MOSTAZA': '#FFDB58',
    'OLIVO': '#808000',
  }
  
  let hexSugerido = '#000000' // default
  for (const [key, hex] of Object.entries(map)) {
    if (norm.includes(key)) {
      hexSugerido = hex
      break
    }
  }

  // Hacer el código de color dinámico basándose en la palabra principal
  const palabras = norm.split(' ')
  if (palabras.length > 1) {
    codigoSugerido = palabras.map(p => p[0]).join('').slice(0, 3)
  }

  let tipoSugerido = 'SOLIDO'
  
  if (norm.includes('ESTAMPADO') || norm.includes('CAMUFLAJE') || norm.includes('LEOPARDO')) {
    tipoSugerido = 'ESTAMPADO'
  } else if (norm.includes('MEZCLA') || norm.includes('HEATHER') || norm.includes('MELANGE')) {
    tipoSugerido = 'MEZCLA'
  } else if (norm.includes('REFLECTANTE')) {
    tipoSugerido = 'REFLECTANTE'
  } else if (norm.includes('/')) {
    tipoSugerido = 'DOBLE'
  }

  // Si es doble intentar crear un código compuesto AB/CD
  if (tipoSugerido === 'DOBLE' && norm.includes('/')) {
    const partes = norm.split('/')
    if (partes.length === 2) {
      const p1 = partes[0].trim().replace(/[^A-Z]/g, '').slice(0, 3)
      const p2 = partes[1].trim().replace(/[^A-Z]/g, '').slice(0, 3)
      codigoSugerido = `${p1}-${p2}`
    }
  }

  return { codigo: codigoSugerido, hex_code: hexSugerido, tipo: tipoSugerido }
}


export function ColorCombobox({ coloresDisponibles, selectedColorId, onSelect, disabledFilas }: ColorComboboxProps) {
  const router = useRouter()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [nuevoHex, setNuevoHex] = useState('#000000')
  const [nuevoTipoColor, setNuevoTipoColor] = useState('SOLIDO')
  const [isCreating, setIsCreating] = useState(false)

  // Filtrar colores disponibles que no se han agregado
  const opciones = useMemo(() => {
    return coloresDisponibles.filter(c => !disabledFilas.includes(c.id))
  }, [coloresDisponibles, disabledFilas])

  const selectedColor = coloresDisponibles.find(c => c.id.toString() === selectedColorId)

  // Handlers para crear nuevo color
  const handleOpenModal = () => {
    setOpenCombobox(false)
    setNuevoNombre(search)
    sugerirDesdeNombre(search)
    setOpenModal(true)
  }

  const sugerirDesdeNombre = (val: string) => {
    if (!val) return
    const { codigo, hex_code, tipo } = inferirHexYCodigo(val)
    setNuevoCodigo(codigo)
    setNuevoHex(hex_code)
    setNuevoTipoColor(tipo)
  }

  const handleCrearColor = async () => {
    if (!nuevoNombre || !nuevoCodigo) {
      toast.error('Nombre y Código son obligatorios')
      return
    }

    setIsCreating(true)
    try {
      const res = await createColorAction(nuevoNombre, nuevoCodigo, nuevoHex, nuevoTipoColor)
      if (res.success && res.id) {
        toast.success(`Color "${nuevoNombre}" creado exitosamente`)
        setOpenModal(false)
        onSelect(res.id.toString())
        router.refresh()
      } else {
        toast.error(res.error || 'Error al crear color')
      }
    } catch (e) {
      toast.error('Ocurrió un error inesperado al intentar crear el color')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
        <PopoverTrigger render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openCombobox}
            className="flex-1 h-9 text-sm justify-between w-full truncate border-input bg-background hover:bg-accent hover:text-accent-foreground"
          />
        }>
          <span className="truncate">
            {selectedColor ? selectedColor.nombre : <span className="text-muted-foreground">Seleccionar color...</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar color..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm">
                <p className="text-muted-foreground mb-3">No se encontraron resultados.</p>
                <Button variant="secondary" size="sm" onClick={handleOpenModal} className="w-[80%]">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar &quot;{debouncedSearch || search}&quot;
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {opciones.map((color) => (
                  <CommandItem
                    key={color.id}
                    value={color.nombre}
                    onSelect={() => {
                      onSelect(color.id.toString())
                      setOpenCombobox(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        selectedColorId === color.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {color.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Color</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="nombre_color" className="text-xs uppercase font-bold text-muted-foreground">Nombre</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => sugerirDesdeNombre(nuevoNombre)}
                  className="h-6 px-2 text-[10px] text-primary"
                  title="Auto sugerir Código y HEX"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Sugerir código
                </Button>
              </div>
              <Input
                id="nombre_color"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. ROJO FERRARI"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_color" className="text-xs uppercase font-bold text-muted-foreground">Código (Abrev.)</Label>
                <Input
                  id="codigo_color"
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej. ROJ"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hex_color" className="text-xs uppercase font-bold text-muted-foreground">Color Hex</Label>
                <div className="flex gap-2">
                  <Input
                    id="hex_color"
                    type="color"
                    value={nuevoHex}
                    onChange={(e) => setNuevoHex(e.target.value)}
                    className="w-12 p-1 px-2 h-9"
                  />
                  <Input
                    value={nuevoHex.toUpperCase()}
                    onChange={(e) => setNuevoHex(e.target.value)}
                    placeholder="#000000"
                    maxLength={7}
                    className="flex-1 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_color" className="text-xs uppercase font-bold text-muted-foreground">Tipo de Color</Label>
              <Select value={nuevoTipoColor} onValueChange={(val) => setNuevoTipoColor(val || 'SOLIDO')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOLIDO">SOLIDO (Liso Normal)</SelectItem>
                  <SelectItem value="DOBLE">DOBLE (Combos ej: Negro/Rojo)</SelectItem>
                  <SelectItem value="ESTAMPADO">ESTAMPADO (Patrones)</SelectItem>
                  <SelectItem value="MEZCLA">MEZCLA (Heather/Jaspeado)</SelectItem>
                  <SelectItem value="REFLECTANTE">REFLECTANTE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCrearColor} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Color
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
