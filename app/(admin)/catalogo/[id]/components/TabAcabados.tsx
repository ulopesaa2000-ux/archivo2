// app/(admin)/catalogo/[id]/components/TabAcabados.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { AcabadoResuelto, CatalogosEdicion } from '@/modules/catalogo/types'
import { sugerirAcabadosDesdeProducto } from '@/lib/catalogo/atributos-sugerencias'
import {
  clearAllAcabadosAction,
  deleteAcabadoAction,
  saveAcabadoAction,
  saveAcabadosBatchAction,
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
import { Label } from '@/components/ui/label'
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
  Paintbrush,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AcabadosQuickEditor, type QuickAcabadoInput } from './AcabadosQuickEditor'
import { TabAcabadosFullModal } from './TabAcabadosFullModal'

export function TabAcabados({
  acabados,
  productoId,
  catalogos,
  descripcion = null,
  tipoPrenda = null,
  skuBase = null,
  imagenPrincipalUrl = null,
  canEdit = true,
}: {
  acabados: AcabadoResuelto[]
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
  const [editingAca, setEditingAca] = useState<AcabadoResuelto | null>(null)
  const [editTipoId, setEditTipoId] = useState('')
  const [editDetalleId, setEditDetalleId] = useState('')
  const [editPatronId, setEditPatronId] = useState('')
  const [editLocId, setEditLocId] = useState('')
  const [isEditPending, startEditTransition] = useTransition()

  const [localItems, setLocalItems] = useState<AcabadoResuelto[]>(acabados)
  const [pendingCount, setPendingCount] = useState(0)
  const pendingRef = useRef(0)

  useEffect(() => {
    if (pendingRef.current === 0) setLocalItems(acabados)
  }, [acabados])

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
      sugerirAcabadosDesdeProducto({
        descripcion,
        tipoPrenda,
        catalogos,
        actuales: localItems,
      }),
    [catalogos, descripcion, localItems, tipoPrenda]
  )

  const buildOptimistic = useCallback(
    (input: QuickAcabadoInput, tempId: number): AcabadoResuelto => ({
      id: tempId,
      tipo_acabado_id: input.tipo_acabado_id,
      tipo_acabado:
        catalogos.acabado_tipos.find((t) => t.id === input.tipo_acabado_id)?.nombre ?? null,
      detalle_acabado_id: input.detalle_acabado_id,
      detalle:
        input.detalle_acabado_id != null
          ? catalogos.acabado_detalles.find((d) => d.id === input.detalle_acabado_id)?.nombre ?? null
          : null,
      patron_acabado_id: input.patron_acabado_id,
      patron:
        input.patron_acabado_id != null
          ? catalogos.acabado_patrones.find((p) => p.id === input.patron_acabado_id)?.nombre ?? null
          : null,
      localizacion_id: input.localizacion_id,
      localizacion:
        input.localizacion_id != null
          ? catalogos.localizaciones.find((l) => l.id === input.localizacion_id)?.nombre ?? null
          : null,
    }),
    [catalogos]
  )

  const handleAdd = (input: QuickAcabadoInput) => {
    const tempId = -Math.floor(Date.now() + Math.random() * 100000)
    const optimistic = buildOptimistic(input, tempId)
    setLocalItems((prev) => [...prev, optimistic])

    beginOp()
    void saveAcabadosBatchAction({ productoId, items: [input] })
      .then((res) => {
        if (!res.success) {
          setLocalItems((prev) => prev.filter((x) => x.id !== tempId))
          toast.error(res.error ?? 'No se pudo agregar el acabado')
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
        toast.error('Error de conexión al guardar acabado')
      })
      .finally(endOp)
  }

  const handleRemove = (id: number) => {
    let removed: AcabadoResuelto | undefined
    setLocalItems((prev) => {
      removed = prev.find((x) => x.id === id)
      return prev.filter((x) => x.id !== id)
    })
    if (id < 0) return

    beginOp()
    void deleteAcabadoAction(id, productoId)
      .then((res) => {
        if (!res.success && removed) {
          setLocalItems((prev) => [...prev, removed!])
          toast.error(res.error ?? 'No se pudo eliminar el acabado')
        }
      })
      .catch(() => {
        if (removed) setLocalItems((prev) => [...prev, removed!])
        toast.error('Error de conexión al eliminar acabado')
      })
      .finally(endOp)
  }

  const handleApplyAllSuggestions = () => {
    if (sugerencias.length === 0) return
    const items: QuickAcabadoInput[] = sugerencias
      .filter((s) => s.tipo_acabado_id != null)
      .map((s) => ({
        tipo_acabado_id: s.tipo_acabado_id!,
        detalle_acabado_id: s.detalle_acabado_id,
        patron_acabado_id: s.patron_acabado_id,
        localizacion_id: s.localizacion_id,
      }))

    const tempItems = items.map((it, idx) =>
      buildOptimistic(it, -Math.floor(Date.now() + idx * 100 + Math.random() * 90))
    )
    setLocalItems((prev) => [...prev, ...tempItems])

    beginOp()
    void saveAcabadosBatchAction({ productoId, items })
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
        toast.success(`${items.length} acabados sugeridos aplicados`)
      })
      .finally(endOp)
  }

  const handleClearAll = async () => {
    const snapshot = localItems
    setLocalItems([])
    beginOp()
    try {
      const res = await clearAllAcabadosAction(productoId)
      if (!res.success) {
        setLocalItems(snapshot)
        toast.error(res.error ?? 'No se pudieron limpiar los acabados')
        return
      }
      toast.success('Todos los acabados fueron eliminados')
      setShowClearModal(false)
    } finally {
      endOp()
    }
  }

  const handleOpenEdit = (aca: AcabadoResuelto) => {
    setEditingAca(aca)
    setEditTipoId(aca.tipo_acabado_id?.toString() || '')
    setEditDetalleId(aca.detalle_acabado_id?.toString() || '')
    setEditPatronId(aca.patron_acabado_id?.toString() || '')
    setEditLocId(aca.localizacion_id?.toString() || '')
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAca) return
    const fd = new FormData(e.currentTarget)
    fd.set('producto_id', String(productoId))
    fd.set('id', String(editingAca.id))

    startEditTransition(async () => {
      const res = await saveAcabadoAction(fd)
      if (res.success) {
        setEditingAca(null)
        toast.success('Acabado actualizado')
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
                <Paintbrush className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Sin acabados asignados
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {sugerencias.length > 0
                    ? `Detectamos ${sugerencias.length} sugerencias desde la descripción. Agrégalas en 1 clic o usa el constructor rápido.`
                    : 'Agrega texturas, estampados, bordados o aplicaciones directo desde aquí.'}
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
            <AcabadosQuickEditor
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
                <Paintbrush className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Acabados asignados</CardTitle>
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
              {localItems.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-foreground">{a.tipo_acabado ?? '—'}</span>
                    {a.detalle && <Badge variant="outline" className="h-5 text-[10px]">{a.detalle}</Badge>}
                    {a.patron && <Badge variant="secondary" className="h-5 text-[10px] italic">{a.patron}</Badge>}
                    {a.localizacion && <span className="text-muted-foreground">· {a.localizacion}</span>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={a.id < 0}
                        onClick={() => handleOpenEdit(a)}
                        className="h-7 w-7"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(a.id)}
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
              <AcabadosQuickEditor
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

      <TabAcabadosFullModal
        open={isFullModalOpen}
        onOpenChange={setIsFullModalOpen}
        acabados={localItems}
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

      <Dialog open={!!editingAca} onOpenChange={(open) => !open && setEditingAca(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Acabado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Acabado *</Label>
              <Select name="tipo_acabado_id" value={editTipoId} onValueChange={(v) => setEditTipoId(v ?? '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo...">
                    {catalogos.acabado_tipos.find((t) => String(t.id) === editTipoId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {catalogos.acabado_tipos.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Detalle</Label>
              <Select name="detalle_acabado_id" value={editDetalleId} onValueChange={(v) => setEditDetalleId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional...">
                    {editDetalleId === '_null' ? 'Ninguno' : catalogos.acabado_detalles.find((d) => String(d.id) === editDetalleId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_null">Ninguno</SelectItem>
                  {catalogos.acabado_detalles.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Patrón / Estampado</Label>
              <Select name="patron_acabado_id" value={editPatronId} onValueChange={(v) => setEditPatronId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional...">
                    {editPatronId === '_null' ? 'Ninguno' : catalogos.acabado_patrones.find((p) => String(p.id) === editPatronId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_null">Ninguno</SelectItem>
                  {catalogos.acabado_patrones.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Localización</Label>
              <Select name="localizacion_id" value={editLocId} onValueChange={(v) => setEditLocId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional...">
                    {editLocId === '_null' ? 'Ninguno' : catalogos.localizaciones.find((l) => String(l.id) === editLocId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_null">Ninguno</SelectItem>
                  {catalogos.localizaciones.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingAca(null)}>Cancelar</Button>
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
        title="¿Limpiar todos los acabados?"
        description="Se quitarán todos los acabados asignados a este producto."
        elementName={`${localItems.length} acabado(s) asignados`}
        confirmText="Limpiar todos"
        confirmLoadingText="Limpiando..."
        onConfirm={handleClearAll}
      />
    </div>
  )
}
