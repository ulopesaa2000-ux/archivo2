// app/(admin)/catalogo/[id]/components/TabAcabados.tsx
'use client'

import { useState, useTransition } from 'react'
import type { AcabadoResuelto, CatalogosEdicion } from '@/modules/catalogo/types'
import { Paintbrush, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { saveAcabadoAction, deleteAcabadoAction } from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────

export function TabAcabados({
  acabados,
  productoId,
  catalogos,
  canEdit = true,
}: {
  acabados: AcabadoResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
  canEdit?: boolean
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAca, setEditingAca] = useState<AcabadoResuelto | null>(null)
  const [deletingAca, setDeletingAca] = useState<AcabadoResuelto | null>(null)
  const [isPending, startTransition] = useTransition()
  // Estados para cada select
  const [selectedTipoAcabadoId, setSelectedTipoAcabadoId] = useState<string>('')
  const [selectedDetalleId, setSelectedDetalleId] = useState<string>('')
  const [selectedPatronId, setSelectedPatronId] = useState<string>('')
  const [selectedLocalizacionId, setSelectedLocalizacionId] = useState<string>('')

  const handleOpenAdd = () => {
    setEditingAca(null)
    setSelectedTipoAcabadoId('')
    setSelectedDetalleId('')
    setSelectedPatronId('')
    setSelectedLocalizacionId('')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (aca: AcabadoResuelto) => {
    setEditingAca(aca)
    setSelectedTipoAcabadoId(aca.tipo_acabado_id?.toString() || '')
    setSelectedDetalleId(aca.detalle_acabado_id?.toString() || '')
    setSelectedPatronId(aca.patron_acabado_id?.toString() || '')
    setSelectedLocalizacionId(aca.localizacion_id?.toString() || '')
    setIsDialogOpen(true)
  }

  // Nombres seleccionados para mostrar en SelectValue
  const selectedTipoAcabadoNombre = selectedTipoAcabadoId
    ? catalogos.acabado_tipos.find(t => t.id.toString() === selectedTipoAcabadoId)?.nombre
    : undefined

  const selectedDetalleNombre = selectedDetalleId === '_null'
    ? 'Ninguno'
    : selectedDetalleId
    ? catalogos.acabado_detalles.find(d => d.id.toString() === selectedDetalleId)?.nombre
    : undefined

  const selectedPatronNombre = selectedPatronId === '_null'
    ? 'Ninguno'
    : selectedPatronId
    ? catalogos.acabado_patrones.find(p => p.id.toString() === selectedPatronId)?.nombre
    : undefined

  const selectedLocalizacionNombre = selectedLocalizacionId === '_null'
    ? 'Ninguno'
    : selectedLocalizacionId
    ? catalogos.localizaciones.find(l => l.id.toString() === selectedLocalizacionId)?.nombre
    : undefined

  const handleDelete = async () => {
    if (!deletingAca) return
    await deleteAcabadoAction(deletingAca.id, productoId)
    setDeletingAca(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    if (editingAca) fd.set('id', String(editingAca.id))

    startTransition(async () => {
      const res = await saveAcabadoAction(fd)
      if (res.success) {
        setIsDialogOpen(false)
      } else {
        alert(res.error)
      }
    })
  }

  return (
    <div className="space-y-4 mt-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Agregar Acabado
          </Button>
        </div>
      )}

      {acabados.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Paintbrush className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm mt-2 font-medium">Sin acabados asignados.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Tipo Acabado</th>
                <th className="px-4 py-2 text-left">Detalle</th>
                <th className="px-4 py-2 text-left">Patrón</th>
                <th className="px-4 py-2 text-left">Localización</th>
                {canEdit && <th className="px-4 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {acabados.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{a.tipo_acabado ?? '—'}</td>
                  <td className="px-4 py-2.5">{a.detalle ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs italic">{a.patron ?? '—'}</td>
                  <td className="px-4 py-2.5">{a.localizacion ?? '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(a)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingAca(a)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DIALOGO DE FORMULARIO */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedTipoAcabadoId('')
          setSelectedDetalleId('')
          setSelectedPatronId('')
          setSelectedLocalizacionId('')
          setEditingAca(null)
        }
        setIsDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAca ? 'Editar Acabado' : 'Nuevo Acabado'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo_acabado_id">Tipo de Acabado</Label>
                <Select
                  name="tipo_acabado_id"
                  value={selectedTipoAcabadoId}
                  onValueChange={(val) => setSelectedTipoAcabadoId(val || '')}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo...">
                      {selectedTipoAcabadoNombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.acabado_tipos.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detalle_acabado_id">Detalle</Label>
                <Select
                  name="detalle_acabado_id"
                  value={selectedDetalleId}
                  onValueChange={(val) => setSelectedDetalleId(val || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona detalle...">
                      {selectedDetalleNombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.acabado_detalles.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="patron_acabado_id">Patrón / Estampado</Label>
                <Select
                  name="patron_acabado_id"
                  value={selectedPatronId}
                  onValueChange={(val) => setSelectedPatronId(val || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona patrón...">
                      {selectedPatronNombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.acabado_patrones.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="localizacion_id">Localización</Label>
                <Select
                  name="localizacion_id"
                  value={selectedLocalizacionId}
                  onValueChange={(val) => setSelectedLocalizacionId(val || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona localización...">
                      {selectedLocalizacionNombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.localizaciones.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingAca ? 'Guardar Cambios' : 'Crear Acabado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deletingAca}
        onOpenChange={(open) => !open && setDeletingAca(null)}
        onConfirm={handleDelete}
        title="Eliminar Acabado"
        description="¿Estás seguro de que deseas eliminar este acabado? Esta acción no se puede deshacer."
        elementName={deletingAca?.tipo_acabado ?? 'Elemento seleccionado'}
      />
    </div>
  )
}
