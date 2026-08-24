// app/error.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Root Error Boundary]:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          Ocurrió un error inesperado
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Ocurrió un fallo en el servidor durante la ejecución. Si estás en producción, verifica los logs del contenedor Docker o las variables de entorno de Supabase.
        </p>

        {error.digest && (
          <div className="mb-6 p-3 bg-slate-950 rounded-xl text-left border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Digest (Error Code)
            </span>
            <code className="text-xs font-mono text-red-400 break-all select-all">
              {error.digest}
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <Link
            href="/inicio"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-6 py-2.5 rounded-xl transition-all border border-slate-700"
          >
            <Home className="w-4 h-4" />
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
