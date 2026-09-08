// C:\Users\uriel\Downloads\enero 26\archivo2\app\(store)\error.tsx
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

export default function StoreErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isChunkError, setIsChunkError] = useState(false)
  const [isAutoReloading, setIsAutoReloading] = useState(false)

  useEffect(() => {
    console.error('[Store Error Boundary]:', error)

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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-background dark:bg-zinc-950">
        <div className="max-w-md w-full text-center bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold font-serif text-foreground dark:text-gray-100 mb-2">
            {isAutoReloading ? 'Actualizando la tienda...' : 'Nueva versión de la tienda disponible'}
          </h1>

          <p className="text-sm text-muted-foreground dark:text-gray-300 mb-6 leading-relaxed">
            {isAutoReloading
              ? 'Se detectaron archivos actualizados. Recargando automáticamente...'
              : 'Se han desplegado actualizaciones en el catálogo o la caché del navegador necesita renovarse.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleHardRefresh}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar caché y recargar
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
