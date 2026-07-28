// app/(admin)/inventario/bodegas/BodegaUsuarios.tsx
'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Trash2, Users, Loader2 } from 'lucide-react'
import {
  asignarUsuarioBodegaAction,
  eliminarUsuarioBodegaAction,
} from '@/modules/inventario/actions'

type UsuarioBodega = {
  id: number
  usuario_id: number
  bodega_id: number
  puede_consultar: boolean | null
  puede_crear_notas: boolean | null
  puede_confirmar_notas: boolean | null
  puede_transferir: boolean | null
  usuario_nombre: string
}

type UsuarioDisponible = {
  id: number
  nombre_completo: string | null
  username: string | null
  email: string | null
  activo: boolean
  rol: { id: number; nombre: string } | null
}

type PermisosState = {
  puede_consultar: boolean
  puede_crear_notas: boolean
  puede_confirmar_notas: boolean
  puede_transferir: boolean
}

type Props = {
  bodegaId: number
  initialUsuarios?: UsuarioBodega[]
}

export function BodegaUsuarios({ bodegaId, initialUsuarios }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [usuarios, setUsuarios] = useState<UsuarioBodega[]>(initialUsuarios ?? [])
  const [isLoading, setIsLoading] = useState(!initialUsuarios)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioDisponible[]>([])
  const [usuariosLoaded, setUsuariosLoaded] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<string>('')
  const [permisos, setPermisos] = useState<PermisosState>({
    puede_consultar: true,
    puede_crear_notas: false,
    puede_confirmar_notas: false,
    puede_transferir: false,
  })
  const [error, setError] = useState<string | null>(null)

  const loadInitialData = useCallback(() => {
    if (initialUsuarios !== undefined) return
    fetch(`/api/inventario/bodega-usuarios?bodega_id=${bodegaId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUsuarios(data))
      .catch(() => { /* ignore */ })
  }, [bodegaId, initialUsuarios])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    if (!dialogOpen || usuariosLoaded) return

    fetch('/api/inventario/bodegas/usuarios-disponibles')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUsuariosDisponibles(data)
        setUsuariosLoaded(true)
      })
      .catch(() => { /* ignore */ })
  }, [dialogOpen, usuariosLoaded])

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
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

  const handleDelete = (asignacionId: number) => {
    startTransition(async () => {
      await eliminarUsuarioBodegaAction(asignacionId)
      setUsuarios((prev) => prev.filter((u) => u.id !== asignacionId))
      router.refresh()
    })
  }

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedUsuario) {
      setError('Selecciona un usuario.')
      return
    }

    const formData = new FormData()
    formData.append('bodega_id', bodegaId.toString())
    formData.append('usuario_id', selectedUsuario)
    formData.append('puede_consultar', permisos.puede_consultar.toString())
    formData.append('puede_crear_notas', permisos.puede_crear_notas.toString())
    formData.append('puede_confirmar_notas', permisos.puede_confirmar_notas.toString())
    formData.append('puede_transferir', permisos.puede_transferir.toString())

    startTransition(async () => {
      const result = await asignarUsuarioBodegaAction(formData)
      if (!result.success) {
        setError(result.error ?? 'Error desconocido.')
        return
      }

      const newUser = usuariosDisponibles.find(u => u.id.toString() === selectedUsuario)
      if (newUser) {
        setUsuarios(prev => [...prev, {
          id: Date.now(),
          usuario_id: newUser.id,
          bodega_id: bodegaId,
          puede_consultar: permisos.puede_consultar,
          puede_crear_notas: permisos.puede_crear_notas,
          puede_confirmar_notas: permisos.puede_confirmar_notas,
          puede_transferir: permisos.puede_transferir,
          usuario_nombre: newUser.nombre_completo ?? newUser.username ?? 'Usuario',
        }])
      }

      handleDialogOpenChange(false)
      router.refresh()
    })
  }

  const assignedUserIds = usuarios.map(u => u.usuario_id)
  const usuariosParaAsignar = usuariosDisponibles.filter(
    u => u.activo && !assignedUserIds.includes(u.id)
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          Usuarios asignados ({usuarios.length})
        </h4>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="h-7 text-xs" />
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Asignar
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Asignar usuario a bodega</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
                {error}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario</Label>
                {!usuariosLoaded ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando usuarios...
                  </div>
                ) : (
                    <Select value={selectedUsuario} onValueChange={(val) => setSelectedUsuario(val ?? '')}>
                      <SelectTrigger id="usuario" className="w-full">
                        <SelectValue placeholder="Selecciona un usuario">
                          {selectedUsuario 
                            ? (() => {
                                const u = usuariosDisponibles.find(x => x.id.toString() === selectedUsuario);
                                return u ? `${u.nombre_completo ?? u.username} (${u.rol?.nombre ?? 'Sin rol'})` : "Selecciona un usuario";
                              })()
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      {usuariosParaAsignar.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No hay usuarios disponibles
                        </div>
                      ) : (() => {
                        const isOperativo = (u: typeof usuariosParaAsignar[number]) => {
                          const name = u.rol?.nombre ?? ''
                          return name.includes('Admin Operativo') || name.includes('Encargado') || name.includes('Bodeguero')
                        }
                        const operativos = usuariosParaAsignar.filter(isOperativo)
                        const otros = usuariosParaAsignar.filter(u => !isOperativo(u))

                        return (
                          <>
                            {operativos.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[11px] font-bold uppercase tracking-wider text-primary px-2 py-1 bg-primary/5 rounded-sm">
                                  📦 Personal Operativo (Inventario)
                                </SelectLabel>
                                {operativos.map((u) => (
                                  <SelectItem key={u.id} value={u.id.toString()} className="truncate">
                                    <span className="truncate block font-medium">
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
                                  <SelectItem key={u.id} value={u.id.toString()} className="truncate">
                                    <span className="truncate block text-muted-foreground">
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

              <div className="space-y-2">
                <Label className="text-xs">Permisos</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="puede_consultar"
                      checked={permisos.puede_consultar}
                      onCheckedChange={(checked) =>
                        setPermisos(prev => ({ ...prev, puede_consultar: !!checked }))
                      }
                    />
                    <Label htmlFor="puede_consultar" className="text-sm font-normal">
                      Consultar
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="puede_crear_notas"
                      checked={permisos.puede_crear_notas}
                      onCheckedChange={(checked) =>
                        setPermisos(prev => ({ ...prev, puede_crear_notas: !!checked }))
                      }
                    />
                    <Label htmlFor="puede_crear_notas" className="text-sm font-normal">
                      Crear notas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="puede_confirmar_notas"
                      checked={permisos.puede_confirmar_notas}
                      onCheckedChange={(checked) =>
                        setPermisos(prev => ({ ...prev, puede_confirmar_notas: !!checked }))
                      }
                    />
                    <Label htmlFor="puede_confirmar_notas" className="text-sm font-normal">
                      Confirmar notas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="puede_transferir"
                      checked={permisos.puede_transferir}
                      onCheckedChange={(checked) =>
                        setPermisos(prev => ({ ...prev, puede_transferir: !!checked }))
                      }
                    />
                    <Label htmlFor="puede_transferir" className="text-sm font-normal">
                      Transferir
                    </Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isPending || !selectedUsuario}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Asignar usuario
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {usuarios.length > 0 ? (
        <div className="rounded border divide-y">
          {usuarios.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
              <span className="font-medium text-sm min-w-0 truncate">{u.usuario_nombre}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {u.puede_consultar && <Badge variant="outline" className="text-[10px]">Consultar</Badge>}
                {u.puede_crear_notas && <Badge variant="outline" className="text-[10px]">Crear</Badge>}
                {u.puede_confirmar_notas && <Badge variant="outline" className="text-[10px]">Confirmar</Badge>}
                {u.puede_transferir && <Badge variant="outline" className="text-[10px]">Transferir</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(u.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin usuarios asignados.</p>
      )}
    </div>
  )
}