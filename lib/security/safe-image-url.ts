// lib/security/safe-image-url.ts
import 'server-only'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const BASE_ALLOWED_HOSTS = [
  'supabase.sistemaindumentaria.com',
  'moda.sistemaindumentaria.com',
  'snow-wolverine-506185.hostingersite.com',
]

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_BATCH_URLS = 20
export const FETCH_IMAGE_TIMEOUT_MS = 5000

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 120
const userRateBuckets = new Map<number, number[]>()

export function checkCatalogImageRateLimit(userId: number): boolean {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const prev = (userRateBuckets.get(userId) ?? []).filter((ts) => ts > cutoff)
  if (prev.length >= RATE_LIMIT_MAX_REQUESTS) {
    userRateBuckets.set(userId, prev)
    return false
  }
  prev.push(now)
  userRateBuckets.set(userId, prev)
  return true
}

function getAllowedHosts(): Set<string> {
  const hosts = new Set(BASE_ALLOWED_HOSTS)
  for (const envUrl of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
    if (!envUrl) continue
    try {
      const parsed = new URL(envUrl)
      if (parsed.hostname) hosts.add(parsed.hostname.toLowerCase())
    } catch {
      // ignorar URL inválida en env
    }
  }
  return hosts
}

function isPrivateOrBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().trim()
  if (!normalized) return true
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1' || normalized === '::') return true
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrBlockedIp(normalized.slice(7))
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) {
    return true
  }

  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return isIP(normalized) === 6 ? false : true
  }

  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // cloud metadata & link-local
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

export async function validateSafeImageUrl(rawUrl: string): Promise<URL> {
  let targetUrl = rawUrl.trim()
  if (targetUrl.startsWith('//')) {
    targetUrl = `https:${targetUrl}`
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    parsedUrl = new URL(encodeURI(targetUrl))
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Solo se permiten URLs HTTPS.')
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('No se permiten credenciales en la URL.')
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Host no permitido.')
  }

  const allowedHosts = getAllowedHosts()
  if (!allowedHosts.has(hostname)) {
    throw new Error(`Dominio no autorizado: ${hostname}`)
  }

  if (isIP(hostname) !== 0 && isPrivateOrBlockedIp(hostname)) {
    throw new Error('IP privada o reservada bloqueada.')
  }

  const resolved = await lookup(hostname, { all: true })
  if (!resolved || resolved.length === 0) {
    throw new Error('No se pudo resolver el host.')
  }
  for (const entry of resolved) {
    if (isPrivateOrBlockedIp(entry.address)) {
      throw new Error('El dominio resolvió a una IP privada o bloqueada.')
    }
  }

  return parsedUrl
}

export async function fetchSafeImageBuffer(
  rawUrl: string,
  userId: number
): Promise<{ buffer: Buffer; host: string; bytes: number }> {
  const parsedUrl = await validateSafeImageUrl(rawUrl)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_IMAGE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      credentials: 'omit',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (response.status >= 300 && response.status < 400) {
    throw new Error('Redirecciones no permitidas al descargar imagen.')
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('image/')) {
    throw new Error(`Respuesta no-imagen (${contentType || 'sin content-type'}).`)
  }

  const contentLengthHeader = Number(response.headers.get('content-length') || 0)
  if (contentLengthHeader > MAX_IMAGE_BYTES) {
    throw new Error('La imagen excede el tamaño máximo permitido (10 MB).')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Respuesta sin cuerpo.')
  }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      totalBytes += value.byteLength
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel()
        throw new Error('La imagen excede el tamaño máximo permitido (10 MB).')
      }
      chunks.push(value)
    }
  }

  if (totalBytes === 0) {
    throw new Error('Buffer vacío (0 bytes).')
  }

  const buffer = Buffer.concat(chunks, totalBytes)
  console.info('[catalog-image]', {
    userId,
    host: parsedUrl.hostname,
    bytes: totalBytes,
  })

  return { buffer, host: parsedUrl.hostname, bytes: totalBytes }
}
