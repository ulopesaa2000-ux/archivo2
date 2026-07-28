// app/(admin)/inventario/bodegas/matriz/MatrizPermisosClient.tsx
'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { 
  Building2, 
  Users, 
  Search, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  FileText, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronRight,
  Shield,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  guardarAsignacionBodegaJSONAction, 
  eliminarAsignacionBodegaJSONAction 
} from '@/modules/inventario/actions'
import type { BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'
import type { UsuarioConDetalle } from '@/modules/config/types'
import { cn } from '@/lib/utils'

type Props = {
  bodegas: BodegaRow[]
  usuarios: UsuarioConDetalle[]
  asignacionesIniciales: UsuarioBodegaRow[]
}

export function MatrizPermisosClient({ bodegas, usuarios, asignacionesIniciales }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('todos')
  const [ciudadFilter, setCiudadFilter] = useState<string>('todas')
  const [isPending, startTransition] = useTransition()
  const [asignaciones, setAsignaciones] = useState<UsuarioBodegaRow[]>(asignacionesIniciales)

  // Filtrar bodegas activas y ordenar: primero matrices (es_matriz), luego por nombre
  const bodegasActivas = useMemo(() => {
    return bodegas.filter(b => b.activa).sort((a, b) => {
      if (a.es_matriz && !b.es_matriz) return -1
      if (!a.es_matriz && b.es_matriz) return 1
      return (a.nombre ?? '').localeCompare(b.nombre ?? '')
    })
  }, [bodegas])

  // Obtener lista dinámica de ciudades únicas de la BD
  const ciudadesUnicas = useMemo(() => {
    const set = new Set<string>()
    bodegasActivas.forEach(b => {
      set.add(b.ciudad ?? 'Virtuales / Sin Ciudad')
    })
    return Array.from(set).sort()
  }, [bodegasActivas])

  // Filtrar bodegas por ciudad seleccionada
  const bodegasVisibles = useMemo(() => {
    if (ciudadFilter === 'todas') return bodegasActivas
    return bodegasActivas.filter(b => (b.ciudad ?? 'Virtuales / Sin Ciudad') === ciudadFilter)
  }, [bodegasActivas, ciudadFilter])

  // Filtrar usuarios activos y dividirlos en Personal Operativo (arriba) vs Super Admins/Otros (abajo)
  const { personalOperativo, superAdminsOtros } = useMemo(() => {
    const filtrados = usuarios.filter(u => {
      if (!u.activo) return false

      const term = searchTerm.toLowerCase().trim()
      const matchSearch = !term || 
        (u.nombre_completo?.toLowerCase().includes(term) ?? false) ||
        (u.email?.toLowerCase().includes(term) ?? false) ||
        (u.username?.toLowerCase().includes(term) ?? false)

      if (!matchSearch) return false

      const nivel = u.rol?.nivel_acceso ?? 99

      if (roleFilter === 'admin') return nivel === 1
      if (roleFilter === 'encargado') return nivel === 2
      if (roleFilter === 'bodeguero') return nivel === 3
      if (roleFilter === 'operativos') return nivel === 2 || nivel === 3

      return nivel <= 3 || u.rol !== null
    })

    const isOperativo = (u: typeof usuarios[number]) => {
      const name = u.rol?.nombre ?? ''
      const nivel = u.rol?.nivel_acceso ?? 99
      return nivel === 2 || nivel === 3 || name.includes('Admin Operativo') || name.includes('Encargado') || name.includes('Bodeguero')
    }

    const ops = filtrados.filter(isOperativo).sort((a, b) => (a.nombre_completo ?? '').localeCompare(b.nombre_completo ?? ''))
    const otros = filtrados.filter(u => !isOperativo(u)).sort((a, b) => (a.nombre_completo ?? '').localeCompare(b.nombre_completo ?? ''))

    return { personalOperativo: ops, superAdminsOtros: otros }
  }, [usuarios, searchTerm, roleFilter])

  const totalUsuarios = personalOperativo.length + superAdminsOtros.length

  // Buscar asignación específica
  const getAsignacion = (usuarioId: number, bodegaId: number) => {
    return asignaciones.find(a => a.usuario_id === usuarioId && a.bodega_id === bodegaId)
  }

  // Alternar permiso específico o asignar si no existe
  const handleTogglePermiso = (
    usuarioId: number, 
    bodegaId: number, 
    campo: 'puede_consultar' | 'puede_crear_notas' | 'puede_confirmar_notas' | 'puede_transferir'
  ) => {
    const asignacionExistente = getAsignacion(usuarioId, bodegaId)

    const defaultAsignacion = {
      usuario_id: usuarioId,
      bodega_id: bodegaId,
      puede_consultar: campo === 'puede_consultar' ? true : true,
      puede_crear_notas: campo === 'puede_crear_notas' ? true : false,
      puede_confirmar_notas: campo === 'puede_confirmar_notas' ? true : false,
      puede_transferir: campo === 'puede_transferir' ? true : false,
    }

    const nuevoPayload = asignacionExistente 
      ? {
          usuario_id: usuarioId,
          bodega_id: bodegaId,
          puede_consultar: campo === 'puede_consultar' ? !asignacionExistente.puede_consultar : (asignacionExistente.puede_consultar ?? true),
          puede_crear_notas: campo === 'puede_crear_notas' ? !asignacionExistente.puede_crear_notas : (asignacionExistente.puede_crear_notas ?? false),
          puede_confirmar_notas: campo === 'puede_confirmar_notas' ? !asignacionExistente.puede_confirmar_notas : (asignacionExistente.puede_confirmar_notas ?? false),
          puede_transferir: campo === 'puede_transferir' ? !asignacionExistente.puede_transferir : (asignacionExistente.puede_transferir ?? false),
        }
      : defaultAsignacion

    // Optimistic Update
    const oldAsignaciones = [...asignaciones]
    if (asignacionExistente) {
      setAsignaciones(prev => prev.map(a => 
        (a.usuario_id === usuarioId && a.bodega_id === bodegaId)
          ? { ...a, ...nuevoPayload }
          : a
      ))
    } else {
      setAsignaciones(prev => [...prev, { 
        id: Date.now(), 
        ...nuevoPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any])
    }

    startTransition(async () => {
      const res = await guardarAsignacionBodegaJSONAction(nuevoPayload)
      if (!res.success) {
        toast.error('No se pudo guardar la asignación')
        setAsignaciones(oldAsignaciones)
      } else {
        toast.success('Permiso actualizado correctamente')
      }
    })
  }

  // Eliminar asignación completa
  const handleEliminarAsignacion = (usuarioId: number, bodegaId: number) => {
    const asignacionExistente = getAsignacion(usuarioId, bodegaId)
    if (!asignacionExistente) return

    const oldAsignaciones = [...asignaciones]
    setAsignaciones(prev => prev.filter(a => !(a.usuario_id === usuarioId && a.bodega_id === bodegaId)))

    startTransition(async () => {
      const res = await eliminarAsignacionBodegaJSONAction(usuarioId, bodegaId)
      if (!res.success) {
        toast.error('No se pudo eliminar la asignación')
        setAsignaciones(oldAsignaciones)
      } else {
        toast.success('Asignación eliminada de la bodega')
      }
    })
  }

  const renderUsuarioRow = (usuario: UsuarioConDetalle) => {
    const nivel = usuario.rol?.nivel_acceso ?? 3
    const isSuperAdmin = nivel === 1

    const rolBadgeColor = nivel === 1
      ? 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400'
      : nivel === 2 
      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' 
      : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'

    return (
      <TableRow key={usuario.id} className="hover:bg-muted/10 transition-colors">
        <TableCell className="font-medium border-r border-muted/50 py-4 pr-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-foreground font-semibold flex items-center gap-1.5">
              {usuario.nombre_completo}
              {isSuperAdmin && (
                <span title="Acceso Total por Rol">
                  <Shield className="h-3.5 w-3.5 text-purple-500" />
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {usuario.email}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={cn('text-[10px] px-2 py-0 font-medium', rolBadgeColor)}>
                {usuario.rol?.nombre ?? 'Sin Rol'}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Nivel {nivel}
              </span>
            </div>
          </div>
        </TableCell>

        {bodegasVisibles.map(bodega => {
          const asig = getAsignacion(usuario.id, bodega.id)

          // Super Admins tienen acceso total automático por rol
          if (isSuperAdmin) {
            return (
              <TableCell key={bodega.id} className="text-center py-4 px-3">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-medium border border-purple-500/20">
                  <Shield className="h-3 w-3" />
                  Acceso Total por Rol
                </div>
              </TableCell>
            )
          }

          return (
            <TableCell key={bodega.id} className="text-center py-4 px-3">
              {asig ? (
                <div className="inline-flex flex-col items-center gap-2 p-2 rounded-lg bg-muted/30 border border-muted/50 shadow-sm">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger render={
                        <button
                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_consultar')}
                          disabled={isPending}
                          className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                            asig.puede_consultar
                              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                          )}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      } />
                      <TooltipContent>
                        <p className="text-xs font-semibold">puede_consultar</p>
                        <p className="text-[10px] opacity-75">Permite consultar stock y ver notas en esta bodega.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger render={
                        <button
                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_crear_notas')}
                          disabled={isPending}
                          className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                            asig.puede_crear_notas
                              ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                          )}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      } />
                      <TooltipContent>
                        <p className="text-xs font-semibold">puede_crear_notas</p>
                        <p className="text-[10px] opacity-75">Permite crear notas borrador en esta bodega.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger render={
                        <button
                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_confirmar_notas')}
                          disabled={isPending}
                          className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                            asig.puede_confirmar_notas
                              ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      } />
                      <TooltipContent>
                        <p className="text-xs font-semibold">puede_confirmar_notas</p>
                        <p className="text-[10px] opacity-75">Permite autorizar/confirmar notas en esta bodega.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger render={
                        <button
                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_transferir')}
                          disabled={isPending}
                          className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                            asig.puede_transferir
                              ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                          )}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      } />
                      <TooltipContent>
                        <p className="text-xs font-semibold">puede_transferir</p>
                        <p className="text-[10px] opacity-75">Permite realizar traspasos hacia/desde esta bodega.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <button
                    onClick={() => handleEliminarAsignacion(usuario.id, bodega.id)}
                    disabled={isPending}
                    className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    Revocar
                  </button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted hover:border-primary/50"
                  onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_consultar')}
                  disabled={isPending}
                  title="Otorgar acceso de solo lectura de stock"
                >
                  <Plus className="h-3 w-3 mr-1 text-primary" />
                  Asignar
                </Button>
              )}
            </TableCell>
          )
        })}
      </TableRow>
    )
  }

  return (
    <Card className="border-none shadow-md bg-card">
      <CardHeader className="pb-3 border-b border-muted/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Matriz Consolidada de Bodegas y Permisos
            </CardTitle>
            <CardDescription className="text-sm">
              Administración unificada por ciudad de accesos (`puede_consultar`), creación (`puede_crear_notas`), confirmación (`puede_confirmar_notas`) y transferencias.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Ciudad */}
            <Select value={ciudadFilter} onValueChange={(v) => setCiudadFilter(v ?? 'todas')}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las Ciudades ({ciudadesUnicas.length})</SelectItem>
                {ciudadesUnicas.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Rol */}
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'todos')}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Roles</SelectItem>
                <SelectItem value="operativos">Personal Operativo</SelectItem>
                <SelectItem value="admin">Admins (Nivel 1)</SelectItem>
                <SelectItem value="encargado">Encargados (Nivel 2)</SelectItem>
                <SelectItem value="bodeguero">Bodegueros (Nivel 3)</SelectItem>
              </SelectContent>
            </Select>

            {/* Buscador de usuario */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario o correo..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <TooltipProvider delay={150}>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[280px] font-semibold text-foreground border-r border-muted/50 py-4">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Usuario / Rol ({totalUsuarios})
                    </span>
                  </TableHead>
                  {bodegasVisibles.map(bodega => (
                    <TableHead key={bodega.id} className="min-w-[200px] text-center font-semibold text-foreground py-4 px-3">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                            {bodega.codigo}
                          </span>
                          {bodega.es_matriz && (
                            <Badge variant="default" className="text-[9px] px-1 py-0 bg-emerald-600 hover:bg-emerald-700">
                              🏛️ Matriz
                            </Badge>
                          )}
                          {bodega.es_virtual && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 scale-90">Virtual</Badge>
                          )}
                        </div>
                        <span className="text-xs truncate max-w-[180px] font-medium" title={bodega.nombre}>
                          {bodega.nombre}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {bodega.ciudad ?? 'Sin Ciudad'}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-muted/30">
                {totalUsuarios === 0 ? (
                  <TableRow>
                    <td colSpan={bodegasVisibles.length + 1} className="py-12 text-center text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-medium">No se encontraron usuarios con los filtros seleccionados</p>
                      <p className="text-xs opacity-75 mt-0.5">Intenta cambiando el filtro de rol o término de búsqueda.</p>
                    </td>
                  </TableRow>
                ) : (
                  <>
                    {/* 1. PERSONAL OPERATIVO (Encargados, Bodegueros, Admins Operativos) */}
                    {personalOperativo.map(renderUsuarioRow)}

                    {/* SEPARADOR VISUAL */}
                    {personalOperativo.length > 0 && superAdminsOtros.length > 0 && (
                      <TableRow key="separator-other-users" className="bg-muted/40 hover:bg-muted/40 border-y-2 border-primary/20">
                        <TableCell colSpan={bodegasVisibles.length + 1} className="py-2.5 px-4 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground bg-muted/20">
                          ──────────────── 🛡️ Super Admins & Otros Usuarios (Acceso Global o Secundario) ────────────────
                        </TableCell>
                      </TableRow>
                    )}

                    {/* 2. SUPER ADMINS Y OTROS USUARIOS */}
                    {superAdminsOtros.map(renderUsuarioRow)}
                  </>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
