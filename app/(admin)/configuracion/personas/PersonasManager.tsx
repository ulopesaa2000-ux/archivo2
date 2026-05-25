// app/(admin)/configuracion/personas/PersonasManager.tsx
'use client'

import React, { useState, useTransition } from 'react'
import {
  UserCheck,
  UserX,
  Mail,
  Search,
  Filter,
  Users,
  Shield,
  ShieldOff,
  Loader2,
  X,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  vincularPersonaUsuarioAction,
  invitarPersonaAction,
} from '@/modules/config/actions'
import type { UsuarioConDetalle, RolConPermisos } from '@/modules/config/types'
import type { UsuarioConRol } from '@/lib/types/tables'
import { toast } from 'sonner'

type PersonaItem = {
  id: number
  nombre_completo: string
  tipo_entidad: string
  email_contacto: string | null
  telefono_contacto: string | null
  direccion: string | null
  identificacion_fiscal: string | null
  activo: boolean | null
  usuario_id: number | null
  usuario?: {
    id: number
    username: string
    email: string | null
    activo: boolean | null
    rol?: {
      nombre: string
    } | null
  } | null
}

const TIPO_BADGES: Record<string, string> = {
  'Proveedor': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'Cliente B2B': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'Cliente Retail': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'Empleado': 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'Administrador': 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

export function PersonasManager({
  personas,
  usuarios,
  roles,
  currentUser,
}: {
  personas: PersonaItem[]
  usuarios: UsuarioConDetalle[]
  roles: RolConPermisos[]
  currentUser: UsuarioConRol | null
}) {
  const [q, setQ] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterVinculo, setFilterVinculo] = useState<string>('all')

  const [selectedPersona, setSelectedPersona] = useState<PersonaItem | null>(null)
  const [isVincularOpen, setIsVincularOpen] = useState(false)
  const [isInvitarOpen, setIsInvitarOpen] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRolId, setInviteRolId] = useState<string>('')
  const [linkUsuarioId, setLinkUsuarioId] = useState<string>('unlink')

  const [isPending, startTransition] = useTransition()

  // 1. Filtrar personas asociadas
  const filteredPersonas = personas.filter((p) => {
    const matchesQ = q === '' ||
      p.nombre_completo.toLowerCase().includes(q.toLowerCase()) ||
      (p.email_contacto?.toLowerCase() || '').includes(q.toLowerCase())

    const matchesTipo = filterTipo === 'all' || p.tipo_entidad === filterTipo

    const matchesVinculo = filterVinculo === 'all' ||
      (filterVinculo === 'linked' && p.usuario_id !== null) ||
      (filterVinculo === 'unlinked' && p.usuario_id === null)

    return matchesQ && matchesTipo && matchesVinculo
  })

  // 2. Filtrar usuarios no vinculados para el modal de vincular
  const usuariosNoVinculados = usuarios.filter((u) => {
    // Que no esté ya en uso por otra persona
    const estaVinculado = personas.some((p) => p.usuario_id === u.id)
    return !estaVinculado || (selectedPersona && selectedPersona.usuario_id === u.id)
  })

  const handleVincularClick = (persona: PersonaItem) => {
    setSelectedPersona(persona)
    setLinkUsuarioId(persona.usuario_id ? String(persona.usuario_id) : 'unlink')
    setIsVincularOpen(true)
  }

  const handleInvitarClick = (persona: PersonaItem) => {
    setSelectedPersona(persona)
    setInviteEmail(persona.email_contacto || '')
    // Pre-seleccionar rol de cliente admin lectura (ID 8) o el primero de los roles B2B
    const defaultRol = roles.find(r => r.nombre.includes('Lectura') || r.nombre.includes('B2B') || r.id === 8)
    setInviteRolId(defaultRol ? String(defaultRol.id) : '')
    setIsInvitarOpen(true)
  }

  const submitVincular = () => {
    if (!selectedPersona) return
    const val = linkUsuarioId === 'unlink' ? null : parseInt(linkUsuarioId, 10)

    startTransition(async () => {
      const res = await vincularPersonaUsuarioAction(selectedPersona.id, val)
      if (res.success) {
        toast.success(val ? 'Persona vinculada correctamente' : 'Vinculación removida')
        setIsVincularOpen(false)
        setSelectedPersona(null)
      } else {
        toast.error(res.error || 'Error al vincular')
      }
    })
  }

  const submitInvitar = () => {
    if (!selectedPersona || !inviteEmail || !inviteRolId) {
      toast.error('Por favor, completa todos los campos.')
      return
    }

    startTransition(async () => {
      const res = await invitarPersonaAction({
        personaId: selectedPersona.id,
        email: inviteEmail,
        rolId: parseInt(inviteRolId, 10),
      })
      if (res.success) {
        toast.success('Invitación enviada de forma exitosa por email')
        setIsInvitarOpen(false)
        setSelectedPersona(null)
      } else {
        toast.error(res.error || 'Error al enviar invitación')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            className="pl-9 h-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" /> Tipo:
            </span>
            <Select value={filterTipo} onValueChange={(val) => setFilterTipo(val || 'all')}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Proveedor">Proveedores</SelectItem>
                <SelectItem value="Cliente B2B">Clientes B2B</SelectItem>
                <SelectItem value="Cliente Retail">Clientes Retail</SelectItem>
                <SelectItem value="Empleado">Empleados</SelectItem>
                <SelectItem value="Administrador">Administradores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <UserCheck className="h-3 w-3" /> Vínculo:
            </span>
            <Select value={filterVinculo} onValueChange={(val) => setFilterVinculo(val || 'all')}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="linked">Vinculados</SelectItem>
                <SelectItem value="unlinked">Sin Vincular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Directorio Principal de Personas */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3.5">Nombre / Identidad</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5">Cuenta Asociada</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium">No se encontraron personas comerciales</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">Ajusta los filtros de búsqueda e inténtalo de nuevo.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPersonas.map((p) => {
                  const badgeColor = TIPO_BADGES[p.tipo_entidad] ?? 'bg-muted text-muted-foreground'
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      {/* Nombre y Entidad */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-foreground text-sm">{p.nombre_completo}</span>
                          <span className={cn('inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide', badgeColor)}>
                            {p.tipo_entidad}
                          </span>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-foreground">{p.email_contacto || 'Sin correo electrónico'}</span>
                          <span className="text-muted-foreground">{p.telefono_contacto || 'Sin teléfono'}</span>
                        </div>
                      </td>

                      {/* Cuenta de Usuario vinculada */}
                      <td className="px-6 py-4">
                        {p.usuario ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {p.usuario.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                                {p.usuario.username}
                              </span>
                              <span className="inline-flex items-center text-[10px] text-muted-foreground gap-1">
                                <Shield className="h-2.5 w-2.5 text-primary" /> {p.usuario.rol?.nombre || 'Sin Rol'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground/80 border">
                            Sin cuenta
                          </span>
                        )}
                      </td>

                      {/* Botones de acción */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => handleVincularClick(p)}
                          >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {p.usuario_id ? 'Re-vincular' : 'Vincular'}
                          </Button>

                          {!p.usuario_id && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 text-xs font-medium"
                              onClick={() => handleInvitarClick(p)}
                            >
                              <Mail className="mr-1.5 h-3.5 w-3.5" />
                              Invitar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VINCULAR USUARIO */}
      <Dialog open={isVincularOpen} onOpenChange={setIsVincularOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Cuenta de Acceso</DialogTitle>
            <DialogDescription>
              Asocia a <strong>{selectedPersona?.nombre_completo}</strong> con una credencial de acceso activa en el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Selecciona el Usuario
              </label>
              <Select value={linkUsuarioId} onValueChange={(val) => setLinkUsuarioId(val || 'unlink')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar usuario de acceso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlink" className="text-destructive font-medium">
                    Desvincular (Quitar Cuenta)
                  </SelectItem>
                  {usuariosNoVinculados.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nombre_completo || u.username} ({u.email}) · Rol: {u.rol?.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsVincularOpen(false)
                setSelectedPersona(null)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={submitVincular} disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar Vinculación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: INVITAR POR EMAIL */}
      <Dialog open={isInvitarOpen} onOpenChange={setIsInvitarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Invitar Socio Comercial B2B
            </DialogTitle>
            <DialogDescription>
              Envía un correo de registro a través de Supabase Auth. La cuenta se creará y vinculará automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre Completo
              </label>
              <Input value={selectedPersona?.nombre_completo || ''} disabled className="bg-muted/40" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email del Invitado
              </label>
              <Input
                placeholder="correo@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Rol de Acceso Asignado
              </label>
              <Select value={inviteRolId} onValueChange={(val) => setInviteRolId(val || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar rol restringido" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.nivel_acceso >= 2)
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nombre} (Nivel {r.nivel_acceso})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInvitarOpen(false)
                setSelectedPersona(null)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={submitInvitar} disabled={isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground">
              {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Enviar Invitación por Correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
