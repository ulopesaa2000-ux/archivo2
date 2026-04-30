---
name: supabase-imgproxy
description: >
  Image optimization patterns for Next.js projects using Supabase Storage
  self-hosted with imgproxy. Use when displaying product images, thumbnails,
  gallery grids, hero images, or any Supabase Storage URL that needs
  responsive sizing, format conversion (WebP), or quality optimization.
  Applies to: next/image with Supabase, product catalogs, image galleries,
  TabImagenes, ImagenCard, or any component fetching from the product_images bucket.
---

# Skill: Supabase imgproxy — Image Optimization for Next.js

## Stack Context
- **Storage**: Supabase self-hosted on VPS (Docker)
- **Image processor**: imgproxy (companion container)
- **Framework**: Next.js 14+ with App Router
- **Bucket**: `product_images` (public)
- **Base URL**: `https://supabase.sistemaindumentaria.com`

---

## 1. How imgproxy URLs Work in Self-Hosted Supabase

When imgproxy is enabled, Supabase Storage exposes a **render endpoint** instead of the plain `object/public` path:

```
# Original (no optimization)
https://supabase.sistemaindumentaria.com/storage/v1/object/public/product_images/Productos/K24/principal/uuid.webp

# Optimized via imgproxy (render endpoint)
https://supabase.sistemaindumentaria.com/storage/v1/render/image/public/product_images/Productos/K24/principal/uuid.webp?width=520&quality=80&resize=contain
```

The key difference: `/object/public/` → `/render/image/public/`

---

## 2. The Central Utility — `lib/utils/imagen.ts`

**ALWAYS create this file first** when implementing image optimization:

```ts
// lib/utils/imagen.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = 'product_images'

// ─── Preset sizes by view context ─────────────────────────────────────────────

export type ImagenPreset =
  | 'thumbnail'    // 80px  — avatars, mini previews in tables/lists
  | 'card'         // 300px — product grid cards (catálogo listado)
  | 'card_lg'      // 520px — large cards, tab imagenes grid
  | 'hero'         // 800px — product hero (detail page, main image)
  | 'full'         // 1200px — lightbox, full-screen zoom
  | 'og'           // 1200x630px — Open Graph social sharing

const PRESET_CONFIG: Record<ImagenPreset, {
  width: number
  height?: number
  quality: number
  resize: 'cover' | 'contain' | 'fill'
}> = {
  thumbnail: { width: 80,   quality: 75, resize: 'cover'   },
  card:      { width: 300,  quality: 80, resize: 'contain' },
  card_lg:   { width: 520,  quality: 80, resize: 'contain' },
  hero:      { width: 800,  quality: 85, resize: 'contain' },
  full:      { width: 1200, quality: 90, resize: 'contain' },
  og:        { width: 1200, height: 630, quality: 85, resize: 'cover' },
}

// ─── Core function ─────────────────────────────────────────────────────────────

/**
 * Converts a Supabase Storage URL (object/public or render/image)
 * into an optimized imgproxy URL for the given preset.
 *
 * @param url     - Full Supabase public URL of the image
 * @param preset  - Size/quality preset for the display context
 * @returns       - Optimized render URL, or original URL if imgproxy is unavailable
 */
export function getImagenUrl(url: string | null | undefined, preset: ImagenPreset): string {
  if (!url) return '/placeholder-product.webp'

  const config = PRESET_CONFIG[preset]

  // If already a render URL, replace params; otherwise convert object→render
  const renderBase = url
    .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    .split('?')[0]  // strip existing params

  const params = new URLSearchParams({
    width:   String(config.width),
    quality: String(config.quality),
    resize:  config.resize,
  })
  if (config.height) params.set('height', String(config.height))

  return `${renderBase}?${params.toString()}`
}

/**
 * Returns a srcSet string with multiple sizes for responsive <img> or next/image.
 * Use with sizes attribute for best performance.
 *
 * @param url     - Full Supabase public URL of the image
 * @param widths  - Array of widths to generate (default: [300, 520, 800, 1200])
 */
export function getImagenSrcSet(
  url: string | null | undefined,
  widths: number[] = [300, 520, 800, 1200]
): string {
  if (!url) return ''
  return widths
    .map((w) => {
      const renderUrl = url
        .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
        .split('?')[0]
      return `${renderUrl}?width=${w}&quality=80&resize=contain ${w}w`
    })
    .join(', ')
}

/**
 * Checks if a URL is from this project's Supabase bucket.
 * External URLs (url_externa) are returned as-is (no imgproxy).
 */
export function isStorageUrl(url: string): boolean {
  return url.includes(SUPABASE_URL) && url.includes(BUCKET)
}

/**
 * Smart URL: applies imgproxy only to Storage URLs, passes through external URLs.
 */
export function getSmartImagenUrl(url: string | null | undefined, preset: ImagenPreset): string {
  if (!url) return '/placeholder-product.webp'
  if (!isStorageUrl(url)) return url  // URL externa — no pasar por imgproxy
  return getImagenUrl(url, preset)
}
```

---

## 3. Preset Usage Guide

| Context | Preset | Where Used |
|---------|--------|------------|
| Tabla de listado (`/catalogo`) | `thumbnail` | Columna de miniatura en DataTable |
| Grid de catálogo (cards) | `card` | ProductCard en listado |
| Tab Imágenes (grid admin) | `card_lg` | ImagenCard en TabImagenes |
| Hero del producto (`/catalogo/[id]`) | `hero` | Imagen principal en detalle |
| Lightbox / zoom | `full` | Modal de imagen ampliada |
| OG / SEO meta tag | `og` | `<meta property="og:image">` |
| Avatar / mini preview | `thumbnail` | Tablas con imagen pequeña |

