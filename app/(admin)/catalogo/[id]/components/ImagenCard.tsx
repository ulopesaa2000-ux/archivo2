// app/(admin)/catalogo/[id]/components/ImagenCard.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Star, Pencil, Trash2, Loader2, Check, X, Link2, ZoomIn } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
} from '@/modules/catalogo/actions'
import { toast } from 'sonner'
import { ProductImageViewer } from './ProductImageViewer'
import type { ProductoImagenRow } from '@/lib/types/tables'
import type { UsoImagen } from '@/lib/types/tables'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS, USO_OPTIONS } from './imagenesConstants'
import { getSmartImagenUrl, IMAGEN_SIZES } from '@/lib/utils/imagen'

// ─── Componente ────────────────────────────────────────────────────────────────

interface ImagenCardProps {
  imagen: ProductoImagenRow
  productoId: number
  canEdit?: boolean
}

export function ImagenCard({ imagen, productoId, canEdit = true }: ImagenCardProps) {
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

  // ── Hacer principal ─────────────────────────────────────────
  const handleSetPrincipal = () => {
    if (imagen.es_principal || isPrincipalPending) return
    startPrincipalTransition(async () => {
      const res = await setPrincipalImagenAction(imagen.id, productoId)
      if (res.success) {
        toast.success('Imagen principal actualizada.')
      } else {
        toast.error(res.error ?? 'Error al actualizar imagen principal.')
      }
    })
  }

  // ── Guardar edición ─────────────────────────────────────────
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
    } else {
      toast.error(res.error ?? 'Error al eliminar la imagen.')
    }
  }

  const usoBadgeColor = USO_IMAGEN_COLORS[imagen.uso_imagen as UsoImagen] ?? 'bg-gray-500'

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200',
          'hover:shadow-md hover:border-primary/20',
          imagen.es_principal && 'ring-2 ring-amber-400 ring-offset-1'
        )}
      >
        {/* ── Imagen ─────────────────────────────────── */}
        <div className="relative aspect-square bg-muted/30 overflow-hidden">
          {imagen.url ? (
            <Image
              src={getSmartImagenUrl(imagen.url, 'card_lg')}
              alt={imagen.alt_text ?? imagen.uso_imagen}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105"
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
              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 cursor-pointer"
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
                  {/* Hacer principal */}
                  {!imagen.es_principal && (
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
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            {imagen.es_principal && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                ★ Principal
              </span>
            )}
            <span className={cn('text-white text-[9px] font-medium px-2 py-0.5 rounded-full shadow', usoBadgeColor)}>
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
          <div className="p-2.5 text-xs space-y-1 bg-card">
            <p className="font-medium text-foreground truncate" title={imagen.alt_text ?? ''}>
              {imagen.alt_text || <span className="text-muted-foreground italic">Sin texto alternativo</span>}
            </p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="capitalize">{imagen.origen_imagen?.replace('_', ' ') ?? 'storage'}</span>
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
              <Label className="text-[11px]">Uso</Label>
              <Select value={editUso} onValueChange={(v) => setEditUso(v as UsoImagen)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USO_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {USO_IMAGEN_LABELS[opt]}
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

      {/* ── Modal Lightbox de Imagen Ampliada con Zoom Interactivo ─────────── */}
      {imagen.url && (
        <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
          <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[92vh] p-4 flex flex-col items-center justify-center bg-black/95 border-none text-white overflow-hidden">
            <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-white/10 pb-2 mb-2">
              <DialogTitle className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <span>{USO_IMAGEN_LABELS[imagen.uso_imagen as UsoImagen] ?? imagen.uso_imagen}</span>
                <span className="text-xs text-white/60 font-normal">({imagen.alt_text ?? `Imagen #${imagen.id}`})</span>
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[78vh] flex items-center justify-center overflow-hidden">
              <ProductImageViewer
                src={imagen.url}
                alt={imagen.alt_text ?? imagen.uso_imagen}
                sku={imagen.alt_text ?? `Imagen #${imagen.id}`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
