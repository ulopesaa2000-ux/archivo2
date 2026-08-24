// C:\Users\uriel\Downloads\enero 26\archivo2\app\(store)\shop\[slug]\page.tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'
import { Suspense } from 'react'
import { AddToQuoteButton } from '@/components/store/producto/AddToQuoteButton'
import { ProductInfo } from '@/components/store/producto/ProductInfo'
import { VariantSelector } from '@/components/store/producto/VariantSelector'
import { SITE_NAME, SITE_URL, LOCALE, CURRENCY, DEFAULT_OG_IMAGE } from '@/lib/seo/site'
import { slugify } from '@/lib/utils'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import {
  fetchConfigEcommerce,
  fetchImagenesProducto,
  fetchMedidasPublicas,
  fetchProductoWebBySlug,
  fetchVariantesProducto,
  incrementProductoWebVisitas,
} from '@/modules/ecommerce/queries'
import type { ProductoWebPublico } from '@/modules/ecommerce/types'
import { ProductGalleryClient } from './components/ProductGalleryClient'

const PRICE_VALID_UNTIL = '2027-12-31'

function isJsonString(str?: string | null): boolean {
  if (!str) return false
  const trimmed = str.trim()
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.includes('hero_title') ||
    trimmed.includes('hero_description')
  )
}

