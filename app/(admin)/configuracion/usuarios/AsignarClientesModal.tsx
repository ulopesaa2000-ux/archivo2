// app/(admin)/configuracion/usuarios/AsignarClientesModal.tsx
'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Users,
  Search,
  Building2,
  UserCheck,
  Loader2,
  X,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { guardarAsignacionesUsuarioAction } from '@/modules/config/actions'
import { fetchAssignedPersonas } from '@/modules/config/queries'
import type { PersonaRow, PersonaAsignadaComercial } from '@/lib/types/tables'
import { cn } from '@/lib/utils'

interface AsignarClientesModalProps {
  usuarioId: number
  nombreUsuario: string
  personasDisponibles: PersonaRow[]
}

export function AsignarClientesModal({
  usuarioId,
  nombreUsuario,
  personasDisponibles,
}: AsignarClientesModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [assignedLoading, setAssignedLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // 1. Cargar las asignaciones actuales cuando se abre el modal
  useEffect(() => {
    if (!open) return

    const loadAsignaciones = async () => {
      setAssignedLoading(true)
      try {
        const assigned = await fetchAssignedPersonas(usuarioId)
        setSelectedIds(assigned.map((p) => p.id))
      } catch (err) {
        console.error('Error al cargar asignaciones comerciales:', err)
        toast.error('No se pudieron cargar las asignaciones actuales.')
      } finally {
        setAssignedLoading(false)
      }
    }

    loadAsignaciones()
  }, [open, usuarioId])

  // 2. Filtrar y clasificar las personas disponibles
  const cleanSearch = searchTerm.trim().toLowerCase()
  const filteredPersonas = personasDisponibles.filter((p) =>
    p.nombre_completo.toLowerCase().includes(cleanSearch) ||
    p.identificacion_fiscal?.toLowerCase().includes(cleanSearch)
  )

  const clientes = filteredPersonas.filter((p) => p.tipo_entidad === 'Cliente B2B')
  const proveedores = filteredPersonas.filter((p) => p.tipo_entidad === 'Proveedor')

  // 3. Manejo de selección individual
  const togglePersona = (personaId: number) => {
    setSelectedIds((prev) =>
      prev.includes(personaId)
        ? prev.filter((id) => id !== personaId)
        : [...prev, personaId]
    )
  }

  // 4. Guardar asignaciones
  const handleSave = () => {
    startTransition(async () => {
      const res = await guardarAsignacionesUsuarioAction(usuarioId, selectedIds)
      if (res.success) {
        toast.success(`Alcance comercial de ${nombreUsuario} actualizado con éxito.`)
        setOpen(false)
      } else {
        toast.error(res.error ?? 'No se pudieron actualizar las asignaciones.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 h-8 px-3 rounded-md select-none shadow-sm cursor-pointer">
        <UserCheck className="h-3.5 w-3.5" />
        <span>Alcance</span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden rounded-xl border border-muted bg-background/95 backdrop-blur-md">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-primary animate-pulse" />
            <span>Alcance Comercial de {nombreUsuario}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Asigna las empresas autorizadas para este usuario. Solo podrá consultar e interactuar con datos de las personas que selecciones aquí.
          </p>
        </DialogHeader>

        {/* Buscador de filtro rápido */}
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 text-xs h-9 rounded-lg border-muted bg-muted/20 focus-visible:ring-primary"
            placeholder="Buscar por nombre de cliente o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary text-muted-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Listado Principal con Scroll */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {assignedLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs">Cargando asignaciones actuales...</p>
            </div>
          ) : (
            <>
              {/* SECCIÓN CLIENTES B2B */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-muted pb-1.5">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Clientes B2B ({clientes.length})
                  </h3>
                </div>

                {clientes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 pl-2">
                    {searchTerm ? 'No hay clientes que coincidan con la búsqueda.' : 'No hay clientes B2B registrados.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clientes.map((c) => {
                      const isAssigned = selectedIds.includes(c.id)
                      return (
                        <div
                          key={c.id}
                          onClick={() => togglePersona(c.id)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 hover:shadow-sm',
                            isAssigned
                              ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-500/5'
                              : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/10'
                          )}
                        >
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={() => togglePersona(c.id)}
                            className="border-muted-foreground/40 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {c.nombre_completo}
                            </p>
                            {c.identificacion_fiscal && (
                              <p className="text-[10px] text-muted-foreground font-mono truncate leading-tight mt-0.5">
                                ID: {c.identificacion_fiscal}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN PROVEEDORES */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 border-b border-muted pb-1.5">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Proveedores ({proveedores.length})
                  </h3>
                </div>

                {proveedores.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 pl-2">
                    {searchTerm ? 'No hay proveedores que coincidan con la búsqueda.' : 'No hay proveedores registrados.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {proveedores.map((p) => {
                      const isAssigned = selectedIds.includes(p.id)
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePersona(p.id)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 hover:shadow-sm',
                            isAssigned
                              ? 'border-emerald-500 bg-emerald-500/5 shadow-emerald-500/5'
                              : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/10'
                          )}
                        >
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={() => togglePersona(p.id)}
                            className="border-muted-foreground/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {p.nombre_completo}
                            </p>
                            {p.identificacion_fiscal && (
                              <p className="text-[10px] text-muted-foreground font-mono truncate leading-tight mt-0.5">
                                ID: {p.identificacion_fiscal}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer y Acciones de Modal */}
        <DialogFooter className="border-t pt-4 mt-4 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground font-medium hidden sm:block">
            {selectedIds.length === 0 ? (
              <span>Sin asignaciones (sin acceso B2B)</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                {selectedIds.length} asignación{selectedIds.length !== 1 ? 'es' : ''} seleccionada{selectedIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-9 bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
              disabled={isPending || assignedLoading}
              onClick={handleSave}
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
