// app/(store)/error.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function StoreErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Loguear detalle completo en la consola
    console.error('[Store Error Boundary]:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-background dark:bg-zinc-950">
      <div className="max-w-md w-full text-center bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold font-serif text-foreground dark:text-gray-100 mb-2">
          Error al cargar la tienda
        </h1>

        <p className="text-sm text-muted-foreground dark:text-gray-300 mb-6 leading-relaxed">
          Se produjo un problema al renderizar los componentes de la tienda. Esto suele ocurrir por falta de conexión a la base de datos o variables de entorno pendientes en la configuración.
        </p>

        {error.digest && (
          <div className="mb-6 p-2.5 bg-muted dark:bg-zinc-800 rounded-xl text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
              Código Digest de Diagnóstico
            </span>
            <code className="text-xs font-mono text-amber-700 dark:text-amber-400 break-all select-all">
              {error.digest}
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <Link
            href="/inicio"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground dark:text-gray-200 font-semibold text-sm px-6 py-2.5 rounded-xl transition-all border border-border"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
