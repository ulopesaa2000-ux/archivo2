// C:\Users\uriel\Downloads\enero 26\archivo2\app\layout.tsx
import './globals.css'
import { Noto_Serif, Plus_Jakarta_Sans } from 'next/font/google'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ThemeProvider } from '@/components/theme-provider'
import { storeMetadata, storeViewport } from '@/lib/seo/store-metadata'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: false,
})
const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  adjustFontFallback: false,
})

export const metadata = storeMetadata
export const viewport = storeViewport

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={cn('font-sans', jakartaSans.variable, notoSerif.variable)}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
            <Toaster
              position="top-right"
              offset={68}
              toastOptions={{
                duration: 4000,
                className: 'font-sans',
              }}
            />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
