// app/(admin)/catalogo/imagenes/components/VistaGrid.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl, IMAGEN_SIZES } from '@/lib/utils/imagen'
import { USO_IMAGEN_LABELS, USO_IMAGEN_COLORS } from './imagenesConstants'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { cambiarUsoImagenRapidoAction } from '@/modules/catalogo/imagenes/actions'
import { Star, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ImageLightbox = dynamic(
  () => import('./ImageLightbox').then((m) => m.ImageLightbox),
  { ssr: false }
)
const ImageQuickEdit = dynamic(
  () => import('./ImageQuickEdit').then((m) => m.ImageQuickEdit),
  { ssr: false }
)

interface Props {
  imagenes: ImagenGlobal[]
}

export function VistaGrid({ imagenes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedImagen, setSelectedImagen] = useState<ImagenGlobal | null>(null)
  const [editImagen, setEditImagen] = useState<ImagenGlobal | null>(null)

  const handleToggleOculta = (img: ImagenGlobal) => {
    const isCurrentlyOculta = img.uso_imagen === 'oculta' || img.uso_imagen === 'oculto'
    const nuevoUso = isCurrentlyOculta ? 'galeria_secundaria' : 'oculta'

    startTransition(async () => {
      const res = await cambiarUsoImagenRapidoAction(img.id, nuevoUso)
      if (res.success) {
        toast.success(
          nuevoUso === 'oculta'
            ? 'Imagen pasada a Oculta'
            : 'Imagen pasada a Galería visible'
        )
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al cambiar visibilidad')
      }
    })
  }

  if (imagenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <div className="rounded-full bg-muted p-4">
          <Star className="h-8 w-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No se encontraron imágenes</p>
          <p className="text-xs opacity-70 mt-1">
            Ajusta los filtros o importa nuevas imágenes
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {imagenes.map((img) => {
          const usoColor = USO_IMAGEN_COLORS[img.uso_imagen] ?? 'bg-gray-500'
          const isOculta = img.uso_imagen === 'oculta' || img.uso_imagen === 'oculto'
          
          return (
            <div
              key={img.id}
              className={cn(
                'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200',
                'hover:shadow-md hover:border-primary/20',
                img.es_principal && 'ring-2 ring-amber-400 ring-offset-1',
                isOculta && 'ring-2 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.45)] border-red-500/60'
              )}
              onClick={() => setSelectedImagen(img)}
            >
              {/* Imagen */}
              <div className="relative aspect-square bg-muted/30 overflow-hidden cursor-pointer">
                <Image
                  src={getSmartImagenUrl(img.url, 'card_lg')}
                  alt={img.alt_text ?? img.uso_imagen}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes={IMAGEN_SIZES.card_lg}
                />

                {/* Badge principal */}
                {img.es_principal && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400/95 text-amber-900 text-[10px] font-semibold rounded-full px-2 py-0.5 z-10">
                    <Star className="h-2.5 w-2.5 fill-amber-900" />
                    Principal
                  </div>
                )}

                {/* Badge oculta */}
                {isOculta && !img.es_principal && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/95 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 z-10 animate-pulse shadow-sm">
                    🚫 Oculta
                  </div>
                )}

                {/* Badge origen */}
                {img.origen_imagen === 'url_externa' ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 z-10">
                    URL
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 z-10">
                    Storage
                  </div>
                )}

                {/* Overlay de acciones */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-20">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 text-foreground hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditImagen(img)
                    }}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="secondary"
                    className={cn(
                      "h-8 w-8 text-white",
                      isOculta
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleOculta(img)
                    }}
                    title={isOculta ? "Hacer visible (Galería)" : "Ocultar imagen"}
                  >
                    {isOculta ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className={cn('text-[10px] text-white font-medium rounded-full px-2 py-0.5 leading-none', usoColor)}>
                    {USO_IMAGEN_LABELS[img.uso_imagen] ?? img.uso_imagen}
                  </span>
                </div>
                <Link
                  href={ADMIN_ROUTES.catalogo.detalle(img.producto_id)}
                  className="text-[10px] font-mono text-primary hover:underline block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {img.sku_base}
                </Link>
                <div className="text-[10px] text-muted-foreground truncate" title={img.descripcion_producto}>
                  {img.descripcion_producto}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modales */}
      {selectedImagen && (
        <ImageLightbox
          imagen={selectedImagen}
          imagenes={imagenes}
          onClose={() => setSelectedImagen(null)}
          onEdit={(img) => {
            setSelectedImagen(null)
            setEditImagen(img)
          }}
        />
      )}

      {editImagen && (
        <ImageQuickEdit
          imagen={editImagen}
          onClose={() => setEditImagen(null)}
        />
      )}
    </>
  )
}