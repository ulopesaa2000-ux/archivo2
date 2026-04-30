// app/(store)/shop/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { fetchProductoWebBySlug, fetchVariantesProducto, fetchImagenesProducto, fetchConfigEcommerce, fetchMedidasPublicas } from '@/modules/ecommerce/queries'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { ProductGalleryClient } from './components/ProductGalleryClient'
import { ProductInfo } from '@/components/store/producto/ProductInfo'
import { VariantSelector } from '@/components/store/producto/VariantSelector'
import { AddToQuoteButton } from '@/components/store/producto/AddToQuoteButton'

// ✅ MEJORA: Constante para URL base (evita hardcoded)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://inv-tienda.com'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

// ✅ MEJORA: Generación de metadatos optimizada para redes sociales
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const producto = await fetchProductoWebBySlug(slug)

  if (!producto) {
    return {
      title: 'Producto no encontrado | inv-tienda',
      description: 'El producto que buscas no está disponible en nuestro catálogo actual.'
    }
  }

  // ✅ LÓGICA DE FALLBACK: Prioriza SEO Web > SKU + Descripción > Solo SKU
  const productTitle = producto.titulo_seo 
    ? producto.titulo_seo 
    : (producto.sku_base && producto.descripcion) 
      ? `${producto.sku_base} - ${producto.descripcion}`
      : producto.sku_base || 'Producto'

  const productDescription = producto.descripcion_seo || producto.descripcion || `Descubre el producto ${producto.sku_base} en inv-tienda`
  
  // Imagen optimizada para OG (1200x630)
  const ogImageUrl = producto.imagen_principal 
    ? getSmartImagenUrl(producto.imagen_principal, 'og')
    : '/og-image.jpg'

  return {
    title: `${productTitle} | inv-tienda`,
    description: productDescription,
    keywords: producto.keywords || undefined,
    openGraph: {
      title: productTitle,
      description: productDescription,
      type: 'website',
      url: `${SITE_URL}/shop/${producto.slug}`,
      siteName: 'inv-tienda',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: productTitle,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: productTitle,
      description: productDescription,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${SITE_URL}/shop/${producto.slug}`,
    }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  
  // ✅ MEJORA: Manejo de errores con try-catch
  try {
    const [producto, config] = await Promise.all([
      fetchProductoWebBySlug(slug),
      fetchConfigEcommerce(),
    ])

    if (!producto) {
      notFound()
    }

    // ✅ CORREGIDO: Null safety con fallbacks
    const [variantes, imagenes, medidas] = await Promise.all([
      fetchVariantesProducto(producto.producto_id) ?? [],
      fetchImagenesProducto(producto.producto_id) ?? [],
      fetchMedidasPublicas(producto.producto_id) ?? { puntos: [], tallas: [], tabla: {} },
    ])

    // ✅ LÓGICA DE NOMBRE: Prioriza SEO Web > SKU + Descripción > Solo SKU
    const productTitle = producto.titulo_seo 
      ? producto.titulo_seo 
      : (producto.sku_base && producto.descripcion) 
        ? `${producto.sku_base} - ${producto.descripcion}`
        : producto.sku_base || 'Producto'

    // ✅ CORREGIDO: Schema enriquecido con datos reales
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: productTitle,
      description: producto.descripcion_seo || producto.descripcion || productTitle,
      sku: producto.sku_base,
      image: producto.imagen_principal 
        ? [getSmartImagenUrl(producto.imagen_principal, 'hero'), ...imagenes.map(img => img.url)] 
        : [],
      brand: { 
        "@type": "Brand", 
        name: producto.marca || "inv-tienda" 
      },
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/shop/${producto.slug}`,
        priceCurrency: "USD", // Podría ser dinámico si se requiere
        price: producto.precio_oferta || producto.precio_publico,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        itemCondition: "https://schema.org/NewCondition",
        availability: producto.activo ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      },
      keywords: producto.keywords || undefined
    }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Catálogo", item: `${SITE_URL}/shop` },
        { "@type": "ListItem", position: 3, name: productTitle, item: `${SITE_URL}/shop/${producto.slug}` }
      ]
    }

    return (
      <div className="bg-[var(--bg)] min-h-screen pb-16">
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        {/* Breadcrumbs */}
        <div className="py-4 px-4 md:px-8 bg-[var(--surface)] border-b border-store-border">
          <nav className="max-w-7xl mx-auto" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-[12px] text-store-ink3">
              <li>
                <Link href="/" className="hover:text-store-ink transition-colors" aria-label="Ir al inicio">
                  Inicio
                </Link>
              </li>
              <li className="flex items-center">
                <span className="mx-2">/</span>
                <Link href="/shop" className="hover:text-store-ink transition-colors" aria-label="Ver catálogo">
                  Catálogo
                </Link>
              </li>
              <li className="flex items-center">
                <span className="mx-2">/</span>
                <span className="text-store-ink font-medium" aria-current="page">
                  {productTitle}
                </span>
              </li>
            </ol>
          </nav>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Galería */}
            <Suspense fallback={
              <div className="aspect-square bg-[var(--surface)] border border-store-border animate-pulse rounded-md" />
            }>
              <ProductGalleryClient
                imagenes={imagenes}
                nombre={producto.nombre}
              />
            </Suspense>

            {/* Info Producto */}
            <div>
              <ProductInfo
                producto={producto}
                config={config}
              />

              <Suspense fallback={
                <div className="h-24 bg-[var(--surface)] border border-store-border animate-pulse rounded-md mt-6" />
              }>
                <VariantSelector
                  variantes={variantes}
                  config={config}
                />
              </Suspense>

              <div className="pt-4">
                <AddToQuoteButton
                  producto={producto}
                  config={config}
                />
              </div>

              {/* ✅ CORREGIDO: Null safety para config */}
              {config?.modo_operacion !== 'ecommerce' && config?.mensaje_precio_variable && (
                <p className="text-[12px] text-store-ink3 italic mt-3">
                  {config.mensaje_precio_variable}
                </p>
              )}

              {/* Descripción + composición + keywords */}
              {(producto.descripcion || producto.composicion || producto.descripcion_seo || producto.keywords) && (
                <div className="mt-8 text-[14px] leading-[1.75] text-store-ink2 space-y-4 border-t border-store-border pt-6">
                  {producto.descripcion && producto.descripcion !== producto.nombre && (
                    <p>{producto.descripcion}</p>
                  )}

                  {producto.descripcion_seo && (
                    <p>{producto.descripcion_seo}</p>
                  )}

                  {producto.keywords && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {producto.keywords.split(',').map((k, idx) => (
                        <span 
                          key={idx}
                          className="bg-[var(--surface)] border border-store-border text-store-ink2 text-[11px] px-3 py-1 rounded-full font-medium"
                        >
                          {k.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {producto.composicion && (
                    <div className="pt-2">
                      <span className="text-[10px] tracking-[0.1em] uppercase text-store-ink3 block mb-1">Composición</span>
                      <p>{producto.composicion}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Atributos */}
              {(producto.tipo_prenda || producto.genero || producto.tela_exterior || producto.tela_forro) && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {producto.tipo_prenda && (
                    <div className="bg-[var(--surface)] border border-store-border rounded p-3">
                      <div className="text-[9px] tracking-[0.1em] uppercase text-store-ink3 mb-1">Tipo</div>
                      <div className="text-[14px] font-medium text-store-ink">{producto.tipo_prenda}</div>
                    </div>
                  )}
                  {producto.genero && (
                    <div className="bg-[var(--surface)] border border-store-border rounded p-3">
                      <div className="text-[9px] tracking-[0.1em] uppercase text-store-ink3 mb-1">Género</div>
                      <div className="text-[14px] font-medium text-store-ink">{producto.genero}</div>
                    </div>
                  )}
                  {producto.tela_exterior && (
                    <div className="bg-[var(--surface)] border border-store-border rounded p-3">
                      <div className="text-[9px] tracking-[0.1em] uppercase text-store-ink3 mb-1">Tela Exterior</div>
                      <div className="text-[14px] font-medium text-store-ink">{producto.tela_exterior}</div>
                    </div>
                  )}
                  {producto.tela_forro && (
                    <div className="bg-[var(--surface)] border border-store-border rounded p-3">
                      <div className="text-[9px] tracking-[0.1em] uppercase text-store-ink3 mb-1">Tela Forro</div>
                      <div className="text-[14px] font-medium text-store-ink">{producto.tela_forro}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ CORREGIDO: Null safety completo para medidas */}
              {medidas?.puntos?.length > 0 && medidas.tallas?.length > 0 && (
                <div className="mt-8 border-t border-store-border pt-6">
                  <h3 className="text-[11px] tracking-[0.1em] uppercase font-medium text-store-ink mb-4">
                    Tabla de Medidas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-store-border">
                          <th className="text-left font-normal text-store-ink3 pb-2 pr-4">Medida</th>
                          {medidas.tallas.map(t => (
                            <th key={t} className="text-center font-medium text-store-ink pb-2 px-3">{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {medidas.puntos.map((punto, i) => (
                          <tr key={punto} className={i % 2 === 0 ? 'bg-transparent' : 'bg-[var(--surface)]'}>
                            <td className="py-2 pr-4 text-store-ink2">{punto} (cm)</td>
                            {medidas.tallas.map(t => (
                              <td key={t} className="text-center py-2 px-3 text-store-ink">
                                {medidas.tabla[punto]?.[t] ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    // ✅ MEJORA: Manejo de errores global
    console.error('Error cargando producto:', error)
    notFound()
  }
}