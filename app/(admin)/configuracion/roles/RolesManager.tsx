// app/(admin)/configuracion/roles/RolesManager.tsx
'use client'

import React, { useState, useTransition } from 'react'
import { Shield, ShieldOff, ChevronDown, ChevronUp, CheckSquare, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toggleRolPermiso, eliminarRolAction } from '@/modules/config/actions'
import type { RolConPermisos, ModuloPermiso, TipoPermiso } from '@/modules/config/types'
import { MODULOS_ORDEN, MODULO_LABELS, buildPermisosCompletos } from '@/modules/config/types'
import { NuevoRolModal } from '../usuarios/NuevoRolModal'
import { toast } from 'sonner'
import type { UsuarioConRol } from '@/lib/types/tables'

const TIPO_COLS: { key: TipoPermiso; label: string; short: string }[] = [
  { key: 'puede_leer', label: 'Leer', short: 'L' },
  { key: 'puede_crear', label: 'Crear', short: 'C' },
  { key: 'puede_editar', label: 'Editar', short: 'E' },
  { key: 'puede_eliminar', label: 'Eliminar', short: 'D' },
]

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

function PermisoCell({
  rolId,
  modulo,
  tipo,
  valor,
  isSuperAdmin,
  currentUserLevel,
}: {
  rolId: number
  modulo: ModuloPermiso
  tipo: TipoPermiso
  valor: boolean
  isSuperAdmin: boolean
  currentUserLevel: number
}) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(valor)

  const canEdit = currentUserLevel === 1

  if (!canEdit || isSuperAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="flex items-center justify-center cursor-not-allowed">
            <CheckSquare className={cn("h-4 w-4", optimistic ? "text-emerald-500" : "text-muted-foreground/30")} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSuperAdmin ? "Super Admin tiene acceso total" : "No tienes permisos para modificar permisos de roles"}
        </TooltipContent>
      </Tooltip>
    )
  }

  const handleToggle = () => {
    const newVal = !optimistic
    setOptimistic(newVal)
    startTransition(async () => {
      const res = await toggleRolPermiso(rolId, modulo, tipo, newVal)
      if (!res.success) setOptimistic(optimistic)
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

function RolPermisoCard({
  rol,
  currentUserLevel,
}: {
  rol: RolConPermisos
  currentUserLevel: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isSuperAdmin = rol.nivel_acceso === 1
  const permisos = buildPermisosCompletos(rol.permisos)

  const grupos = MODULOS_ORDEN.reduce<Record<string, ModuloPermiso[]>>((acc, mod) => {
    const grupo = MODULO_LABELS[mod].grupo
    if (!acc[grupo]) acc[grupo] = []
    acc[grupo].push(mod)
    return acc
  }, {})

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
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

          {!isSuperAdmin && currentUserLevel === 1 && (
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
                                currentUserLevel={currentUserLevel}
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

export function RolesManager({
  roles,
  currentUser,
}: {
  roles: RolConPermisos[]
  currentUser: UsuarioConRol | null
}) {
  const isCurrentUserSuperAdmin = currentUser?.rol?.nivel_acceso === 1
  const currentUserLevel = currentUser?.rol?.nivel_acceso ?? 99

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          {TIPO_COLS.map((col) => (
            <span key={col.key} className="flex items-center gap-1">
              <span className="font-mono font-semibold text-foreground">{col.short}</span>
              = {col.label}
            </span>
          ))}
          <span className="text-muted-foreground/60">· Haz clic en cada rol para expandir/colapsar los permisos.</span>
        </div>

        {isCurrentUserSuperAdmin && <NuevoRolModal />}
      </div>

      <div className="space-y-3">
        {roles.map((rol) => (
          <RolPermisoCard key={rol.id} rol={rol} currentUserLevel={currentUserLevel} />
        ))}
      </div>
    </div>
  )
}
