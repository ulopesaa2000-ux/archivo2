// components/admin/inventario/config/AsignacionCiudadTab.tsx
'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Building2, 
  Users, 
  Search, 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  UserCheck, 
  UserX, 
  Loader2,
  MapPin,
  Sparkles,
  Eye,
  FileText,
  Check,
  RefreshCw,
  RotateCcw,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  asignarCiudadMasivaAction,
  guardarPermisoDevolucionUsuarioBodegaAction
} from '@/modules/inventario/config-actions'
import { 
  guardarAsignacionBodegaJSONAction, 
  eliminarAsignacionBodegaJSONAction 
} from '@/modules/inventario/actions'
import type { BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'
import type { UsuarioConDetalle } from '@/modules/config/types'
import type { ConfigInventario } from '@/modules/inventario/config-types'
import { cn } from '@/lib/utils'

type Props = {
  bodegas: BodegaRow[]
  usuarios: UsuarioConDetalle[]
  asignacionesIniciales?: UsuarioBodegaRow[]
  config?: ConfigInventario
}

export function AsignacionCiudadTab({ bodegas, usuarios, asignacionesIniciales = [], config }: Props) {
  const [selectedCiudad, setSelectedCiudad] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()
  const [asignaciones, setAsignaciones] = useState<UsuarioBodegaRow[]>(asignacionesIniciales)

  // Estado local para los permisos de Devolución por usuario y bodega
  const [devolucionMap, setDevolucionMap] = useState<Record<string, boolean>>(
    config?.permisos_devolucion_usuario_bodega || {}
  )

  // Control para expandir/colapsar usuarios no operativos
  const [mostrarOtrosUsuarios, setMostrarOtrosUsuarios] = useState(false)

  // Permisos a otorgar en la asignación masiva
  const [permisosMasivos, setPermisosMasivos] = useState({
    puede_consultar: true,
    puede_crear_notas: true,
    puede_confirmar_notas: false,
    puede_transferir: true,
    puede_devolucion: false,
  })

  // Lista de bodegas activas
  const bodegasActivas = useMemo(() => {
    return bodegas.filter((b) => b.activa)
  }, [bodegas])

  // Lista de ciudades disponibles únicas
  const ciudadesDisponibles = useMemo(() => {
    const set = new Set<string>()
    bodegasActivas.forEach((b) => {
      if (b.ciudad) {
        set.add(b.ciudad.trim())
      }
    })
    return Array.from(set).sort()
  }, [bodegasActivas])

  // Bodegas visibles según el filtro de ciudad seleccionado
  const bodegasVisibles = useMemo(() => {
    if (selectedCiudad === 'todas') return bodegasActivas
    if (selectedCiudad === '__VIRTUALES__') {
      return bodegasActivas.filter((b) => b.es_virtual)
    }
    return bodegasActivas.filter((b) => (b.ciudad || '').toLowerCase() === selectedCiudad.toLowerCase())
  }, [bodegasActivas, selectedCiudad])

  // Separar usuarios en: Personal Operativo de Almacén/Bodega vs Otros Roles
  const { personalOperativo, otrosUsuarios } = useMemo(() => {
    const filtrados = usuarios.filter((u) => {
      if (!u.activo) return false
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase().trim()
      return (
        (u.nombre_completo?.toLowerCase().includes(term) ?? false) ||
        (u.email?.toLowerCase().includes(term) ?? false) ||
        (u.username?.toLowerCase().includes(term) ?? false) ||
        (u.rol?.nombre?.toLowerCase().includes(term) ?? false)
      )
    })

    const isOperativo = (u: UsuarioConDetalle) => {
      const name = u.rol?.nombre?.toLowerCase() ?? ''
      
      // Excluir explícitamente roles comerciales, ventas, clientes o superadmins
      if (
        name.includes('comercial') || 
        name.includes('ventas') || 
        name.includes('cliente') || 
        name.includes('b2b') ||
        name.includes('ecommerce')
      ) {
        return false
      }

      // Incluir únicamente los roles directamente ligados a la operación de inventario y bodegas
      return (
        name.includes('inventario') ||
        name.includes('bodeg') ||
        name.includes('encargad') ||
        name.includes('almacen')
      )
    }

    const ops = filtrados.filter(isOperativo).sort((a, b) => {
      const nivelDiff = (a.rol?.nivel_acceso ?? 99) - (b.rol?.nivel_acceso ?? 99)
      if (nivelDiff !== 0) return nivelDiff
      return (a.nombre_completo ?? '').localeCompare(b.nombre_completo ?? '')
    })

    const otros = filtrados.filter((u) => !isOperativo(u)).sort((a, b) => {
      return (a.nombre_completo ?? '').localeCompare(b.nombre_completo ?? '')
    })

    return { personalOperativo: ops, otrosUsuarios: otros }
  }, [usuarios, searchTerm])

  // Buscar asignación específica
  const getAsignacion = (usuarioId: number, bodegaId: number) => {
    return asignaciones.find((a) => a.usuario_id === usuarioId && a.bodega_id === bodegaId)
  }

  // Verificar si tiene permiso de Devolución
  const getPuedeDevolucion = (usuarioId: number, bodegaId: number) => {
    const key = `${usuarioId}_${bodegaId}`
    if (key in devolucionMap) {
      return !!devolucionMap[key]
    }
    // Si no está registrado en el mapa individual, verificar si el rol tiene DEV por defecto
    const user = usuarios.find((u) => u.id === usuarioId)
    const nivel = user?.rol?.nivel_acceso ?? 99
    if (nivel <= 2) return true
    const rolKey = user?.rol_id ? String(user.rol_id) : String(nivel)
    const allowed = config?.permisos_tipos_movimiento?.[rolKey] || config?.permisos_tipos_movimiento?.[String(nivel)]
    return allowed ? allowed.includes('DEV') : false
  }

  // Alternar permiso individual en la celda de la matriz
  const handleTogglePermiso = (
    usuarioId: number,
    bodegaId: number,
    campo: 'puede_consultar' | 'puede_crear_notas' | 'puede_confirmar_notas' | 'puede_transferir' | 'puede_devolucion'
  ) => {
    // Si es permiso especial de devolución
    if (campo === 'puede_devolucion') {
      const key = `${usuarioId}_${bodegaId}`
      const nuevoValor = !getPuedeDevolucion(usuarioId, bodegaId)
      
      setDevolucionMap((prev) => ({
        ...prev,
        [key]: nuevoValor,
      }))

      startTransition(async () => {
        const res = await guardarPermisoDevolucionUsuarioBodegaAction(usuarioId, bodegaId, nuevoValor)
        if (!res.success) {
          toast.error('No se pudo guardar el permiso de devolución')
          setDevolucionMap((prev) => ({
            ...prev,
            [key]: !nuevoValor,
          }))
        } else {
          toast.success(`Permiso de Devolución ${nuevoValor ? 'activado' : 'desactivado'}`)
        }
      })
      return
    }

    const asignacionExistente = getAsignacion(usuarioId, bodegaId)

    const defaultAsignacion = {
      usuario_id: usuarioId,
      bodega_id: bodegaId,
      puede_consultar: true,
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
      setAsignaciones((prev) =>
        prev.map((a) =>
          a.usuario_id === usuarioId && a.bodega_id === bodegaId ? { ...a, ...nuevoPayload } : a
        )
      )
    } else {
      setAsignaciones((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...nuevoPayload,
          created_at: new Date().toISOString(),
        } as any,
      ])
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

  // Eliminar asignación de una bodega individual
  const handleEliminarAsignacion = (usuarioId: number, bodegaId: number) => {
    const oldAsignaciones = [...asignaciones]
    setAsignaciones((prev) => prev.filter((a) => !(a.usuario_id === usuarioId && a.bodega_id === bodegaId)))

    startTransition(async () => {
      const res = await eliminarAsignacionBodegaJSONAction(usuarioId, bodegaId)
      if (!res.success) {
        toast.error('No se pudo eliminar la asignación')
        setAsignaciones(oldAsignaciones)
      } else {
        toast.success('Asignación revocada')
      }
    })
  }

  // Selección múltiple para asignación masiva
  const todosLosUsuariosFiltrados = useMemo(() => {
    return [...personalOperativo, ...(mostrarOtrosUsuarios ? otrosUsuarios : [])]
  }, [personalOperativo, otrosUsuarios, mostrarOtrosUsuarios])

  const handleToggleSelectAll = () => {
    if (selectedUserIds.length === todosLosUsuariosFiltrados.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(todosLosUsuariosFiltrados.map((u) => u.id))
    }
  }

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Ejecutar asignación o revocación masiva por ciudad
  const handleEjecutarMasivo = (accion: 'asignar' | 'revocar') => {
    if (!selectedCiudad || selectedCiudad === 'todas') {
      toast.error('Selecciona una ciudad específica para la acción masiva.')
      return
    }
    if (selectedUserIds.length === 0) {
      toast.error('Selecciona al menos un usuario con los checkboxes.')
      return
    }

    startTransition(async () => {
      const res = await asignarCiudadMasivaAction({
        ciudad: selectedCiudad,
        usuarioIds: selectedUserIds,
        permisos: {
          puede_consultar: permisosMasivos.puede_consultar,
          puede_crear_notas: permisosMasivos.puede_crear_notas,
          puede_confirmar_notas: permisosMasivos.puede_confirmar_notas,
          puede_transferir: permisosMasivos.puede_transferir,
        },
        accion,
      })

      if (res.success) {
        toast.success(res.mensaje || 'Operación completada con éxito')

        // Si se asigna devolución masiva
        if (accion === 'asignar') {
          const nuevasAsigs = [...asignaciones]
          const nuevoDevMap = { ...devolucionMap }

          for (const uId of selectedUserIds) {
            for (const b of bodegasVisibles) {
              const idx = nuevasAsigs.findIndex((a) => a.usuario_id === uId && a.bodega_id === b.id)
              const payload = {
                usuario_id: uId,
                bodega_id: b.id,
                puede_consultar: permisosMasivos.puede_consultar,
                puede_crear_notas: permisosMasivos.puede_crear_notas,
                puede_confirmar_notas: permisosMasivos.puede_confirmar_notas,
                puede_transferir: permisosMasivos.puede_transferir,
              }
              if (idx >= 0) {
                nuevasAsigs[idx] = { ...nuevasAsigs[idx], ...payload }
              } else {
                nuevasAsigs.push({ id: Date.now() + Math.random(), ...payload, created_at: new Date().toISOString() } as any)
              }

              // Devolución map
              nuevoDevMap[`${uId}_${b.id}`] = permisosMasivos.puede_devolucion
            }
          }
          setAsignaciones(nuevasAsigs)
          setDevolucionMap(nuevoDevMap)
        } else {
          const bIds = new Set(bodegasVisibles.map((b) => b.id))
          const uIds = new Set(selectedUserIds)
          setAsignaciones((prev) => prev.filter((a) => !(uIds.has(a.usuario_id) && bIds.has(a.bodega_id))))
        }

        setSelectedUserIds([])
      } else {
        toast.error(res.error || 'Error al procesar la acción masiva')
      }
    })
  }

  // Renderizador de una fila de usuario en la matriz
  const renderUsuarioRow = (usuario: UsuarioConDetalle) => {
    const nivel = usuario.rol?.nivel_acceso ?? 3
    const isSuperAdmin = nivel === 1
    const isSelected = selectedUserIds.includes(usuario.id)

    const rolBadgeColor =
      nivel === 1
        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400'
        : nivel === 2
        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'

    return (
      <TableRow key={usuario.id} className={cn('transition-colors', isSelected ? 'bg-primary/5' : 'hover:bg-muted/10')}>
        {/* Columna Usuario con Checkbox */}
        <TableCell className="font-medium border-r border-muted/50 py-3 pr-4 sticky left-0 bg-card z-10 min-w-[260px]">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleToggleUser(usuario.id)}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate flex items-center gap-1.5">
                {usuario.nombre_completo || usuario.username}
                {isSuperAdmin && (
                  <span title="Acceso Total SuperAdmin">
                    <Shield className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground truncate font-mono">{usuario.email}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-medium', rolBadgeColor)}>
                  {usuario.rol?.nombre ?? 'Sin Rol'}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-semibold">Nivel {nivel}</span>
              </div>
            </div>
          </div>
        </TableCell>

        {/* Columnas de Bodegas */}
        {bodegasVisibles.map((bodega) => {
          const asig = getAsignacion(usuario.id, bodega.id)
          const puedeDev = getPuedeDevolucion(usuario.id, bodega.id)

          if (isSuperAdmin) {
            return (
              <TableCell key={bodega.id} className="text-center py-3 px-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-medium border border-purple-500/20">
                  <Shield className="h-3 w-3" />
                  <span>Acceso Total</span>
                </div>
              </TableCell>
            )
          }

          return (
            <TableCell key={bodega.id} className="text-center py-3 px-2">
              {asig ? (
                <div className="inline-flex flex-col items-center gap-1.5 p-1.5 rounded-lg bg-muted/40 border border-muted shadow-xs">
                  <div className="flex items-center gap-1">
                    {/* 1. Consultar */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={
                          <button
                            type="button"
                            onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_consultar')}
                            disabled={isPending}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center transition-all border text-xs',
                              asig.puede_consultar
                                ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                                : 'bg-background text-muted-foreground/30 border-muted hover:bg-muted'
                            )}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        } />
                        <TooltipContent>
                          <p className="text-xs font-semibold">Consultar</p>
                          <p className="text-[10px] text-muted-foreground">Ver stock y catálogo de esta bodega</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 2. Crear Notas */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={
                          <button
                            type="button"
                            onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_crear_notas')}
                            disabled={isPending}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center transition-all border text-xs',
                              asig.puede_crear_notas
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-background text-muted-foreground/30 border-muted hover:bg-muted'
                            )}
                          >
                            <FileText className="h-3 w-3" />
                          </button>
                        } />
                        <TooltipContent>
                          <p className="text-xs font-semibold">Crear Notas</p>
                          <p className="text-[10px] text-muted-foreground">Crear borradores de notas en esta bodega</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 3. Confirmar / Autorizar Notas */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={
                          <button
                            type="button"
                            onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_confirmar_notas')}
                            disabled={isPending}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center transition-all border text-xs',
                              asig.puede_confirmar_notas
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-500/30'
                                : 'bg-background text-muted-foreground/30 border-muted hover:bg-muted'
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        } />
                        <TooltipContent>
                          <p className="text-xs font-semibold">Aceptar / Confirmar Notas</p>
                          <p className="text-[10px] text-muted-foreground">
                            Autorización para encargados de bodega (aplicar stock)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 4. Transferir */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={
                          <button
                            type="button"
                            onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_transferir')}
                            disabled={isPending}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center transition-all border text-xs',
                              asig.puede_transferir
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-background text-muted-foreground/30 border-muted hover:bg-muted'
                            )}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        } />
                        <TooltipContent>
                          <p className="text-xs font-semibold">Transferir (TRF)</p>
                          <p className="text-[10px] text-muted-foreground">Realizar traspasos hacia/desde esta bodega</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 5. Devolución (DEV) */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={
                          <button
                            type="button"
                            onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_devolucion')}
                            disabled={isPending}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center transition-all border text-xs',
                              puedeDev
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                : 'bg-background text-muted-foreground/30 border-muted hover:bg-muted'
                            )}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        } />
                        <TooltipContent>
                          <p className="text-xs font-semibold">Devolución (DEV)</p>
                          <p className="text-[10px] text-muted-foreground">Permite crear notas de devolución en esta bodega</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarAsignacion(usuario.id, bodega.id)}
                    disabled={isPending}
                    className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-muted hover:border-primary/50"
                  onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_consultar')}
                  disabled={isPending}
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
    <div className="space-y-6">
      {/* ── Bloque 1: Herramienta de Asignación Masiva por Ciudad ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Asignación Masiva por Ciudad</CardTitle>
              <CardDescription>
                Aplica o revoca permisos a todos los usuarios seleccionados sobre las bodegas de una ciudad completa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Ciudad objetivo */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Ciudad Objetivo *
              </Label>
              <Select
                value={selectedCiudad}
                onValueChange={(val: string | null) => setSelectedCiudad(val || 'todas')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="-- Seleccionar Ciudad --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las ciudades ({bodegasActivas.length} bodegas)</SelectItem>
                  {ciudadesDisponibles.map((c) => (
                    <SelectItem key={c} value={c}>
                      Ciudad {c} ({bodegasActivas.filter((b) => (b.ciudad || '').toLowerCase() === c.toLowerCase()).length} bodegas)
                    </SelectItem>
                  ))}
                  <SelectItem value="__VIRTUALES__">
                    Bodegas Virtuales ({bodegasActivas.filter((b) => b.es_virtual).length} bodegas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes de Permisos Masivos */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Permisos a Otorgar en Lote
              </Label>
              <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg border bg-card">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={permisosMasivos.puede_consultar}
                    onCheckedChange={(c) => setPermisosMasivos((p) => ({ ...p, puede_consultar: c === true }))}
                  />
                  <span>Consultar (Eye)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={permisosMasivos.puede_crear_notas}
                    onCheckedChange={(c) => setPermisosMasivos((p) => ({ ...p, puede_crear_notas: c === true }))}
                  />
                  <span>Crear Notas</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={permisosMasivos.puede_confirmar_notas}
                    onCheckedChange={(c) => setPermisosMasivos((p) => ({ ...p, puede_confirmar_notas: c === true }))}
                  />
                  <span className="text-emerald-600 font-semibold">Aceptar/Confirmar</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={permisosMasivos.puede_transferir}
                    onCheckedChange={(c) => setPermisosMasivos((p) => ({ ...p, puede_transferir: c === true }))}
                  />
                  <span className="text-indigo-600 font-semibold">Transferir (TRF)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={permisosMasivos.puede_devolucion}
                    onCheckedChange={(c) => setPermisosMasivos((p) => ({ ...p, puede_devolucion: c === true }))}
                  />
                  <span className="text-purple-600 font-semibold">Devolución (DEV)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Botones de acción masiva */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>
                <strong>{selectedUserIds.length}</strong> usuario(s) seleccionado(s) en la matriz inferior.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending || selectedCiudad === 'todas' || selectedUserIds.length === 0}
                onClick={() => handleEjecutarMasivo('revocar')}
                className="h-8 text-xs gap-1.5"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                Revocar Ciudad ({selectedUserIds.length})
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || selectedCiudad === 'todas' || selectedUserIds.length === 0}
                onClick={() => handleEjecutarMasivo('asignar')}
                className="h-8 text-xs gap-1.5 font-bold shadow-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                Asignar Ciudad ({selectedUserIds.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bloque 2: Matriz Visual de Permisos Usuario × Bodega ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Matriz Granular de Accesos por Bodega</CardTitle>
                <CardDescription>
                  Haz clic en los íconos de cada celda para alternar permisos individuales o revocar accesos.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAll}
                className="h-8 text-xs shrink-0"
              >
                {selectedUserIds.length === todosLosUsuariosFiltrados.length ? 'Deseleccionar' : 'Marcar Todos'}
              </Button>
            </div>
          </div>

          {/* Leyenda de Íconos */}
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground pt-3 border-t mt-3">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-blue-500 text-white inline-flex items-center justify-center text-[10px]">
                <Eye className="h-2.5 w-2.5" />
              </span>
              = Consultar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-amber-500 text-white inline-flex items-center justify-center text-[10px]">
                <FileText className="h-2.5 w-2.5" />
              </span>
              = Crear Notas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[10px]">
                <Check className="h-2.5 w-2.5" />
              </span>
              = Aceptar/Confirmar (Encargados)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-indigo-600 text-white inline-flex items-center justify-center text-[10px]">
                <RefreshCw className="h-2.5 w-2.5" />
              </span>
              = Transferir (TRF)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-purple-600 text-white inline-flex items-center justify-center text-[10px]">
                <RotateCcw className="h-2.5 w-2.5" />
              </span>
              = Devolución (DEV)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-bold text-xs uppercase sticky left-0 bg-muted z-20 min-w-[260px]">
                    Personal / Usuario
                  </TableHead>
                  {bodegasVisibles.map((b) => (
                    <TableHead key={b.id} className="text-center font-bold text-xs uppercase min-w-[150px] px-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {b.ciudad || (b.es_virtual ? 'Virtual' : 'General')}
                        </span>
                        <span className="truncate max-w-[130px]">{b.nombre}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Encabezado Grupo 1: Personal Operativo de Bodega */}
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell
                    colSpan={bodegasVisibles.length + 1}
                    className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-primary"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Personal Operativo de Inventario y Bodegas ({personalOperativo.length})</span>
                    </div>
                  </TableCell>
                </TableRow>

                {personalOperativo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bodegasVisibles.length + 1} className="text-center py-6 text-xs text-muted-foreground">
                      No se encontraron usuarios operativos con el filtro actual.
                    </TableCell>
                  </TableRow>
                ) : (
                  personalOperativo.map(renderUsuarioRow)
                )}

                {/* Encabezado Grupo 2: División con flechita para otros roles */}
                <TableRow
                  onClick={() => setMostrarOtrosUsuarios(!mostrarOtrosUsuarios)}
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors border-t-2"
                >
                  <TableCell
                    colSpan={bodegasVisibles.length + 1}
                    className="py-2.5 px-4 text-xs font-semibold text-muted-foreground"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Otros Roles y Usuarios Generales ({otrosUsuarios.length}) —{' '}
                          <span className="font-normal opacity-80">
                            {mostrarOtrosUsuarios ? 'Haz clic para colapsar' : 'Haz clic para expandir y configurar accesos especiales'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-primary">
                        <span>{mostrarOtrosUsuarios ? 'Ocultar' : 'Mostrar'}</span>
                        {mostrarOtrosUsuarios ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Filas del Grupo 2 cuando está expandido */}
                {mostrarOtrosUsuarios && otrosUsuarios.map(renderUsuarioRow)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
