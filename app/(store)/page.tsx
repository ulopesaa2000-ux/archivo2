import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchProductosWebPublicos, fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { fetchBannerCategoriaActivo } from '@/modules/ecommerce/banners'
import { ArrowRight, Heart } from 'lucide-react'
import type { Metadata } from 'next'

import { LiveStoreEditorProvider } from '@/components/store/editor/LiveStoreEditorContext'
import { QuickEditButton } from '@/components/store/editor/QuickEditButton'
import { StoreQuickEditorToolbar } from '@/components/store/editor/StoreQuickEditorToolbar'
import { LiveEditDrawer } from '@/components/store/editor/LiveEditDrawer'
import { SkuPill } from '@/components/store/SkuPill'

export const metadata: Metadata = {
  title: 'inv-tienda | Moda que te define - Colección 2026',
  description: 'Descubre nuestra exclusiva colección de moda 2026. Chamarra, pants, gorros y accesorios diseñados con los mejores materiales. Calidad y estilo en cada prenda.',
  openGraph: {
    title: 'inv-tienda | Moda que te define',
    description: 'Explora nuestra colección 2026 de moda exclusiva. Calidad y diseño en un solo lugar.',
    images: ['/og-image.jpg'],
  }
}

async function DestacadosSection() {
  const { productos: destacados } = await fetchProductosWebPublicos({ destacado: true, page: 1 })
  const top4 = destacados.slice(0, 4)

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 relative">
      <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
        <div>
          <span className="font-serif text-[24px] md:text-[28px] text-foreground dark:text-gray-100 font-bold">Próximas Llegadas / Destacados</span>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Explora las prendas destacadas de la nueva temporada</p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <QuickEditButton section="destacados" label="Destacados" />
          <Link
            href="/shop?destacado=true"
            className="text-[12px] md:text-[14px] text-emerald-700 dark:text-emerald-400 font-semibold tracking-[0.03em] hover:underline flex items-center gap-1 transition-all duration-300 group"
          >
            Ver todo el catálogo
            <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {top4.map((prod) => (
          <Link
            href={`/shop/${prod.slug}`}
            key={prod.id}
            className="bg-card dark:bg-zinc-900 rounded-xl overflow-hidden block group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border dark:border-zinc-800"
          >
            <div className="relative aspect-[3/4] bg-muted dark:bg-zinc-800 overflow-hidden">
              <div className="absolute inset-0" style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 12px,
                  rgba(0,0,0,0.015) 12px,
                  rgba(0,0,0,0.015) 13px
                )`
              }}></div>

              {prod.imagen_principal ? (
                <Image
                  src={prod.imagen_principal}
                  alt={prod.nombre || prod.sku_base || 'Fotografía del producto'}
                  fill
                  className="object-contain p-1 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm font-medium">1080 × 1440</span>
                </div>
              )}

              <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                {prod.nuevo && (
                  <span className="bg-[#2D5A3D] text-white text-[9px] font-semibold py-1.5 px-3 rounded-full shadow-lg">
                    Nuevo
                  </span>
                )}
                {prod.en_oferta && !prod.nuevo && (
                  <span className="bg-[#B35A3E] text-white text-[9px] font-semibold py-1.5 px-3 rounded-full shadow-lg">
                    -Oferta
                  </span>
                )}
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center">
                <span className="text-white text-xs font-semibold uppercase tracking-wider bg-black/60 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-xs">
                  Ver detalle
                </span>
              </div>
            </div>

            <div className="p-4 bg-card dark:bg-zinc-900">
              <div className="text-[11px] text-muted-foreground dark:text-gray-400 tracking-[0.05em] uppercase mb-1.5 font-medium truncate">
                {prod.marca || 'IDOL NAVY'}
              </div>
              <h3 className="text-[14px] md:text-[15px] text-foreground dark:text-gray-100 font-semibold mb-2 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {prod.nombre}
              </h3>

              <div className="flex items-baseline gap-2">
                {prod.precio_oferta || prod.precio_publico ? (
                  <>
                    <span className="text-[16px] text-foreground dark:text-gray-100 font-bold">
                      ${(prod.precio_oferta || prod.precio_publico)?.toFixed(2)}
                    </span>
                    {prod.precio_oferta && prod.precio_publico && (
                      <span className="text-[13px] text-muted-foreground line-through font-normal">
                        ${prod.precio_publico.toFixed(2)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] italic font-normal text-muted-foreground dark:text-gray-400">
                    Consultar precio
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DestacadosSkeleton() {
  return (
    <div className="px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card dark:bg-zinc-900 rounded-xl overflow-hidden aspect-[3/4] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

async function HomePageContent() {
  const bannerDama = await fetchBannerCategoriaActivo({ generoId: 1 })
  const bannerCaballero = await fetchBannerCategoriaActivo({ generoId: 2 })
  const config = await fetchConfigEcommerce()

  let exploraCategoriaMsg = 'Explora cada una de nuestras opciones y descubre los diseños que mejor se adapten a tu personalidad. Nos esforzamos por brindarte productos de excelente calidad y una atención cercana para que tu experiencia sea la mejor.'
  let exploraCategoriaSize = 'normal'

  let footerAgradecimientoMsg = '¡Gracias por confiar en nosotros y ser parte de nuestra comunidad!'
  let footerAgradecimientoSize = 'large'

  if (config?.mensaje_precio_variable) {
    try {
      const parsed = JSON.parse(config.mensaje_precio_variable)
      if (parsed.explora_categoria) exploraCategoriaMsg = parsed.explora_categoria
      if (parsed.explora_categoria_size) exploraCategoriaSize = parsed.explora_categoria_size
      if (parsed.footer_agradecimiento) footerAgradecimientoMsg = parsed.footer_agradecimiento
      if (parsed.footer_agradecimiento_size) footerAgradecimientoSize = parsed.footer_agradecimiento_size
    } catch {
      // Usar texto por defecto
    }
  }

  return (
    <div className="bg-background dark:bg-zinc-950 pb-12 transition-colors">
      {/* Hero Section estilo Bienvenida */}
      <div className="relative pt-12 md:pt-16 pb-12 md:pb-16 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center bg-background dark:bg-zinc-950 border-b border-border">
        <div className="absolute top-4 right-4 z-20">
          <QuickEditButton section="hero" label="Hero / Bienvenida" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-card dark:bg-zinc-900 px-3.5 py-1.5 rounded-full mb-6 border border-border shadow-xs">
            <span className="text-[10px] tracking-[0.15em] uppercase text-emerald-700 dark:text-emerald-400 font-bold">
              Bienvenido a Catálogo IDOL NAVY
            </span>
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
          </div>

          <h1 className="font-serif text-[34px] md:text-[46px] lg:text-[52px] leading-[1.15] text-foreground dark:text-gray-100 mb-6 font-bold">
            Estilo, Calidad y <br />
            <em className="italic text-emerald-700 dark:text-emerald-400">Comodidad Exclusiva</em>
          </h1>

          <p className="text-[14px] md:text-[16px] text-muted-foreground dark:text-gray-300 leading-[1.7] mb-8">
            Nos alegra que formes parte de esta experiencia. Aquí encontrarás nuestra colección diseñada para ofrecerte prendas de alta gama que combinan diseño y durabilidad para cada ocasión.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop?genero=dama"
              className="bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-7 rounded-lg text-[14px] font-semibold tracking-[0.02em] transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              Colección Dama
            </Link>
            <Link
              href="/shop?genero=caballero"
              className="bg-zinc-900 dark:bg-zinc-800 text-white py-3 px-7 rounded-lg text-[14px] font-semibold hover:bg-black transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Colección Caballero
            </Link>
          </div>
        </div>

        {/* Muestra de Cuadros en 3:4 con producto o banner asignado */}
        <div className="grid grid-cols-2 gap-4 relative">
          {/* Tarjeta Colección Dama */}
          <div className="relative aspect-[3/4] bg-card dark:bg-zinc-900 rounded-2xl overflow-hidden border border-border shadow-md group">
            {bannerDama?.imagen_url ? (
              <Image
                src={bannerDama.imagen_url}
                alt={bannerDama.titulo_banner || 'Portada Colección Dama'}
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-black" />
            )}

            <div className="absolute top-3 left-3 bg-emerald-700 text-white text-[10px] font-bold py-1 px-3 rounded-full z-10 shadow-md">
              DAMA
            </div>
            <div className="absolute top-3 right-3 z-20">
              <QuickEditButton section="coleccion_dama" label="Colección Dama" />
            </div>
            {/* Link grande → categoría dama (sombra únicamente en la parte inferior para legibilidad) */}
            <Link
              href="/shop?genero=dama"
              className="absolute inset-x-0 bottom-0 h-28 flex flex-col justify-end text-center p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10 transition-all"
            >
              <span className="text-white text-base font-bold drop-shadow-md">
                {bannerDama?.titulo_banner || 'Colección Dama'}
              </span>
            </Link>
            {/* SKU del producto → link individual al producto */}
            {bannerDama?.producto_sku && bannerDama?.producto_slug && (
              <SkuPill
                href={`/shop/${bannerDama.producto_slug}`}
                sku={bannerDama.producto_sku}
                color="emerald"
              />
            )}
          </div>

          {/* Tarjeta Colección Caballero */}
          <div className="relative aspect-[3/4] bg-card dark:bg-zinc-900 rounded-2xl overflow-hidden border border-border shadow-md group">
            {bannerCaballero?.imagen_url ? (
              <Image
                src={bannerCaballero.imagen_url}
                alt={bannerCaballero.titulo_banner || 'Portada Colección Caballero'}
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
            )}

            <div className="absolute top-3 left-3 bg-zinc-900 text-white text-[10px] font-bold py-1 px-3 rounded-full z-10 shadow-md border border-zinc-700">
              CABALLERO
            </div>
            <div className="absolute top-3 right-3 z-20">
              <QuickEditButton section="coleccion_caballero" label="Colección Caballero" />
            </div>
            {/* Link grande → categoría caballero (sombra únicamente en la parte inferior para legibilidad) */}
            <Link
              href="/shop?genero=caballero"
              className="absolute inset-x-0 bottom-0 h-28 flex flex-col justify-end text-center p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10 transition-all"
            >
              <span className="text-white text-base font-bold drop-shadow-md">
                {bannerCaballero?.titulo_banner || 'Colección Caballero'}
              </span>
            </Link>
            {/* SKU del producto → link individual al producto */}
            {bannerCaballero?.producto_sku && bannerCaballero?.producto_slug && (
              <SkuPill
                href={`/shop/${bannerCaballero.producto_slug}`}
                sku={bannerCaballero.producto_sku}
                color="amber"
              />
            )}
          </div>
        </div>
      </div>

      {/* Categorías Principales */}
      <div className="px-4 md:px-8 py-10 md:py-14 border-b border-border relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mb-8 gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-serif text-[24px] md:text-[28px] text-foreground dark:text-gray-100 font-bold">Explora por Categoría</span>
              <QuickEditButton section="explora_categoria" label="Explora por Categoría" />
            </div>
            <p className={`text-muted-foreground dark:text-gray-300 mt-2 leading-relaxed ${
              exploraCategoriaSize === 'small'
                ? 'text-[11px] md:text-xs'
                : exploraCategoriaSize === 'large'
                ? 'text-sm md:text-base font-medium text-foreground dark:text-gray-200'
                : 'text-xs md:text-sm'
            }`}>
              {exploraCategoriaMsg}
            </p>
          </div>
          <Link
            href="/shop"
            className="text-[12px] md:text-[14px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 transition-all duration-300 group shrink-0"
          >
            Ver catálogo completo
            <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Subcategorías Dama */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-4">Categoría Dama</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { name: 'Chamarras', href: '/shop?genero=dama&tipo=chamarras' },
              { name: 'Rompevientos', href: '/shop?genero=dama&tipo=rompevientos' },
              { name: 'Chalecos', href: '/shop?genero=dama&tipo=chalecos' },
              { name: 'Conjuntos', href: '/shop?genero=dama&tipo=sets-deportivos' },
              { name: 'Suéter', href: '/shop?genero=dama&tipo=sueter' },
              { name: 'Sudaderas', href: '/shop?genero=dama&tipo=sudaderas' },
              { name: 'Abrigos', href: '/shop?genero=dama&tipo=abrigos' }
            ].map((sub) => (
              <Link
                key={sub.name}
                href={sub.href}
                className="bg-card dark:bg-zinc-900 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-600 text-foreground dark:text-gray-200 border border-border dark:border-zinc-800 rounded-lg p-3 text-center transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <span className="text-xs font-semibold block">{sub.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Subcategorías Caballero */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-gray-200 mb-4">Categoría Caballero</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Rompevientos', href: '/shop?genero=caballero&tipo=rompevientos' },
              { name: 'Chamarras', href: '/shop?genero=caballero&tipo=chamarras' },
              { name: 'Chalecos', href: '/shop?genero=caballero&tipo=chalecos' },
              { name: 'Sudaderas', href: '/shop?genero=caballero&tipo=sudaderas' }
            ].map((sub) => (
              <Link
                key={sub.name}
                href={sub.href}
                className="bg-card dark:bg-zinc-900 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-800 text-foreground dark:text-gray-200 border border-border dark:border-zinc-800 rounded-lg p-3 text-center transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <span className="text-xs font-semibold block">{sub.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Próximas Llegadas / Destacados */}
      <Suspense fallback={<DestacadosSkeleton />}>
        <DestacadosSection />
      </Suspense>

      {/* Sección de Contactos Directos por Región */}
      <div id="contactos" className="relative mx-4 md:mx-8 mt-8 p-8 bg-card dark:bg-zinc-900 rounded-2xl border border-border shadow-sm text-card-foreground">
        <div className="absolute top-4 right-4 z-20">
          <QuickEditButton section="contactos_regionales" label="Contactos Regionales" />
        </div>

        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="font-serif text-[24px] md:text-[28px] text-foreground dark:text-gray-100 font-bold mb-2">Atención Personalizada y Contactos</h2>
          <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-300">
            Si necesitas más información sobre algún modelo, tallas, colores o disponibilidad, consulta con tu distribuidor autorizado de tu región.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Daniel (Centro)</h4>
            <a href="tel:2481250472" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">248 125 0472</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Javier (Tulancingo)</h4>
            <a href="tel:5615495410" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">56 1549 5410</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Carlos (Moroleón)</h4>
            <a href="tel:5539356156" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">55 3935 6156</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Juan (San Martín, Toluca, Chiconcuac)</h4>
            <a href="tel:248125167" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">248 125 167</a>
          </div>
        </div>
      </div>

      {/* Banner de Agradecimiento Footer / Comunidad */}
      <div className="relative mx-4 md:mx-8 mt-6 p-6 md:p-8 bg-gradient-to-r from-emerald-900/10 via-emerald-800/15 to-zinc-900/10 dark:from-emerald-950/40 dark:via-zinc-900/80 dark:to-emerald-950/30 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs text-center overflow-hidden group">
        <div className="absolute top-3 right-3 z-20">
          <QuickEditButton section="footer_agradecimiento" label="Mensaje de Agradecimiento" />
        </div>

        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current animate-pulse text-emerald-600 dark:text-emerald-400" />
            <span>Nuestra Comunidad</span>
          </div>

          <p className={`text-foreground dark:text-gray-100 font-serif leading-relaxed ${
            footerAgradecimientoSize === 'small'
              ? 'text-xs md:text-sm font-medium'
              : footerAgradecimientoSize === 'normal'
              ? 'text-sm md:text-lg font-semibold'
              : 'text-base md:text-2xl lg:text-3xl font-bold tracking-tight text-emerald-900 dark:text-emerald-200'
          }`}>
            {footerAgradecimientoMsg}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <LiveStoreEditorProvider>
      <Suspense fallback={<DestacadosSkeleton />}>
        <HomePageContent />
      </Suspense>
      <StoreQuickEditorToolbar />
      <LiveEditDrawer />
    </LiveStoreEditorProvider>
  )
}
