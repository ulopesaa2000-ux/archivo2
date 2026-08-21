// app/(store)/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchProductosWebPublicos, fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { fetchBannerCategoriaActivo } from '@/modules/ecommerce/banners'
import { 
  ArrowRight, 
  Heart, 
  Sparkles, 
  Shirt, 
  Crown, 
  Flame, 
  Baby, 
  Zap, 
  Layers, 
  ShieldCheck,
  User,
  Users
} from 'lucide-react'
import type { Metadata } from 'next'

import { LiveStoreEditorProvider } from '@/components/store/editor/LiveStoreEditorContext'
import { QuickEditButton } from '@/components/store/editor/QuickEditButton'
import { StoreQuickEditorToolbar } from '@/components/store/editor/StoreQuickEditorToolbar'
import { LiveEditDrawer } from '@/components/store/editor/LiveEditDrawer'
import { SkuPill } from '@/components/store/SkuPill'
import { 
  parseStoreConfig, 
  getTitleSizeClass, 
  getSubtitleSizeClass 
} from '@/lib/utils/storeConfig'

export const metadata: Metadata = {
  title: 'Idol Navy | Moda que te define - Colección 2026',
  description: 'Descubre nuestra exclusiva colección de moda Idol Navy 2026. Chamarras, rompevientos, chalecos y conjuntos diseñados con los mejores materiales. Calidad y estilo en cada prenda.',
  openGraph: {
    title: 'Idol Navy | Moda que te define',
    description: 'Explora nuestra colección 2026 de moda exclusiva Idol Navy. Calidad y diseño en un solo lugar.',
    images: ['/og-image.jpg'],
  }
}

