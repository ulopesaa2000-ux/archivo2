'use client'

import React, { useState, useTransition } from 'react'
import { Shield, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  toggleUsuarioActivo,
  cambiarRolUsuario,
} from '@/modules/config/actions'
import type {
  UsuarioConDetalle,
  RolConPermisos,
} from '@/modules/config/types'
import { NuevoUsuarioModal } from '@/app/(admin)/configuracion/usuarios/NuevoUsuarioModal'
import { CambiarPasswordModal } from '@/app/(admin)/configuracion/usuarios/CambiarPasswordModal'
import { SincronizarUsuarioModal } from '@/app/(admin)/configuracion/usuarios/SincronizarUsuarioModal'

import { toast } from 'sonner'
import type { UsuarioConRol } from '@/lib/types/tables'

const NIVEL_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  2: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  3: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  4: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  5: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
}

function NivelBadge({ nivel, nombre }: { nivel: number; nombre: string }) {
  const color = NIVEL_COLORS[nivel] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', color)}>
      {nivel === 1 && <Shield className="h-3 w-3" />}
      {nombre}
    </span>
  )
}

// ─────────────────────────────────────────────────
// USUARIO ROW
function UsuarioRow({
  usuario,
  roles,
  isCurrentUserSuperAdmin,
}: {
  usuario: UsuarioConDetalle
  roles: RolConPermisos[]
  isCurrentUserSuperAdmin: boolean
}) {
  const [isPendingActivo, startActivo] = useTransition()
  const [isPendingRol, startRol] = useTransition()
  const [activoOpt, setActivoOpt] = useState(usuario.activo)

  const handleToggleActivo = () => {
    const next = !activoOpt
    setActivoOpt(next)
    startActivo(async () => {
      const res = await toggleUsuarioActivo(usuario.id, next)
      if (!res.success) setActivoOpt(activoOpt)
    })
  }

  // onValueChange puede recibir null en Base UI Select → lo ignoramos
  const handleRolChange = (rolIdStr: string | null) => {
    if (!rolIdStr) return
    const rolId = parseInt(rolIdStr, 10)
    if (isNaN(rolId)) return
    startRol(async () => {
      await cambiarRolUsuario(usuario.id, rolId)
    })
  }

  const isSuperAdmin = usuario.rol?.nivel_acceso === 1

  // Nombre para mostrar: nombre_completo → username → email
  const displayName = usuario.nombre_completo ?? usuario.username ?? usuario.email ?? '?'
  const avatarChar = displayName.charAt(0).toUpperCase()

  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b last:border-0 transition-colors',
      !activoOpt && 'opacity-60 bg-muted/10',
    )}>
      {/* Info usuario */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          activoOpt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {avatarChar}
        </div>
        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="font-medium text-sm truncate flex items-center gap-2">
            {displayName}
            {/* BADGE DE AUTH */}
            {usuario.auth_user_id ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                Verificado
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                Sin vincular
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 ml-12 sm:ml-0">

        {/* Validar Sincronización Auth vs Cambiar Contraseña */}
        {!usuario.auth_user_id && isCurrentUserSuperAdmin && usuario.email ? (
          <SincronizarUsuarioModal
            usuarioId={usuario.id}
            emailUsuario={usuario.email}
            nombreUsuario={displayName}
          />
        ) : (
          isCurrentUserSuperAdmin && (
            <CambiarPasswordModal
              usuarioId={usuario.id}
              nombreUsuario={displayName}
            />
          )
        )}

        {/* Rol selector */}
        {isSuperAdmin ? (
          <NivelBadge nivel={1} nombre="Super Admin" />
        ) : (
          <Select
            value={String(usuario.rol_id)}
            onValueChange={handleRolChange}
            disabled={isPendingRol}
          >
            <SelectTrigger className="h-8 text-xs w-[180px]">
              <SelectValue>
                {roles.find((r) => r.id === usuario.rol_id)?.nombre || 'Seleccionar rol'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-max">
              {roles
                .filter((r) => r.nivel_acceso > 1)
                .map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.nombre}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {/* Estado activo */}
        <div className="flex items-center gap-2">
          {!isSuperAdmin && (
            <>
              <Switch
                checked={activoOpt}
                onCheckedChange={handleToggleActivo}
                disabled={isPendingActivo}
                id={`activo-${usuario.id}`}
                className="data-[state=checked]:bg-emerald-500"
              />
              <label
                htmlFor={`activo-${usuario.id}`}
                className={cn(
                  'text-xs cursor-pointer select-none',
                  activoOpt ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                )}
              >
                {activoOpt ? 'Activo' : 'Inactivo'}
              </label>
            </>
          )}
          {isSuperAdmin && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Siempre activo
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function UsuariosManager({
  usuarios,
  roles,
  currentUser,
}: {
  usuarios: UsuarioConDetalle[]
  roles: RolConPermisos[]
  currentUser: UsuarioConRol | null
}) {
  const isCurrentUserSuperAdmin = currentUser?.rol?.nivel_acceso === 1
  const currentUserLevel = currentUser?.rol?.nivel_acceso ?? 99

  // Filtrar usuarios visibles (solo nivel >= del usuario logueado)
  const visibleUsuarios = usuarios.filter((u) => {
    const userNivel = u.rol?.nivel_acceso ?? 99
    return userNivel >= currentUserLevel
  })

  // Filtrar roles asignables (solo nivel >= del usuario logueado)
  const visibleRoles = roles.filter((r) => {
    return r.nivel_acceso >= currentUserLevel
  })

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Directorio de Usuarios ({usuarios.length})</h2>
        <NuevoUsuarioModal roles={visibleRoles} />
      </div>

      {/* LISTADO DE USUARIOS */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Leyenda */}
        <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Activo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            Inactivo
          </span>
          <span className="text-muted-foreground/60">· El rol determina los permisos base del usuario.</span>
        </div>

        {visibleUsuarios.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <ShieldOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No hay usuarios registrados</p>
          </div>
        ) : (
          <div>
            {visibleUsuarios.map((u) => (
              <UsuarioRow
                key={u.id}
                usuario={u}
                roles={visibleRoles}
                isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
