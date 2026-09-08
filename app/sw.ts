// C:\Users\uriel\Downloads\enero 26\archivo2\app\sw.ts
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry } from 'serwist'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[]
}

// Filtrar el manifiesto para evitar precachear chunks pesados o variables del panel admin
const filteredPrecacheEntries = (self.__SW_MANIFEST || []).filter((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url
  // El panel de administración no opera offline y precachear sus chunks genera colisiones en disco
  if (url.includes('(admin)') || url.includes('%28admin%29') || url.includes('/admin/')) {
    return false
  }
  if (url.endsWith('.map')) {
    return false
  }
  return true
})

const serwist = new Serwist({
  precacheEntries: filteredPrecacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

// Fallback de red como red de seguridad ante cualquier fallo de lectura en caché (ej. ERR_CACHE_READ_FAILURE)
serwist.setCatchHandler(async ({ request }) => {
  try {
    return await fetch(request)
  } catch {
    return Response.error()
  }
})

serwist.addEventListeners()
