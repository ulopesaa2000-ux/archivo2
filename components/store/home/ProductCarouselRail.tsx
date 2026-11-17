// components/store/home/ProductCarouselRail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react'
import { ProgressiveProductImage } from '@/components/shared/ProgressiveProductImage'
import { FavoriteButton } from '@/components/store/producto/FavoriteButton'
import { mostrarPrecio, formatearPrecio, getPrecioAMostrar, formatearStockDisponible } from '@/modules/ecommerce/utils'
import type { ConfigEcommerce, ProductoWebPublico } from '@/modules/ecommerce/types'

const AUTO_SLIDE_MS = 6000

interface ProductCarouselRailProps {
  title: string
  subtitle: string
  href: string
  hrefLabel: string
  productos: ProductoWebPublico[]
  config: ConfigEcommerce | null
  badgeType: 'trending' | 'recommended'
}

export function ProductCarouselRail({
  title,
  subtitle,
  href,
  hrefLabel,
  productos,
  config,
  badgeType,
}: ProductCarouselRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  const slideBy = (direction: 'prev' | 'next') => {
    const el = railRef.current
    if (!el) return
    const step = Math.max(240, Math.round(el.clientWidth * 0.75))

    if (direction === 'next') {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' })
      }
    } else {
      const atStart = el.scrollLeft <= 12
      if (atStart) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    if (isPaused || productos.length <= 2) return
    const timer = window.setInterval(() => {
      slideBy('next')
    }, AUTO_SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [isPaused, productos.length])

  if (productos.length === 0) return null

  return (
    <section
      className="px-4 md:px-8 py-8 md:py-10 border-b border-border"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            {badgeType === 'trending' ? (
              <Flame className="h-5 w-5 text-amber-500" />
            ) : (
              <Sparkles className="h-5 w-5 text-emerald-600" />
            )}
            <span>{title}</span>
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => slideBy('prev')}
              aria-label={`Anterior en ${title}`}
              className="h-8 w-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => slideBy('next')}
              aria-label={`Siguiente en ${title}`}
              className="h-8 w-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors shadow-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Link
            href={href}
            className="text-xs md:text-sm text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 group shrink-0"
          >
            <span>{hrefLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Carrusel horizontal automático (6s) y manual en web y móvil */}
      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {productos.map((prod) => {
          const showPrice = config ? mostrarPrecio(prod, config) : false
          const { precio } = config ? getPrecioAMostrar(prod, config) : { precio: null }
          const stockInfo = Boolean(config?.mostrar_stock)
            ? formatearStockDisponible(prod, config)
            : null

          return (
            <div
              key={prod.id}
              className="w-[46vw] sm:w-[31vw] lg:w-[calc(25%-12px)] shrink-0 snap-start bg-card dark:bg-zinc-900 rounded-2xl overflow-hidden border border-border dark:border-zinc-800 hover:shadow-lg transition-all group relative"
            >
              <div className="absolute top-2.5 right-2.5 z-20">
                <FavoriteButton productoWebId={prod.id} nombre={prod.nombre} />
              </div>

              <Link href={`/shop/${prod.slug}`} className="block">
                <div className="relative aspect-[3/4] bg-muted dark:bg-zinc-800 overflow-hidden">
                  <ProgressiveProductImage
                    src={prod.imagen_principal}
                    alt={prod.nombre}
                    preset="card"
                    objectFit="cover"
                    sizes="(max-width: 768px) 46vw, 25vw"
                    className="object-top group-hover:scale-105 duration-500"
                    fallbackLabel="Sin Imagen"
                  />
                  {badgeType === 'trending' && (prod.visitas ?? 0) > 0 && (
                    <span className="absolute top-2.5 left-2.5 z-10 bg-black/70 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Popular
                    </span>
                  )}
                  {badgeType === 'recommended' && prod.nuevo && (
                    <span className="absolute top-2.5 left-2.5 z-10 bg-emerald-700 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {config?.mostrar_sku && prod.sku_base && (
                      <span className="text-[10px] font-mono text-muted-foreground uppercase truncate">
                        {prod.sku_base}
                      </span>
                    )}
                    {stockInfo && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          stockInfo.disponible
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {stockInfo.textoCorto}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs md:text-sm font-semibold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {prod.nombre}
                  </h3>
                  {showPrice && precio ? (
                    <span className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                      {formatearPrecio(precio, config!)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic mt-1 block">
                      Consultar precio
                    </span>
                  )}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
