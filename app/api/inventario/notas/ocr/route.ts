// app/api/inventario/notas/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionOptional } from '@/lib/dal'
import { fetchConfigInventarioLive, fetchConfigInventario } from '@/modules/inventario/config-queries'
import { isModoSoloCajas, DEFAULT_CONFIG_INVENTARIO } from '@/modules/inventario/config-types'

export const maxDuration = 120 // Permitir hasta 2 minutos para procesamiento de IA/OCR

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const { isAuth, user } = await verifySessionOptional()
    if (!isAuth || !user) {
      return NextResponse.json(
        { ok: false, error: 'Sesión no válida o no autenticado.' },
        { status: 401 }
      )
    }

    const n8nWebhookUrl = process.env.N8N_OCR_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { ok: false, error: 'La variable de entorno N8N_OCR_WEBHOOK_URL no está configurada.' },
        { status: 500 }
      )
    }

    // 2. Extraer archivo y metadatos
    const incomingForm = await request.formData()
    const foto = incomingForm.get('foto')
    
    if (!(foto instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'No se recibió ninguna foto. El campo debe llamarse foto.' },
        { status: 400 }
      )
    }

    const clientRequestId = String(incomingForm.get('client_request_id') || crypto.randomUUID())
    const tipoHint = String(incomingForm.get('tipo_hint') || '')
    const origenHint = String(incomingForm.get('origen_hint') || incomingForm.get('origen') || '')
    const destinoHint = String(incomingForm.get('destino_hint') || incomingForm.get('destino') || '')
    const fechaHint = String(incomingForm.get('fecha_hint') || incomingForm.get('fecha') || '')
    const priorizarIa = incomingForm.get('priorizar_ia')
    const modoSoloCajasRaw = incomingForm.get('modo_solo_cajas')

    // Modo solo cajas: default TRUE si no se envía o si falla config (evita piezas sueltas por error)
    let modoSoloCajas = DEFAULT_CONFIG_INVENTARIO.modo_solo_cajas
    if (modoSoloCajasRaw !== null && modoSoloCajasRaw !== undefined && String(modoSoloCajasRaw) !== '') {
      const v = String(modoSoloCajasRaw).toLowerCase().trim()
      modoSoloCajas = !(v === 'false' || v === '0' || v === 'no' || v === 'off')
    } else {
      try {
        const cfg = await fetchConfigInventarioLive().catch(() => fetchConfigInventario())
        modoSoloCajas = isModoSoloCajas(cfg)
      } catch {
        modoSoloCajas = true
      }
    }

    // 3. Optimizar imagen con Sharp preservando máxima nitidez para OCR
    const rawBuffer = Buffer.from(await foto.arrayBuffer())
    let optimizedBuffer: Buffer

    try {
      const sharp = (await import('sharp')).default
      optimizedBuffer = await sharp(rawBuffer)
        .rotate() // Respeta orientación EXIF de celulares
        .resize({
          width: 2400,
          height: 2400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          mozjpeg: true,
        })
        .toBuffer()
    } catch (sharpError) {
      console.warn('Fallo optimización con sharp, usando imagen original:', sharpError)
      optimizedBuffer = rawBuffer
    }

    // 4. Construir FormData para enviar a n8n
    const n8nForm = new FormData()
    const optimizedBlob = new Blob([new Uint8Array(optimizedBuffer)], { type: 'image/jpeg' })
    n8nForm.append('foto', optimizedBlob, 'foto_nota.jpg')
    n8nForm.append('client_request_id', clientRequestId)
    n8nForm.append('usuario_id', String(user.id))
    if (priorizarIa !== null && priorizarIa !== undefined && priorizarIa !== '') {
      n8nForm.append('priorizar_ia', String(priorizarIa))
    }
    if (tipoHint) {
      n8nForm.append('tipo_hint', tipoHint)
    }
    if (origenHint) {
      n8nForm.append('origen_hint', origenHint)
    }
    if (destinoHint) {
      n8nForm.append('destino_hint', destinoHint)
    }
    if (fechaHint) {
      n8nForm.append('fecha_hint', fechaHint)
    }
    // Siempre enviar modo_solo_cajas explícito (default true) para que n8n ignore piezas sueltas pre-DB
    n8nForm.append('modo_solo_cajas', String(modoSoloCajas))

    // 5. Reenviar al webhook de n8n
    console.log(`Enviando propuesta OCR optimizada a n8n: ID ${clientRequestId} (${(optimizedBuffer.length / 1024).toFixed(1)} KB vs original ${(rawBuffer.length / 1024).toFixed(1)} KB)`)
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: n8nForm,
      cache: 'no-store',
    })

    const rawText = await n8nResponse.text()
    let data: unknown
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { raw: rawText }
    }

    if (!n8nResponse.ok) {
      console.error('Error de respuesta de n8n webhook:', rawText)
      return NextResponse.json(
        {
          ok: false,
          error: 'El servicio de procesamiento (n8n) reportó un error.',
          status: n8nResponse.status,
          data,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Excepción en API ocr proxy:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error interno procesando OCR de la nota.',
      },
      { status: 500 }
    )
  }
}
