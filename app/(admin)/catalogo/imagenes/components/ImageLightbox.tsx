// app/(admin)/catalogo/imagenes/components/ImageLightbox.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Pencil, Star, ExternalLink, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS } from './imagenesConstants'
import { setImagenPrincipalAction } from '@/modules/catalogo/imagenes/actions'
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
  const [currentImagen, setCurrentImagen] = useState(initialImagen)
  const currentIndex = imagenes.findIndex(i => i.id === currentImagen.id)
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

  const usoColor = USO_IMAGEN_COLORS[currentImagen.uso_imagen] ?? 'bg-blue-500'
  const usoLabel = USO_IMAGEN_LABELS[currentImagen.uso_imagen] ?? currentImagen.uso_imagen

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
          {/* Lado izquierdo - Imagen (ocupa todo el espacio restante) */}
          <div className="relative bg-black flex items-center justify-center" style={{ flex: 1, minWidth: 0 }}>
            <Image
              src={getSmartImagenUrl(currentImagen.url, 'full')}
              alt={currentImagen.alt_text ?? currentImagen.uso_imagen}
              fill
              className="object-contain"
              sizes="(max-width: 1200px) 65vw, 800px"
              priority
            />

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

          {/* Lado derecho - Detalles (ancho fijo) */}
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
              <div className="mb-6 pr-6">
                <h2 className="text-3xl font-semibold tracking-tight mb-1">
                  {currentImagen.sku_base}
                </h2>
                <p className="text-zinc-400 text-sm uppercase tracking-wider">
                  {currentImagen.descripcion_producto || currentImagen.nombre_producto || 'Sin descripción'}
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-10">
                <span className={cn(
                  'text-sm font-medium rounded-full px-4 py-1.5',
                  usoColor.includes('bg-') ? usoColor : 'bg-[#4385F4]'
                )}>
                  {usoLabel}
                </span>
                
                {currentImagen.es_principal && (
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                )}
                
                <span className={cn(
                  'text-sm font-medium rounded-full px-4 py-1.5 border bg-transparent',
                  currentImagen.origen_imagen === 'local'
                    ? 'border-[#81C995] text-[#81C995]'
                    : 'border-orange-400 text-orange-400'
                )}>
                  Storage ({currentImagen.origen_imagen})
                </span>
              </div>

              {/* Metadatos */}
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-sm text-zinc-500 mb-1">Alt Text</h3>
                  <p className="text-base text-zinc-200">
                    {currentImagen.alt_text || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm text-zinc-500 mb-1">Orden</h3>
                  <p className="text-base text-zinc-200">
                    #{currentImagen.orden ?? 0}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm text-zinc-500 mb-1">Fecha</h3>
                  <p className="text-base text-zinc-200">
                    {currentImagen.created_at ? new Date(currentImagen.created_at).toLocaleDateString('es-MX') : '-'}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-3 mt-8 pt-8 border-t border-white/10">
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white h-12 text-base font-normal justify-start px-6" 
                  asChild
                >
                  <Link href={ADMIN_ROUTES.catalogo.detalle(currentImagen.producto_id)}>
                    <ExternalLink className="h-5 w-5 mr-3 text-zinc-400" />
                    Ver producto
                  </Link>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white h-12 text-base font-normal justify-start px-6" 
                  onClick={() => onEdit(currentImagen)}
                >
                  <Pencil className="h-5 w-5 mr-3 text-zinc-400" />
                  Editar
                </Button>

                {!currentImagen.es_principal && (
                  <SetPrincipalButton imagenId={currentImagen.id} productoId={currentImagen.producto_id} />
                )}
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}

function SetPrincipalButton({ imagenId, productoId }: { imagenId: number; productoId: number }) {
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    startTransition(async () => {
      const res = await setImagenPrincipalAction(imagenId, productoId)
      if (res.success) {
        toast.success('Imagen definida como principal')
      } else {
        toast.error(res.error ?? 'Error al definir principal')
      }
    })
  }

  return (
    <Button
      variant="outline"
      className="w-full rounded-full border border-amber-500/50 bg-transparent text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 h-12 text-base font-normal justify-start px-6 mt-3"
      onClick={handle}
      disabled={isPending}
    >
      <Star className="h-5 w-5 mr-3" />
      {isPending ? 'Actualizando...' : 'Definir como Principal'}
    </Button>
  )
}