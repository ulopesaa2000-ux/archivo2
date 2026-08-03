import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchProductosWebPublicos } from '@/modules/ecommerce/queries'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

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
    <div className="px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
        <div>
          <span className="font-serif text-[24px] md:text-[28px] text-[#1A1C1A]">Próximas Llegadas / Destacados</span>
          <p className="text-xs text-[#8C8C8C] mt-1">Explora las prendas destacadas de la nueva temporada</p>
        </div>
        <Link
          href="/shop?destacado=true"
          className="text-[12px] md:text-[14px] text-[#2D5A3D] font-semibold tracking-[0.03em] hover:underline flex items-center gap-1 transition-all duration-300 group mt-2 sm:mt-0"
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
            className="bg-[#FFFFFF] rounded-xl overflow-hidden block group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-[#2D5A3D]/10"
          >
            {/* Product image container con proporción 3:4 (1080x1440) */}
            <div className="relative aspect-[3/4] bg-[#F4F4F1] overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0" style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 12px,
                  rgba(0,0,0,0.015) 12px,
                  rgba(0,0,0,0.015) 13px
                )`
              }}></div>

              {/* Image */}
              {prod.imagen_principal ? (
                <Image
                  src={prod.imagen_principal}
                  alt={prod.nombre}
                  fill
                  className="object-contain p-1 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#8C8C8C] text-sm font-medium">1080 × 1440</span>
                </div>
              )}

              {/* Badges */}
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

              {/* Quick view overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center">
                <span className="text-white text-xs font-semibold uppercase tracking-wider bg-black/60 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-xs">
                  Ver detalle
                </span>
              </div>
            </div>

            {/* Product info */}
            <div className="p-4 bg-[#FFFFFF]">
              <div className="text-[11px] text-[#8C8C8C] tracking-[0.05em] uppercase mb-1.5 font-medium truncate">
                {prod.marca || 'IDOL NAVY'}
              </div>
              <h3 className="text-[14px] md:text-[15px] text-[#1A1C1A] font-semibold mb-2 line-clamp-1 group-hover:text-[#2D5A3D] transition-colors">
                {prod.nombre}
              </h3>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                {prod.precio_oferta || prod.precio_publico ? (
                  <>
                    <span className="text-[16px] text-[#1A1C1A] font-bold">
                      ${(prod.precio_oferta || prod.precio_publico)?.toFixed(2)}
                    </span>
                    {prod.precio_oferta && prod.precio_publico && (
                      <span className="text-[13px] text-[#8C8C8C] line-through font-normal">
                        ${prod.precio_publico.toFixed(2)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] italic font-normal text-[#8C8C8C]">
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
          <div key={i} className="bg-[#FFFFFF] rounded-xl overflow-hidden aspect-[3/4] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="bg-[#F4F4F1] pb-12">
      {/* Hero Section estilo Bienvenida */}
      <div className="pt-12 md:pt-16 pb-12 md:pb-16 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center bg-[#F4F4F1] border-b border-[#2D5A3D]/10">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-[#FFFFFF] px-3.5 py-1.5 rounded-full mb-6 border border-[#2D5A3D]/20 shadow-xs">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#2D5A3D] font-bold">
              Bienvenido a Catálogo IDOL NAVY
            </span>
            <span className="w-1.5 h-1.5 bg-[#2D5A3D] rounded-full animate-pulse"></span>
          </div>

          <h1 className="font-serif text-[34px] md:text-[46px] lg:text-[52px] leading-[1.15] text-[#1A1C1A] mb-6 font-bold">
            Estilo, Calidad y <br />
            <em className="italic text-[#2D5A3D]">Comodidad Exclusiva</em>
          </h1>

          <p className="text-[14px] md:text-[16px] text-[#444444] leading-[1.7] mb-8">
            Nos alegra que formes parte de esta experiencia. Aquí encontrarás nuestra colección diseñada para ofrecerte prendas de alta gama que combinan diseño y durabilidad para cada ocasión.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop?genero=dama"
              className="bg-[#2D5A3D] text-white py-3 px-7 rounded-lg text-[14px] font-semibold tracking-[0.02em] hover:bg-[#1e3a2f] transition-all duration-300 hover:shadow-lg"
            >
              Colección Dama
            </Link>
            <Link
              href="/shop?genero=caballero"
              className="bg-[#1A1C1A] text-white py-3 px-7 rounded-lg text-[14px] font-semibold hover:bg-[#000000] transition-all duration-300 hover:shadow-md"
            >
              Colección Caballero
            </Link>
          </div>
        </div>

        {/* Muestra de Cuadros en 3:4 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[3/4] bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#2D5A3D]/10 shadow-md group">
            <div className="absolute top-3 left-3 bg-[#2D5A3D] text-white text-[10px] font-bold py-1 px-3 rounded-full z-10">
              DAMA
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 flex-col justify-end">
              <span className="text-white text-sm font-bold">Colección Dama</span>
              <span className="text-white/80 text-[11px]">Formato 1080×1440</span>
            </div>
          </div>

          <div className="relative aspect-[3/4] bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#2D5A3D]/10 shadow-md group">
            <div className="absolute top-3 left-3 bg-[#1A1C1A] text-white text-[10px] font-bold py-1 px-3 rounded-full z-10">
              CABALLERO
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 flex-col justify-end">
              <span className="text-white text-sm font-bold">Colección Caballero</span>
              <span className="text-white/80 text-[11px]">Formato 1080×1440</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categorías Principales */}
      <div className="px-4 md:px-8 py-10 md:py-14 border-b border-[#2D5A3D]/10">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
          <div>
            <span className="font-serif text-[24px] md:text-[28px] text-[#1A1C1A] font-bold">Explora por Categoría</span>
            <p className="text-xs text-[#8C8C8C] mt-1">Selecciona la línea de ropa que deseas consultar</p>
          </div>
          <Link
            href="/shop"
            className="text-[12px] md:text-[14px] text-[#2D5A3D] font-semibold hover:underline flex items-center gap-1 transition-all duration-300 group mt-2 sm:mt-0"
          >
            Ver catálogo completo
            <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Subcategorías Dama */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-4">Categoría Dama</h3>
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
                className="bg-[#FFFFFF] hover:bg-[#2D5A3D] hover:text-white text-[#1A1C1A] border border-[#2D5A3D]/20 rounded-lg p-3 text-center transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <span className="text-xs font-semibold block">{sub.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Subcategorías Caballero */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1C1A] mb-4">Categoría Caballero</h3>
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
                className="bg-[#FFFFFF] hover:bg-[#1A1C1A] hover:text-white text-[#1A1C1A] border border-[#1A1C1A]/20 rounded-lg p-3 text-center transition-all duration-200 shadow-xs hover:shadow-md"
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
      <div id="contactos" className="mx-4 md:mx-8 mt-8 p-8 bg-[#FFFFFF] rounded-2xl border border-[#2D5A3D]/15 shadow-sm">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="font-serif text-[24px] md:text-[28px] text-[#1A1C1A] font-bold mb-2">Atención Personalizada y Contactos</h2>
          <p className="text-xs md:text-sm text-[#444444]">
            Si necesitas más información sobre algún modelo, tallas, colores o disponibilidad, consulta con tu distribuidor autorizado de tu región.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-[#F4F4F1] border border-[#2D5A3D]/10">
            <h4 className="text-sm font-bold text-[#1A1C1A]">Daniel (Centro)</h4>
            <a href="tel:2481250472" className="text-xs font-semibold text-[#2D5A3D] hover:underline block mt-1">248 125 0472</a>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F4F1] border border-[#2D5A3D]/10">
            <h4 className="text-sm font-bold text-[#1A1C1A]">Javier (Tulancingo)</h4>
            <a href="tel:5615495410" className="text-xs font-semibold text-[#2D5A3D] hover:underline block mt-1">56 1549 5410</a>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F4F1] border border-[#2D5A3D]/10">
            <h4 className="text-sm font-bold text-[#1A1C1A]">Carlos (Moroleón)</h4>
            <a href="tel:5539356156" className="text-xs font-semibold text-[#2D5A3D] hover:underline block mt-1">55 3935 6156</a>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F4F1] border border-[#2D5A3D]/10">
            <h4 className="text-sm font-bold text-[#1A1C1A]">Juan (San Martín, Toluca, Chiconcuac)</h4>
            <a href="tel:248125167" className="text-xs font-semibold text-[#2D5A3D] hover:underline block mt-1">248 125 167</a>
          </div>
        </div>
      </div>
    </div>
  )
}
