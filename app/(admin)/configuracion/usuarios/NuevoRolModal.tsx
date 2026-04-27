'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
  SelectValue 
} from '@/components/ui/select'
import { MODULO_LABELS, MODULOS_ORDEN, type ModuloPermiso } from '@/modules/config/types'
import { crearRolAction } from '@/modules/config/actions'
import { toast } from 'sonner'

// Áreas grandes para simplificar el formulario
const AREAS = [
  { id: 'catalogo', label: 'Catálogo', modules: ['catalogo_productos', 'catalogo_catalogos'] },
  { id: 'inventario', label: 'Inventario', modules: ['inventario_stock', 'inventario_notas', 'inventario_bodegas'] },
  { id: 'b2b', label: 'Órdenes B2B', modules: ['b2b_ordenes', 'b2b_contenedores'] },
  { id: 'ecommerce', label: 'Ecommerce', modules: ['ecommerce_catalogo', 'ecommerce_ordenes'] },
  { id: 'config', label: 'Configuración', modules: ['config_usuarios', 'config_roles'] },
]

export function NuevoRolModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Campos del rol
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nivelAcceso, setNivelAcceso] = useState('2')
  
  // Selección de áreas (para permisos rápidos)
  // Al seleccionar un área, se le asignarán permisos según el nivel de acceso
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
      // Construir la lista de permisos final
      // Si el área está seleccionada:
      // - Nivel 1: CRUD completo (leer, crear, editar, eliminar)
      // - Nivel 2 o +: Solo lectura (leer) para empezar (el usuario puede editar luego)
      const permisosFinales: { modulo: ModuloPermiso; puede_leer: boolean; puede_crear: boolean; puede_editar: boolean; puede_eliminar: boolean }[] = []

      AREAS.forEach(area => {
        if (areasSeleccionadas.includes(area.id)) {
          area.modules.forEach(modId => {
            const mod = modId as ModuloPermiso
            permisosFinales.push({
              modulo: mod,
              puede_leer: true,
              puede_crear: nivelAcceso === '1',
              puede_editar: nivelAcceso === '1',
              puede_eliminar: nivelAcceso === '1'
            })
          })
        }
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
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) reset(); }}>
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
              <Label htmlFor="descripcion">Descripción</Label>
              <Input 
                id="descripcion" 
                placeholder="Breve explicación de las responsabilidades" 
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nivel">Nivel de Acceso</Label>
              <Select value={nivelAcceso} onValueChange={(val) => setNivelAcceso(val || '2')}>
                <SelectTrigger id="nivel">
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Nivel 1 - Super Admin (Acceso Total)</SelectItem>
                  <SelectItem value="2">Nivel 2 - Administrador (Gestión)</SelectItem>
                  <SelectItem value="3">Nivel 3 - Operativo (Uso diario)</SelectItem>
                  <SelectItem value="4">Nivel 4 - Consulta (Solo lectura)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                * Los niveles 1 y 2 suelen tener acceso automático a todas las bodegas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Permisos por Áreas</Label>
            <p className="text-xs text-muted-foreground mb-4">
              Selecciona las áreas a las que este rol tendrá acceso inicial.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {AREAS.map((area) => (
                <div key={area.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`area-${area.id}`} 
                    checked={areasSeleccionadas.includes(area.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setAreasSeleccionadas([...areasSeleccionadas, area.id])
                      else setAreasSeleccionadas(areasSeleccionadas.filter(id => id !== area.id))
                    }}
                  />
                  <Label 
                    htmlFor={`area-${area.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {area.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-md border text-[11px] text-muted-foreground">
              <span className="font-bold block mb-1">Resumen de lógica:</span>
              • Si el nivel es 1: Se activará Leer, Crear, Editar y Eliminar en los módulos del área.<br/>
              • Si el nivel es 2+: Se activará solo Lectura (podrás ajustar el resto manualmente después).
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
