// C:\Users\uriel\Downloads\enero 26\archivo2\app\manifest.ts
import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/seo/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: 'Catálogo de moda y sistema de administración Idol Navy',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e17',
    theme_color: '#0a0e17',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
