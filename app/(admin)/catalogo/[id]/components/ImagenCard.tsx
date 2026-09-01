// app/(admin)/catalogo/[id]/components/ImagenCard.tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Star,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Link2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  EyeOff,
  Eye,
  ChevronDown,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { cn } from '@/lib/utils'
import {
  setPrincipalImagenAction,
  updateImagenAction,
  deleteImagenAction,
  cambiarUsoImagenAction,
} from '@/modules/catalogo/actions'
import { toast } from 'sonner'
import type { ProductoImagenRow } from '@/lib/types/tables'
import type { UsoImagen } from '@/lib/types/tables'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS, USO_OPTIONS } from './imagenesConstants'
import { getSmartImagenUrl, IMAGEN_SIZES } from '@/lib/utils/imagen'

// ─── Componente Principal ──────────────────────────────────────────────────────

interface ImagenCardProps {
  imagen: ProductoImagenRow
  productoId: number
  canEdit?: boolean
}

export function ImagenCard({ imagen, productoId, canEdit = true }: ImagenCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing]               = useState(false)
  const [showDeleteModal, setShowDeleteModal]    = useState(false)
  const [showZoomModal, setShowZoomModal]        = useState(false)
  const [editAltText, setEditAltText]           = useState(imagen.alt_text ?? '')
  const [editUso, setEditUso]                   = useState<UsoImagen>(imagen.uso_imagen as UsoImagen)
  const [editOrden, setEditOrden]               = useState(imagen.orden ?? 0)
  // URL solo editable si es imagen externa (no tiene sentido mover el archivo local)
  const [editUrl, setEditUrl]                   = useState(imagen.origen_imagen === 'url_externa' ? imagen.url : '')

  const [isPrincipalPending, startPrincipalTransition] = useTransition()
  const [isEditPending, startEditTransition]           = useTransition()
  const [isUsoPending, startUsoTransition]             = useTransition()

  const isOculta = imagen.uso_imagen === 'oculta' || imagen.uso_imagen === 'oculto'

  // ── Cambio Rápido de Uso de Imagen ───────────────────────────
  const handleQuickChangeUso = (nuevoUso: UsoImagen) => {
    if (nuevoUso === imagen.uso_imagen || isUsoPending) return
    startUsoTransition(async () => {
      const res = await cambiarUsoImagenAction(imagen.id, productoId, nuevoUso)
      if (res.success) {
        toast.success(`Tipo actualizado a "${USO_IMAGEN_LABELS[nuevoUso] ?? nuevoUso}"`)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al cambiar tipo de imagen.')
      }
    })
  }

  // ── Alternar Oculta / Galería Secundaria ─────────────────────
  const handleToggleOculta = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nuevoUso: UsoImagen = isOculta ? 'galeria_secundaria' : 'oculta'
    handleQuickChangeUso(nuevoUso)
  }

  // ── Hacer principal ─────────────────────────────────────────
  const handleSetPrincipal = () => {
    if (imagen.es_principal || isPrincipalPending) return
    startPrincipalTransition(async () => {
      const res = await setPrincipalImagenAction(imagen.id, productoId)
      if (res.success) {
        toast.success('Imagen principal actualizada.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al actualizar imagen principal.')
      }
    })
  }

  // ── Guardar edición manual ──────────────────────────────────
  const handleSaveEdit = () => {
    const fd = new FormData()
    fd.append('id',          String(imagen.id))
    fd.append('producto_id', String(productoId))
    fd.append('alt_text',    editAltText)
    fd.append('uso_imagen',  editUso)
    fd.append('orden',       String(editOrden))
    // Si es URL externa, permitir actualizar la URL
    if (imagen.origen_imagen === 'url_externa' && editUrl.trim()) {
      fd.append('url', editUrl.trim())
    }

    startEditTransition(async () => {
      const res = await updateImagenAction(fd)
      if (res.success) {
        toast.success('Imagen actualizada.')
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al actualizar la imagen.')
      }
    })
  }

  const handleCancelEdit = () => {
    setEditAltText(imagen.alt_text ?? '')
    setEditUso(imagen.uso_imagen as UsoImagen)
    setEditOrden(imagen.orden ?? 0)
    setEditUrl(imagen.origen_imagen === 'url_externa' ? imagen.url : '')
    setIsEditing(false)
  }

  // ── Eliminar ─────────────────────────────────────────────────
  const handleDelete = async () => {
    const res = await deleteImagenAction(imagen.id, productoId)
    if (res.success) {
      toast.success('Imagen eliminada.')
      router.refresh()
    } else {
      toast.error(res.error ?? 'Error al eliminar la imagen.')
    }
  }

  const usoBadgeColor = USO_IMAGEN_COLORS[imagen.uso_imagen as UsoImagen] ?? 'bg-gray-500 text-white'

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200',
          'hover:shadow-md hover:border-primary/20',
          imagen.es_principal && 'ring-2 ring-amber-400 ring-offset-1',
          isOculta && 'border-dashed border-zinc-400 dark:border-zinc-700 bg-muted/20 opacity-80 hover:opacity-100'
        )}
      >
        {/* ── Imagen ─────────────────────────────────── */}
        <div className="relative aspect-square bg-muted/30 overflow-hidden">
          {imagen.url ? (
            <Image
              src={getSmartImagenUrl(imagen.url, 'card_lg')}
              alt={imagen.alt_text ?? imagen.uso_imagen}
              fill
              className={cn(
                'object-contain transition-transform duration-300 group-hover:scale-105',
                isOculta && 'grayscale-[40%]'
              )}
              sizes={IMAGEN_SIZES.card_lg}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40 text-xs">
              Sin imagen
            </div>
          )}

          {/* Overlay de controles — aparece en hover */}
          {!isEditing && (
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 cursor-pointer"
              onClick={() => imagen.url && setShowZoomModal(true)}
            >
              {/* Ver en grande */}
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 text-slate-800 hover:bg-white shadow"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowZoomModal(true)
                }}
                title="Ver en grande y hacer zoom"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              {canEdit && (
                <>
                  {/* Botón rápido Ocultar / Mostrar */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className={cn(
                      'h-8 w-8 shadow transition-colors',
                      isOculta
                        ? 'bg-zinc-800 text-amber-300 hover:bg-zinc-700 hover:text-amber-200'
                        : 'bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900'
                    )}
                    onClick={handleToggleOculta}
                    disabled={isUsoPending}
                    title={isOculta ? 'Mostrar en tienda (cambiar a Galería)' : 'Ocultar foto en tienda (marcar Oculta)'}
                  >
                    {isUsoPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isOculta ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Hacer principal (solo si no es oculta) */}
                  {!imagen.es_principal && !isOculta && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 text-amber-600 hover:bg-amber-50 hover:text-amber-700 shadow"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetPrincipal()
                      }}
                      disabled={isPrincipalPending}
                      title="Hacer imagen principal"
                    >
                      {isPrincipalPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Star className="h-3.5 w-3.5" />
                      }
                    </Button>
                  )}

                  {/* Editar */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 text-slate-800 hover:bg-white shadow"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                    title="Editar datos de imagen"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  {/* Eliminar */}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 bg-red-600/90 hover:bg-red-600 text-white shadow"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteModal(true)
                    }}
                    title="Eliminar imagen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Badges superiores */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {imagen.es_principal && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                ★ Principal
              </span>
            )}
            <span className={cn('text-[9px] font-medium px-2 py-0.5 rounded-full shadow', usoBadgeColor)}>
              {USO_IMAGEN_LABELS[imagen.uso_imagen as UsoImagen] ?? imagen.uso_imagen}
            </span>
          </div>

          {/* Orden badge */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
            #{imagen.orden}
          </div>
        </div>

        {/* ── Footer datos ───────────────────────────────── */}
        {!isEditing ? (
          <div className="p-2.5 text-xs space-y-2 bg-card">
            <p className="font-medium text-foreground truncate" title={imagen.alt_text ?? ''}>
              {imagen.alt_text || <span className="text-muted-foreground italic">Sin texto alternativo</span>}
            </p>

            {/* Selector rápido de tipo de imagen */}
            <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold shrink-0">
                Tipo:
              </span>
              {canEdit ? (
                <Select
                  value={imagen.uso_imagen}
                  onValueChange={(val) => handleQuickChangeUso(val as UsoImagen)}
                  disabled={isUsoPending}
                >
                  <SelectTrigger className="h-6 text-[11px] px-2 bg-muted/40 hover:bg-muted font-medium w-auto max-w-[150px] border-none shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {USO_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {USO_IMAGEN_LABELS[opt] ?? opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-[11px] font-medium text-foreground">
                  {USO_IMAGEN_LABELS[imagen.uso_imagen as UsoImagen] ?? imagen.uso_imagen}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Modo Edición en Card */
          <div className="p-3 space-y-2.5 bg-muted/20 border-t text-xs">
            <div className="space-y-1">
              <Label className="text-[11px]">Alt text</Label>
              <Input
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder="Descripción de la imagen"
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Tipo de imagen</Label>
              <Select value={editUso} onValueChange={(val) => setEditUso(val as UsoImagen)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USO_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {USO_IMAGEN_LABELS[opt] ?? opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Orden</Label>
              <Input
                type="number"
                value={editOrden}
                onChange={(e) => setEditOrden(Number(e.target.value))}
                className="h-7 text-xs"
              />
            </div>

            {imagen.origen_imagen === 'url_externa' && (
              <div className="space-y-1">
                <Label className="text-[11px]">URL</Label>
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1 justify-end">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs px-3"
                onClick={handleSaveEdit}
                disabled={isEditPending}
              >
                {isEditPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Guardar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={handleCancelEdit}
                disabled={isEditPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de confirmación de borrado ─────────── */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleDelete}
        title="¿Eliminar imagen?"
        description={`Esta acción eliminará la imagen del bucket de Storage y de la base de datos. No se puede deshacer.${imagen.es_principal ? ' ⚠️ Esta es la imagen PRINCIPAL del producto.' : ''}`}
        elementName={imagen.alt_text ?? imagen.uso_imagen ?? `Imagen #${imagen.id}`}
      />

      {/* ── Modal Lightbox de Imagen Ampliada con Zoom Interactivo Directo ─────────── */}
      {imagen.url && (
        <CardImageZoomModal
          open={showZoomModal}
          onOpenChange={setShowZoomModal}
          url={imagen.url}
          alt={imagen.alt_text ?? imagen.uso_imagen}
          uso={USO_IMAGEN_LABELS[imagen.uso_imagen as UsoImagen] ?? imagen.uso_imagen}
          id={imagen.id}
        />
      )}
    </>
  )
}

// ─── Modal de Zoom Interactivo (Lightbox dedicado) ───────────────────────────

function CardImageZoomModal({
  open,
  onOpenChange,
  url,
  alt,
  uso,
  id,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  alt: string
  uso: string
  id: number
}) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const handleZoomIn = () => setScale(prev => Math.min(3.5, prev + 0.5))
  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(1, prev - 0.5)
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }

  const handleReset = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length === 0) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length === 0) return
    const deltaX = e.touches[0].clientX - dragStartRef.current.x
    const deltaY = e.touches[0].clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val)
      if (!val) handleReset()
    }}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] h-[90vh] p-3 sm:p-4 flex flex-col bg-zinc-950 border-zinc-800 text-white overflow-hidden shadow-2xl">
        <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <DialogTitle className="text-sm font-mono font-bold text-white flex items-center gap-2 truncate pr-2">
            <span>{uso}</span>
            <span className="text-xs text-zinc-400 font-normal truncate">({alt || `Imagen #${id}`})</span>
          </DialogTitle>

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mr-6 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              title="Alejar (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono px-2 text-zinc-300 w-12 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800"
              onClick={handleZoomIn}
              disabled={scale >= 3.5}
              title="Acercar (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            {scale > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={handleReset}
                title="Restablecer (100%)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Área de la imagen interactiva */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={cn(
            'relative w-full flex-1 flex items-center justify-center overflow-hidden p-2 select-none touch-none bg-zinc-900/40 rounded-lg border border-zinc-800/60',
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          )}
        >
          <div
            className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
            style={{
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            }}
          >
            <Image
              src={getSmartImagenUrl(url, 'full')}
              alt={alt || uso}
              fill
              priority
              sizes="90vw"
              className="object-contain select-none pointer-events-none"
            />
          </div>

          {scale > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md pointer-events-none shadow flex items-center gap-1.5 border border-zinc-700">
              <Move className="h-3.5 w-3.5 text-amber-300" /> Arrastra para mover la imagen
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
