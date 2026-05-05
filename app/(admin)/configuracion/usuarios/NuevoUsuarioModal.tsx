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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { crearUsuarioAction } from '@/modules/config/actions'
import type { RolConPermisos } from '@/modules/config/types'
import { toast } from 'sonner'

export function NuevoUsuarioModal({ roles }: { roles: RolConPermisos[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState('')

  const reset = () => {
    setNombreCompleto('')
    setEmail('')
    setPassword('')
    setRolId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCompleto || !email || !password || !rolId) {
      return toast.error('Todos los campos son obligatorios')
    }
    
    if (password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres')
    }

    startTransition(async () => {
      const res = await crearUsuarioAction({
        nombreCompleto,
        email,
        password,
        rolId: parseInt(rolId, 10)
      })
      
      if (res.success) {
        toast.success('Usuario creado correctamente')
        setIsOpen(false)
        reset()
      } else {
        toast.error(res.error || 'Error al crear el usuario')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) reset(); }}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Nuevo Usuario
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input 
              id="nombre" 
              placeholder="Ej. Juan Pérez" 
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="juan@ejemplo.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input 
              id="password" 
              type="password"
              placeholder="Min. 6 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rol">Rol Asignado</Label>
            <Select value={rolId} onValueChange={(val) => setRolId(val || '')} required>
              <SelectTrigger id="rol">
                <SelectValue placeholder="Selecciona un rol">
                  {rolId ? roles.find((r) => String(r.id) === rolId)?.nombre : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-max">
                {roles.filter(r => r.nivel_acceso > 1).map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic">
              * Super Admin no se puede asignar desde aquí.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
 
