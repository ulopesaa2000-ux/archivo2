// app/(admin)/catalogo/[id]/components/TabComplementos.tsx
'use client'

import { useState, useTransition } from 'react'
import type { ComplementoResuelto, CatalogosEdicion } from '@/modules/catalogo/types'
import { Puzzle, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { saveComplementoAction, deleteComplementoAction } from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────

export function TabComplementos({
  complementos,
  productoId,
  catalogos,
}: {
  complementos: ComplementoResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingComp, setEditingComp] = useState<ComplementoResuelto | null>(null)
  const [deletingComp, setDeletingComp] = useState<ComplementoResuelto | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenAdd = () => {
    setEditingComp(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (comp: ComplementoResuelto) => {
    setEditingComp(comp)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingComp) return
    await deleteComplementoAction(deletingComp.id, productoId)
    setDeletingComp(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    if (editingComp) fd.set('id', String(editingComp.id))

    startTransition(async () => {
      const res = await saveComplementoAction(fd)
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
          <Plus className="h-3.5 w-3.5" /> Agregar Complemento
        </Button>
      </div>

      {complementos.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Puzzle className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm mt-2 font-medium">Sin complementos asignados.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Parte Prenda</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Material</th>
                <th className="px-4 py-2 text-left">Corte/Forma</th>
                <th className="px-4 py-2 text-left">Descripción</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {complementos.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{c.parte_prenda ?? '—'}</td>
                  <td className="px-4 py-2.5">{c.tipo_complemento ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs">{c.material ?? '—'}</td>
                  <td className="px-4 py-2.5">{c.corte_forma ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground italic truncate max-w-[200px]">
                    {c.descripcion_adicional ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(c)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingComp(c)}
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
              <DialogTitle>{editingComp ? 'Editar Complemento' : 'Nuevo Complemento'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="parte_prenda_id">Parte de la Prenda</Label>
                <Select name="parte_prenda_id" defaultValue={editingComp?.parte_prenda_id?.toString() || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona parte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.partes.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tipo_comp_id">Tipo de Componente</Label>
                <Select name="tipo_comp_id" defaultValue={editingComp?.tipo_comp_id?.toString() || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.componente_tipos.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material_id">Material</Label>
                <Select name="material_id" defaultValue={editingComp?.material_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona material..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.telas.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion_adicional">Descripción / Detalles</Label>
                <Textarea
                  id="descripcion_adicional"
                  name="descripcion_adicional"
                  defaultValue={editingComp?.descripcion_adicional ?? ''}
                  placeholder="Detalles específicos..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingComp ? 'Guardar Cambios' : 'Crear Complemento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deletingComp}
        onOpenChange={(open) => !open && setDeletingComp(null)}
        onConfirm={handleDelete}
        title="Eliminar Complemento"
        description="¿Estás seguro de que deseas eliminar este complemento? Esta acción no se puede deshacer."
        elementName={deletingComp?.tipo_complemento ?? 'Elemento seleccionado'}
      />
    </div>
  )
}
