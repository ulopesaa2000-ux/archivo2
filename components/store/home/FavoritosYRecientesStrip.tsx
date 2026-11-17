// components/store/home/FavoritosYRecientesStrip.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, History, ArrowRight } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { RECENT_PRODUCTS_KEY } from '@/components/store/producto/RecentProductTracker'
import { publicFetchProductosWebByIdsAction } from '@/modules/ecommerce/actions/public-reads'
import { ProgressiveProductImage } from '@/components/shared/ProgressiveProductImage'
import { FavoriteButton } from '@/components/store/producto/FavoriteButton'
import type { ConfigEcommerce, ProductoWebPublico } from '@/modules/ecommerce/types'
import { mostrarPrecio, formatearPrecio, getPrecioAMostrar } from '@/modules/ecommerce/utils'

export function FavoritosYRecientesStrip({ config }: { config: ConfigEcommerce | null }) {
  const { ids: favoriteIds, isHydrated } = useFavorites()
  const [productos, setProductos] = useState<ProductoWebPublico[]>([])
  const [favSet, setFavSet] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!isHydrated) return

    let recentIds: number[] = []
    try {
      const raw = localStorage.getItem(RECENT_PRODUCTS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        recentIds = parsed.filter((id) => Number.isInteger(id) && id > 0)
      }
    } catch {
      recentIds = []
    }

    const combinedIds = Array.from(new Set([...favoriteIds, ...recentIds])).slice(0, 10)
    setFavSet(new Set(favoriteIds))

    if (combinedIds.length === 0) {
      setProductos([])
      return
    }

    let cancelled = false
    publicFetchProductosWebByIdsAction(combinedIds).then((res) => {
      if (!cancelled) setProductos(res)
    }).catch(() => {
      if (!cancelled) setProductos([])
    })

    return () => {
      cancelled = true
    }
  }, [favoriteIds, isHydrated])

  if (!isHydrated || productos.length === 0) {
    return null
  }

  return (
    <section className="px-4 md:px-8 py-7 border-b border-border bg-emerald-950/[0.02] dark:bg-zinc-900/30">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <h2 className="font-serif text-lg md:text-xl font-bold text-foreground">
            Tus Favoritos y Vistos Recientemente
          </h2>
        </div>
        {favoriteIds.length > 0 && (
          <Link
            href="/favoritos"
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>Ver favoritos ({favoriteIds.length})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {productos.map((prod) => {
          const showPrice = config ? mostrarPrecio(prod, config) : false
          const { precio } = config ? getPrecioAMostrar(prod, config) : { precio: null }
          const isFav = favSet.has(prod.id)

          return (
            <div
              key={prod.id}
              className="w-40 sm:w-44 shrink-0 snap-start bg-card dark:bg-zinc-900 rounded-xl overflow-hidden border border-border relative group hover:shadow-md transition-all"
            >
              <div className="absolute top-2 right-2 z-20">
                <FavoriteButton productoWebId={prod.id} nombre={prod.nombre} />
              </div>

              <Link href={`/shop/${prod.slug}`} className="block">
                <div className="relative aspect-[3/4] bg-muted dark:bg-zinc-800 overflow-hidden">
                  <ProgressiveProductImage
                    src={prod.imagen_principal}
                    alt={prod.nombre}
                    preset="card"
                    objectFit="cover"
                    sizes="180px"
                    className="object-top group-hover:scale-105 duration-300"
                    fallbackLabel="Sin Imagen"
                  />
                  <span className="absolute bottom-2 left-2 z-10 bg-black/65 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                    {isFav ? 'Favorito' : 'Visto'}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-semibold text-foreground line-clamp-1">
                    {prod.nombre}
                  </div>
                  {showPrice && precio ? (
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatearPrecio(precio, config!)}
                    </div>
                  ) : null}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
