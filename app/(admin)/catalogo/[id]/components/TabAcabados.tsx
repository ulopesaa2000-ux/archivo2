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
}: {
  acabados: AcabadoResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAca, setEditingAca] = useState<AcabadoResuelto | null>(null)
  const [deletingAca, setDeletingAca] = useState<AcabadoResuelto | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenAdd = () => {
    setEditingAca(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (aca: AcabadoResuelto) => {
    setEditingAca(aca)
    setIsDialogOpen(true)
  }

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
      <div className="flex justify-end">
        <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Agregar Acabado
        </Button>
      </div>

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
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {acabados.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{a.tipo_acabado ?? '—'}</td>
                  <td className="px-4 py-2.5">{a.detalle ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs italic">{a.patron ?? '—'}</td>
                  <td className="px-4 py-2.5">{a.localizacion ?? '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DIALOGO DE FORMULARIO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAca ? 'Editar Acabado' : 'Nuevo Acabado'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo_acabado_id">Tipo de Acabado</Label>
                <Select name="tipo_acabado_id" defaultValue={editingAca?.tipo_acabado_id?.toString() || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.acabado_tipos.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} label={cat.nombre}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detalle_acabado_id">Detalle</Label>
                <Select name="detalle_acabado_id" defaultValue={editingAca?.detalle_acabado_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona detalle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null" label="Ninguno">Ninguno</SelectItem>
                    {catalogos.acabado_detalles.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} label={cat.nombre}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="patron_acabado_id">Patrón / Estampado</Label>
                <Select name="patron_acabado_id" defaultValue={editingAca?.patron_acabado_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona patrón..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null" label="Ninguno">Ninguno</SelectItem>
                    {catalogos.acabado_patrones.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} label={cat.nombre}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="localizacion_id">Localización</Label>
                <Select name="localizacion_id" defaultValue={editingAca?.localizacion_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona localización..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null" label="Ninguno">Ninguno</SelectItem>
                    {catalogos.localizaciones.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} label={cat.nombre}>
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
