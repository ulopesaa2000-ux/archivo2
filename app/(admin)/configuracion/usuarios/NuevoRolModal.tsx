// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\configuracion\usuarios\NuevoRolModal.tsx
'use client'

import React, { useState, useTransition } from 'react'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { crearRolAction } from '@/modules/config/actions'
import type { ModuloPermiso } from '@/modules/config/types'
import { toast } from 'sonner'

const AREAS: { id: string; label: string; modules: ModuloPermiso[] }[] = [
  { id: 'catalogo', label: 'Catalogo', modules: ['catalogo_productos', 'catalogo_catalogos', 'catalogo_imagenes', 'catalogo_familias'] },
  { id: 'inventario', label: 'Inventario', modules: ['inventario_stock', 'inventario_notas', 'inventario_bodegas', 'inventario_virtual'] },
  { id: 'b2b', label: 'Ordenes B2B', modules: ['b2b_ordenes', 'b2b_cajas', 'b2b_contenedores', 'despachos'] },
  { id: 'ecommerce', label: 'Ecommerce', modules: ['ecommerce_catalogo', 'ecommerce_ordenes', 'ecommerce_config'] },
  { id: 'config', label: 'Configuracion', modules: ['config_usuarios', 'config_roles', 'config_auditoria_productos', 'config_tablas'] },
]

export function NuevoRolModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nivelAcceso, setNivelAcceso] = useState('2')
  const [areasSeleccionadas, setAreasSeleccionadas] = useState<string[]>([])

  const reset = () => {
    setNombre('')
    setDescripcion('')
    setNivelAcceso('2')
    setAreasSeleccionadas([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) return toast.error('El nombre es obligatorio')

    startTransition(async () => {
      const permisosFinales = AREAS.flatMap((area) => {
        if (!areasSeleccionadas.includes(area.id)) return []
        return area.modules.map((modulo) => ({
          modulo,
          puede_leer: true,
          puede_crear: nivelAcceso === '1',
          puede_editar: nivelAcceso === '1',
          puede_eliminar: nivelAcceso === '1',
        }))
      })

      const res = await crearRolAction(nombre, descripcion, parseInt(nivelAcceso, 10), permisosFinales)

      if (res.success) {
        toast.success('Rol creado correctamente')
        setIsOpen(false)
        reset()
      } else {
        toast.error(res.error || 'Error al crear el rol')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(value) => { setIsOpen(value); if (!value) reset() }}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Nuevo Rol
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre del Rol</Label>
              <Input
                id="nombre"
                placeholder="Ej. Auditor de Inventario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Input
                id="descripcion"
                placeholder="Responsabilidades principales"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nivel">Nivel de Acceso</Label>
              <Select value={nivelAcceso} onValueChange={(value) => setNivelAcceso(value || '2')}>
                <SelectTrigger id="nivel">
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Nivel 1 - Super Admin</SelectItem>
                  <SelectItem value="2">Nivel 2 - Administrador</SelectItem>
                  <SelectItem value="3">Nivel 3 - Operativo</SelectItem>
                  <SelectItem value="4">Nivel 4 - Consulta</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] italic text-muted-foreground">
                Nivel 1 activa CRUD completo. Niveles 2+ inician solo con lectura en las areas seleccionadas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Permisos por areas</Label>
            <div className="grid grid-cols-2 gap-4">
              {AREAS.map((area) => (
                <div key={area.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`area-${area.id}`}
                    checked={areasSeleccionadas.includes(area.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setAreasSeleccionadas([...areasSeleccionadas, area.id])
                      else setAreasSeleccionadas(areasSeleccionadas.filter((id) => id !== area.id))
                    }}
                  />
                  <Label htmlFor={`area-${area.id}`} className="cursor-pointer text-sm font-medium leading-none">
                    {area.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Rol
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
