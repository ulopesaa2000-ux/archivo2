// app/api/ecommerce/catalog-image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

// NOTA: No usar `export const dynamic = 'force-dynamic'` aquí: es incompatible
// con `cacheComponents: true` de Next 16 y hace que la ruta falle con 500.
// Este Route Handler ya es dinámico por naturaleza (lee `searchParams` y el
// body del POST), así que no necesita configuración adicional.

const FETCH_TIMEOUT_MS = 20000

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
  origin: string,
  maxW: number = 500,
  quality: number = 80
) {
  let targetUrl = url.trim()
  if (targetUrl.startsWith('//')) {
    targetUrl = `https:${targetUrl}`
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `${origin}${targetUrl}`
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    parsedUrl = new URL(encodeURI(targetUrl))
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  // Odoo puede devolver la página de login (text/html) si la sesión expiró o
  // la URL es inválida: detectarlo aquí en vez de fallar dentro de sharp.
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('image/')) {
    throw new Error(`Respuesta no-imagen (${contentType || 'sin content-type'}).`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)
  if (inputBuffer.length === 0) {
    throw new Error('Buffer vacío (0 bytes).')
  }

  return await optimizeImageBuffer(inputBuffer, maxW, quality)
}

/**
 * GET /api/ecommerce/catalog-image?url=...&format=json
 */
export async function GET(request: NextRequest) {
  try {
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

    const result = await fetchAndOptimize(
      rawUrl,
      request.nextUrl.origin,
      maxW,
      quality
    )

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
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    return new NextResponse(result.outputBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(result.outputBuffer.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Image-Width': String(result.width),
        'X-Image-Height': String(result.height),
      },
    })
  } catch (err: any) {
    console.error('Error en GET /api/ecommerce/catalog-image:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error al procesar la imagen.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ecommerce/catalog-image
 * Body: { url: string, maxW?: number, quality?: number } o { urls: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const maxW = Math.min(Number(body.maxW || 500), 1200)
    const quality = Math.min(Math.max(Number(body.quality || 80), 30), 100)

    // Soporte para lote { urls: string[] }
    if (Array.isArray(body.urls)) {
      const results: Record<string, any> = {}
      await Promise.all(
        body.urls.map(async (u: string) => {
          try {
            const opt = await fetchAndOptimize(u, request.nextUrl.origin, maxW, quality)
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

    const result = await fetchAndOptimize(body.url, request.nextUrl.origin, maxW, quality)
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
