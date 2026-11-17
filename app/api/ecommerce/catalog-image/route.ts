// app/api/ecommerce/catalog-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getCurrentUser } from '@/modules/auth/queries'
import { can, isClienteEcommerce } from '@/lib/auth/permissions'
import {
  checkCatalogImageRateLimit,
  fetchSafeImageBuffer,
  MAX_BATCH_URLS,
} from '@/lib/security/safe-image-url'

// NOTA: No usar `export const dynamic = 'force-dynamic'` aquí: es incompatible
// con `cacheComponents: true` de Next 16 y hace que la ruta falle con 500.

async function authorizeCatalogImageRequest() {
  const user = await getCurrentUser().catch(() => null)
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'No autenticado.' }, { status: 401 }),
    }
  }
  const hasPermission =
    !isClienteEcommerce(user) &&
    (can(user, 'ecommerce_catalogo', 'puede_leer') || can(user, 'catalogo_productos', 'puede_leer'))
  if (!hasPermission) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 }),
    }
  }
  if (!checkCatalogImageRateLimit(user.id)) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Límite de peticiones excedido.' }, { status: 429 }),
    }
  }
  return { ok: true as const, user }
}

async function optimizeImageBuffer(
  inputBuffer: Buffer,
  maxW: number = 500,
  quality: number = 80
) {
  const image = sharp(inputBuffer)
  const metadata = await image.metadata()

  const origW = metadata.width || 480
  const origH = metadata.height || 640

  let targetW = origW
  let targetH = origH

  if (origW > maxW) {
    targetH = Math.round(maxW * (origH / origW))
    targetW = maxW
  }

  const outputBuffer = await image
    .rotate() // Respeta orientación EXIF (fotos de celular de Odoo/WordPress)
    .resize(targetW, targetH, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' }) // WebP/PNG con transparencia -> fondo blanco, no negro
    .jpeg({
      quality,
      mozjpeg: false,
    })
    .toBuffer()

  const aspectRatio = targetW / targetH
  const base64 = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`

  return {
    outputBuffer,
    base64,
    width: targetW,
    height: targetH,
    aspectRatio,
  }
}

async function fetchAndOptimize(
  url: string,
  userId: number,
  maxW: number = 500,
  quality: number = 80
) {
  const { buffer } = await fetchSafeImageBuffer(url, userId)
  return await optimizeImageBuffer(buffer, maxW, quality)
}

/**
 * GET /api/ecommerce/catalog-image?url=...&format=json
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeCatalogImageRequest()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get('url')
    const format = searchParams.get('format') || 'json'
    const maxW = Math.min(Number(searchParams.get('maxW') || 500), 1200)
    const quality = Math.min(Math.max(Number(searchParams.get('quality') || 80), 30), 100)

    if (!rawUrl || !rawUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Parámetro "url" requerido.' },
        { status: 400 }
      )
    }

    const result = await fetchAndOptimize(rawUrl, auth.user.id, maxW, quality)

    if (format === 'json') {
      return NextResponse.json(
        {
          success: true,
          base64: result.base64,
          width: result.width,
          height: result.height,
          aspectRatio: result.aspectRatio,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=3600',
          },
        }
      )
    }

    return new NextResponse(result.outputBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(result.outputBuffer.length),
        'Cache-Control': 'private, max-age=3600',
        'X-Image-Width': String(result.width),
        'X-Image-Height': String(result.height),
      },
    })
  } catch (err: any) {
    const msg = err?.message || 'Error al procesar la imagen.'
    const isClientError =
      msg.includes('autorizado') ||
      msg.includes('permitid') ||
      msg.includes('bloquead') ||
      msg.includes('HTTPS') ||
      msg.includes('URL')
    console.error('Error en GET /api/ecommerce/catalog-image:', msg)
    return NextResponse.json(
      { success: false, error: msg },
      { status: isClientError ? 400 : 500 }
    )
  }
}

/**
 * POST /api/ecommerce/catalog-image
 * Body: { url: string, maxW?: number, quality?: number } o { urls: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeCatalogImageRequest()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const maxW = Math.min(Number(body.maxW || 500), 1200)
    const quality = Math.min(Math.max(Number(body.quality || 80), 30), 100)

    // Soporte para lote { urls: string[] }
    if (Array.isArray(body.urls)) {
      if (body.urls.length > MAX_BATCH_URLS) {
        return NextResponse.json(
          { success: false, error: `Máximo ${MAX_BATCH_URLS} URLs por lote.` },
          { status: 400 }
        )
      }
      const results: Record<string, any> = {}
      await Promise.all(
        body.urls.map(async (u: string) => {
          try {
            const opt = await fetchAndOptimize(u, auth.user.id, maxW, quality)
            results[u] = {
              success: true,
              base64: opt.base64,
              width: opt.width,
              height: opt.height,
              aspectRatio: opt.aspectRatio,
            }
          } catch (e: any) {
            results[u] = { success: false, error: e?.message }
          }
        })
      )
      return NextResponse.json({ success: true, images: results })
    }

    // Soporte individual { url: string }
    if (!body.url) {
      return NextResponse.json({ success: false, error: 'Campo "url" requerido.' }, { status: 400 })
    }

    const result = await fetchAndOptimize(body.url, auth.user.id, maxW, quality)
    return NextResponse.json({
      success: true,
      base64: result.base64,
      width: result.width,
      height: result.height,
      aspectRatio: result.aspectRatio,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error en POST' }, { status: 500 })
  }
}