function toAbsolute(url: string, base: string): string {
  if (!url) {
    return DEFAULT_OG_IMAGE
  }

  return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

async function resolveSiteUrl(): Promise<string> {
  try {
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    const protocol =
      headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')

    if (host) {
      return `${protocol}://${host}`
    }
  } catch {
    // Fallback a SITE_URL cuando headers no esten disponibles.
  }

  return SITE_URL
}

async function ProductGallerySection({
  productoId,
  nombre,
}: {
  productoId: number
  nombre: string
}) {
  const imagenes = await fetchImagenesProducto(productoId)
  return <ProductGalleryClient imagenes={imagenes} nombre={nombre} />
}

async function VariantSelectorSection({
  productoId,
  config,
}: {
  productoId: number
  config: Awaited<ReturnType<typeof fetchConfigEcommerce>>
}) {
  const variantes = await fetchVariantesProducto(productoId)
  return <VariantSelector variantes={variantes} config={config} />
}

async function MeasurementsSection({ productoId }: { productoId: number }) {
  const medidas = await fetchMedidasPublicas(productoId)

  if (medidas.puntos.length === 0 || medidas.tallas.length === 0) {
    return null
  }

  return (
    <div className="mt-8 border-t border-store-border pt-6">
      <h3 className="text-[11px] tracking-[0.1em] uppercase font-medium text-store-ink mb-4">
        Tabla de Medidas
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-store-border">
              <th className="text-left font-normal text-store-ink3 pb-2 pr-4">Medida</th>
              {medidas.tallas.map((talla) => (
                <th key={talla} className="text-center font-medium text-store-ink pb-2 px-3">
                  {talla}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medidas.puntos.map((punto, index) => (
              <tr key={punto} className={index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--surface)]'}>
                <td className="py-2 pr-4 text-store-ink2">{punto} (cm)</td>
                {medidas.tallas.map((talla) => (
                  <td key={talla} className="text-center py-2 px-3 text-store-ink">
                    {medidas.tabla[punto]?.[talla] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getCleanText(text?: string | null): string | null {
  if (!text) return null
  if (isJsonString(text)) return null
  return text.trim()
}

function getProductTitle(producto: ProductoWebPublico): string {
  const cleanSeoTitle = getCleanText(producto.titulo_seo)
  const cleanNombre = getCleanText(producto.nombre)
  const cleanDesc = getCleanText(producto.descripcion)

  if (cleanSeoTitle) return cleanSeoTitle
  if (cleanNombre) return cleanNombre
  if (producto.sku_base && cleanDesc) return `${producto.sku_base} - ${cleanDesc}`
  if (producto.sku_base) return producto.sku_base
  return 'Producto'
}

function getProductDescription(producto: ProductoWebPublico, productTitle: string): string {
  const cleanSeoDesc = getCleanText(producto.descripcion_seo)
  const cleanDesc = getCleanText(producto.descripcion)
  return cleanSeoDesc || cleanDesc || `Descubre ${productTitle} en ${SITE_NAME}`
}

type ShopSlugPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ShopSlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const producto = await fetchProductoWebBySlug(slug)
  const dynamicSiteUrl = await resolveSiteUrl()

  if (!producto) {
    return {
      title: `Producto no encontrado | ${SITE_NAME}`,
      description: 'El producto que buscas no está disponible en nuestro catálogo actual.',
    }
  }

  const productTitle = getProductTitle(producto)
  const productDescription = getProductDescription(producto, productTitle)

  const rawOgImage = producto.imagen_principal
    ? getSmartImagenUrl(producto.imagen_principal, 'og')
    : DEFAULT_OG_IMAGE
  const ogImageUrl = toAbsolute(rawOgImage, dynamicSiteUrl)
  const productUrl = `${dynamicSiteUrl}/shop/${slugify(producto.slug)}`

  return {
    title: productTitle,
    description: productDescription,
    keywords: producto.keywords || undefined,
    openGraph: {
      title: productTitle,
      description: productDescription,
      type: 'website',
      url: productUrl,
      siteName: SITE_NAME,
      locale: LOCALE,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: ogImageUrl.toLowerCase().endsWith('.png')
            ? 'image/png'
            : ogImageUrl.toLowerCase().endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg',
          alt: productTitle,
        },
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
    other: {
      'product:price:amount': String(producto.precio_oferta || producto.precio_publico || 0),
      'product:price:currency': CURRENCY,
      'product:availability': producto.activo ? 'instock' : 'out of stock',
      'product:condition': 'new',
      'product:retailer_item_id': producto.sku_base || producto.slug,
      'product:brand': producto.marca || SITE_NAME,
    },
  }
}

export default async function ProductPage({ params }: ShopSlugPageProps) {
  const { slug } = await params
  const dynamicSiteUrl = await resolveSiteUrl()
  const [producto, config] = await Promise.all([fetchProductoWebBySlug(slug), fetchConfigEcommerce()])

  if (!producto) {
    notFound()
  }

  const canonicalSlug = slugify(producto.slug)
  if (slug !== canonicalSlug) {
    redirect(`/shop/${canonicalSlug}`)
  }

  after(async () => {
    await incrementProductoWebVisitas(producto.id, producto.visitas)
  })

  const productTitle = getProductTitle(producto)

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productTitle,
    description: producto.descripcion_seo || producto.descripcion || productTitle,
    sku: producto.sku_base,
    image: producto.imagen_principal
      ? [toAbsolute(getSmartImagenUrl(producto.imagen_principal, 'hero'), dynamicSiteUrl)]
      : [],
    brand: {
      '@type': 'Brand',
      name: producto.marca || SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: `${dynamicSiteUrl}/shop/${canonicalSlug}`,
      priceCurrency: CURRENCY,
      price: producto.precio_oferta || producto.precio_publico,
      priceValidUntil: PRICE_VALID_UNTIL,
      itemCondition: 'https://schema.org/NewCondition',
      availability: producto.activo
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${dynamicSiteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${dynamicSiteUrl}/shop` },
      { '@type': 'ListItem', position: 3, name: productTitle, item: `${dynamicSiteUrl}/shop/${canonicalSlug}` },
    ],
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
              <Link href="/inicio" className="hover:text-store-ink transition-colors" aria-label="Ir al inicio">
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
          <Suspense
            fallback={
              <div className="aspect-square bg-[var(--surface)] border border-store-border animate-pulse rounded-md" />
            }
          >
            <ProductGallerySection productoId={producto.producto_id} nombre={producto.nombre} />
          </Suspense>

          <div>
            <ProductInfo producto={producto} config={config} />

            <Suspense
              fallback={
                <div className="h-24 bg-[var(--surface)] border border-store-border animate-pulse rounded-md mt-6" />
              }
            >
              <VariantSelectorSection productoId={producto.producto_id} config={config} />
            </Suspense>

            <div className="pt-4">
              <AddToQuoteButton producto={producto} config={config} />
            </div>

            {config?.modo_operacion !== 'ecommerce' && config?.mensaje_precio_variable && !isJsonString(config.mensaje_precio_variable) && (
              <p className="text-[12px] text-store-ink3 italic mt-3">{config.mensaje_precio_variable}</p>
            )}

            {((producto.descripcion && producto.descripcion !== producto.nombre && !isJsonString(producto.descripcion)) ||
              producto.composicion ||
              producto.keywords) && (
              <div className="mt-8 text-[14px] leading-[1.75] text-store-ink2 space-y-4 border-t border-store-border pt-6">
                {producto.descripcion &&
                  producto.descripcion !== producto.nombre &&
                  !isJsonString(producto.descripcion) && (
                    <p>{producto.descripcion}</p>
                  )}

                {producto.keywords && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {producto.keywords.split(',').map((keyword, index) => (
                      <span
                        key={index}
                        className="bg-[var(--surface)] border border-store-border text-store-ink2 text-[11px] px-3 py-1 rounded-full font-medium"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {producto.composicion && (
                  <div className="pt-2">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-store-ink3 block mb-1">
                      Composición
                    </span>
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

            <Suspense fallback={null}>
              <MeasurementsSection productoId={producto.producto_id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
