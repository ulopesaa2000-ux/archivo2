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
      <div className="pt-16 pb-12 px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gradient-to-br from-[#f5f2ec] to-[#ede8e0]">
        <div>
          <div className="text-[11px] tracking-[0.15em] uppercase text-store-accent mb-4 font-medium">
            Nueva colección 2026
          </div>
          <h1 className="font-serif text-[42px] leading-[1.15] text-store-ink mb-4">
            Moda que<br/><em className="italic">te define</em>
          </h1>
          <p className="text-[14px] text-store-ink2 leading-[1.7] mb-6 max-w-[340px]">
            Descubre prendas diseñadas con materiales de calidad. Variantes por talla y color disponibles en toda la colección.
          </p>
          <div className="flex gap-3">
            <Link 
              href="/shop" 
              className="bg-store-accent text-white border-none py-[10px] px-6 rounded text-[13px] font-medium tracking-[0.02em] hover:bg-store-accent/90 transition-colors"
            >
              Ver catálogo
            </Link>
            <Link 
              href="/shop?nuevo=true" 
              className="bg-transparent text-store-ink border border-store-border py-[10px] px-6 rounded text-[13px] hover:bg-store-surface transition-colors"
            >
              Novedades
            </Link>
          </div>
        </div>
        <div className="bg-[#e8e2d8] rounded-lg h-[280px] flex items-center justify-center text-store-ink3 text-xs tracking-[0.05em] uppercase relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,.02) 20px, rgba(0,0,0,.02) 21px)' }}></div>
          <span className="absolute top-4 left-4 bg-store-accent2 text-white text-[10px] font-semibold py-1 px-2.5 rounded-[2px] tracking-[0.05em] uppercase z-10">Nuevo</span>
          <span className="z-10">Imagen destacada</span>
        </div>
      </div>

      {/* Categorías */}
      <div className="flex items-baseline justify-between px-8 pt-8 pb-4">
        <span className="font-serif text-[22px]">Categorías</span>
        <Link href="/shop" className="text-[12px] text-store-accent tracking-[0.03em] hover:underline">
          Ver todas <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-8 pb-10">
        <Link href="/shop?tipo=chamarras" className="bg-store-accent rounded-lg h-20 flex items-center justify-center relative overflow-hidden group">
          <span className="font-serif text-[18px] text-white tracking-[0.02em] z-10 transition-transform group-hover:scale-105">Chamarras</span>
        </Link>
        <Link href="/shop?tipo=pants" className="bg-[#3a4a5e] rounded-lg h-20 flex items-center justify-center relative overflow-hidden group">
          <span className="font-serif text-[18px] text-white tracking-[0.02em] z-10 transition-transform group-hover:scale-105">Pants</span>
        </Link>
        <Link href="/shop?tipo=gorros" className="bg-[#5e3a2e] rounded-lg h-20 flex items-center justify-center relative overflow-hidden group">
          <span className="font-serif text-[18px] text-white tracking-[0.02em] z-10 transition-transform group-hover:scale-105">Gorros</span>
        </Link>
      </div>

      {/* Destacados */}
      <div className="flex items-baseline justify-between px-8 pt-8 pb-4">
        <span className="font-serif text-[22px]">Destacados</span>
        <Link href="/shop?destacado=true" className="text-[12px] text-store-accent tracking-[0.03em] hover:underline">
          Ver más <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-store-border mx-8 mb-8 border border-store-border rounded-lg overflow-hidden">
        {top4.map((prod) => (
          <Link href={`/shop/${prod.slug}`} key={prod.id} className="bg-store-surface p-4 block group">
            <div className="bg-store-bg rounded-md h-[120px] flex items-center justify-center text-store-ink3 text-[10px] tracking-[0.05em] uppercase relative overflow-hidden mb-3">
              <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,.015) 12px, rgba(0,0,0,.015) 13px)' }}></div>
              {prod.nuevo && (
                <span className="absolute top-2 right-2 bg-store-accent text-white text-[9px] font-semibold py-[3px] px-[7px] rounded-[2px] tracking-[0.05em] z-10">Nuevo</span>
              )}
              {prod.en_oferta && !prod.nuevo && (
                <span className="absolute top-2 right-2 bg-[#cc4444] text-white text-[9px] font-semibold py-[3px] px-[7px] rounded-[2px] tracking-[0.05em] z-10">-Oferta</span>
              )}
              {prod.imagen_principal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prod.imagen_principal} alt={prod.nombre} className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 group-hover:opacity-100 transition-opacity" />
              ) : (
                <span className="z-10">Imagen</span>
              )}
            </div>
            <div className="text-[10px] text-store-ink3 tracking-[0.05em] uppercase mb-1 truncate">{prod.marca || 'Marca'}</div>
            <div className="text-[13px] text-store-ink font-medium mb-1.5 truncate">{prod.nombre}</div>
            <div className="text-[14px] text-store-ink font-semibold">
              {prod.precio_oferta || prod.precio_publico ? (
                <>
                  ${(prod.precio_oferta || prod.precio_publico)?.toFixed(2)}
                  {prod.precio_oferta && prod.precio_publico && (
                    <span className="text-[12px] text-store-ink3 line-through ml-1.5 font-normal">${prod.precio_publico.toFixed(2)}</span>
                  )}
                </>
              ) : (
                <span className="text-[13px] italic font-normal text-store-ink3">Consultar precio</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
