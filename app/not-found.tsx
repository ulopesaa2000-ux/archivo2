import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Página no encontrada | Idol Navy',
  description: 'La página que buscas no existe. Regresa al catálogo o inicia búsqueda.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-store-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-[120px] font-bold text-store-ink3 mb-4">404</div>
          <h1 className="font-serif text-3xl text-store-ink mb-4">
            Página no encontrada
          </h1>
          <p className="text-store-ink2 leading-relaxed">
            La página que estás buscando parece haber sido movida o eliminada.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-store-accent text-white py-3 px-6 rounded-lg hover:bg-store-accent/90 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Ir al inicio</span>
          </Link>
          <Link
            href="/shop"
            className="flex items-center justify-center gap-2 bg-store-bg border border-store-border text-store-ink py-3 px-6 rounded-lg hover:bg-store-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Ver catálogo</span>
          </Link>
        </div>
      </div>
    </div>
  )
}