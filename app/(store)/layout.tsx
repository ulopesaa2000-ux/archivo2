// app/(store)/layout.tsx
import type { Metadata } from 'next'
import { ReactNode, Suspense } from 'react'
import { StoreHeader } from '@/components/store/layout/StoreHeader'
import { StoreFooter } from '@/components/store/layout/StoreFooter'
import { verifySessionOptional } from '@/lib/dal'

export const metadata: Metadata = {
  title: {
    default: 'inv-tienda | Moda que te define',
    template: '%s | inv-tienda'
  },
  description: 'Descubre nuestra colección de moda 2026. Prendas de calidad con materiales exclusivos. Envío rápido y cotización online.',
  keywords: 'moda, ropa, tienda online, chamarras, pants, gorros, accesorios',
  authors: [{ name: 'inv-tienda' }],
  creator: 'inv-tienda',
  publisher: 'inv-tienda',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://inv-tienda.com',
    siteName: 'inv-tienda',
    title: 'inv-tienda | Moda que te define',
    description: 'Descubre nuestra colección de moda 2026 con prendas de calidad y materiales exclusivos',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'inv-tienda Moda 2026'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'inv-tienda | Moda que te define',
    description: 'Descubre nuestra colección de moda 2026',
    images: ['/og-image.jpg'],
    creator: '@inv-tienda'
  },
  // metadataBase is not needed here as it inherits from root layout
};

export const viewport = 'width=device-width, initial-scale=1';

export const themeColor = '#2D5A3D';

// Usa verifySessionOptional del DAL que no redirige si no hay sesión
// y usa React.cache() para optimizar rendimiento
async function StoreHeaderWithUser() {
  const session = await verifySessionOptional()
  return <StoreHeader user={session.user} />
}

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-store-bg text-store-ink font-sans antialiased">
      <Suspense fallback={<header className="h-[64px] bg-store-surface border-b border-store-border" />}>
        <StoreHeaderWithUser />
      </Suspense>
      <main className="flex-1">
        {children}
      </main>
      <Suspense fallback={<footer className="bg-store-surface border-t border-store-border h-32" />}>
        <StoreFooter />
      </Suspense>
    </div>
  )
}
