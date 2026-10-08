// app/(store)/favoritos/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Heart } from 'lucide-react'
import { FavoritosList } from '@/components/store/favoritos/FavoritosList'
import { verifySessionOptional } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Mis Favoritos | Catálogo IDOL NAVY',
  description: 'Tus productos guardados con el corazón. Disponibles con o sin sesión.',
}

async function FavoritosContent() {
  const session = await verifySessionOptional()
  return (
    <FavoritosList
      isLogged={session.isAuth}
      userName={session.user?.nombre_completo ?? null}
    />
  )
}

export default function FavoritosPage() {
  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-red-600 bg-red-500/10 px-3 py-1 rounded-full">
            <Heart className="h-3.5 w-3.5 fill-current" />
            Mis favoritos
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Productos que te gustan
          </h1>
          <p className="text-sm text-muted-foreground">
            Se guardan en este navegador aunque no inicies sesión. Al iniciar sesión se guardan permanentes en tu cuenta.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          }
        >
          <FavoritosContent />
        </Suspense>
      </div>
    </div>
  )
}
