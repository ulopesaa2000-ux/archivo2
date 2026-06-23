// app/api/inventario/notas/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionOptional } from '@/lib/dal'

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

    // 3. Construir FormData para enviar a n8n
    const n8nForm = new FormData()
    n8nForm.append('foto', foto, foto.name)
    n8nForm.append('client_request_id', clientRequestId)
    if (tipoHint) {
      n8nForm.append('tipo_hint', tipoHint)
    }

    // 4. Reenviar al webhook de n8n
    console.log(`Enviando propuesta OCR a n8n: ID ${clientRequestId}`)
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
