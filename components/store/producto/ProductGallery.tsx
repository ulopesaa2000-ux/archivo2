// components/store/producto/ProductGallery.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ZoomIn, Move, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSmartImagenUrl, IMAGEN_SIZES } from '@/lib/utils/imagen'

export interface ProductGalleryProps {
  imagenes: { url: string; es_principal: boolean; orden: number }[]
  nombre: string
}

export function ProductGallery({ imagenes, nombre }: ProductGalleryProps) {
  const [imagenActiva, setImagenActiva] = useState(0)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [errorSrc, setErrorSrc] = useState<string | null>(null)
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
  const optimizedMainUrl = getSmartImagenUrl(currentImgUrl, 'hero')
  const isMainProxied = optimizedMainUrl.includes('/storage/v1/render/image/public/')
  const isMainLoaded = Boolean(currentImgUrl) && loadedSrc === optimizedMainUrl
  const hasMainError = !currentImgUrl || errorSrc === optimizedMainUrl

  return (
    <div className="space-y-4">
      {/* 
        Imagen principal completa con carga progresiva (datos primero, imagen después)
        y ZOOM PARCIAL INLINE (Lupa al pasar el mouse/tocar).
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
          "group relative aspect-[3/4] max-h-[52vh] lg:max-h-none w-full bg-store-bg border border-store-border rounded-xl overflow-hidden flex items-center justify-center shadow-sm select-none transition-all duration-200",
          isHovered ? "cursor-crosshair ring-2 ring-store-accent/40" : "cursor-zoom-in"
        )}
      >
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(0,0,0,.015) 15px, rgba(0,0,0,.015) 16px)' }}></div>

        {/* Esqueleto ligero mientras descarga la imagen en segundo plano */}
        {!isMainLoaded && !hasMainError && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-muted/40 dark:bg-zinc-900/50 animate-pulse flex flex-col items-center justify-center gap-2 z-0"
          >
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider">
              Cargando imagen...
            </span>
          </div>
        )}

        {hasMainError ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50 z-10">
            <Package className="h-10 w-10" />
            <span className="text-[11px] uppercase tracking-wider">Imagen no disponible</span>
          </div>
        ) : (
          <Image
            src={optimizedMainUrl}
            alt={`${nombre} - Imagen ${imagenActiva + 1}`}
            fill
            unoptimized={isMainProxied}
            decoding="async"
            className={cn(
              'object-contain p-2 z-10 transition-all duration-300 ease-out will-change-transform pointer-events-none',
              isMainLoaded ? 'opacity-100' : 'opacity-0'
            )}
            sizes={IMAGEN_SIZES.hero}
            onLoad={() => setLoadedSrc(optimizedMainUrl)}
            onError={() => setErrorSrc(optimizedMainUrl)}
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
        )}

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
          {imagenesOrdenadas.map((imagen, index) => {
            const thumbUrl = getSmartImagenUrl(imagen.url, 'thumbnail')
            return (
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
                src={thumbUrl}
                alt={`${nombre} - Thumbnail ${index + 1}`}
                fill
                unoptimized={thumbUrl.includes('/storage/v1/render/image/public/')}
                loading="lazy"
                decoding="async"
                className="object-contain p-1"
                sizes={IMAGEN_SIZES.thumbnail}
              />
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


