// components/shared/ProgressiveProductImage.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSmartImagenUrl, IMAGEN_SIZES, type ImagenPreset } from '@/lib/utils/imagen'

export interface ProgressiveProductImageProps {
  src: string | null | undefined
  alt: string
  preset?: ImagenPreset
  sizes?: string
  priority?: boolean
  objectFit?: 'contain' | 'cover'
  className?: string
  containerClassName?: string
  fallbackIconClassName?: string
  fallbackLabel?: string
}

/**
 * Componente universal de imagen de producto con carga progresiva ("Datos primero, imagen al final").
 *
 * - Aplica automáticamente `getSmartImagenUrl(src, preset)` para optimizar peso vía imgproxy.
 * - Muestra un pulso ligero no bloqueante mientras descarga en segundo plano (`decoding="async"`).
 * - Hace transición suave (`opacity-0 -> opacity-100`) al terminar de cargar.
 * - Si no hay imagen o falla la red, muestra un estado de respaldo limpio sin romper el layout.
 * - Reutilizable en `/catalogo`, `/catalogo/catalogos`, `/catalogo/imagenes`, `/ecommerce/productos-web` y `/shop`.
 */
export function ProgressiveProductImage({
  src,
  alt,
  preset = 'card',
  sizes,
  priority = false,
  objectFit = 'contain',
  className,
  containerClassName,
  fallbackIconClassName,
  fallbackLabel,
}: ProgressiveProductImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [errorSrc, setErrorSrc] = useState<string | null>(null)

  const hasValidSrc = Boolean(src && src.trim().length > 0)
  const isLoaded = hasValidSrc && loadedSrc === src
  const hasError = !hasValidSrc || errorSrc === src

  if (hasError) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/30 dark:bg-slate-900/40 text-muted-foreground/40 select-none',
          containerClassName
        )}
      >
        <Package className={cn('h-9 w-9 stroke-[1.5]', fallbackIconClassName)} />
        {fallbackLabel && (
          <span className="text-[10px] font-medium tracking-wider uppercase opacity-70">
            {fallbackLabel}
          </span>
        )}
      </div>
    )
  }

  const optimizedUrl = getSmartImagenUrl(src, preset)
  const resolvedSizes = sizes ?? IMAGEN_SIZES[preset]
  const isAlreadyProxied = optimizedUrl.includes('/storage/v1/render/image/public/')

  return (
    <div className={cn('relative w-full h-full overflow-hidden', containerClassName)}>
      {/* Esqueleto ligero mientras la imagen descarga en segundo plano */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-muted/50 dark:bg-slate-800/40 animate-pulse flex items-center justify-center"
        >
          <Package className="h-7 w-7 text-muted-foreground/20" />
        </div>
      )}

      <Image
        src={optimizedUrl}
        alt={alt}
        fill
        unoptimized={isAlreadyProxied}
        sizes={resolvedSizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        decoding="async"
        onLoad={() => setLoadedSrc(src!)}
        onError={() => setErrorSrc(src!)}
        className={cn(
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          'transition-all duration-300',
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]',
          className
        )}
      />
    </div>
  )
}

