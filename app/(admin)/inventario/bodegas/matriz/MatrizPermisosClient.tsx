// app/(admin)/inventario/bodegas/matriz/MatrizPermisosClient.tsx
'use client'

import React, { useState, useTransition } from 'react'
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
  Info
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
  const [isPending, startTransition] = useTransition()
  const [asignaciones, setAsignaciones] = useState<UsuarioBodegaRow[]>(asignacionesIniciales)

  // Filtrar bodegas activas
  const bodegasActivas = bodegas.filter(b => b.activa)

  // Filtrar usuarios activos y que sean nivel 2 o 3 (personal operativo y encargados)
  const usuariosOperativos = usuarios.filter(u => 
    u.activo && 
    u.rol && 
    (u.rol.nivel_acceso === 2 || u.rol.nivel_acceso === 3) &&
    u.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

    // Valores por defecto si se crea uno nuevo
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
        setAsignaciones(oldAsignaciones) // rollback
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
        setAsignaciones(oldAsignaciones) // rollback
      } else {
        toast.success('Asignación eliminada de la bodega')
      }
    })
  }

  // Crear asignación rápida con consulta por defecto
  const handleCrearAsignacionRapida = (usuarioId: number, bodegaId: number) => {
    handleTogglePermiso(usuarioId, bodegaId, 'puede_consultar')
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
              Visualiza y administra accesos, creación de notas y autorizaciones por bodega de forma directa.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario o correo..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                      Usuario / Rol
                    </span>
                  </TableHead>
                  {bodegasActivas.map(bodega => (
                    <TableHead key={bodega.id} className="min-w-[200px] text-center font-semibold text-foreground py-4 px-3">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-mono text-xs text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                          {bodega.codigo}
                        </span>
                        <span className="text-xs truncate max-w-[180px] font-medium" title={bodega.nombre}>
                          {bodega.nombre}
                        </span>
                        {bodega.es_virtual && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 scale-90">Virtual</Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-muted/30">
                {usuariosOperativos.length === 0 ? (
                  <TableRow>
                    <td colSpan={bodegasActivas.length + 1} className="py-12 text-center text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-medium">No se encontraron usuarios operativos activos</p>
                      <p className="text-xs opacity-75 mt-0.5">Intenta con otro término de búsqueda.</p>
                    </td>
                  </TableRow>
                ) : (
                  usuariosOperativos.map(usuario => {
                    const nivel = usuario.rol?.nivel_acceso ?? 3
                    const rolBadgeColor = nivel === 2 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'

                    return (
                      <TableRow key={usuario.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium border-r border-muted/50 py-4 pr-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-foreground font-semibold">
                              {usuario.nombre_completo}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {usuario.email}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className={cn('text-[10px] px-2 py-0 font-medium', rolBadgeColor)}>
                                {usuario.rol?.nombre ?? 'Sin Rol'}
                              </Badge>
                              {usuario.rol?.nivel_acceso && (
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Nivel {usuario.rol.nivel_acceso}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {bodegasActivas.map(bodega => {
                          const asig = getAsignacion(usuario.id, bodega.id)

                          return (
                            <TableCell key={bodega.id} className="text-center py-4 px-3">
                              {asig ? (
                                <div className="inline-flex flex-col items-center gap-2 p-2 rounded-lg bg-muted/30 border border-muted/50 shadow-sm">
                                  <div className="flex items-center gap-1">
                                    <Tooltip>
                                      <TooltipTrigger>
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
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-semibold">puede_consultar</p>
                                        <p className="text-[10px] opacity-75">Permite ver stock y listado de notas de esta bodega.</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger>
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
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-semibold">puede_crear_notas</p>
                                        <p className="text-[10px] opacity-75">Permite crear nuevas notas de inventario (Borrador).</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger>
                                        <button
                                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_confirmar_notas')}
                                          disabled={isPending}
                                          className={cn(
                                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                                            asig.puede_confirmar_notas
                                              ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                                          )}
                                        >
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-semibold">puede_confirmar_notas</p>
                                        <p className="text-[10px] opacity-75">Permite CONFIRMAR notas y realizar movimientos de stock reales.</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger>
                                        <button
                                          onClick={() => handleTogglePermiso(usuario.id, bodega.id, 'puede_transferir')}
                                          disabled={isPending}
                                          className={cn(
                                            'w-7 h-7 rounded-md flex items-center justify-center transition-all border shadow-sm',
                                            asig.puede_transferir
                                              ? 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600'
                                              : 'bg-background text-muted-foreground/40 border-muted hover:bg-muted/50'
                                          )}
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs font-semibold">puede_transferir</p>
                                        <p className="text-[10px] opacity-75">Permite mover stock entre esta bodega y otras.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>

                                  <div className="w-full border-t border-muted/50 pt-1.5 mt-0.5 flex justify-between items-center px-1">
                                    <span className="text-[9px] text-muted-foreground italic font-semibold">
                                      Asignado
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`¿Quitar asignación de bodega "${bodega.codigo}" al usuario "${usuario.nombre_completo}"?`)) {
                                          handleEliminarAsignacion(usuario.id, bodega.id)
                                        }
                                      }}
                                      disabled={isPending}
                                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5 rounded hover:bg-destructive/10"
                                      title="Desasignar bodega"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-dashed border-muted text-muted-foreground/50 hover:text-primary hover:border-primary/50 text-xs px-2.5 rounded-lg"
                                  onClick={() => handleCrearAsignacionRapida(usuario.id, bodega.id)}
                                  disabled={isPending}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Asignar
                                </Button>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
      <div className="p-4 border-t border-muted/50 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-foreground"><Info className="h-3.5 w-3.5 text-blue-500" /> Guía de Iconos:</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500 fill-blue-500/10" /> 🔍 Consultar</span>
          <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-amber-500 fill-amber-500/10" /> 📝 Crear Notas</span>
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500 fill-emerald-500/10" /> 🏆 Confirmar Notas</span>
          <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 text-purple-500 fill-purple-500/10" /> 🔄 Transferir</span>
        </div>
        <div>
          {isPending && (
            <span className="flex items-center gap-1 text-primary font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando en Supabase...
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
