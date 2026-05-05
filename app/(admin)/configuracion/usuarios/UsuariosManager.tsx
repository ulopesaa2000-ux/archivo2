'use client'

import React, { useState, useTransition } from 'react'
import { Shield, ShieldOff, ChevronDown, ChevronUp, CheckSquare, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  toggleUsuarioActivo,
  cambiarRolUsuario,
  toggleRolPermiso,
  eliminarRolAction,
} from '@/modules/config/actions'
import type {
  UsuarioConDetalle,
  RolConPermisos,
  ModuloPermiso,
  PermisoModulo,
  TipoPermiso,
} from '@/modules/config/types'
import { MODULOS_ORDEN, MODULO_LABELS, buildPermisosCompletos } from '@/modules/config/types'
import { NuevoRolModal } from './NuevoRolModal'
import { NuevoUsuarioModal } from '@/app/(admin)/configuracion/usuarios/NuevoUsuarioModal'
import { CambiarPasswordModal } from '@/app/(admin)/configuracion/usuarios/CambiarPasswordModal'
import { SincronizarUsuarioModal } from '@/app/(admin)/configuracion/usuarios/SincronizarUsuarioModal'

import { toast } from 'sonner'
import type { UsuarioConRol } from '@/lib/types/tables'

// ─────────────────────────────────────────────────
// Columnas reales confirmadas por MCP: puede_leer, puede_crear, puede_editar, puede_eliminar
const TIPO_COLS: { key: TipoPermiso; label: string; short: string }[] = [
  { key: 'puede_leer', label: 'Leer', short: 'L' },
  { key: 'puede_crear', label: 'Crear', short: 'C' },
  { key: 'puede_editar', label: 'Editar', short: 'E' },
  { key: 'puede_eliminar', label: 'Eliminar', short: 'D' },
]

// ─────────────────────────────────────────────────
// NIVEL BADGE
const NIVEL_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  2: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  3: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
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
// PERMISO CELL — toggle individual por tipo
function PermisoCell({
  rolId,
  modulo,
  tipo,
  valor,
  isSuperAdmin,
}: {
  rolId: number
  modulo: ModuloPermiso
  tipo: TipoPermiso
  valor: boolean
  isSuperAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(valor)

  if (isSuperAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="flex items-center justify-center cursor-not-allowed">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Super Admin tiene acceso total</TooltipContent>
      </Tooltip>
    )
  }

  const handleToggle = () => {
    const newVal = !optimistic
    setOptimistic(newVal)
    startTransition(async () => {
      const res = await toggleRolPermiso(rolId, modulo, tipo, newVal)
      if (!res.success) setOptimistic(optimistic) // revert on error
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={TIPO_COLS.find((c) => c.key === tipo)?.label}
      className={cn(
        'flex items-center justify-center w-7 h-7 rounded transition-all',
        optimistic
          ? 'text-primary hover:text-primary/70'
          : 'text-muted-foreground/30 hover:text-muted-foreground/60',
        isPending && 'opacity-50 cursor-wait'
      )}
    >
      {optimistic
        ? <CheckSquare className="h-4 w-4" />
        : <Square className="h-4 w-4" />
      }
    </button>
  )
}

// ─────────────────────────────────────────────────
// ROL CARD CON PERMISOS EXPANDIBLES
function RolPermisoCard({ rol }: { rol: RolConPermisos }) {
  const [expanded, setExpanded] = useState(false)
  const isSuperAdmin = rol.nivel_acceso === 1
  const permisos = buildPermisosCompletos(rol.permisos)

  // Agrupar módulos por grupo
  const grupos = MODULOS_ORDEN.reduce<Record<string, ModuloPermiso[]>>((acc, mod) => {
    const grupo = MODULO_LABELS[mod].grupo
    if (!acc[grupo]) acc[grupo] = []
    acc[grupo].push(mod)
    return acc
  }, {})

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header del rol */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <NivelBadge nivel={rol.nivel_acceso} nombre={rol.nombre} />
          {rol.descripcion && (
            <span className="text-sm text-muted-foreground hidden sm:inline">{rol.descripcion}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              Acceso Total
            </span>
          )}

          {!isSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) {
                  eliminarRolAction(rol.id).then(res => {
                    if (!res.success) toast.error(res.error)
                    else toast.success('Rol eliminado')
                  })
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <div className="p-1 hover:bg-muted rounded-md transition-colors">
            {expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        </div>
      </div>

      {/* Matriz de permisos expandida */}
      {expanded && (
        <div className="border-t overflow-x-auto">
          <TooltipProvider>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Módulo</th>
                  {TIPO_COLS.map((col) => (
                    <th key={col.key} className="text-center px-2 py-2 w-10">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-xs font-medium text-muted-foreground cursor-default">{col.short}</span>
                        </TooltipTrigger>
                        <TooltipContent>{col.label}</TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grupos).map(([grupo, mods]) => (
                  <React.Fragment key={grupo}>
                    <tr className="bg-muted/10">
                      <td colSpan={5} className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {grupo}
                      </td>
                    </tr>
                    {mods.map((mod) => {
                      const p = permisos[mod]
                      return (
                        <tr key={mod} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 text-sm">{MODULO_LABELS[mod].label}</td>
                          {TIPO_COLS.map((col) => (
                            <td key={col.key} className="text-center px-2 py-1">
                              <PermisoCell
                                rolId={rol.id}
                                modulo={mod}
                                tipo={col.key}
                                valor={isSuperAdmin ? true : p[col.key]}
                                isSuperAdmin={isSuperAdmin}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      )}
    </div>
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

// ─────────────────────────────────────────────────
// MAIN EXPORT
export function UsuariosManager({
  usuarios,
  roles,
  currentUser,
}: {
  usuarios: UsuarioConDetalle[]
  roles: RolConPermisos[]
  currentUser: UsuarioConRol | null
}) {
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios')
  const isCurrentUserSuperAdmin = currentUser?.rol?.nivel_acceso === 1

  return (
    <div className="space-y-6">
      {/* Header con tabs y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setTab('usuarios')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === 'usuarios'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Usuarios ({usuarios.length})
          </button>
          <button
            onClick={() => setTab('roles')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === 'roles'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Roles y Permisos ({roles.length})
          </button>
        </div>

        {tab === 'roles' && <NuevoRolModal />}
        {tab === 'usuarios' && <NuevoUsuarioModal roles={roles} />}
      </div>

      {/* TAB: USUARIOS */}
      {tab === 'usuarios' && (
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

          {usuarios.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <ShieldOff className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div>
              {usuarios.map((u) => (
                <UsuarioRow
                  key={u.id}
                  usuario={u}
                  roles={roles}
                  isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ROLES Y PERMISOS */}
      {tab === 'roles' && (
        <div className="space-y-3">
          {/* Leyenda de columnas */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
            {TIPO_COLS.map((col) => (
              <span key={col.key} className="flex items-center gap-1">
                <span className="font-mono font-semibold text-foreground">{col.short}</span>
                = {col.label}
              </span>
            ))}
            <span className="text-muted-foreground/60">· Haz clic en cada rol para expandir/colapsar los permisos.</span>
          </div>

          {roles.map((rol) => (
            <RolPermisoCard key={rol.id} rol={rol} />
          ))}
        </div>
      )}
    </div>
  )
}
