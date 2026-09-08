// C:\Users\uriel\Downloads\enero 26\archivo2\app\error.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, Sparkles } from 'lucide-react'

const CHUNK_RELOAD_KEY = '__app_chunk_reload_ts__'
const RELOAD_THROTTLE_MS = 20_000

function isChunkOrCacheError(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  return (
    /Loading chunk [0-9]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /ERR_CACHE_READ_FAILURE/i.test(msg) ||
    /Failed to register a ServiceWorker/i.test(msg)
  )
}

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isChunkError, setIsChunkError] = useState(false)
  const [isAutoReloading, setIsAutoReloading] = useState(false)

  useEffect(() => {
    console.error('[Root Error Boundary]:', error)

    if (isChunkOrCacheError(error)) {
      setIsChunkError(true)
      try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
        const now = Date.now()
        if (now - lastReload > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
          setIsAutoReloading(true)
          setTimeout(() => {
            window.location.reload()
          }, 300)
        }
      } catch {
        // Fallback silencioso si sessionStorage no está accesible
      }
    }
  }, [error])

  const handleHardRefresh = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }
    } catch {
      // Continuar con reload si fallara alguna llamada de desregistro
    }
    window.location.reload()
  }

  if (isChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {isAutoReloading ? 'Actualizando la aplicación...' : 'Nueva versión disponible'}
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            {isAutoReloading
              ? 'Se detectó una versión actualizada de los módulos. Recargando automáticamente...'
              : 'Se han desplegado actualizaciones en el sistema o la caché del navegador necesita renovarse.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleHardRefresh}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar caché y recargar
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
