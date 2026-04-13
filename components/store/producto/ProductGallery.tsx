// components/store/producto/ProductGallery.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface ProductGalleryProps {
  imagenes: { url: string; es_principal: boolean; orden: number }[]
  nombre: string
}

export function ProductGallery({ imagenes, nombre }: ProductGalleryProps) {
  const [imagenActiva, setImagenActiva] = useState(0)

  // Si no hay imágenes, mostrar placeholder
  if (imagenes.length === 0) {
    return (
      <div className="aspect-square bg-store-bg border border-store-border flex items-center justify-center rounded-lg relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,.015) 15px, rgba(0,0,0,.015) 16px)' }}></div>
        <span className="text-[12px] text-store-ink3 uppercase tracking-[0.05em] z-10">Sin imagen disponible</span>
      </div>
    )
  }

  // Ordenar por orden
  const imagenesOrdenadas = [...imagenes].sort((a, b) => a.orden - b.orden)

  return (
    <div className="space-y-4">
      {/* Imagen principal */}
      <div className="relative aspect-square bg-store-bg border border-store-border rounded-lg overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,.015) 15px, rgba(0,0,0,.015) 16px)' }}></div>
        <Image
          src={imagenesOrdenadas[imagenActiva].url}
          alt={`${nombre} - Imagen ${imagenActiva + 1}`}
          fill
          className="object-cover z-10"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {imagenesOrdenadas.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {imagenesOrdenadas.map((imagen, index) => (
            <button
              key={index}
              onClick={() => setImagenActiva(index)}
              className={cn(
                'relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors bg-store-bg',
                imagenActiva === index
                  ? 'border-store-accent'
                  : 'border-transparent hover:border-store-border'
              )}
            >
              <Image
                src={imagen.url}
                alt={`${nombre} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
