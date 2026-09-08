// C:\Users\uriel\Downloads\enero 26\archivo2\components\shared\ChunkErrorRecovery.tsx
'use client'

import { useEffect } from 'react'

const CHUNK_RELOAD_KEY = '__app_chunk_reload_ts__'
const RELOAD_THROTTLE_MS = 20_000 // 20 segundos para evitar loops de recarga

function isChunkOrCacheError(err: unknown): boolean {
  if (!err) return false

  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message}`
        : typeof (err as { reason?: unknown }).reason === 'object'
          ? String((err as { reason?: { message?: string } }).reason?.message || '')
          : String(err)

  return (
    /Loading chunk [0-9]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /ERR_CACHE_READ_FAILURE/i.test(message) ||
    /Failed to register a ServiceWorker.*An unknown error occurred/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  )
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    function tryAutoReload(triggerMessage: string) {
      try {
        const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
        const now = Date.now()

        if (now - lastReload > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
          console.warn(`[AutoRecovery] ${triggerMessage}. Forzando recarga limpia de la aplicación...`)

          // Notificar al Service Worker para que busque la última versión disponible
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              for (const reg of regs) {
                reg.update().catch(() => {})
              }
            }).catch(() => {})
          }

          window.location.reload()
        } else {
          console.warn(`[AutoRecovery] ${triggerMessage} detectado, pero se omitió recarga por throttle de seguridad.`)
        }
      } catch {
        // Ignorar excepciones al acceder a sessionStorage si cookies/almacenamiento están bloqueados
      }
    }

    function errorHandler(event: ErrorEvent) {
      if (isChunkOrCacheError(event.error || event.message)) {
        tryAutoReload(`Error de chunk o caché detectado: ${event.message || event.error?.message}`)
      }
    }

    function rejectionHandler(event: PromiseRejectionEvent) {
      if (isChunkOrCacheError(event.reason)) {
        tryAutoReload(`Rechazo de promesa de chunk/caché detectado: ${event.reason?.message || event.reason}`)
      }
    }

    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectionHandler)

    return () => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', rejectionHandler)
    }
  }, [])

  return null
}