async function DestacadosSection({ title, titleSize, subtitle, subtitleSize }: {
  title: string
  titleSize: string
  subtitle: string
  subtitleSize: string
}) {
  const { productos: destacados } = await fetchProductosWebPublicos({ destacado: true, page: 1 })
  const top4 = destacados.slice(0, 4)

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 relative border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`font-serif text-foreground dark:text-gray-100 ${getTitleSizeClass(titleSize)}`}>
              {title}
            </span>
            <QuickEditButton section="destacados" label="Destacados" />
          </div>
          <p className={`text-muted-foreground dark:text-gray-400 mt-1 ${getSubtitleSizeClass(subtitleSize)}`}>
            {subtitle}
          </p>
        </div>
        <Link
          href="/shop?destacado=true"
          className="text-[12px] md:text-[14px] text-emerald-700 dark:text-emerald-400 font-semibold tracking-[0.03em] hover:underline flex items-center gap-1 transition-all duration-300 group shrink-0"
        >
          Ver todo el catálogo
          <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {top4.map((prod) => (
          <Link
            href={`/shop/${prod.slug}`}
            key={prod.id}
            className="bg-card dark:bg-zinc-900 rounded-2xl overflow-hidden block group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border dark:border-zinc-800"
          >
            <div className="relative aspect-[3/4] bg-muted dark:bg-zinc-800 overflow-hidden">
              {prod.imagen_principal ? (
                <Image
                  src={prod.imagen_principal}
                  alt={prod.nombre}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Sin Imagen
                </div>
              )}

              <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Destacado
              </div>
            </div>

            <div className="p-3.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block truncate">
                {prod.sku_base}
              </span>
              <h4 className="text-xs md:text-sm font-semibold text-foreground dark:text-gray-100 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                {prod.nombre}
              </h4>
              {prod.precio_publico && (
                <span className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                  ${prod.precio_publico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DestacadosSkeleton() {
  return (
    <div className="px-4 md:px-8 py-8 md:py-12 animate-pulse">
      <div className="h-7 w-64 bg-muted rounded mb-2" />
      <div className="h-4 w-96 bg-muted rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

async function HomePageContent() {
  const bannerDama = await fetchBannerCategoriaActivo({ generoId: 1 })
  const bannerCaballero = await fetchBannerCategoriaActivo({ generoId: 2 })
  const rawConfig = await fetchConfigEcommerce()
  const storeConfig = parseStoreConfig(rawConfig?.mensaje_precio_variable)

  return (
    <div className="bg-background dark:bg-zinc-950 pb-12 transition-colors">
      {/* 1. HERO SECTION / BIENVENIDA */}
      <div className="relative pt-10 md:pt-16 pb-12 md:pb-16 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center bg-background dark:bg-zinc-950 border-b border-border">
        <div className="absolute top-4 right-4 z-20">
          <QuickEditButton section="hero" label="Hero / Bienvenida" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-card dark:bg-zinc-900 px-3.5 py-1.5 rounded-full mb-6 border border-border shadow-xs">
            <span className="text-[10px] tracking-[0.15em] uppercase text-emerald-700 dark:text-emerald-400 font-bold">
              {storeConfig.heroBadge}
            </span>
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
          </div>

          <h1 className={`font-serif text-foreground dark:text-gray-100 mb-6 font-bold leading-[1.15] ${getTitleSizeClass(storeConfig.heroTitleSize)}`}>
            {storeConfig.heroTitle}
          </h1>

          <p className={`text-muted-foreground dark:text-gray-300 leading-[1.7] mb-8 ${getSubtitleSizeClass(storeConfig.heroDescriptionSize)}`}>
            {storeConfig.heroDescription}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop?genero=dama"
              className="bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-7 rounded-xl text-[14px] font-semibold tracking-[0.02em] transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-2"
            >
              <span>Colección Dama</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/shop?genero=caballero"
              className="bg-zinc-900 dark:bg-zinc-800 text-white py-3 px-7 rounded-xl text-[14px] font-semibold hover:bg-black transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <span>Colección Caballero</span>
              <ArrowRight className="h-4 w-4" />
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

            <Link
              href="/shop?genero=dama"
              className="absolute inset-x-0 bottom-0 h-28 flex flex-col justify-end text-center p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10 transition-all"
            >
              <span className="text-white text-base font-bold drop-shadow-md">
                {bannerDama?.titulo_banner || 'Colección Dama'}
              </span>
            </Link>

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

            <Link
              href="/shop?genero=caballero"
              className="absolute inset-x-0 bottom-0 h-28 flex flex-col justify-end text-center p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10 transition-all"
            >
              <span className="text-white text-base font-bold drop-shadow-md">
                {bannerCaballero?.titulo_banner || 'Colección Caballero'}
              </span>
            </Link>

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

      {/* 2. EXPLORA POR CATEGORÍA SECTION */}
      <div className="px-4 md:px-8 py-10 md:py-14 border-b border-border relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mb-6 gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className={`font-serif text-foreground dark:text-gray-100 ${getTitleSizeClass(storeConfig.exploraTitleSize)}`}>
                {storeConfig.exploraTitle}
              </span>
              <QuickEditButton section="explora_categoria" label="Explora por Categoría" />
            </div>
            <p className={`text-muted-foreground dark:text-gray-300 mt-2 leading-relaxed ${getSubtitleSizeClass(storeConfig.exploraCategoriaSize)}`}>
              {storeConfig.exploraCategoria}
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
      </div>

      {/* 3. CATÁLOGO POR LÍNEAS / CUADROS DE CATEGORÍA CON ICONOS (DAMA, CABALLERO E INFANTIL) */}
      <div className="px-4 md:px-8 py-10 md:py-14 border-b border-border relative">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className={`font-serif text-foreground dark:text-gray-100 ${getTitleSizeClass(storeConfig.categoriasGridTitleSize)}`}>
                {storeConfig.categoriasGridTitle}
              </span>
              <QuickEditButton section="categorias_grid" label="Catálogo por Líneas" />
            </div>
            <p className={`text-muted-foreground dark:text-gray-400 mt-1 ${getSubtitleSizeClass(storeConfig.categoriasGridSubtitleSize)}`}>
              {storeConfig.categoriasGridSubtitle}
            </p>
          </div>
        </div>

        {/* Bloque 1: Categoría Dama */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-card to-card dark:from-emerald-950/40 dark:via-zinc-900/60 dark:to-zinc-900 border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-700 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span>Línea Dama</span>
                <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  7 Categorías
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { name: 'Chamarras', href: '/shop?genero=dama&tipo=chamarras', icon: Shirt },
              { name: 'Rompevientos', href: '/shop?genero=dama&tipo=rompevientos', icon: Zap },
              { name: 'Chalecos', href: '/shop?genero=dama&tipo=chalecos', icon: Layers },
              { name: 'Conjuntos', href: '/shop?genero=dama&tipo=sets-deportivos', icon: Sparkles },
              { name: 'Suéter', href: '/shop?genero=dama&tipo=sueter', icon: Heart },
              { name: 'Sudaderas', href: '/shop?genero=dama&tipo=sudaderas', icon: Flame },
              { name: 'Abrigos', href: '/shop?genero=dama&tipo=abrigos', icon: ShieldCheck }
            ].map((sub) => {
              const IconComp = sub.icon
              return (
                <Link
                  key={sub.name}
                  href={sub.href}
                  className="group bg-card dark:bg-zinc-950 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-600 text-foreground dark:text-gray-200 border border-border dark:border-zinc-800 rounded-xl p-3.5 text-center transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <IconComp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                  <span className="text-xs font-semibold block">{sub.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bloque 2: Categoría Caballero */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-card to-card dark:from-amber-950/40 dark:via-zinc-900/60 dark:to-zinc-900 border border-amber-500/20 dark:border-amber-500/30 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span>Línea Caballero</span>
                <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  4 Categorías
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Rompevientos', href: '/shop?genero=caballero&tipo=rompevientos', icon: Zap },
              { name: 'Chamarras', href: '/shop?genero=caballero&tipo=chamarras', icon: Shirt },
              { name: 'Chalecos', href: '/shop?genero=caballero&tipo=chalecos', icon: Layers },
              { name: 'Sudaderas', href: '/shop?genero=caballero&tipo=sudaderas', icon: Flame }
            ].map((sub) => {
              const IconComp = sub.icon
              return (
                <Link
                  key={sub.name}
                  href={sub.href}
                  className="group bg-card dark:bg-zinc-950 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-foreground dark:text-gray-200 border border-border dark:border-zinc-800 rounded-xl p-3.5 text-center transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <IconComp className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:text-white transition-colors" />
                  <span className="text-xs font-semibold block">{sub.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bloque 3: Línea Infantil / Novedades General */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/20 via-card to-card dark:from-violet-950/40 dark:via-zinc-900/60 dark:to-zinc-900 border border-violet-500/20 dark:border-violet-500/30 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-xs">
              <Baby className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                <span>Línea Infantil & Novedades</span>
                <span className="text-[10px] font-semibold text-violet-600/80 dark:text-violet-300/80 bg-violet-500/10 px-2 py-0.5 rounded-full">
                  3 Categorías
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Chamarras Niños', href: '/shop?tipo=chamarras-ninos', icon: Baby },
              { name: 'Conjuntos Infantil', href: '/shop?tipo=conjuntos-infantil', icon: Sparkles },
              { name: 'Novedades & Accesorios', href: '/shop?tipo=novedades', icon: Zap }
            ].map((sub) => {
              const IconComp = sub.icon
              return (
                <Link
                  key={sub.name}
                  href={sub.href}
                  className="group bg-card dark:bg-zinc-950 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 text-foreground dark:text-gray-200 border border-border dark:border-zinc-800 rounded-xl p-3.5 text-center transition-all duration-300 shadow-xs hover:shadow-lg flex items-center justify-center gap-3 hover:-translate-y-0.5"
                >
                  <IconComp className="h-5 w-5 text-violet-600 dark:text-violet-400 group-hover:text-white transition-colors" />
                  <span className="text-xs font-semibold block">{sub.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. PRÓXIMAS LLEGADAS / DESTACADOS */}
      <Suspense fallback={<DestacadosSkeleton />}>
        <DestacadosSection
          title={storeConfig.destacadosTitle}
          titleSize={storeConfig.destacadosTitleSize}
          subtitle={storeConfig.destacadosSubtitle}
          subtitleSize={storeConfig.destacadosSubtitleSize}
        />
      </Suspense>

      {/* 5. SECCIÓN DE CONTACTOS DIRECTOS POR REGIÓN */}
      <div id="contactos" className="relative mx-4 md:mx-8 mt-10 p-6 md:p-8 bg-card dark:bg-zinc-900 rounded-2xl border border-border shadow-sm text-card-foreground">
        <div className="absolute top-4 right-4 z-20">
          <QuickEditButton section="contactos_regionales" label="Contactos Regionales" />
        </div>

        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className={`font-serif text-foreground dark:text-gray-100 font-bold mb-2 ${getTitleSizeClass(storeConfig.contactosTitleSize)}`}>
            {storeConfig.contactosTitle}
          </h2>
          <p className={`text-muted-foreground dark:text-gray-300 ${getSubtitleSizeClass(storeConfig.contactosSubtitleSize)}`}>
            {storeConfig.contactosSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border hover:border-emerald-500/30 transition-colors">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Daniel (Centro)</h4>
            <a href="https://wa.me/522481250472" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">248 125 0472</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border hover:border-emerald-500/30 transition-colors">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Javier (Tulancingo)</h4>
            <a href="https://wa.me/525615495410" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">56 1549 5410</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border hover:border-emerald-500/30 transition-colors">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Carlos (Moroleón)</h4>
            <a href="https://wa.me/525539356156" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">55 3935 6156</a>
          </div>

          <div className="p-4 rounded-xl bg-background dark:bg-zinc-950 border border-border hover:border-emerald-500/30 transition-colors">
            <h4 className="text-sm font-bold text-foreground dark:text-gray-100">Juan (San Martín, Toluca, Chiconcuac)</h4>
            <a href="https://wa.me/522481251671" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline block mt-1">248 125 1671</a>
          </div>
        </div>
      </div>

      {/* 6. BANNER DE AGRADECIMIENTO FOOTER / COMUNIDAD */}
      <div className="relative mx-4 md:mx-8 mt-6 p-6 md:p-8 bg-gradient-to-r from-emerald-900/10 via-emerald-800/15 to-zinc-900/10 dark:from-emerald-950/40 dark:via-zinc-900/80 dark:to-emerald-950/30 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs text-center overflow-hidden group">
        <div className="absolute top-3 right-3 z-20">
          <QuickEditButton section="footer_agradecimiento" label="Mensaje de Agradecimiento" />
        </div>

        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current animate-pulse text-emerald-600 dark:text-emerald-400" />
            <span>Nuestra Comunidad</span>
          </div>

          <p className={`text-foreground dark:text-gray-100 font-serif leading-relaxed ${getSubtitleSizeClass(storeConfig.footerAgradecimientoSize)}`}>
            {storeConfig.footerAgradecimiento}
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
