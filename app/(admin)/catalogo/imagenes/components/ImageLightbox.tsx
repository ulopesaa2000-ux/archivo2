// app/(admin)/catalogo/imagenes/components/ImageLightbox.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Star,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import {
  usoImagenOptions,
  USO_IMAGEN_LABELS,
  USO_IMAGEN_COLORS,
} from './imagenesConstants'
import {
  setImagenPrincipalAction,
  cambiarUsoImagenRapidoAction,
} from '@/modules/catalogo/imagenes/actions'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  imagen: ImagenGlobal
  imagenes: ImagenGlobal[]
  onClose: () => void
  onEdit: (imagen: ImagenGlobal) => void
}

export function ImageLightbox({ imagen: initialImagen, imagenes, onClose, onEdit }: Props) {
  const router = useRouter()
  const [currentImagen, setCurrentImagen] = useState(initialImagen)
  const [isPendingUso, startTransitionUso] = useTransition()

  const currentIndex = imagenes.findIndex((i) => i.id === currentImagen.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < imagenes.length - 1

  const goPrev = () => {
    if (hasPrev) {
      setCurrentImagen(imagenes[currentIndex - 1])
    }
  }

  const goNext = () => {
    if (hasNext) {
      setCurrentImagen(imagenes[currentIndex + 1])
    }
  }

  const isOculta =
    currentImagen.uso_imagen === 'oculta' || currentImagen.uso_imagen === 'oculto'

  const usoColor = USO_IMAGEN_COLORS[currentImagen.uso_imagen] ?? 'bg-blue-500'
  const usoLabel =
    USO_IMAGEN_LABELS[currentImagen.uso_imagen] ?? currentImagen.uso_imagen

  const handleQuickUsoChange = (nuevoUso: string | null) => {
    if (!nuevoUso) return
    startTransitionUso(async () => {
      const res = await cambiarUsoImagenRapidoAction(currentImagen.id, nuevoUso)
      if (res.success) {
        toast.success(res.message || 'Tipo de imagen actualizado')
        setCurrentImagen((prev) => ({
          ...prev,
          uso_imagen: nuevoUso,
          es_principal:
            nuevoUso === 'principal_ecommerce'
              ? true
              : nuevoUso === 'oculta'
              ? false
              : prev.es_principal,
        }))
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al actualizar tipo')
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent
        className="p-0 overflow-hidden border-0 bg-[#0f0f0f] text-white [&>button]:hidden"
        style={{
          maxWidth: '95vw',
          width: '1200px',
          maxHeight: '90vh',
          height: '85vh',
          display: 'flex',
          flexDirection: 'row',
        }}
        aria-describedby={undefined}
      >
        {/* Lado izquierdo - Imagen (con sombra roja si es oculta) */}
        <div
          className={cn(
            'relative bg-black flex items-center justify-center transition-all duration-300',
            isOculta &&
              'border-2 border-red-500/70 shadow-[inset_0_0_40px_rgba(239,68,68,0.35),0_0_25px_rgba(239,68,68,0.3)]'
          )}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Image
            src={getSmartImagenUrl(currentImagen.url, 'full')}
            alt={currentImagen.alt_text ?? currentImagen.uso_imagen}
            fill
            className="object-contain"
            sizes="(max-width: 1200px) 65vw, 800px"
            priority
          />

          {/* Badge Oculta sobre la imagen si aplica */}
          {isOculta && (
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm border border-red-400/50 animate-pulse">
              <EyeOff className="h-4 w-4" />
              <span>Imagen Oculta (No pública en tienda)</span>
            </div>
          )}

          {/* Navegación */}
          {hasPrev && (
            <button
              className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-4 text-white hover:bg-white/10 transition-colors z-20"
              onClick={goPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && (
            <button
              className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-4 text-white hover:bg-white/10 transition-colors z-20"
              onClick={goNext}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Contador */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tracking-widest z-20">
            {currentIndex + 1} / {imagenes.length}
          </div>
        </div>

        {/* Lado derecho - Detalles y Cambios Rápidos */}
        <div className="w-[380px] bg-[#0f0f0f] border-l border-white/10 flex flex-col relative shrink-0">
          {/* Botón Cerrar absoluto */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-8 pt-10 flex flex-col">
            {/* Header / Títulos */}
            <div className="mb-4 pr-6">
              <h2 className="text-3xl font-semibold tracking-tight mb-1">
                {currentImagen.sku_base}
              </h2>
              <p className="text-zinc-400 text-sm uppercase tracking-wider">
                {currentImagen.descripcion_producto ||
                  currentImagen.nombre_producto ||
                  'Sin descripción'}
              </p>
            </div>

            {/* Selector Rápido de Tipo de Imagen */}
            <div className="mb-6 p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tipo de imagen (Cambio Rápido)
                </span>
                {isPendingUso && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
              </div>

              <Select
                value={currentImagen.uso_imagen}
                onValueChange={handleQuickUsoChange}
                disabled={isPendingUso}
              >
                <SelectTrigger
                  className={cn(
                    'w-full bg-zinc-800/80 border-zinc-700 text-white h-10 text-xs font-medium',
                    isOculta &&
                      'border-red-500/70 bg-red-950/40 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  {usoImagenOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs cursor-pointer focus:bg-zinc-800 focus:text-white"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isOculta && (
                <p className="text-[11px] text-red-400 font-medium">
                  Esta foto no se mostrará a los clientes en la tienda pública.
                </p>
              )}
            </div>

            {/* Badges actuales */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className={cn(
                  'text-xs font-medium rounded-full px-3 py-1',
                  isOculta
                    ? 'bg-red-950 text-red-200 border border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                    : usoColor
                )}
              >
                {usoLabel}
              </span>

              {currentImagen.es_principal && (
                <span className="flex items-center gap-1 bg-amber-400/90 text-amber-950 text-xs font-bold rounded-full px-2.5 py-0.5">
                  <Star className="h-3 w-3 fill-amber-950" />
                  Principal
                </span>
              )}

              <span
                className={cn(
                  'text-xs font-medium rounded-full px-3 py-1 border bg-transparent',
                  currentImagen.origen_imagen === 'local'
                    ? 'border-[#81C995] text-[#81C995]'
                    : 'border-orange-400 text-orange-400'
                )}
              >
                Storage ({currentImagen.origen_imagen})
              </span>
            </div>

            {/* Metadatos */}
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-xs text-zinc-500 mb-0.5">Alt Text</h3>
                <p className="text-sm text-zinc-200">
                  {currentImagen.alt_text || '-'}
                </p>
              </div>

              <div>
                <h3 className="text-xs text-zinc-500 mb-0.5">Orden</h3>
                <p className="text-sm text-zinc-200">
                  #{currentImagen.orden ?? 0}
                </p>
              </div>

              <div>
                <h3 className="text-xs text-zinc-500 mb-0.5">Fecha</h3>
                <p className="text-sm text-zinc-200">
                  {currentImagen.created_at
                    ? new Date(currentImagen.created_at).toLocaleDateString('es-MX')
                    : '-'}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="space-y-2 mt-6 pt-6 border-t border-white/10">
              {/* Botón rápido de Ocultar / Mostrar */}
              {isOculta ? (
                <Button
                  variant="outline"
                  className="w-full rounded-full border border-emerald-500/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 h-10 text-sm font-medium justify-start px-5"
                  onClick={() => handleQuickUsoChange('galeria_secundaria')}
                  disabled={isPendingUso}
                >
                  <Eye className="h-4 w-4 mr-2.5 text-emerald-400" />
                  Hacer Visible (Galería)
                </Button>
              ) : (
                !currentImagen.es_principal && (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border border-red-500/50 bg-red-950/15 text-red-400 hover:bg-red-950/30 h-10 text-sm font-medium justify-start px-5"
                    onClick={() => handleQuickUsoChange('oculta')}
                    disabled={isPendingUso}
                  >
                    <EyeOff className="h-4 w-4 mr-2.5 text-red-400" />
                    Ocultar esta imagen
                  </Button>
                )
              )}

              {!currentImagen.es_principal && (
                <SetPrincipalButton
                  imagenId={currentImagen.id}
                  productoId={currentImagen.producto_id}
                  onSuccess={() => {
                    setCurrentImagen((prev) => ({
                      ...prev,
                      es_principal: true,
                      uso_imagen: 'principal_ecommerce',
                    }))
                  }}
                />
              )}

              <Button
                variant="outline"
                className="w-full rounded-full border border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white h-10 text-sm font-normal justify-start px-5"
                onClick={() => onEdit(currentImagen)}
              >
                <Pencil className="h-4 w-4 mr-2.5 text-zinc-400" />
                Editar completo (Texto, Reasignar SKU)
              </Button>

              <Button
                variant="outline"
                className="w-full rounded-full border border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white h-10 text-sm font-normal justify-start px-5"
                asChild
              >
                <Link
                  href={ADMIN_ROUTES.catalogo.detalle(currentImagen.producto_id)}
                >
                  <ExternalLink className="h-4 w-4 mr-2.5 text-zinc-400" />
                  Ver producto en catálogo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SetPrincipalButton({
  imagenId,
  productoId,
  onSuccess,
}: {
  imagenId: number
  productoId: number
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    startTransition(async () => {
      const res = await setImagenPrincipalAction(imagenId, productoId)
      if (res.success) {
        toast.success('Imagen definida como principal')
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al definir principal')
      }
    })
  }

  return (
    <Button
      variant="outline"
      className="w-full rounded-full border border-amber-500/50 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 h-10 text-sm font-medium justify-start px-5"
      onClick={handle}
      disabled={isPending}
    >
      <Star className="h-4 w-4 mr-2.5 text-amber-400" />
      {isPending ? 'Actualizando...' : 'Definir como Principal'}
    </Button>
  )
}