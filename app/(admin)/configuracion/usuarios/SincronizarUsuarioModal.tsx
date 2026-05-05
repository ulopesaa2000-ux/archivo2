'use client'

import React, { useState, useTransition } from 'react'
import { Link, Loader2, AlertCircle } from 'lucide-react'
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
import { sincronizarUsuarioAction } from '@/modules/config/actions'
import { toast } from 'sonner'

export function SincronizarUsuarioModal({ 
  usuarioId, 
  emailUsuario,
  nombreUsuario 
}: { 
  usuarioId: number; 
  emailUsuario: string;
  nombreUsuario: string;
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
      const res = await sincronizarUsuarioAction({
        usuarioId,
        email: emailUsuario,
        password
      })
      
      if (res.success) {
        toast.success('Usuario sincronizado con Auth correctamente')
        setIsOpen(false)
        reset()
      } else {
        toast.error(res.error || 'Error al sincronizar el usuario')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) reset(); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs gap-2 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 hover:text-destructive" />}>
        <AlertCircle className="h-3 w-3" />
        Falta en Auth
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sincronizar con Auth</DialogTitle>
          <DialogDescription>
            El usuario <strong>{nombreUsuario}</strong> existe en la base de datos pero no está vinculado a una cuenta de autenticación. Define una contraseña temporal para crearlo en el sistema de login.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Email asignado</Label>
            <Input value={emailUsuario} disabled className="bg-muted" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña inicial</Label>
            <Input 
              id="password" 
              type="password"
              placeholder="Min. 6 caracteres" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
