// app/(admin)/catalogo/imagenes/components/ImageQuickEdit.tsx
'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Loader2, Star, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { usoImagenOptions, USO_IMAGEN_LABELS, USO_IMAGEN_COLORS } from './imagenesConstants'
import { updateImagenGlobalAction, deleteImagenGlobalAction } from '@/modules/catalogo/imagenes/actions'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  imagen: ImagenGlobal
  onClose: () => void
}

export function ImageQuickEdit({ imagen, onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  const [altText, setAltText] = useState(imagen.alt_text ?? '')
  const [usoImagen, setUsoImagen] = useState<string>(imagen.uso_imagen)
  const [orden, setOrden] = useState(imagen.orden ?? 0)
  const [esPrincipal, setEsPrincipal] = useState(imagen.es_principal)

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateImagenGlobalAction(imagen.id, {
        alt_text: altText || null,
        uso_imagen: usoImagen,
        orden,
        es_principal: esPrincipal,
      })

      if (res.success) {
        toast.success('Imagen actualizada')
        onClose()
      } else {
        toast.error(res.error ?? 'Error al guardar')
      }
    })
  }

  const handleDelete = (desvincularSolo: boolean) => {
    startTransition(async () => {
      const res = await deleteImagenGlobalAction(imagen.id, desvincularSolo)
      if (res.success) {
        toast.success(desvincularSolo ? 'Imagen desvinculada' : 'Imagen eliminada')
        onClose()
      } else {
        toast.error(res.error ?? 'Error al eliminar')
      }
    })
  }

  const usoColor = USO_IMAGEN_COLORS[imagen.uso_imagen] ?? 'bg-gray-500'

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Imagen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={getSmartImagenUrl(imagen.url, 'hero')}
              alt={altText || imagen.uso_imagen}
              fill
              className="object-contain"
            />
          </div>

          {/* Producto (solo lectura, no editable) */}
          <div className="space-y-2">
            <Label>Producto asociado</Label>
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <div className="flex flex-col">
                <span className="font-mono text-sm font-medium">{imagen.sku_base}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {imagen.descripcion_producto || imagen.nombre_producto}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href={ADMIN_ROUTES.catalogo.detalle(imagen.producto_id)} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Uso imagen */}
          <div className="grid gap-2">
            <Label>Tipo de uso</Label>
            <Select 
              value={usoImagen} 
              onValueChange={(v) => setUsoImagen(v || usoImagen)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usoImagenOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alt text */}
          <div className="grid gap-2">
            <Label>Alt Text (SEO)</Label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descripción de la imagen"
            />
          </div>

          {/* Orden */}
          <div className="grid gap-2">
            <Label>Orden</Label>
            <Input
              type="number"
              min={0}
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value))}
            />
          </div>

          {/* Principal */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esPrincipal"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="esPrincipal" className="text-sm cursor-pointer flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Imagen principal
            </Label>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
          >
            Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>

        {/* Modal de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-sm w-full space-y-4 border-2 border-red-500">
              <h3 className="font-semibold text-lg text-red-600">¿Eliminar imagen?</h3>
              <p className="text-sm text-muted-foreground">
                ¿Qué deseas hacer con esta imagen?
              </p>
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDelete(false)}
                >
                  Eliminar completamente
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-yellow-600 border-yellow-500 hover:bg-yellow-50"
                  onClick={() => handleDelete(true)}
                >
                  Desvincular (mantener en Storage)
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}