// app/(store)/shop/[slug]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { fetchProductoWebBySlug, fetchVariantesProducto, fetchImagenesProducto, fetchConfigEcommerce, fetchMedidasPublicas } from '@/modules/ecommerce/queries'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { slugify } from '@/lib/utils'
import { ProductGalleryClient } from './components/ProductGalleryClient'
import { ProductInfo } from '@/components/store/producto/ProductInfo'
import { VariantSelector } from '@/components/store/producto/VariantSelector'
import { AddToQuoteButton } from '@/components/store/producto/AddToQuoteButton'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.sistemaindumentaria.com'
const PRICE_VALID_UNTIL = '2027-12-31'
const SITE_NAME = 'Sistema Indumentaria'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

// Helper para garantizar URLs absolutas (Meta/Facebook las requiere)
function toAbsolute(url: string, base: string): string {
  if (!url) return `${base}/og-image.jpg`
  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const producto = await fetchProductoWebBySlug(slug)

  let dynamicSiteUrl = SITE_URL
  try {
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
    if (host) dynamicSiteUrl = `${protocol}://${host}`
  } catch {
    // Fallback a SITE_URL
  }

  if (!producto) {
    return {
      title: `Producto no encontrado | ${SITE_NAME}`,
      description: 'El producto que buscas no está disponible en nuestro catálogo actual.'
    }
  }

  // Lógica de título: SEO > SKU + Desc > SKU
  const productTitle = producto.titulo_seo
    ? producto.titulo_seo
    : (producto.sku_base && producto.descripcion)
      ? `${producto.sku_base} - ${producto.descripcion}`
      : producto.sku_base || 'Producto'

  const productDescription = producto.descripcion_seo || producto.descripcion || `Descubre ${producto.sku_base} en ${SITE_NAME}`

  // ✅ CORREGIDO: Imagen OG absoluta obligatoria para Meta
  const rawOgImage = producto.imagen_principal
    ? getSmartImagenUrl(producto.imagen_principal, 'og')
    : '/og-image.jpg'
  const ogImageUrl = toAbsolute(rawOgImage, dynamicSiteUrl)

  // URL canónica: misma lógica que sitemap.ts (slugify elimina espacios/mayúsculas)
  const productUrl = `${dynamicSiteUrl}/shop/${slugify(producto.slug)}`

  return {
    title: `${productTitle} | ${SITE_NAME}`,
    description: productDescription,
    keywords: producto.keywords || undefined,
    openGraph: {
      title: productTitle,
      description: productDescription,
      type: 'website',
      url: productUrl,
      siteName: SITE_NAME,
      locale: 'es_AR',
      images: [
        {
          url: ogImageUrl,
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
      canonical: productUrl,
    },
    // ✅ NUEVO: Meta tags de producto para catálogo de Meta/Instagram
    other: {
      'product:price:amount': String(producto.precio_oferta || producto.precio_publico || 0),
      'product:price:currency': 'ARS', // Cambiá a 'USD' si corresponde
      'product:availability': producto.activo ? 'instock' : 'out of stock',
      'product:condition': 'new',
      'product:retailer_item_id': producto.sku_base || producto.slug,
      'product:brand': producto.marca || SITE_NAME,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params

  let dynamicSiteUrl = SITE_URL
  try {
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
    if (host) dynamicSiteUrl = `${protocol}://${host}`
  } catch {
    // Fallback
  }

  try {
    const [producto, config] = await Promise.all([
      fetchProductoWebBySlug(slug),
      fetchConfigEcommerce(),
    ])

    if (!producto) {
      notFound()
    }

    // Redirect 301 si la URL no es la canónica
    // Next.js decodifica %20 → espacio en params, por eso comparamos el slug
    // crudo contra el canónico directamente (no slugify vs slugify, que siempre serían iguales)
    const canonicalSlug = slugify(producto.slug)
    if (slug !== canonicalSlug) {
      redirect(`/shop/${canonicalSlug}`)
    }

    const [variantes, imagenes, medidas] = await Promise.all([
      fetchVariantesProducto(producto.producto_id) ?? [],
      fetchImagenesProducto(producto.producto_id) ?? [],
      fetchMedidasPublicas(producto.producto_id) ?? { puntos: [], tallas: [], tabla: {} },
    ])

    const productTitle = producto.titulo_seo
      ? producto.titulo_seo
      : (producto.sku_base && producto.descripcion)
        ? `${producto.sku_base} - ${producto.descripcion}`
        : producto.sku_base || 'Producto'

    // ✅ CORREGIDO: Imágenes absolutas en Schema.org
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: productTitle,
      description: producto.descripcion_seo || producto.descripcion || productTitle,
      sku: producto.sku_base,
      image: producto.imagen_principal
        ? [
          toAbsolute(getSmartImagenUrl(producto.imagen_principal, 'hero'), dynamicSiteUrl),
          ...imagenes.map(img => toAbsolute(img.url, dynamicSiteUrl))
        ]
        : [],
      brand: {
        "@type": "Brand",
        name: producto.marca || SITE_NAME
      },
      offers: {
        "@type": "Offer",
        url: `${dynamicSiteUrl}/shop/${slugify(producto.slug)}`,
        priceCurrency: 'ARS',
        price: producto.precio_oferta || producto.precio_publico,
        priceValidUntil: PRICE_VALID_UNTIL,
        itemCondition: "https://schema.org/NewCondition",
        availability: producto.activo ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      },
    }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${dynamicSiteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Catálogo", item: `${dynamicSiteUrl}/shop` },
        { "@type": "ListItem", position: 3, name: productTitle, item: `${dynamicSiteUrl}/shop/${encodeURIComponent(producto.slug)}` }
      ]
    }

    return (
      <div className="bg-[var(--bg)] min-h-screen pb-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

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
            <Suspense fallback={
              <div className="aspect-square bg-[var(--surface)] border border-store-border animate-pulse rounded-md" />
            }>
              <ProductGalleryClient
                imagenes={imagenes}
                nombre={producto.nombre}
              />
            </Suspense>

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

              {config?.modo_operacion !== 'ecommerce' && config?.mensaje_precio_variable && (
                <p className="text-[12px] text-store-ink3 italic mt-3">
                  {config.mensaje_precio_variable}
                </p>
              )}

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
    console.error('Error cargando producto:', error)
    notFound()
  }
}