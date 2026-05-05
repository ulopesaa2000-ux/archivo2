import { MetadataRoute } from 'next'
import { fetchAllProductSlugs } from '@/modules/ecommerce/queries'

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

  const productPages: MetadataRoute.Sitemap = productos.map((p) => {
    // Limpieza de slug: espacios → guiones, sin espacios extra
    const cleanSlug = p.slug
      .trim()
      .replace(/\s+/g, '-')     // todos los espacios por guiones
      .replace(/-+/g, '-')      // múltiples guiones seguidos → uno solo
      .toLowerCase()            // minúsculas para URL limpia

    return {
      url: `${baseUrl}/shop/${encodeURIComponent(cleanSlug)}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  })

  return [...staticPages, ...productPages]
}