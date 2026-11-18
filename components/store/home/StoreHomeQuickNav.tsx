// components/store/home/StoreHomeQuickNav.tsx
'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Flame, Sparkles, Star, Shirt, Zap, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import { QuickEditButton } from '@/components/store/editor/QuickEditButton'
import type { QuickNavItem } from '@/lib/utils/storeConfig'

function getLeftIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('ofert')) return Flame
  if (l.includes('destac')) return Star
  return Sparkles
}

function getRightIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('rompe')) return Zap
  if (l.includes('chalec')) return Layers
  return Shirt
}

function PillScrollRow({
  children,
  alignRight = false,
}: {
  children: ReactNode
  alignRight?: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [checkOverflow, children])

  const slide = (dir: 'left' | 'right') => {
    const el = rowRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  return (
    <div className="relative flex items-center min-w-0">
      {canLeft && (
        <button
          type="button"
          onClick={() => slide('left')}
          aria-label="Desplazar a la izquierda"
          className="shrink-0 mr-1 h-6 w-6 rounded-full border border-store-border bg-background/95 hover:bg-muted text-foreground flex items-center justify-center shadow-xs transition-colors z-10"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        ref={rowRef}
        onScroll={checkOverflow}
        className="overflow-x-auto scroll-smooth min-w-0 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div
          className={`flex items-center gap-2 w-max mx-auto ${
            alignRight ? 'lg:ml-auto lg:mr-0' : 'lg:mr-auto lg:ml-0'
          }`}
        >
          {children}
        </div>
      </div>

      {canRight && (
        <button
          type="button"
          onClick={() => slide('right')}
          aria-label="Desplazar a la derecha"
          className="shrink-0 ml-1 h-6 w-6 rounded-full border border-store-border bg-background/95 hover:bg-muted text-foreground flex items-center justify-center shadow-xs transition-colors z-10"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function StoreHomeQuickNav({
  izquierda = [],
  derecha = [],
}: {
  izquierda?: QuickNavItem[]
  derecha?: QuickNavItem[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const leftItems = izquierda.filter((i) => i.activo && i.label.trim())
  const rightItems = derecha.filter((i) => i.activo && i.label.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop')
  }

  return (
    <div className="bg-store-surface/90 border-b border-store-border px-4 md:px-8 py-3 relative">
      <div className="absolute top-2 right-2 z-20">
        <QuickEditButton section="barra_rapida" label="Barra Rápida" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-[1fr_minmax(280px,420px)_1fr] items-stretch lg:items-center gap-2.5 lg:gap-4">
        {/* Izquierda: Novedades, Destacados, Ofertas */}
        <PillScrollRow alignRight>
          {leftItems.map((item) => {
            const Icon = getLeftIcon(item.label)
            const isOffer = item.label.toLowerCase().includes('ofert')
            const isStar = item.label.toLowerCase().includes('destac')
            return (
              <Link
                key={item.id}
                href={item.href}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background dark:bg-zinc-900 border border-store-border hover:border-emerald-600/50 text-xs font-medium text-foreground transition-colors"
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isOffer
                      ? 'text-amber-600 dark:text-amber-400'
                      : isStar
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </PillScrollRow>

        {/* Centro: Buscador centrado */}
        <form onSubmit={handleSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar chamarra, rompevientos, SKU..."
            aria-label="Buscar productos en el catálogo"
            className="w-full h-10 pl-10 pr-24 rounded-full bg-background dark:bg-zinc-900 border border-store-border text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
          >
            Buscar
          </button>
        </form>

        {/* Derecha: Solo prendas (Chamarras, Rompevientos, Chalecos, etc.) */}
        <PillScrollRow>
          {rightItems.map((item) => {
            const Icon = getRightIcon(item.label)
            return (
              <Link
                key={item.id}
                href={item.href}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background dark:bg-zinc-900 border border-store-border hover:border-emerald-600/50 text-xs font-medium text-foreground transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-store-ink2" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </PillScrollRow>
      </div>
    </div>
  )
}
