import { MetadataRoute } from 'next'
import { fetchAllProductSlugs } from '@/modules/ecommerce/queries'
import { slugify } from '@/lib/utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base URL limpio sin espacios al final
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wear.sistemaindumentaria.com').trim()

  // Páginas estáticas
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

  // Páginas de productos dinámicas
  const productos = await fetchAllProductSlugs()

  const productPages: MetadataRoute.Sitemap = productos.map((p) => ({
    url: `${baseUrl}/shop/${slugify(p.slug)}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticPages, ...productPages]
}