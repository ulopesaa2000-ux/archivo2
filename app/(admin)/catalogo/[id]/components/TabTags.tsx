// app/(admin)/catalogo/[id]/components/TabTags.tsx
'use client'

import { useState, useTransition } from 'react'
import type { TagResuelto, CatalogosEdicion } from '@/modules/catalogo/types'
import { Tag, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { saveTagAction, deleteTagAction } from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────

export function TabTags({
  tags,
  productoId,
  catalogos,
}: {
  tags: TagResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagResuelto | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagResuelto | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenAdd = () => {
    setEditingTag(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (tag: TagResuelto) => {
    setEditingTag(tag)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    await deleteTagAction(deletingTag.id, productoId)
    setDeletingTag(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    if (editingTag) fd.set('id', String(editingTag.id))

    startTransition(async () => {
      const res = await saveTagAction(fd)
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
          <Plus className="h-3.5 w-3.5" /> Agregar Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <EmptyState message="Sin tags asignados." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Referencia</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tags.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">{t.tipo_tag_nombre ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {t.tipo_tag_codigo ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">{t.ref_tag_nombre ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.valor_texto ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(t)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingTag(t)}
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
              <DialogTitle>{editingTag ? 'Editar Tag' : 'Nuevo Tag'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo_tag_id">Tipo de Tag</Label>
                <Select name="tipo_tag_id" defaultValue={editingTag?.tipo_tag_id?.toString() || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.tipos_tag.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ref_tag_id">Referencia / Categoría</Label>
                <Select name="ref_tag_id" defaultValue={editingTag?.ref_tag_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una referencia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.ref_tags.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valor_texto">Valor / Texto</Label>
                <Input
                  id="valor_texto"
                  name="valor_texto"
                  defaultValue={editingTag?.valor_texto ?? ''}
                  placeholder="Ej: Slim Fit, Algodón 100%, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingTag ? 'Guardar Cambios' : 'Crear Tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        onConfirm={handleDelete}
        title="Eliminar Tag"
        description="¿Estás seguro de que deseas eliminar este tag? Esta acción no se puede deshacer."
        elementName={deletingTag?.tipo_tag_nombre ?? 'Elemento seleccionado'}
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
      <Tag className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm mt-2 font-medium">{message}</p>
    </div>
  )
}
