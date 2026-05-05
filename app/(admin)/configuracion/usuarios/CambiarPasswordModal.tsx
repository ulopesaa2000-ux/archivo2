'use client'

import React, { useState, useTransition } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cambiarPasswordAction } from '@/modules/config/actions'
import { toast } from 'sonner'

export function CambiarPasswordModal({ 
  usuarioId, 
  nombreUsuario 
}: { 
  usuarioId: number; 
  nombreUsuario: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')

  const reset = () => {
    setPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres')
    }

    startTransition(async () => {
      const res = await cambiarPasswordAction(usuarioId, password)
      
      if (res.success) {
        toast.success('Contraseña actualizada correctamente')
        setIsOpen(false)
        reset()
      } else {
        toast.error(res.error || 'Error al cambiar la contraseña')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) reset(); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs gap-2" />}>
        <KeyRound className="h-3 w-3" />
        Cambiar Contraseña
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Estás a punto de cambiar la contraseña para el usuario <strong>{nombreUsuario}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input 
              id="password" 
              type="password"
              placeholder="Min. 6 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-md">
            <strong>Atención:</strong> Esta acción requiere permisos de Super Admin. El usuario podrá acceder con la nueva contraseña inmediatamente.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
 
