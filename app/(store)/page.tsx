import Link from 'next/link'
import { fetchProductosWebPublicos } from '@/modules/ecommerce/queries'
import { ArrowRight } from 'lucide-react'

export default async function HomePage() {
  // Fetch destacados
  const { productos: destacados } = await fetchProductosWebPublicos({ destacado: true, page: 1 })
  const top4 = destacados.slice(0, 4)

  return (
    <div className="bg-store-bg pb-12">
      {/* Hero Section */}
      <div className="pt-16 md:pt-24 pb-12 md:pb-16 px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center bg-gradient-to-br from-[#f5f2ec] via-[#f0ebe5] to-[#ede8e0] relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(45, 90, 61, 0.03) 40px,
              rgba(45, 90, 61, 0.03) 80px
            )`
          }}></div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full mb-6 border border-store-border/50">
            <span className="text-[10px] tracking-[0.15em] uppercase text-store-accent font-medium">
              Nueva colección 2026
            </span>
            <span className="w-1 h-1 bg-store-accent rounded-full animate-pulse"></span>
          </div>

          <h1 className="font-serif text-[36px] md:text-[48px] lg:text-[56px] leading-[1.1] md:leading-[1.15] text-store-ink mb-6">
            Moda que<br/>
            <em className="italic text-store-accent">te define</em>
          </h1>

          <p className="text-[14px] md:text-[16px] text-store-ink2 leading-[1.7] mb-8 max-w-[380px] md:max-w-[420px]">
            Descubre prendas diseñadas con materiales de exclusivos.
            <br />
            <span className="text-store-accent font-medium">Envío gratis</span> en compras mayores a $100
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/shop"
              className="bg-store-accent text-white border-none py-3 px-8 rounded-lg text-[14px] font-medium tracking-[0.02em] hover:bg-store-accent/90 transition-all duration-300 hover:shadow-lg hover:scale-105 relative overflow-hidden"
            >
              <span className="relative z-10">Ver catálogo</span>
              <div className="absolute inset-0 bg-white/20 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100 origin-left"></div>
            </Link>
            <Link
              href="/shop?nuevo=true"
              className="bg-transparent text-store-ink border-2 border-store-border py-3 px-8 rounded-lg text-[14px] font-medium hover:bg-store-surface transition-all duration-300 hover:shadow-md hover:scale-105"
            >
              Novedades
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="relative bg-gradient-to-br from-[#e8e2d8] to-[#d4ccc0] rounded-2xl h-[320px] md:h-[400px] flex items-center justify-center text-store-ink3 text-xs tracking-[0.05em] uppercase overflow-hidden group">
            {/* Animated overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Pattern overlay */}
            <div className="absolute inset-0" style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 20px,
                rgba(0,0,0,0.02) 20px,
                rgba(0,0,0,0.02) 21px
              )`
            }}></div>

            {/* Badge */}
            <div className="absolute top-4 left-4 bg-store-accent2 text-white text-[10px] font-semibold py-2 px-4 rounded-[4px] tracking-[0.05em] uppercase z-10 shadow-lg animate-bounce">
              Nuevo
            </div>

            {/* Hover text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-lg font-medium text-white drop-shadow-lg">Ver colección</span>
              </div>
            </div>

            {/* Placeholder */}
            <div className="relative z-0">
              <span className="text-lg">Imagen destacada</span>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-store-accent/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-store-accent2/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Categorías */}
      {/* Categorías */}
      <div className="px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
          <span className="font-serif text-[24px] md:text-[28px] mb-4 sm:mb-0">Categorías</span>
          <Link
            href="/shop"
            className="text-[12px] md:text-[14px] text-store-accent tracking-[0.03em] hover:underline flex items-center gap-1 transition-all duration-300 group"
          >
            Ver todas
            <ArrowRight className="inline h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { name: 'Chamarras', color: 'bg-store-accent', hover: 'bg-green-700' },
            { name: 'Pants', color: 'bg-[#3a4a5e]', hover: 'bg-blue-800' },
            { name: 'Gorros', color: 'bg-[#5e3a2e]', hover: 'bg-amber-800' },
            { name: 'Accesorios', color: 'bg-[#8B5CF6]', hover: 'bg-purple-700' }
          ].map((categoria, index) => (
            <Link
              key={categoria.name}
              href={`/shop?tipo=${categoria.name.toLowerCase()}`}
              className={`${categoria.color} rounded-xl h-24 md:h-28 flex items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-30" style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 15px,
                  rgba(255,255,255,0.1) 15px,
                  rgba(255,255,255,0.1) 16px
                )`
              }}></div>

              <span className="font-serif text-[16px] md:text-[18px] text-white tracking-[0.02em] z-10 transition-transform duration-300 group-hover:scale-105">
                {categoria.name}
              </span>

              {/* Shine effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </Link>
          ))}
        </div>
      </div>

      {/* Destacados */}
      {/* Destacados */}
      <div className="px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
          <span className="font-serif text-[24px] md:text-[28px] mb-4 sm:mb-0">Destacados</span>
          <Link
            href="/shop?destacado=true"
            className="text-[12px] md:text-[14px] text-store-accent tracking-[0.03em] hover:underline flex items-center gap-1 transition-all duration-300 group"
          >
            Ver más
            <ArrowRight className="inline h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {top4.map((prod) => (
            <Link
              href={`/shop/${prod.slug}`}
              key={prod.id}
              className="bg-store-surface rounded-xl overflow-hidden block group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {/* Product image container */}
              <div className="relative aspect-square bg-store-bg overflow-hidden">
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
                  <img
                    src={prod.imagen_principal}
                    alt={prod.nombre}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-store-ink3 text-sm">Imagen</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                  {prod.nuevo && (
                    <span className="bg-store-accent text-white text-[9px] font-semibold py-1.5 px-3 rounded-full shadow-lg animate-pulse">
                      Nuevo
                    </span>
                  )}
                  {prod.en_oferta && !prod.nuevo && (
                    <span className="bg-[#cc4444] text-white text-[9px] font-semibold py-1.5 px-3 rounded-full shadow-lg">
                      -Oferta
                    </span>
                  )}
                </div>

                {/* Quick view overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Ver producto
                  </span>
                </div>
              </div>

              {/* Product info */}
              <div className="p-4">
                <div className="text-[11px] text-store-ink3 tracking-[0.05em] uppercase mb-2 font-medium">
                  {prod.marca || 'Marca'}
                </div>
                <h3 className="text-[14px] md:text-[15px] text-store-ink font-medium mb-3 line-clamp-2 group-hover:text-store-accent transition-colors">
                  {prod.nombre}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  {prod.precio_oferta || prod.precio_publico ? (
                    <>
                      <span className="text-[16px] text-store-ink font-bold">
                        ${(prod.precio_oferta || prod.precio_publico)?.toFixed(2)}
                      </span>
                      {prod.precio_oferta && prod.precio_publico && (
                        <span className="text-[13px] text-store-ink3 line-through font-normal">
                          ${prod.precio_publico.toFixed(2)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[14px] italic font-normal text-store-ink3">
                      Consultar precio
                    </span>
                  )}
                </div>

                {/* Add to cart button */}
                <button className="mt-4 w-full bg-store-bg border border-store-border text-store-ink py-2 rounded-lg text-[12px] font-medium hover:bg-store-surface transition-all duration-300 group-hover:shadow-md">
                  Agregar
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