---

## 4. Component Patterns

### A) `next/image` with imgproxy (recommended for LCP)
```tsx
import Image from 'next/image'
import { getSmartImagenUrl } from '@/lib/utils/imagen'

// In a product card:
<Image
  src={getSmartImagenUrl(imagen.url, 'card')}
  alt={imagen.alt_text ?? producto.sku_base}
  fill
  className="object-contain"
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
/>
```

### B) Hero image (detail page)
```tsx
<Image
  src={getSmartImagenUrl(imagen.url, 'hero')}
  alt={imagen.alt_text ?? sku}
  fill
  priority    // ← LCP image, always add priority
  className="object-contain"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### C) Thumbnail in a table/list
```tsx
<img
  src={getSmartImagenUrl(imagen.url, 'thumbnail')}
  alt={imagen.alt_text ?? ''}
  className="h-10 w-10 object-cover rounded"
  loading="lazy"
/>
```

### D) OG image for metadata
```ts
// In page.tsx generateMetadata:
import { getSmartImagenUrl } from '@/lib/utils/imagen'

export async function generateMetadata({ params }) {
  const producto = await fetchProductoPorId(params.id)
  const imagenPrincipal = producto?.imagenes?.find(i => i.es_principal)

  return {
    openGraph: {
      images: imagenPrincipal
        ? [{ url: getSmartImagenUrl(imagenPrincipal.url, 'og'), width: 1200, height: 630 }]
        : [],
    },
  }
}
```

---

## 5. next.config.ts — Required Pattern

Add the render endpoint to `remotePatterns` alongside the object URL:

```ts
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'supabase.sistemaindumentaria.com',
      pathname: '/storage/v1/object/public/**',
    },
    {
      // imgproxy render endpoint — MUST be separate entry
      protocol: 'https',
      hostname: 'supabase.sistemaindumentaria.com',
      pathname: '/storage/v1/render/image/public/**',
    },
  ],
}
```

---

## 6. External URL Handling

Images with `origen_imagen === 'url_externa'` MUST NOT pass through imgproxy:

```ts
// Use getSmartImagenUrl (not getImagenUrl) — it auto-detects external URLs
const src = getSmartImagenUrl(imagen.url, 'card_lg')
// → If URL is from Supabase bucket: applies imgproxy
// → If URL is from external domain: returns as-is
```

---

## 7. Supabase Self-Hosted VPS Configuration Checklist

Before using this skill, verify imgproxy is enabled:

**`.env` file on VPS:**
```bash
ENABLE_IMAGE_TRANSFORMATION=true
IMGPROXY_URL=http://imgproxy:5001
IMGPROXY_KEY=<random-hex-64-chars>
IMGPROXY_SALT=<random-hex-64-chars>
```

**`docker-compose.yml`:**
```yaml
imgproxy:
  image: darthsim/imgproxy:v3.8.0
  restart: unless-stopped
  environment:
    - IMGPROXY_ENABLE_WEBP_DETECTION=true
    - IMGPROXY_JPEG_PROGRESSIVE=true
    - IMGPROXY_KEY=${IMGPROXY_KEY}
    - IMGPROXY_SALT=${IMGPROXY_SALT}
    - IMGPROXY_MAX_SRC_RESOLUTION=50
  volumes:
    - ./volumes/storage:/var/lib/storage:z
```

**Test the endpoint:**
```bash
# Should return an optimized WebP image:
curl -I "https://supabase.sistemaindumentaria.com/storage/v1/render/image/public/product_images/Productos/TEST/principal/test.webp?width=300&quality=80"
# Expected: HTTP 200 with Content-Type: image/webp
```

---

## 8. Implementation Order for a New Component

1. Import `getSmartImagenUrl` from `@/lib/utils/imagen`
2. Choose the correct preset based on the display context (see table in §3)
3. Pass the optimized URL to `next/image` or `<img>`
4. Add appropriate `sizes` attribute for responsive behavior
5. Add `priority` only to LCP images (hero/main image above the fold)
6. For external URLs — `getSmartImagenUrl` handles them automatically

---

## 9. Fallback Strategy

If imgproxy is not enabled (render endpoint returns 404):

```ts
// lib/utils/imagen.ts — add fallback detection
export function getImagenUrlWithFallback(
  url: string | null | undefined,
  preset: ImagenPreset
): string {
  if (!url) return '/placeholder-product.webp'
  if (!isStorageUrl(url)) return url
  // If ENABLE_IMAGE_TRANSFORMATION not set, return original URL
  if (process.env.NEXT_PUBLIC_IMGPROXY_ENABLED !== 'true') return url
  return getImagenUrl(url, preset)
}
```

Set `NEXT_PUBLIC_IMGPROXY_ENABLED=true` in `.env.local` once imgproxy is confirmed working.

---

## 10. Quick Reference — Preset Sizes

```
thumbnail  →  80px  @ q75  cover    (tablas, mini avatares)
card       → 300px  @ q80  contain  (grid listado catálogo)
card_lg    → 520px  @ q80  contain  (tab imágenes, cards grandes)
hero       → 800px  @ q85  contain  (detalle producto, imagen principal)
full       → 1200px @ q90  contain  (lightbox, zoom)
og         → 1200x630 @ q85 cover  (Open Graph / redes sociales)
```
