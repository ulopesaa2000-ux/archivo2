import { MetadataRoute } from 'next'
import { fetchAllProductSlugs } from '@/modules/ecommerce/queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.sistemaindumentaria.com'

  // 1. Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cotizacion`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  // 2. Páginas de productos dinámicas
  const productos = await fetchAllProductSlugs()
  const productPages: MetadataRoute.Sitemap = productos.map((p) => ({
    url: `${baseUrl}/shop/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticPages, ...productPages]
}