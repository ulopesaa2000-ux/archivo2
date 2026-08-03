// components/store/catalogo/CategoryPromoHero.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ArrowRight, Tag } from 'lucide-react'
import type { CategoriaBannerResuelto } from '@/modules/ecommerce/banners'

interface Props {
  banner: CategoriaBannerResuelto | null
}

export function CategoryPromoHero({ banner }: Props) {
  if (!banner) return null

  // Determinar link de destino: si tiene producto_slug va a /shop/[slug]
  const targetHref = banner.producto_slug
    ? `/shop/${banner.producto_slug}`
    : banner.link_destino || '#productos'

  return (
    <div className="mb-8 relative rounded-2xl overflow-hidden shadow-md border border-store-border group bg-black/90 text-white">
      {/* Banner 16:9 Panorámico */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full">
        <Image
          src={banner.imagen_url}
          alt={banner.titulo_banner || banner.nombre}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />

        {/* Gradiente oscuro para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-10" />

        {/* Overlay con información y llamada a la acción */}
        <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-between z-10 pointer-events-none">
          {/* Badge superior */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2D5A3D] text-white text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Promoción Destacada
            </span>
            {banner.producto_sku && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white/90 text-xs font-mono">
                <Tag className="h-3 w-3" />
                SKU: {banner.producto_sku}
              </span>
            )}
          </div>

          {/* Textos y Botón */}
          <div className="space-y-3 pointer-events-auto max-w-2xl">
            {banner.titulo_banner && (
              <h2 className="font-serif text-2xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md">
                {banner.titulo_banner}
              </h2>
            )}

            {banner.subtitulo_banner && (
              <p className="text-sm md:text-base text-white/90 font-medium drop-shadow-xs max-w-xl">
                {banner.subtitulo_banner}
              </p>
            )}

            <div className="pt-1">
              <Link
                href={targetHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black hover:bg-[#2D5A3D] hover:text-white font-bold text-xs md:text-sm transition-all shadow-md group/btn"
              >
                <span>{banner.producto_slug ? 'Ver Producto en Detalle' : 'Explorar Promoción'}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
