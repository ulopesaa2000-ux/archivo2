import type {Metadata} from 'next';
import './globals.css';
import { Noto_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";

const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600', '700'] });
const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-serif', weight: ['400', '700'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: {
    default: 'inv-tienda | Moda que te define',
    template: '%s | inv-tienda'
  },
  description: 'Descubre nuestra colección de moda 2026. Prendas de calidad con materiales exclusivos. Envío rápido y cotización online.',
  keywords: 'moda, ropa, tienda online, chamarras, pants, gorros, accesorios, fashion, clothing, e-commerce',
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
  // metadataBase es necesario para resolver URLs absolutas en Open Graph y Twitter
  metadataBase: new URL('https://inv-tienda.com')
};

export const viewport = 'width=device-width, initial-scale=1';

const appThemeColor = '#2D5A3D';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={cn("font-sans", jakartaSans.variable, notoSerif.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
