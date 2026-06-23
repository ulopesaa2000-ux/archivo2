// C:\Users\uriel\Downloads\enero 26\archivo2\lib\seo\store-metadata.ts
import type { Metadata, Viewport } from 'next'
import { LOCALE, SITE_NAME, SITE_URL } from '@/lib/seo/site'

export const storeViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e17',
}

export const storeMetadata: Metadata = {
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  title: {
    default: `${SITE_NAME} | Moda que te define`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Descubre nuestra colección de moda 2026. Prendas de calidad con materiales exclusivos. Envío rápido y cotización online.',
  keywords:
    'moda, ropa, tienda online, chamarras, pants, gorros, accesorios, fashion, clothing, e-commerce',
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Moda que te define`,
    description:
      'Descubre nuestra colección de moda 2026 con prendas de calidad y materiales exclusivos',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Moda 2026`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Moda que te define`,
    description: 'Descubre nuestra colección de moda 2026',
    images: ['/og-image.jpg'],
    creator: `@${SITE_NAME.toLowerCase().replace(/\s+/g, '')}`,
  },
  metadataBase: new URL(SITE_URL),
}
