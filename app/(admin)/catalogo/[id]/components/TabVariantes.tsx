// app/(admin)/catalogo/[id]/components/TabVariantes.tsx
'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { VarianteResuelta, CatalogosEdicion } from '@/modules/catalogo/types'
import { Shirt, Plus, Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { saveVarianteAction, deleteVarianteAction } from '@/modules/catalogo/actions'

// ─────────────────────────────────────────────────────────────────────────────

export function TabVariantes({
  variantes,
  productoId,
  skuBase,
  catalogos,
}: {
  variantes: VarianteResuelta[]
  productoId: number
  skuBase: string
  catalogos: CatalogosEdicion
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVar, setEditingVar] = useState<VarianteResuelta | null>(null)
  const [deletingVar, setDeletingVar] = useState<VarianteResuelta | null>(null)
  const [isPending, startTransition] = useTransition()

  const activas = variantes.filter((v) => v.activo).length

  const handleOpenAdd = () => {
    setEditingVar(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (v: VarianteResuelta) => {
    setEditingVar(v)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingVar) return
    await deleteVarianteAction(deletingVar.id, productoId)
    setDeletingVar(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    if (editingVar) fd.set('id', String(editingVar.id))

    startTransition(async () => {
      const res = await saveVarianteAction(fd)
      if (res.success) {
        setIsDialogOpen(false)
      } else {
        alert(res.error)
      }
    })
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activas} activa{activas !== 1 ? 's' : ''} de {variantes.length} variantes
        </p>
        <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Agregar Variante
        </Button>
      </div>

      {variantes.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Shirt className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm mt-2 font-medium">Sin variantes asignadas.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Talla</th>
                <th className="px-4 py-2 text-left">Color</th>
                <th className="px-4 py-2 text-right">Costo</th>
                <th className="px-4 py-2 text-right">Precio</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {variantes.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{v.sku_completo ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium">{v.talla_codigo ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      {v.color_hex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border shadow-sm"
                          style={{ backgroundColor: v.color_hex }}
                        />
                      )}
                      {v.color_nombre ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {v.costo_promedio ? formatCurrency(v.costo_promedio) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                    {v.precio_venta ? formatCurrency(v.precio_venta) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {v.activo ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-100">
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(v)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingVar(v)}
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
              <DialogTitle>{editingVar ? 'Editar Variante' : 'Nueva Variante'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sku_completo">SKU Completo</Label>
                <Input
                  id="sku_completo"
                  name="sku_completo"
                  defaultValue={editingVar?.sku_completo ?? skuBase}
                  placeholder="Ej: ABC-XL-RED"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="talla_id">Talla</Label>
                  <Select name="talla_id" defaultValue={editingVar?.talla_id?.toString() || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogos.tallas.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color_id">Color</Label>
                  <Select name="color_id" defaultValue={editingVar?.color_id?.toString() || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_null">Ninguno</SelectItem>
                      {catalogos.colores.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="costo_promedio">Costo Promedio</Label>
                  <Input
                    id="costo_promedio"
                    name="costo_promedio"
                    type="number"
                    step="0.01"
                    defaultValue={editingVar?.costo_promedio ?? ''}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="precio_venta">Precio de Venta</Label>
                  <Input
                    id="precio_venta"
                    name="precio_venta"
                    type="number"
                    step="0.01"
                    defaultValue={editingVar?.precio_venta ?? ''}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  id="activo" 
                  name="activo" 
                  defaultChecked={editingVar ? editingVar.activo : true} 
                />
                <Label htmlFor="activo">Variante activa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingVar ? 'Guardar Cambios' : 'Crear Variante'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={!!deletingVar}
        onOpenChange={(open) => !open && setDeletingVar(null)}
        onConfirm={handleDelete}
        title="Eliminar Variante"
        description="¿Estás seguro de que deseas eliminar esta variante? Se eliminarán también sus registros de stock asociados."
        elementName={deletingVar?.sku_completo ?? 'Variante seleccionada'}
      />
    </div>
  )
}
