// app/(admin)/catalogo/[id]/components/ImagenCard.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Star, Pencil, Trash2, Loader2, Check, X, Link2 } from 'lucide-react'
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
import type { ProductoImagenRow } from '@/lib/types/tables'
import type { UsoImagen } from '@/lib/types/tables'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS, USO_OPTIONS } from './imagenesConstants'
import { getSmartImagenUrl, IMAGEN_SIZES } from '@/lib/utils/imagen'

// ─── Componente ────────────────────────────────────────────────────────────────

interface ImagenCardProps {
  imagen: ProductoImagenRow
  productoId: number
}

export function ImagenCard({ imagen, productoId }: ImagenCardProps) {
  const [isEditing, setIsEditing]               = useState(false)
  const [showDeleteModal, setShowDeleteModal]    = useState(false)
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {/* Hacer principal */}
              {!imagen.es_principal && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-white/90 text-amber-600 hover:bg-amber-50 hover:text-amber-700 shadow"
                  onClick={handleSetPrincipal}
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
                className="h-8 w-8 bg-white/90 shadow"
                onClick={() => setIsEditing(true)}
                title="Editar metadatos"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {/* Eliminar */}
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 shadow"
                onClick={() => setShowDeleteModal(true)}
                title="Eliminar imagen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Badge principal — top-left */}
          {imagen.es_principal && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400/95 text-amber-900 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-sm">
              <Star className="h-2.5 w-2.5 fill-amber-900" />
              Principal
            </div>
          )}

          {/* Badge URL Externa — top-right (solo si origen es externo) */}
          {imagen.origen_imagen === 'url_externa' && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-sm">
              <Link2 className="h-2.5 w-2.5" />
              URL
            </div>
          )}
        </div>

        {/* ── Footer normal ────────────────────────────── */}
        {!isEditing && (
          <div className="p-2.5 space-y-1.5">
            <div className="flex items-center gap-1">
              <span className={cn('text-[10px] text-white font-medium rounded-full px-2 py-0.5 leading-none', usoBadgeColor)}>
                {USO_IMAGEN_LABELS[imagen.uso_imagen as UsoImagen] ?? imagen.uso_imagen}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate max-w-[80%]" title={imagen.alt_text ?? undefined}>
                {imagen.alt_text
                  ? imagen.alt_text
                  : <span className="opacity-40 italic">Sin alt text</span>
                }
              </span>
              <span className="shrink-0 tabular-nums">#{imagen.orden}</span>
            </div>
          </div>
        )}

        {/* ── Form de edición inline ─────────────────── */}
        {isEditing && (
          <div className="p-3 space-y-2.5 bg-muted/30 border-t">
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Tipo de uso
              </Label>
              <Select value={editUso} onValueChange={(v) => setEditUso(v as UsoImagen)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USO_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {USO_IMAGEN_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Alt text
                </Label>
                <Input
                  className="h-8 text-xs"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder="Descripción de la imagen"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Orden
                </Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  value={editOrden}
                  onChange={(e) => setEditOrden(Number(e.target.value))}
                />
              </div>
            </div>

            {/* URL editable solo para imágenes externas */}
            {imagen.origen_imagen === 'url_externa' && (
              <div className="grid gap-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> URL de imagen
                </Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 text-xs flex-1 gap-1"
                onClick={handleSaveEdit}
                disabled={isEditPending}
              >
                {isEditPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Check className="h-3 w-3" />
                }
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
    </>
  )
}
