// app/(admin)/catalogo/[id]/components/TabConjunto.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import { Layers, Package, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import type { ConjuntoResuelto } from '@/modules/catalogo/types'
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
import { Switch } from '@/components/ui/switch'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { saveConjuntoItemAction, deleteConjuntoItemAction } from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────

export function TabConjunto({
  conjunto,
  productoId,
}: {
  conjunto: ConjuntoResuelto[]
  productoId: number
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ConjuntoResuelto | null>(null)
  const [deletingItem, setDeletingItem] = useState<ConjuntoResuelto | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleOpenAdd = () => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (c: ConjuntoResuelto) => {
    setEditingItem(c)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    await deleteConjuntoItemAction(deletingItem.id, productoId)
    setDeletingItem(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('producto_padre_id', String(productoId))
    if (editingItem) fd.set('id', String(editingItem.id))

    startTransition(async () => {
      const res = await saveConjuntoItemAction(fd)
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
          <Plus className="h-3.5 w-3.5" /> Agregar Componente
        </Button>
      </div>

      {conjunto.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Layers className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm mt-2 font-medium">Sin productos en el conjunto.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Imagen</th>
                <th className="px-4 py-2 text-left">Producto (SKU)</th>
                <th className="px-4 py-2 text-center">Cant.</th>
                <th className="px-4 py-2 text-center">Req.</th>
                <th className="px-4 py-2 text-center">Orden</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {conjunto.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                      {c.hijo_imagen ? (
                        <img src={c.hijo_imagen} alt="" className="object-contain w-full h-full" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <Link
                        href={ADMIN_ROUTES.catalogo.detalle(c.producto_hijo_id)}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {c.hijo_sku}
                      </Link>
                      <span className="text-muted-foreground truncate max-w-[200px]">{c.hijo_nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums font-semibold text-base">×{c.cantidad}</td>
                  <td className="px-4 py-2 text-center">
                    {c.es_requerido && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-100">
                        Si
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-muted-foreground">#{c.orden}</td>
                  <td className="px-4 py-2 text-right">
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
                          onClick={() => setDeletingItem(c)}
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
              <DialogTitle>{editingItem ? 'Editar Componente' : 'Nuevo Componente'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="producto_hijo_id">ID de Producto Hijo</Label>
                <Input
                  id="producto_hijo_id"
                  name="producto_hijo_id"
                  type="number"
                  defaultValue={editingItem?.producto_hijo_id || ''}
                  placeholder="ID numérico..."
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Temporalmente usa el ID interno. En el futuro se integrará un buscador.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    name="cantidad"
                    type="number"
                    defaultValue={editingItem?.cantidad || 1}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    name="orden"
                    type="number"
                    defaultValue={editingItem?.orden || 0}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  id="es_requerido" 
                  name="es_requerido" 
                  defaultChecked={editingItem?.es_requerido ?? true} 
                />
                <Label htmlFor="es_requerido">Es requerido para el conjunto</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingItem ? 'Guardar Cambios' : 'Agregar Hijo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Eliminar del Conjunto"
        description="¿Estás seguro de que deseas quitar este producto del conjunto?"
        elementName={deletingItem?.hijo_sku ?? 'Producto seleccionado'}
      />
    </div>
  )
}
