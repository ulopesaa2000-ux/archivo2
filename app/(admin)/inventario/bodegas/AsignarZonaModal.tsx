// app/(admin)/inventario/bodegas/AsignarZonaModal.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Users, Loader2, Plus, ShieldCheck } from 'lucide-react'
import { asignarUsuarioZonaAction } from '@/modules/inventario/actions'
import { toast } from 'sonner'

type UsuarioDisponible = {
  id: number
  nombre_completo: string | null
  username: string | null
  email: string | null
  activo: boolean
  rol: { id: number; nombre: string } | null
}

type Props = {
  ciudades: string[]
}

export function AsignarZonaModal({ ciudades }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioDisponible[]>([])
  const [usuariosLoaded, setUsuariosLoaded] = useState(false)
  const [selectedCiudad, setSelectedCiudad] = useState<string>('')
  const [selectedUsuario, setSelectedUsuario] = useState<string>('')
  const [permisos, setPermisos] = useState({
    puede_consultar: true,
    puede_crear_notas: false,
    puede_confirmar_notas: false,
    puede_transferir: false,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || usuariosLoaded) return
    fetch('/api/inventario/bodegas/usuarios-disponibles')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUsuariosDisponibles(data)
        setUsuariosLoaded(true)
      })
      .catch(() => { /* ignore */ })
  }, [open, usuariosLoaded])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedCiudad('')
      setSelectedUsuario('')
      setPermisos({
        puede_consultar: true,
        puede_crear_notas: false,
        puede_confirmar_notas: false,
        puede_transferir: false,
      })
      setError(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedCiudad) {
      setError('Selecciona una ciudad/zona.')
      return
    }
    if (!selectedUsuario) {
      setError('Selecciona un usuario.')
      return
    }

    const formData = new FormData()
    formData.append('ciudad', selectedCiudad)
    formData.append('usuario_id', selectedUsuario)
    formData.append('puede_consultar', permisos.puede_consultar.toString())
    formData.append('puede_crear_notas', permisos.puede_crear_notas.toString())
    formData.append('puede_confirmar_notas', permisos.puede_confirmar_notas.toString())
    formData.append('puede_transferir', permisos.puede_transferir.toString())

    startTransition(async () => {
      const res = await asignarUsuarioZonaAction(formData)
      if (!res.success) {
        setError(res.error ?? 'Error al asignar permisos por zona.')
        return
      }

      toast.success(`Permisos asignados a todas las bodegas de ${selectedCiudad}`)
      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" className="h-9 text-xs">
          <Building2 className="h-4 w-4 mr-2 text-primary" />
          Asignar por Zona / Ciudad
        </Button>
      } />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Asignar Usuario a toda una Ciudad / Zona
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3.5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleccionar Ciudad */}
          <div className="space-y-2">
            <Label htmlFor="zona-ciudad">Ciudad / Zona *</Label>
            <Select value={selectedCiudad} onValueChange={(v) => setSelectedCiudad(v ?? '')}>
              <SelectTrigger id="zona-ciudad" className="w-full">
                <SelectValue placeholder="Selecciona una ciudad/zona" />
              </SelectTrigger>
              <SelectContent>
                {ciudades.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleccionar Usuario */}
          <div className="space-y-2">
            <Label htmlFor="zona-usuario">Usuario *</Label>
            {!usuariosLoaded ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando usuarios...
              </div>
            ) : (
              <Select value={selectedUsuario} onValueChange={(v) => setSelectedUsuario(v ?? '')}>
                <SelectTrigger id="zona-usuario" className="w-full">
                  <SelectValue placeholder="Selecciona un usuario de inventario">
                    {selectedUsuario
                      ? (() => {
                          const u = usuariosDisponibles.find(x => x.id.toString() === selectedUsuario)
                          return u ? `${u.nombre_completo ?? u.username} (${u.rol?.nombre ?? 'Sin rol'})` : "Selecciona usuario"
                        })()
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const isOperativo = (u: typeof usuariosDisponibles[number]) => {
                      const name = u.rol?.nombre ?? ''
                      return name.includes('Admin Operativo') || name.includes('Encargado') || name.includes('Bodeguero')
                    }
                    const operativos = usuariosDisponibles.filter(isOperativo)
                    const otros = usuariosDisponibles.filter(u => !isOperativo(u))

                    return (
                      <>
                        {operativos.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-[11px] font-bold uppercase tracking-wider text-primary px-2 py-1 bg-primary/5 rounded-sm">
                              📦 Personal Operativo (Inventario)
                            </SelectLabel>
                            {operativos.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                <span className="font-medium">
                                  {u.nombre_completo ?? u.username} ({u.rol?.nombre ?? 'Sin rol'})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}

                        {operativos.length > 0 && otros.length > 0 && (
                          <SelectSeparator className="my-1" />
                        )}

                        {otros.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                              🛡️ Super Admins & Otros Usuarios
                            </SelectLabel>
                            {otros.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                <span className="text-muted-foreground">
                                  {u.nombre_completo ?? u.username} ({u.rol?.nombre ?? 'Sin rol'})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )
                  })()}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Permisos */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Permisos para TODAS las bodegas de la zona</Label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3.5 bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="zona_puede_consultar"
                  checked={permisos.puede_consultar}
                  onCheckedChange={(checked) =>
                    setPermisos(prev => ({ ...prev, puede_consultar: !!checked }))
                  }
                />
                <Label htmlFor="zona_puede_consultar" className="text-xs font-normal cursor-pointer">
                  👁 Consultar Stock
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="zona_puede_crear_notas"
                  checked={permisos.puede_crear_notas}
                  onCheckedChange={(checked) =>
                    setPermisos(prev => ({ ...prev, puede_crear_notas: !!checked }))
                  }
                />
                <Label htmlFor="zona_puede_crear_notas" className="text-xs font-normal cursor-pointer">
                  ✍ Crear Notas (Borrador)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="zona_puede_confirmar_notas"
                  checked={permisos.puede_confirmar_notas}
                  onCheckedChange={(checked) =>
                    setPermisos(prev => ({ ...prev, puede_confirmar_notas: !!checked }))
                  }
                />
                <Label htmlFor="zona_puede_confirmar_notas" className="text-xs font-normal cursor-pointer">
                  ✅ Confirmar / Autorizar Notas
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="zona_puede_transferir"
                  checked={permisos.puede_transferir}
                  onCheckedChange={(checked) =>
                    setPermisos(prev => ({ ...prev, puede_transferir: !!checked }))
                  }
                />
                <Label htmlFor="zona_puede_transferir" className="text-xs font-normal cursor-pointer">
                  ↔ Realizar Transferencias
                </Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Aplicar Permisos a Toda la Zona
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
