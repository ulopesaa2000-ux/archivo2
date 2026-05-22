// app/(store)/catalogo/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchProductosWebPublicos } from '@/modules/ecommerce/queries'
import { fetchConfigEcommerce } from '@/modules/ecommerce/queries'
import { ProductGrid } from '@/components/store/catalogo/ProductGrid'
import { FilterSidebar } from '@/components/store/catalogo/FilterSidebar'
import { CatalogSkeleton } from '@/components/store/catalogo/CatalogSkeleton'
import { SITE_URL, SITE_NAME, CURRENCY } from '@/lib/seo/site'

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
    tipo_prenda_id: params.tipo ? parseInt(params.tipo) : undefined,
    en_oferta: params.oferta === 'true',
    nuevo: params.nuevo === 'true',
    destacado: params.destacado === 'true',
    page: params.page ? parseInt(params.page) : 1,
  }

  const { productos, total } = await fetchProductosWebPublicos(filtros)

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
      <div className="py-4 px-4 md:px-8 bg-[#F4F4F1] border-b border-[#2D5A3D]/10">
        <nav className="max-w-7xl mx-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-[12px] text-[#8C8C8C]">
            <li>
              <Link
                href="/"
                className="text-[#262626] hover:text-[#1A1C1A] transition-colors"
                aria-label="Ir al inicio"
              >
                Inicio
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2 text-[#8C8C8C]">/</span>
              <span className="text-[#1A1C1A] font-medium" aria-current="page">
                Catálogo
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] flex-1">
        {/* Sidebar filtros */}
        <aside className="border-r border-[#2D5A3D]/10 bg-[#F4F4F1] pt-6 px-6 pb-12">
          <Suspense fallback={<div className="h-96 bg-[#FFFFFF] animate-pulse rounded-lg border border-[#2D5A3D]/10" />}>
            <FilterSidebar />
          </Suspense>
        </aside>

        {/* Grid productos */}
        <main className="bg-[#F4F4F1] pt-6 px-8 pb-12">
          <div className="flex justify-between items-center pb-4 mb-6 border-b border-[#2D5A3D]/10">
            <div className="text-[14px] text-[#262626]">
              <strong className="text-[#1A1C1A]">{total}</strong> productos encontrados
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
