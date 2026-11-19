// app/(admin)/catalogo/[id]/components/TabComplementos.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { CatalogosEdicion, ComplementoResuelto } from '@/modules/catalogo/types'
import { sugerirComplementosDesdeProducto } from '@/lib/catalogo/atributos-sugerencias'
import {
  clearAllComplementosAction,
  deleteComplementoAction,
  saveComplementoAction,
  saveComplementosBatchAction,
} from '@/modules/catalogo/actions'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeftRight,
  Loader2,
  Maximize2,
  Pencil,
  Puzzle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ComplementosQuickEditor, type QuickComplementoInput } from './ComplementosQuickEditor'
import { TabComplementosFullModal } from './TabComplementosFullModal'

export function TabComplementos({
  complementos,
  productoId,
  catalogos,
  descripcion = null,
  tipoPrenda = null,
  skuBase = null,
  imagenPrincipalUrl = null,
  canEdit = true,
}: {
  complementos: ComplementoResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
  descripcion?: string | null
  tipoPrenda?: string | null
  skuBase?: string | null
  imagenPrincipalUrl?: string | null
  canEdit?: boolean
}) {
  const [isFullModalOpen, setIsFullModalOpen] = useState(false)
  const [expandedEditor, setExpandedEditor] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [editingComp, setEditingComp] = useState<ComplementoResuelto | null>(null)
  const [editParteId, setEditParteId] = useState('')
  const [editTipoId, setEditTipoId] = useState('')
  const [editCorteId, setEditCorteId] = useState('')
  const [editMaterialId, setEditMaterialId] = useState('')
  const [isEditPending, startEditTransition] = useTransition()

  const [localItems, setLocalItems] = useState<ComplementoResuelto[]>(complementos)
  const [pendingCount, setPendingCount] = useState(0)
  const pendingRef = useRef(0)

  useEffect(() => {
    if (pendingRef.current === 0) setLocalItems(complementos)
  }, [complementos])

  const beginOp = () => {
    pendingRef.current += 1
    setPendingCount(pendingRef.current)
  }
  const endOp = () => {
    pendingRef.current = Math.max(0, pendingRef.current - 1)
    setPendingCount(pendingRef.current)
  }

  const sugerencias = useMemo(
    () =>
      sugerirComplementosDesdeProducto({
        descripcion,
        tipoPrenda,
        catalogos,
        actuales: localItems,
      }),
    [catalogos, descripcion, localItems, tipoPrenda]
  )

  const buildOptimistic = useCallback(
    (input: QuickComplementoInput, tempId: number): ComplementoResuelto => ({
      id: tempId,
      parte_prenda_id: input.parte_prenda_id,
      parte_prenda: catalogos.partes.find((p) => p.id === input.parte_prenda_id)?.nombre ?? null,
      tipo_comp_id: input.tipo_comp_id,
      tipo_complemento:
        input.tipo_comp_id != null
          ? catalogos.componente_tipos.find((t) => t.id === input.tipo_comp_id)?.nombre ?? null
          : null,
      material_id: input.material_id,
      material:
        input.material_id != null
          ? catalogos.materiales.find((m) => m.id === input.material_id)?.nombre ?? null
          : null,
      corte_forma_id: input.corte_forma_id,
      corte_forma:
        input.corte_forma_id != null
          ? catalogos.corte_formas.find((c) => c.id === input.corte_forma_id)?.nombre ?? null
          : null,
      descripcion_adicional: input.descripcion_adicional,
    }),
    [catalogos]
  )

  const handleAdd = (input: QuickComplementoInput) => {
    const tempId = -Math.floor(Date.now() + Math.random() * 100000)
    const optimistic = buildOptimistic(input, tempId)
    setLocalItems((prev) => [...prev, optimistic])

    beginOp()
    void saveComplementosBatchAction({ productoId, items: [input] })
      .then((res) => {
        if (!res.success) {
          setLocalItems((prev) => prev.filter((x) => x.id !== tempId))
          toast.error(res.error ?? 'No se pudo agregar el complemento')
          return
        }
        const realRow = res.data?.inserted?.[0]
        if (realRow) {
          setLocalItems((prev) =>
            prev.map((x) => (x.id === tempId ? { ...x, id: realRow.id } : x))
          )
        }
      })
      .catch(() => {
        setLocalItems((prev) => prev.filter((x) => x.id !== tempId))
        toast.error('Error de conexión al guardar complemento')
      })
      .finally(endOp)
  }

  const handleRemove = (id: number) => {
    let removed: ComplementoResuelto | undefined
    setLocalItems((prev) => {
      removed = prev.find((x) => x.id === id)
      return prev.filter((x) => x.id !== id)
    })
    if (id < 0) return

    beginOp()
    void deleteComplementoAction(id, productoId)
      .then((res) => {
        if (!res.success && removed) {
          setLocalItems((prev) => [...prev, removed!])
          toast.error(res.error ?? 'No se pudo eliminar el complemento')
        }
      })
      .catch(() => {
        if (removed) setLocalItems((prev) => [...prev, removed!])
        toast.error('Error de conexión al eliminar complemento')
      })
      .finally(endOp)
  }

  const handleApplyAllSuggestions = () => {
    if (sugerencias.length === 0) return
    const items: QuickComplementoInput[] = sugerencias
      .filter((s) => s.parte_prenda_id != null)
      .map((s) => ({
        parte_prenda_id: s.parte_prenda_id!,
        tipo_comp_id: s.tipo_comp_id,
        corte_forma_id: s.corte_forma_id,
        material_id: s.material_id,
        descripcion_adicional: null,
      }))

    const tempItems = items.map((it, idx) =>
      buildOptimistic(it, -Math.floor(Date.now() + idx * 100 + Math.random() * 90))
    )
    setLocalItems((prev) => [...prev, ...tempItems])

    beginOp()
    void saveComplementosBatchAction({ productoId, items })
      .then((res) => {
        if (!res.success) {
          const tempIds = new Set(tempItems.map((t) => t.id))
          setLocalItems((prev) => prev.filter((x) => !tempIds.has(x.id)))
          toast.error(res.error ?? 'No se pudieron aplicar sugerencias')
          return
        }
        const inserted = res.data?.inserted ?? []
        setLocalItems((prev) => {
          const tempIds = new Set(tempItems.map((t) => t.id))
          let cursor = 0
          return prev.map((x) => {
            if (!tempIds.has(x.id)) return x
            const real = inserted[cursor++]
            return real ? { ...x, id: real.id } : x
          })
        })
        toast.success(`${items.length} complementos sugeridos aplicados`)
      })
      .finally(endOp)
  }

  const handleClearAll = async () => {
    const snapshot = localItems
    setLocalItems([])
    beginOp()
    try {
      const res = await clearAllComplementosAction(productoId)
      if (!res.success) {
        setLocalItems(snapshot)
        toast.error(res.error ?? 'No se pudieron limpiar los complementos')
        return
      }
      toast.success('Todos los complementos fueron eliminados')
      setShowClearModal(false)
    } finally {
      endOp()
    }
  }

  const handleOpenEdit = (comp: ComplementoResuelto) => {
    setEditingComp(comp)
    setEditParteId(comp.parte_prenda_id?.toString() || '')
    setEditTipoId(comp.tipo_comp_id?.toString() || '')
    setEditCorteId(comp.corte_forma_id?.toString() || '')
    setEditMaterialId(comp.material_id?.toString() || '')
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingComp) return
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    fd.set('id', String(editingComp.id))

    startEditTransition(async () => {
      const res = await saveComplementoAction(fd)
      if (res.success) {
        setEditingComp(null)
        toast.success('Complemento actualizado')
      } else {
        toast.error(res.error ?? 'No se pudo actualizar')
      }
    })
  }

  const isSaving = pendingCount > 0

  return (
    <div className="space-y-4 mt-4">
      {localItems.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Puzzle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Sin complementos asignados
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {sugerencias.length > 0
                    ? `Detectamos ${sugerencias.length} sugerencias desde la descripción. Agrégalas en 1 clic o usa el constructor rápido.`
                    : 'Agrega partes de prenda, cierres, bolsas o revestimientos directo desde aquí.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullModalOpen(true)}
              className="h-8 gap-1.5 shrink-0"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Editor completo
            </Button>
          </CardHeader>
          <CardContent>
            <ComplementosQuickEditor
              catalogos={catalogos}
              sugerencias={sugerencias}
              canEdit={canEdit}
              onAdd={handleAdd}
              onApplyAllSuggestions={handleApplyAllSuggestions}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <Card className={cn('transition-all duration-200', expandedEditor ? 'lg:col-span-4' : 'lg:col-span-8')}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Complementos asignados</CardTitle>
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{localItems.length}</Badge>
                {isSaving && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Guardando
                  </span>
                )}
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearModal(true)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpiar todos
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {localItems.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-foreground">{c.parte_prenda ?? '—'}</span>
                      {c.tipo_complemento && <Badge variant="outline" className="h-5 text-[10px]">{c.tipo_complemento}</Badge>}
                      {c.corte_forma && <Badge variant="secondary" className="h-5 text-[10px]">{c.corte_forma}</Badge>}
                      {c.material && <span className="text-muted-foreground">· {c.material}</span>}
                    </div>
                    {c.descripcion_adicional && (
                      <p className="text-[11px] text-muted-foreground truncate">{c.descripcion_adicional}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={c.id < 0}
                        onClick={() => handleOpenEdit(c)}
                        className="h-7 w-7"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(c.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Quitar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={cn('transition-all duration-200', expandedEditor ? 'lg:col-span-8' : 'lg:col-span-4')}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <CardTitle className="text-sm font-semibold truncate">Agregar rápido</CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedEditor((prev) => !prev)}
                  className="h-7 px-2 text-xs gap-1 hidden lg:inline-flex"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {expandedEditor ? '1/3' : '2/3'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullModalOpen(true)}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Ampliar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ComplementosQuickEditor
                catalogos={catalogos}
                sugerencias={sugerencias}
                canEdit={canEdit}
                compact={!expandedEditor}
                onAdd={handleAdd}
                onApplyAllSuggestions={handleApplyAllSuggestions}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <TabComplementosFullModal
        open={isFullModalOpen}
        onOpenChange={setIsFullModalOpen}
        complementos={localItems}
        catalogos={catalogos}
        sugerencias={sugerencias}
        imagenPrincipalUrl={imagenPrincipalUrl}
        skuBase={skuBase}
        descripcion={descripcion}
        tipoPrenda={tipoPrenda}
        isSaving={isSaving}
        canEdit={canEdit}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onApplyAllSuggestions={handleApplyAllSuggestions}
        onRequestClearAll={() => setShowClearModal(true)}
      />

      <Dialog open={!!editingComp} onOpenChange={(open) => !open && setEditingComp(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Editar Complemento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Parte de la Prenda *</Label>
              <Select name="parte_prenda_id" value={editParteId} onValueChange={(v) => setEditParteId(v ?? '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona parte...">
                    {catalogos.partes.find((p) => String(p.id) === editParteId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {catalogos.partes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Componente</Label>
              <Select name="tipo_comp_id" value={editTipoId} onValueChange={(v) => setEditTipoId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional...">
                    {editTipoId === '_null' ? 'Ninguno' : catalogos.componente_tipos.find((tc) => String(tc.id) === editTipoId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_null">Ninguno</SelectItem>
                  {catalogos.componente_tipos.map((tc) => (
                    <SelectItem key={tc.id} value={String(tc.id)}>{tc.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Corte / Forma</Label>
                <Select name="corte_forma_id" value={editCorteId} onValueChange={(v) => setEditCorteId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional...">
                      {editCorteId === '_null' ? 'Ninguno' : catalogos.corte_formas.find((cf) => String(cf.id) === editCorteId)?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.corte_formas.map((cf) => (
                      <SelectItem key={cf.id} value={String(cf.id)}>{cf.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Material</Label>
                <Select name="material_id" value={editMaterialId} onValueChange={(v) => setEditMaterialId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional...">
                      {editMaterialId === '_null' ? 'Ninguno' : catalogos.materiales.find((m) => String(m.id) === editMaterialId)?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_null">Ninguno</SelectItem>
                    {catalogos.materiales.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas / Descripción adicional</Label>
              <Textarea name="descripcion_adicional" defaultValue={editingComp?.descripcion_adicional ?? ''} rows={2} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingComp(null)}>Cancelar</Button>
              <Button type="submit" disabled={isEditPending}>
                {isEditPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
        isOpen={showClearModal}
        onOpenChange={setShowClearModal}
        title="¿Limpiar todos los complementos?"
        description="Se quitarán todos los complementos asignados a este producto."
        elementName={`${localItems.length} complemento(s) asignados`}
        confirmText="Limpiar todos"
        confirmLoadingText="Limpiando..."
        onConfirm={handleClearAll}
      />
    </div>
  )
}
