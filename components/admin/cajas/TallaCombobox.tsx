'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
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
import type { CatalogoItem } from '@/modules/catalogo/types'
import { createTallaAction } from '@/modules/catalogo/actions'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'

interface TallaComboboxProps {
  tallasDisponibles: CatalogoItem[]
  selectedTallaId: string
  onSelect: (val: string) => void
  disabledFilas?: number[]
}

export function TallaCombobox({
  tallasDisponibles,
  selectedTallaId,
  onSelect,
  disabledFilas = [],
}: TallaComboboxProps) {
  const router = useRouter()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Filtrar tallas disponibles que no están deshabilitadas
  const opciones = useMemo(() => {
    return tallasDisponibles.filter(t => !disabledFilas.includes(t.id))
  }, [tallasDisponibles, disabledFilas])

  const selectedTalla = tallasDisponibles.find(t => t.id.toString() === selectedTallaId)

  // Suggest code from name
  const sugerirCodigo = (val: string) => {
    if (!val) return
    const norm = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    setNuevoCodigo(norm.slice(0, 6))
  }

  const handleOpenModal = () => {
    setOpenCombobox(false)
    setNuevoNombre(search)
    sugerirCodigo(search)
    setOpenModal(true)
  }

  const handleCrearTalla = async () => {
    if (!nuevoNombre || !nuevoCodigo) {
      toast.error('Nombre y Código son obligatorios')
      return
    }

    setIsCreating(true)
    try {
      const res = await createTallaAction(nuevoNombre, nuevoCodigo)
      if (res.success && res.id) {
        toast.success(`Talla "${nuevoNombre}" creada exitosamente`)
        setOpenModal(false)
        onSelect(res.id.toString())
        router.refresh()
      } else {
        toast.error(res.error || 'Error al crear talla')
      }
    } catch (e) {
      toast.error('Ocurrió un error inesperado al intentar crear la talla')
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
            {selectedTalla ? selectedTalla.nombre : <span className="text-muted-foreground">Seleccionar talla...</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar talla..."
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
                {opciones.map((talla) => (
                  <CommandItem
                    key={talla.id}
                    value={talla.nombre}
                    onSelect={() => {
                      onSelect(talla.id.toString())
                      setOpenCombobox(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        selectedTallaId === talla.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {talla.nombre}
                    {talla.codigo && (
                      <span className="ml-2 text-muted-foreground text-xs">{talla.codigo}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Talla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_talla" className="text-xs uppercase font-bold text-muted-foreground">Nombre</Label>
              <Input
                id="nombre_talla"
                value={nuevoNombre}
                onChange={(e) => {
                  setNuevoNombre(e.target.value)
                  sugerirCodigo(e.target.value)
                }}
                placeholder="Ej. EXTRA GRANDE"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_talla" className="text-xs uppercase font-bold text-muted-foreground">Código</Label>
              <Input
                id="codigo_talla"
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. XL"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCrearTalla} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Talla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}