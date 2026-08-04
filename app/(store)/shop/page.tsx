// app/(store)/catalogo/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchProductosWebPublicos, fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { ProductGrid } from '@/components/store/catalogo/ProductGrid'
import { FilterSidebar } from '@/components/store/catalogo/FilterSidebar'
import { CategoryPromoHero } from '@/components/store/catalogo/CategoryPromoHero'
import { CatalogSkeleton } from '@/components/store/catalogo/CatalogSkeleton'
import { fetchBannerCategoriaActivo } from '@/modules/ecommerce/banners'
import { SITE_URL, SITE_NAME, CURRENCY } from '@/lib/seo/site'
import { Filter, SlidersHorizontal } from 'lucide-react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'

export const metadata: Metadata = {
  title: `Catálogo de Productos | ${SITE_NAME}`,
  description: 'Explora nuestra completa colección de moda. Chamarras, pants, gorros y accesorios de calidad. Filtra por categorías, marcas y ofertas.',
  keywords: 'catálogo productos, moda online, ropa, chamarras, pants, gorros, ofertas, descuentos',
  openGraph: {
    title: `Catálogo de Productos | ${SITE_NAME}`,
    description: 'Explora nuestra completa colección de moda 2026',
    url: `${SITE_URL}/shop`
  }
}

interface CatalogoPageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    tipo?: string
    genero?: string
    oferta?: string
    nuevo?: string
    destacado?: string
    page?: string
  }>
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams
  const config = await fetchConfigEcommerce()

  const filtros = {
    q: params.q,
    marca_id: params.marca ? parseInt(params.marca) : undefined,
    tipo_prenda_id: (params.tipo && !isNaN(Number(params.tipo))) ? parseInt(params.tipo) : undefined,
    tipo: (params.tipo && isNaN(Number(params.tipo))) ? params.tipo : undefined,
    genero: params.genero,
    en_oferta: params.oferta === 'true',
    nuevo: params.nuevo === 'true',
    destacado: params.destacado === 'true',
    page: params.page ? parseInt(params.page) : 1,
  }

  const [{ productos, total }, categoryBanner] = await Promise.all([
    fetchProductosWebPublicos(filtros),
    fetchBannerCategoriaActivo({
      genero: filtros.genero,
      generoId: filtros.genero ? undefined : undefined,
      tipoPrendaId: filtros.tipo_prenda_id,
      tipo: filtros.tipo,
    }),
  ])

  // Generate breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catálogo",
        item: `${SITE_URL}/shop`
      }
    ]
  }

  // Generate product list schema
  const productListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: total,
    itemListElement: productos.map((producto, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/shop/${producto.slug}`,
      name: producto.nombre,
      image: producto.imagen_principal,
      offers: {
        "@type": "Offer",
        price: producto.precio_oferta || producto.precio_publico,
        priceCurrency: CURRENCY
      }
    }))
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productListSchema)
        }}
      />

      {/* Breadcrumbs */}
      <div className="py-3 px-4 md:px-8 bg-background border-b border-border">
        <nav className="max-w-7xl mx-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-[12px] text-muted-foreground">
            <li>
              <Link
                href="/"
                className="text-foreground hover:text-emerald-600 transition-colors"
                aria-label="Ir al inicio"
              >
                Inicio
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-foreground font-medium" aria-current="page">
                Catálogo
              </span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Botón Flotante/Sticky para Filtros en Móviles */}
      <div className="lg:hidden sticky top-14 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong className="text-foreground font-bold">{total}</strong> prendas
        </div>

        <Sheet>
          <SheetTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs shadow-xs hover:bg-emerald-800 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filtros y Menú</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-[380px] p-5 overflow-y-auto bg-card dark:bg-zinc-950">
            <SheetHeader className="pb-3 mb-2 border-b border-border">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" />
                <span>Filtros del Catálogo</span>
              </SheetTitle>
            </SheetHeader>
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-xl" />}>
              <FilterSidebar />
            </Suspense>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] flex-1">
        {/* Sidebar filtros del lado izquierdo — STICKY AL NAVEGAR / DESPLAZAR */}
        <aside className="hidden lg:block border-r border-border bg-card dark:bg-zinc-950 pt-6 px-5 pb-12 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-xl border border-border" />}>
            <FilterSidebar />
          </Suspense>
        </aside>

        {/* Grid productos */}
        <main className="bg-background dark:bg-zinc-950 pt-6 px-4 md:px-8 pb-12">
          {/* Banner Promocional Panorámico de Categoría (si existe) */}
          <CategoryPromoHero banner={categoryBanner} />

          <div className="hidden lg:flex justify-between items-center pb-4 mb-6 border-b border-border">
            <div className="text-xs text-muted-foreground">
              Mostrando <strong className="text-foreground font-bold">{total}</strong> productos en el catálogo
            </div>
          </div>

          <Suspense fallback={<CatalogSkeleton />}>
            <ProductGrid
              productos={productos}
              config={config}
              total={total}
              currentPage={filtros.page || 1}
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
