// components/store/producto/ProductGallery.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ZoomIn, Move } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProductGalleryProps {
  imagenes: { url: string; es_principal: boolean; orden: number }[]
  nombre: string
}

export function ProductGallery({ imagenes, nombre }: ProductGalleryProps) {
  const [imagenActiva, setImagenActiva] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Estado de zoom en línea (hover lens zoom directo en la página)
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const updatePointerPos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setMousePos({ x, y })
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updatePointerPos(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updatePointerPos(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  // Si no hay imágenes, mostrar placeholder
  if (imagenes.length === 0) {
    return (
      <div className="aspect-[3/4] bg-store-bg border border-store-border flex items-center justify-center rounded-xl relative overflow-hidden shadow-xs">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,.015) 15px, rgba(0,0,0,.015) 16px)' }}></div>
        <span className="text-[12px] text-store-ink3 uppercase tracking-[0.05em] z-10 font-medium">1080 × 1440 — Sin imagen</span>
      </div>
    )
  }

  // Ordenar por principal primero, luego por orden
  const imagenesOrdenadas = [...imagenes].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1
    if (!a.es_principal && b.es_principal) return 1
    return (a.orden ?? 0) - (b.orden ?? 0)
  })
  const currentImgUrl = imagenesOrdenadas[imagenActiva]?.url

  return (
    <div className="space-y-4">
      {/* 
        Imagen principal completa con ZOOM PARCIAL INLINE (Lupa al pasar el mouse/tocar)
        No abre ventanas secundarias; el zoom ocurre directamente en la imagen de la página.
      */}
      <div 
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => {
          setIsHovered(true)
          if (e.touches.length > 0) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsHovered(false)}
        className={cn(
          "group relative aspect-[3/4] bg-store-bg border border-store-border rounded-xl overflow-hidden flex items-center justify-center shadow-sm select-none transition-all duration-200",
          isHovered ? "cursor-crosshair ring-2 ring-store-accent/40" : "cursor-zoom-in"
        )}
      >
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,.015) 15px, rgba(0,0,0,.015) 16px)' }}></div>
        
        {/* Imagen principal con efecto lupa directo */}
        <Image
          src={currentImgUrl}
          alt={`${nombre} - Imagen ${imagenActiva + 1}`}
          fill
          className="object-contain p-2 z-10 transition-transform duration-150 ease-out will-change-transform pointer-events-none"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          style={
            isHovered
              ? {
                  transform: 'scale(2.6)',
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                }
              : {
                  transform: 'scale(1)',
                  transformOrigin: 'center',
                }
          }
        />

        {/* Badge indicador flotante de ayuda */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-200">
          {isHovered ? (
            <div className="py-1 px-3 rounded-full bg-black/80 text-white text-[11px] font-medium backdrop-blur-md flex items-center gap-1.5 shadow-md whitespace-nowrap">
              <Move className="h-3 w-3 animate-pulse text-amber-300" /> Pasa el cursor para explorar detalle
            </div>
          ) : (
            <div className="py-1 px-3 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-md opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-sm whitespace-nowrap">
              <ZoomIn className="h-3 w-3" /> Pasa el cursor sobre la foto para zoom
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {imagenesOrdenadas.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {imagenesOrdenadas.map((imagen, index) => (
            <button
              key={index}
              onClick={() => {
                setImagenActiva(index)
                setIsHovered(false)
              }}
              className={cn(
                'relative w-16 aspect-[3/4] flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all bg-store-bg shadow-xs',
                imagenActiva === index
                  ? 'border-store-accent ring-2 ring-store-accent/20'
                  : 'border-transparent hover:border-store-border opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={imagen.url}
                alt={`${nombre} - Thumbnail ${index + 1}`}
                fill
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


