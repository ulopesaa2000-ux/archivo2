// app/(admin)/catalogo/[id]/components/TabComplementos.tsx
'use client'

import { useState, useTransition } from 'react'
import type { ComplementoResuelto, CatalogosEdicion, CatalogoItem } from '@/modules/catalogo/types'
import { Puzzle, Plus, Pencil, Trash2, MoreVertical, Loader2, Layers } from 'lucide-react'
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
  // Estado para trackear la parte de prenda seleccionada (filtra tipos y cortes)
  const [selectedParteId, setSelectedParteId] = useState<string>('')
  // Estado para trackear el tipo de componente seleccionado (filtra cortes)
  const [selectedTipoCompId, setSelectedTipoCompId] = useState<string>('')

  const handleOpenAdd = () => {
    setEditingComp(null)
    setSelectedParteId('')
    setSelectedTipoCompId('')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (comp: ComplementoResuelto) => {
    setEditingComp(comp)
    setSelectedParteId(comp.parte_prenda_id?.toString() || '')
    setSelectedTipoCompId(comp.tipo_comp_id?.toString() || '')
    setIsDialogOpen(true)
  }

  // Obtener nombre de la parte seleccionada para filtrar
  const selectedParteNombre = selectedParteId
    ? catalogos.partes.find((p) => p.id === parseInt(selectedParteId))?.nombre
    : undefined

  // Obtener nombre del tipo de componente seleccionado para filtrar cortes
  const selectedTipoCompNombre = selectedTipoCompId
    ? catalogos.componente_tipos.find((tc) => tc.id === parseInt(selectedTipoCompId))?.nombre
    : undefined

  // Filtrar tipo_comp: complemento_en = nombre_parte O "TODO"
  const tiposFiltrados = selectedParteNombre
    ? catalogos.componente_tipos.filter(
        (tc) => tc.complemento_en === selectedParteNombre || tc.complemento_en === 'TODO'
      )
    : []

  // Filtrar corte_forma: corte_forma_en = nombre_parte O "TODO" O nombre_tipo_comp
  const cortesFiltrados = selectedParteNombre
    ? catalogos.corte_formas.filter(
        (cf) =>
          cf.corte_forma_en === selectedParteNombre ||
          cf.corte_forma_en === 'TODO' ||
          (selectedTipoCompNombre && cf.corte_forma_en === selectedTipoCompNombre)
      )
    : []

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
                <Label htmlFor="parte_prenda_id">Parte de la Prenda *</Label>
                <Select
                  name="parte_prenda_id"
                  value={selectedParteId}
                  onValueChange={(val) => {
                    setSelectedParteId(val || '')
                    setSelectedTipoCompId('') // Reset tipo cuando cambia la parte
                  }}
                  required
                >
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
                <Label htmlFor="tipo_comp_id">Tipo de Componente *</Label>
                <Select
                  name="tipo_comp_id"
                  value={selectedTipoCompId}
                  onValueChange={(val) => setSelectedTipoCompId(val || '')}
                  disabled={!selectedParteId || tiposFiltrados.length === 0}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedParteId
                        ? "Primero selecciona una parte..."
                        : tiposFiltrados.length === 0
                          ? "Sin tipos para esta parte"
                          : "Selecciona tipo..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposFiltrados.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                        {cat.complemento_en === 'TODO' && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(TODO)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedParteId && tiposFiltrados.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    No hay tipos de componente configurados para "{selectedParteNombre}".
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="corte_forma_id">Corte / Forma</Label>
                <Select
                  name="corte_forma_id"
                  defaultValue={editingComp?.corte_forma_id?.toString() || ''}
                  disabled={!selectedParteId || cortesFiltrados.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedParteId
                        ? "Primero selecciona una parte..."
                        : cortesFiltrados.length === 0
                          ? "Sin cortes para esta parte/tipo"
                          : "Selecciona corte/forma..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {cortesFiltrados.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nombre}
                        {cat.corte_forma_en === 'TODO' && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(TODO)</span>
                        )}
                        {selectedTipoCompNombre && cat.corte_forma_en === selectedTipoCompNombre && (
                          <span className="ml-2 text-[10px] text-blue-500">→ {selectedTipoCompNombre}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedParteId && cortesFiltrados.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    No hay cortes/formas configurados para "{selectedParteNombre}" o tipo seleccionado.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material_id">Material</Label>
                <Select name="material_id" defaultValue={editingComp?.material_id?.toString() || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona material..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.materiales.map((cat) => (
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
