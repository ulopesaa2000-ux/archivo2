// C:\Users\uriel\Downloads\enero 26\archivo2\components\shared\ErrorBoundary.tsx
'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  isChunkError: boolean
  isAutoReloading: boolean
}

const CHUNK_RELOAD_KEY = '__app_chunk_reload_ts__'
const RELOAD_THROTTLE_MS = 20_000

function isChunkOrCacheError(err?: Error): boolean {
  if (!err) return false
  const msg = `${err.name} ${err.message}`
  return (
    /Loading chunk [0-9]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /ERR_CACHE_READ_FAILURE/i.test(msg) ||
    /Failed to register a ServiceWorker/i.test(msg)
  )
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false,
    isAutoReloading: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkOrCacheError(error)
    return {
      hasError: true,
      error,
      isChunkError: chunkError,
      isAutoReloading: false,
    }
  }

  public componentDidCatch(error: Error) {
    if (isChunkOrCacheError(error)) {
      try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
        const now = Date.now()
        if (now - lastReload > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
          this.setState({ isAutoReloading: true })
          setTimeout(() => {
            window.location.reload()
          }, 300)
        }
      } catch {
        // Fallback si sessionStorage está bloqueado
      }
    }
  }

  private handleHardRefresh = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((n) => caches.delete(n)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
    } catch {
      // Ignorar fallos de limpieza
    }
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-store-bg flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="mb-8">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20 text-amber-600">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h1 className="font-serif text-2xl text-store-ink mb-4">
                  {this.state.isAutoReloading ? 'Actualizando la aplicación...' : 'Nueva versión disponible'}
                </h1>
                <p className="text-store-ink2 leading-relaxed mb-6">
                  {this.state.isAutoReloading
                    ? 'Se detectaron archivos actualizados en el sistema. Recargando automáticamente...'
                    : 'Se han desplegado actualizaciones o la caché del navegador necesita sincronizarse.'}
                </p>

                {this.state.error && (
                  <details className="text-left bg-store-surface border border-store-border rounded-lg p-4 mb-6">
                    <summary className="cursor-pointer text-sm font-medium text-store-ink mb-2">
                      Ver detalles del error
                    </summary>
                    <p className="text-xs text-store-ink3 font-mono break-all">
                      {this.state.error.message}
                    </p>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleHardRefresh}
                  className="flex items-center justify-center gap-2 bg-store-accent text-white py-3 px-6 rounded-lg hover:bg-store-accent/90 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Limpiar caché y recargar</span>
                </button>
                <Link
                  href="/inicio"
                  className="flex items-center justify-center gap-2 bg-store-bg border border-store-border text-store-ink py-3 px-6 rounded-lg hover:bg-store-surface transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Ir al inicio</span>
                </Link>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-store-bg flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="font-serif text-2xl text-store-ink mb-4">
                Algo salió mal
              </h1>
              <p className="text-store-ink2 leading-relaxed mb-6">
                Ha ocurrido un error inesperado. No te preocupes, estamos trabajando para solucionarlo.
              </p>

              {this.state.error && (
                <details className="text-left bg-store-surface border border-store-border rounded-lg p-4 mb-6">
                  <summary className="cursor-pointer text-sm font-medium text-store-ink mb-2">
                    Ver detalles del error
                  </summary>
                  <p className="text-xs text-store-ink3 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="flex items-center justify-center gap-2 bg-store-accent text-white py-3 px-6 rounded-lg hover:bg-store-accent/90 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Intentar de nuevo</span>
              </button>
              <Link
                href="/inicio"
                className="flex items-center justify-center gap-2 bg-store-bg border border-store-border text-store-ink py-3 px-6 rounded-lg hover:bg-store-surface transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Ir al inicio</span>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}