// app/(admin)/catalogo/[id]/components/TabVariantes.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, cn } from '@/lib/utils'
import type { VarianteResuelta, CatalogosEdicion, CajaConDetalle } from '@/modules/catalogo/types'
import { Shirt, Plus, Pencil, Trash2, MoreVertical, Loader2, Sparkles, Star, Package } from 'lucide-react'
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
import { saveVarianteAction, deleteVarianteAction, deleteVariantesBatchAction } from '@/modules/catalogo/actions'
import { generarVariantesDesdeCajaPrincipalAction } from '@/modules/cajas/actions'
import { ColorCombobox } from '@/components/admin/cajas/ColorCombobox'
import { TallaCombobox } from '@/components/admin/cajas/TallaCombobox'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────────────────

export function TabVariantes({
  variantes,
  productoId,
  skuBase,
  catalogos,
  cajaPrincipal,
  canEdit = true,
}: {
  variantes: VarianteResuelta[]
  productoId: number
  skuBase: string
  catalogos: CatalogosEdicion
  cajaPrincipal: CajaConDetalle | null
  canEdit?: boolean
}) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVar, setEditingVar] = useState<VarianteResuelta | null>(null)
  const [deletingVar, setDeletingVar] = useState<VarianteResuelta | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  // Estados para talla y color
  const [selectedTallaId, setSelectedTallaId] = useState<string>('')
  const [selectedColorId, setSelectedColorId] = useState<string>('')

  const activas = variantes.filter((v) => v.activo).length
  const seleccionadasCount = selectedIds.size

  const handleOpenAdd = () => {
    setEditingVar(null)
    setSelectedTallaId('')
    setSelectedColorId('')
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (v: VarianteResuelta) => {
    setEditingVar(v)
    setSelectedTallaId(v.talla_id?.toString() || '')
    setSelectedColorId(v.color_id?.toString() || '')
    setIsDialogOpen(true)
  }

  // Nombres seleccionados para mostrar en SelectValue
  const selectedTallaNombre = selectedTallaId
    ? catalogos.tallas.find(t => t.id.toString() === selectedTallaId)?.nombre
    : undefined

  const selectedColorNombre = selectedColorId === '_null'
    ? 'Ninguno'
    : selectedColorId
    ? catalogos.colores.find(c => c.id.toString() === selectedColorId)?.nombre
    : undefined

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

  const toggleSelectAll = () => {
    if (selectedIds.size === variantes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(variantes.map(v => v.id)))
    }
  }

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    setIsBatchDeleting(true)
    try {
      const res = await deleteVariantesBatchAction(Array.from(selectedIds), productoId)
      if (res.success) {
        toast.success(`${selectedIds.size} variantes eliminadas permanentemente`)
        setSelectedIds(new Set())
        setShowBatchDeleteModal(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al eliminar variantes')
      }
    } catch (err) {
      toast.error('Error inesperado al eliminar variantes')
    } finally {
      setIsBatchDeleting(false)
    }
  }

  const handleGenerarVariantes = async () => {
    setIsGenerating(true)
    try {
      console.log('[handleGenerarVariantes] Iniciando... productoId=', productoId)
      const res = await generarVariantesDesdeCajaPrincipalAction(productoId)
      console.log('[handleGenerarVariantes] Respuesta del server:', res)
      if (res.success) {
        if (res.id && res.id > 0) {
          toast.success(res.error ?? 'Variantes sincronizadas correctamente')
        } else {
          toast.info(res.error ?? 'Las variantes ya están sincronizadas')
        }
        router.refresh()
      } else {
        console.log('[handleGenerarVariantes] Error detectado:', res.error)
        toast.error(res.error ?? 'Error al generar variantes')
      }
    } catch (err) {
      console.error('[handleGenerarVariantes] Excepción:', err)
      toast.error('Error inesperado al generar variantes')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {activas} activa{activas !== 1 ? 's' : ''} de {variantes.length} variantes
          </p>
          {seleccionadasCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowBatchDeleteModal(true)}
              className="h-7 gap-1.5 text-[11px]"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar {seleccionadasCount} seleccionada{seleccionadasCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {cajaPrincipal ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerarVariantes}
                disabled={isGenerating}
                className="h-8 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                title={`Generar variantes desde caja principal: ${cajaPrincipal.codigo_caja}`}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generar desde caja
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Sin caja principal
              </div>
            )}
            <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Agregar Variante
            </Button>
          </div>
        )}
      </div>

      {cajaPrincipal && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
          <Package className="h-3.5 w-3.5" />
          <span>
            Caja principal: <span className="font-mono font-medium text-foreground">{cajaPrincipal.codigo_caja}</span>
            {' '}— {cajaPrincipal.contenidoMap?.totalPiezas ?? cajaPrincipal.piezas_por_caja ?? 0} piezas × {cajaPrincipal.contenidoMap?.colores.length ?? 0} colores × {cajaPrincipal.contenidoMap?.tallas.length ?? 0} tallas
          </span>
        </div>
      )}

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
                {canEdit && (
                  <th className="px-2 py-2 w-8">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-muted-foreground/30"
                      checked={variantes.length > 0 && selectedIds.size === variantes.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Talla</th>
                <th className="px-4 py-2 text-left">Color</th>
                <th className="px-4 py-2 text-right">Costo</th>
                <th className="px-4 py-2 text-right">Precio</th>
                <th className="px-4 py-2 text-center">Estado</th>
                {canEdit && <th className="px-4 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {variantes.map((v) => (
                <tr key={v.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.has(v.id) && "bg-primary/5")}>
                  {canEdit && (
                    <td className="px-2 py-2.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-muted-foreground/30"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelectOne(v.id)}
                      />
                    </td>
                  )}
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
                  {canEdit && (
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
          setSelectedTallaId('')
          setSelectedColorId('')
          setEditingVar(null)
        }
        setIsDialogOpen(open)
      }}>
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
                  <Label htmlFor="talla_id" className="text-xs uppercase font-bold text-muted-foreground">Talla</Label>
                  <input type="hidden" name="talla_id" value={selectedTallaId} />
                  <TallaCombobox
                    tallasDisponibles={catalogos.tallas}
                    selectedTallaId={selectedTallaId}
                    onSelect={(val) => setSelectedTallaId(val)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color_id" className="text-xs uppercase font-bold text-muted-foreground">Color</Label>
                  <input type="hidden" name="color_id" value={selectedColorId === '_null' ? '' : selectedColorId} />
                  <ColorCombobox
                    coloresDisponibles={catalogos.colores}
                    selectedColorId={selectedColorId === '_null' ? '' : selectedColorId}
                    onSelect={(val) => setSelectedColorId(val || '_null')}
                    disabledFilas={[]}
                  />
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

      {/* CONFIRMAR ELIMINACIÓN SIMPLE */}
      <ConfirmDeleteModal
        isOpen={!!deletingVar}
        onOpenChange={(open) => !open && setDeletingVar(null)}
        onConfirm={handleDelete}
        title="Eliminar Variante"
        description="¿Estás seguro de que deseas eliminar esta variante? Se eliminarán también sus registros de stock asociados."
        elementName={deletingVar?.sku_completo ?? 'Variante seleccionada'}
      />

      {/* CONFIRMAR ELIMINACIÓN MASIVA */}
      <ConfirmDeleteModal
        isOpen={showBatchDeleteModal}
        onOpenChange={(open) => !open && setShowBatchDeleteModal(false)}
        onConfirm={handleBatchDelete}
        title={`Eliminar ${seleccionadasCount} variantes`}
        description="⚠️ Borrado permanente. Esta acción no se puede deshacer. Se eliminarán las variantes seleccionadas y todos sus registros de stock asociados."
        elementName={`${seleccionadasCount} variantes seleccionadas`}
      />
    </div>
  )
}
