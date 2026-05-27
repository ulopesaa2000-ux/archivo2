// app/(admin)/ordenes-b2b/[id]/components/OrdenProductos.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Loader2, Package, Plus, Pencil, Save, X, Search, AlertCircle, MessageSquare, Paperclip, CheckCircle2, Clock3 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ESTADO_DETALLE_B2B_COLORS, ESTADOS_DETALLE_B2B } from '@/lib/constants'
import { eliminarDetalleOrdenAction, agregarDetalleOrdenAction, actualizarDetalleOrdenAction, crearComentarioDetalleOrdenAction, registrarEventoDetalleOrdenAction } from '@/modules/ordenes-b2b/actions'
import { fetchProductosBusqueda } from '@/modules/ordenes-b2b/queries'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'
import type { OrdenDetalleResuelto } from '@/modules/ordenes-b2b/types'

// ════════════════════════════════════════════════════════════
// A G R E G A R   P R O D U C T O   D I A L O G
// ════════════════════════════════════════════════════════════

function AgregarProductoDialog({
  open, onOpenChange, ordenId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenId: number
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: number; sku_base: string; nombre: string; descripcion: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    setLoading(true)
    setSelected(null)
    try {
      const items = await fetchProductosBusqueda(q || undefined)
      setResults(items)
    } catch { setResults([]) } finally { setLoading(false) }
  }, 300)

  useEffect(() => {
    if (open) debouncedSearch('')
  }, [debouncedSearch, open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    setError(null)
    setCreando(true)
    const fd = new FormData(e.currentTarget)
    fd.set('orden_id', String(ordenId))
    fd.set('producto_id', String(selected))
    const result = await agregarDetalleOrdenAction(fd)
    setCreando(false)
    if (result.success) { onOpenChange(false); router.refresh() }
    else { setError(result.error ?? 'Error.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agregar Producto a la Orden</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto por SKU o nombre..." value={search}
              onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value) }} />
          </div>
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
              </div>
            ) : results.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                {search ? 'Sin resultados.' : 'Escribe para buscar productos.'}
              </p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {results.map((p) => (
                    <tr key={p.id} onClick={() => setSelected(p.id)}
                      className={cn('border-t cursor-pointer transition-colors',
                        selected === p.id ? 'bg-primary/5' : 'hover:bg-muted/30')}>
                      <td className={cn('w-4 px-2 py-2', selected === p.id ? 'text-primary' : 'text-transparent')}>●</td>
                      <td className="px-2 py-2 font-mono text-primary font-medium">{p.sku_base}</td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-medium truncate max-w-[200px]">{p.descripcion ?? p.nombre}</div>
                        {p.nombre && p.descripcion && <div className="text-[10px] text-muted-foreground">{p.nombre}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-3 bg-muted/10">
              <div className="text-xs font-medium text-muted-foreground">
                Producto seleccionado: <span className="text-foreground font-semibold">
                  {results.find(p => p.id === selected)?.sku_base}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-semibold text-muted-foreground">Piezas</label>
                  <Input name="piezas_pedidas" type="number" min="0" className="h-8 text-xs" placeholder="0" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">Cajas</label>
                  <Input name="cajas_pedidas" type="number" min="0" step="0.5" className="h-8 text-xs" placeholder="0" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">P.Unit (USD)</label>
                  <Input name="precio_unitario" type="number" step="0.01" min="0" className="h-8 text-xs" placeholder="0.00" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">Precio Yuan</label>
                  <Input name="precio_yuan" type="number" step="0.01" min="0" className="h-8 text-xs" placeholder="0.00" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">CBM</label>
                  <Input name="cbm_detalle" type="number" step="0.001" min="0" className="h-8 text-xs" placeholder="0.000" /></div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                  <AlertCircle className="h-3 w-3 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={creando}>
                  {creando && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const EVENT_LABELS: Record<string, string> = {
  solicitud_cambio: 'Solicitud de cambio',
  aprobacion_cambio: 'Cambio aprobado',
  rechazo_cambio: 'Cambio rechazado',
  cambio_estado: 'Estado actualizado',
  cambio_precio: 'Precio actualizado',
}

function DetalleConversationDialog({
  detalle,
  open,
  onOpenChange,
  canComment,
  canEdit,
}: {
  detalle: OrdenDetalleResuelto | null
  open: boolean
  onOpenChange: (value: boolean) => void
  canComment: boolean
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [eventType, setEventType] = useState<'solicitud_cambio' | 'aprobacion_cambio' | 'rechazo_cambio' | 'cambio_estado' | 'cambio_precio'>('solicitud_cambio')
  const [estadoProducto, setEstadoProducto] = useState(detalle?.estado_producto ?? 'Pendiente')
  const [precioUnitario, setPrecioUnitario] = useState(detalle?.precio_unitario ? String(detalle.precio_unitario) : '')
  const [precioYuan, setPrecioYuan] = useState(detalle?.precio_yuan ? String(detalle.precio_yuan) : '')
  const [precioAcordado, setPrecioAcordado] = useState(detalle?.precio_acordado ? String(detalle.precio_acordado) : '')
  const [eventError, setEventError] = useState<string | null>(null)

  if (!detalle) return null

  const timeline = [
    ...(detalle.comentarios ?? []).map((comment) => ({
      key: `comment-${comment.id}`,
      created_at: comment.created_at,
      kind: 'comment' as const,
      author: comment.autor_nombre ?? comment.autor_email ?? 'Usuario',
      personaType: comment.autor_persona_tipo,
      body: comment.mensaje,
      attachmentUrl: comment.archivo_adjunto_url,
    })),
    ...(detalle.eventos ?? []).map((event) => ({
      key: `event-${event.id}`,
      created_at: event.created_at,
      kind: 'event' as const,
      author: event.autor_nombre ?? event.autor_email ?? 'Usuario',
      personaType: event.autor_persona_tipo,
      body: EVENT_LABELS[event.tipo_evento] ?? event.tipo_evento,
      payload: event.payload,
    })),
  ].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())

  const submitComment = () => {
    if (!message.trim()) {
      setCommentError('Escribe un comentario antes de enviarlo.')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('detalle_id', String(detalle.id))
      formData.set('mensaje', message.trim())
      if (attachment) formData.set('adjunto', attachment)

      const result = await crearComentarioDetalleOrdenAction(formData)
      if (!result.success) {
        setCommentError(result.error ?? 'No se pudo crear el comentario.')
        return
      }

      setMessage('')
      setAttachment(null)
      setCommentError(null)
      router.refresh()
    })
  }

  const submitEvent = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('detalle_id', String(detalle.id))
      formData.set('tipo_evento', eventType)

      if (eventType === 'cambio_estado') {
        formData.set('estado_producto', estadoProducto)
      }

      if (eventType === 'cambio_precio') {
        formData.set('precio_unitario', precioUnitario)
        formData.set('precio_yuan', precioYuan)
        formData.set('precio_acordado', precioAcordado)
      }

      const result = await registrarEventoDetalleOrdenAction(formData)
      if (!result.success) {
        setEventError(result.error ?? 'No se pudo registrar el evento.')
        return
      }

      setEventError(null)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl lg:max-w-5xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageSquare className="h-4 w-4 text-primary animate-pulse" />
            Conversación y cambios del detalle
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mt-2">
          <div className="lg:col-span-7 xl:col-span-8 rounded-lg border bg-muted/10 flex flex-col min-w-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{detalle.producto_sku ?? 'Sin SKU'} · {detalle.producto_descripcion ?? detalle.producto_nombre ?? 'Producto sin descripción'}</p>
              <p className="text-xs text-muted-foreground">Historial del detalle específico dentro de la orden.</p>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
              {timeline.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aún no hay comentarios ni eventos formales para esta línea.
                </div>
              ) : (
                timeline.map((item) => (
                  <div key={item.key} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.kind === 'comment' ? <MessageSquare className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                      <span className="font-medium text-foreground">{item.author}</span>
                      {item.personaType ? <span>{item.personaType}</span> : null}
                      {item.created_at ? <span>{new Date(item.created_at).toLocaleString('es-MX')}</span> : null}
                    </div>
                    <div className="mt-2 text-sm text-foreground">{item.body}</div>
                    {'attachmentUrl' in item && item.attachmentUrl ? (
                      <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Paperclip className="h-3.5 w-3.5" />
                        Ver adjunto
                      </a>
                    ) : null}
                    {'payload' in item && item.payload ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px] text-muted-foreground">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-4 flex flex-col min-w-0">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Nuevo comentario</h3>
              </div>
              <div className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder={canComment ? 'Describe el cambio, duda técnica o decisión comercial...' : 'Sin permiso para comentar.'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={!canComment || isPending}
                />
                <Input
                  type="file"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  disabled={!canComment || isPending}
                />
                {commentError ? <p className="text-xs text-destructive">{commentError}</p> : null}
                <Button size="sm" onClick={submitComment} disabled={!canComment || isPending}>
                  {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
                  Publicar comentario
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Evento formal</h3>
              </div>

              <div className="space-y-3">
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as typeof eventType)}
                  disabled={!canEdit || isPending}
                >
                  <option value="solicitud_cambio">Solicitud de cambio</option>
                  <option value="aprobacion_cambio">Aprobación</option>
                  <option value="rechazo_cambio">Rechazo</option>
                  <option value="cambio_estado">Cambio de estado</option>
                  <option value="cambio_precio">Cambio de precio</option>
                </select>

                {eventType === 'cambio_estado' ? (
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={estadoProducto}
                    onChange={(e) => setEstadoProducto(e.target.value)}
                    disabled={!canEdit || isPending}
                  >
                    {ESTADOS_DETALLE_B2B.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                ) : null}

                {eventType === 'cambio_precio' ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} placeholder="P. Unitario" disabled={!canEdit || isPending} />
                    <Input value={precioYuan} onChange={(e) => setPrecioYuan(e.target.value)} placeholder="Precio Yuan" disabled={!canEdit || isPending} />
                    <Input value={precioAcordado} onChange={(e) => setPrecioAcordado(e.target.value)} placeholder="Precio acordado" disabled={!canEdit || isPending} />
                  </div>
                ) : null}

                {eventError ? <p className="text-xs text-destructive">{eventError}</p> : null}
                <Button size="sm" variant="outline" onClick={submitEvent} disabled={!canEdit || isPending}>
                  {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Registrar evento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
// O R D E N   P R O D U C T O S
// ════════════════════════════════════════════════════════════

export function OrdenProductos({
  detalles,
  ordenId,
  canEdit,
  canComment,
}: {
  detalles: OrdenDetalleResuelto[]
  ordenId: number
  canEdit: boolean
  canComment: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversationOpen, setConversationOpen] = useState(false)
  const [conversationDetail, setConversationDetail] = useState<OrdenDetalleResuelto | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const startEdit = (d: OrdenDetalleResuelto) => {
    setEditingId(d.id)
    setEditForm({
      piezas_pedidas: String(d.piezas_pedidas ?? ''),
      cajas_pedidas: String(d.cajas_pedidas ?? ''),
      precio_unitario: String(d.precio_unitario ?? ''),
      precio_yuan: String(d.precio_yuan ?? ''),
      cbm_detalle: String(d.cbm_detalle ?? ''),
    })
  }

  const handleSaveEdit = (detalleId: number) => {
    if (!canEdit) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('detalle_id', String(detalleId))
      fd.set('orden_id', String(ordenId))
      fd.set('piezas_pedidas', editForm.piezas_pedidas)
      fd.set('cajas_pedidas', editForm.cajas_pedidas)
      fd.set('precio_unitario', editForm.precio_unitario)
      fd.set('precio_yuan', editForm.precio_yuan)
      fd.set('cbm_detalle', editForm.cbm_detalle)
      const result = await actualizarDetalleOrdenAction(fd)
      if (result.success) { setEditingId(null); router.refresh() }
    })
  }

  const handleDelete = (detalleId: number) => {
    if (!canEdit) return
    startTransition(async () => {
      await eliminarDetalleOrdenAction(detalleId, ordenId)
      router.refresh()
    })
  }

  if (detalles.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">0 líneas de producto</p>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!canEdit}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
          </Button>
        </div>
        <div className="flex flex-col items-center py-12 text-muted-foreground rounded-lg border">
          <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin productos.</p>
        </div>
        <AgregarProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} ordenId={ordenId} />
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{detalles.length} línea{detalles.length !== 1 ? 's' : ''} de producto</p>
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!canEdit}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
        </Button>
      </div>

      <AgregarProductoDialog key={dialogOpen ? 'agregar-open' : 'agregar-closed'} open={dialogOpen} onOpenChange={setDialogOpen} ordenId={ordenId} />
      <DetalleConversationDialog
        key={`${conversationDetail?.id ?? 'none'}-${conversationOpen ? 'open' : 'closed'}`}
        detalle={conversationDetail}
        open={conversationOpen}
        onOpenChange={setConversationOpen}
        canEdit={canEdit}
        canComment={canComment}
      />

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 font-semibold text-muted-foreground">
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-center">Pz</th>
              <th className="px-3 py-2 text-center">Cajas</th>
              <th className="px-3 py-2 text-right">P.Unit</th>
              <th className="px-3 py-2 text-right">Yuan</th>
              <th className="px-3 py-2 text-right">CBM</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 w-[112px]"></th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d) => {
              const isEditing = editingId === d.id
              const estadoColor = ESTADO_DETALLE_B2B_COLORS[d.estado_producto ?? ''] ?? ''

              return (
                <tr key={d.id} className={cn('border-t', isEditing && 'bg-accent/20')}>
                  <td className="px-3 py-2 font-mono">{d.producto_sku ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <div className="text-xs font-medium truncate">{d.producto_descripcion ?? d.producto_nombre ?? '—'}</div>
                    {d.producto_nombre && d.producto_descripcion && (
                      <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {d.producto_nombre}
                      </div>
                    )}
                  </td>

                  {isEditing ? (
                    <>
                      <td className="px-1 py-1"><Input name="piezas" type="number" min="0"
                        className="h-7 w-16 text-xs text-center" value={editForm.piezas_pedidas}
                        onChange={(e) => setEditForm(f => ({ ...f, piezas_pedidas: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="cajas" type="number" min="0" step="0.5"
                        className="h-7 w-14 text-xs text-center" value={editForm.cajas_pedidas}
                        onChange={(e) => setEditForm(f => ({ ...f, cajas_pedidas: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="punit" type="number" step="0.01" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.precio_unitario}
                        onChange={(e) => setEditForm(f => ({ ...f, precio_unitario: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="yuan" type="number" step="0.01" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.precio_yuan}
                        onChange={(e) => setEditForm(f => ({ ...f, precio_yuan: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="cbm" type="number" step="0.001" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.cbm_detalle}
                        onChange={(e) => setEditForm(f => ({ ...f, cbm_detalle: e.target.value }))} /></td>
                      <td className="px-3 py-2"><Badge variant="secondary" className={`text-[10px] ${estadoColor}`}>{d.estado_producto}</Badge></td>
                      <td className="px-2 py-1">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleSaveEdit(d.id)} disabled={isPending}>
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center tabular-nums">{d.piezas_pedidas ?? 0}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.cajas_pedidas ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.precio_unitario ? formatCurrency(d.precio_unitario, 'USD') : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.precio_yuan ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.cbm_detalle ?? '—'}</td>
                      <td className="px-3 py-2"><Badge variant="secondary" className={`text-[10px] ${estadoColor}`}>{d.estado_producto}</Badge></td>
                      <td className="px-2 py-1">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => startEdit(d)} title="Editar" disabled={!canEdit}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => { setConversationDetail(d); setConversationOpen(true) }}
                            title="Conversación"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(d.id)} disabled={isPending || !canEdit} title="Eliminar">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
