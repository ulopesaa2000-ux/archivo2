// lib/utils/imagen.ts
// Utilidad central para URLs de imágenes optimizadas via imgproxy (Supabase self-hosted)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BUCKET = 'product_images'
// Host de WordPress donde están las imágenes externas del catálogo
const WORDPRESS_HOST = 'snow-wolverine-506185.hostingersite.com'

// ─── Presets de tamaño por contexto de vista ──────────────────────────────────

export type ImagenPreset =
  | 'thumbnail'  // 80px  — miniatura en tablas / listas
  | 'card'       // 300px — grid de catálogo
  | 'card_lg'    // 520px — tab Imágenes, cards grandes
  | 'hero'       // 800px — imagen principal en detalle de producto
  | 'full'       // 1200px — lightbox / zoom
  | 'og'         // 1200×630 — Open Graph / redes sociales

interface PresetConfig {
  width: number
  height?: number
  quality: number
  resize: 'cover' | 'contain' | 'fill'
  format?: 'jpeg' | 'png' | 'webp' | 'origin'
}

const PRESET_CONFIG: Record<ImagenPreset, PresetConfig> = {
  thumbnail: { width: 80,           quality: 75, resize: 'cover'   },
  card:      { width: 300,          quality: 80, resize: 'contain' },
  card_lg:   { width: 520,          quality: 80, resize: 'contain' },
  hero:      { width: 800,          quality: 85, resize: 'contain' },
  full:      { width: 1200,         quality: 90, resize: 'contain' },
  og:        { width: 1200, height: 630, quality: 70, resize: 'fill', format: 'jpeg' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detecta si la URL pertenece al bucket de Storage de este proyecto.
 * Las URLs externas (origen_imagen = 'url_externa') NO deben pasar por imgproxy.
 */
export function isStorageUrl(url: string): boolean {
  return url.includes(SUPABASE_URL) && url.includes(BUCKET)
}

/**
 * Detecta si la URL viene de WordPress (hostingersite.com).
 * WordPress genera variantes de tamaño con el patrón: imagen-WIDTHxHEIGHT.ext
 */
export function isWordPressUrl(url: string): boolean {
  return url.includes(WORDPRESS_HOST)
}

/**
 * Para imágenes de WordPress, inserta el sufijo de tamaño OG (-1080x630)
 * antes de la extensión para usar la variante landscape ya generada por WP.
 *
 * Ejemplo:
 *   AND240016.jpg          → AND240016-1080x630.jpg
 *   AND240016-300x400.jpg  → AND240016-1080x630.jpg  (reemplaza tamaño previo)
 */
export function getWordPressOgUrl(url: string): string {
  // Si ya tiene un sufijo de tamaño WP (ej. -300x400), lo reemplazamos
  // Patrón: -NNNxNNN antes de la extensión
  const withoutSize = url.replace(/-\d+x\d+(\.\w+)$/, '$1')
  // Insertar -1080x630 antes de la extensión
  return withoutSize.replace(/(\.[^.]+)$/, '-1080x630$1')
}

// ─── Funciones principales ────────────────────────────────────────────────────

/**
 * Convierte una URL de Supabase Storage en una URL optimizada por imgproxy.
 * Cambia /object/public/ → /render/image/public/ y agrega parámetros de transformación.
 *
 * @param url    - URL pública del bucket (object/public o render/image)
 * @param preset - Contexto de visualización (thumbnail, card, hero, etc.)
 */
export function getImagenUrl(url: string | null | undefined, preset: ImagenPreset): string {
  if (!url) return '/placeholder-product.webp'

  const config = PRESET_CONFIG[preset]

  // Convertir /object/public/ → /render/image/public/ y limpiar params previos
  const renderBase = url
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    .split('?')[0]

  const params = new URLSearchParams({
    width:   String(config.width),
    quality: String(config.quality),
    resize:  config.resize,
  })
  if (config.height) params.set('height', String(config.height))
  if (config.format) params.set('format', config.format)

  return `${renderBase}?${params.toString()}`
}

/**
 * URL inteligente: aplica imgproxy solo a URLs del bucket propio.
 * URLs externas (url_externa) se devuelven sin modificar.
 *
 * Para OG (WhatsApp, Telegram, Facebook): detecta imagen _seo.jpg y la usa directamente.
 *
 * @param url    - URL de la imagen (puede ser del bucket o URL externa)
 * @param preset - Contexto de visualización
 */
export function getSmartImagenUrl(
  url: string | null | undefined,
  preset: ImagenPreset
): string {
  if (!url) return '/placeholder-product.webp'

  const cleanUrl = url
    .replace('/storage/v1/render/image/public/', '/storage/v1/object/public/')
    .split('?')[0]

  // Para OpenGraph / WhatsApp / Telegram:
  // siempre usar una URL directa, pública y sin transformaciones.
  if (preset === 'og') {
    if (isWordPressUrl(cleanUrl)) {
      return cleanUrl.replace(/-\d+x\d+(\.\w+)$/, '$1')
    }

    if (isStorageUrl(cleanUrl)) {
      return cleanUrl
    }

    return cleanUrl
  }

  // WordPress externo: dejar directo
  if (isWordPressUrl(url)) {
    return url
  }

  // Supabase en vistas normales: sí puedes usar render/image
  if (isStorageUrl(url)) {
    return getImagenUrl(url, preset)
  }

  return url
}

/**
 * Genera un srcSet con múltiples anchos para imágenes responsive.
 * Útil con el atributo sizes en <img> nativo o como loader custom.
 *
 * @param url    - URL de la imagen en el bucket
 * @param widths - Anchos a generar (default: [300, 520, 800, 1200])
 */
export function getImagenSrcSet(
  url: string | null | undefined,
  widths: number[] = [300, 520, 800, 1200]
): string {
  if (!url || !isStorageUrl(url)) return ''

  const base = url
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    .split('?')[0]

  return widths
    .map((w) => `${base}?width=${w}&quality=80&resize=contain ${w}w`)
    .join(', ')
}

// ─── Tamaños de pantalla sugeridos (atributo sizes de next/image) ──────────────

/**
 * Atributos sizes recomendados para cada preset.
 * Usar junto con next/image para que el navegador elija el tamaño correcto.
 */
export const IMAGEN_SIZES: Record<ImagenPreset, string> = {
  thumbnail: '80px',
  card:      '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px',
  card_lg:   '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px',
  hero:      '(max-width: 768px) 100vw, 50vw',
  full:      '100vw',
  og:        '1200px',
}
