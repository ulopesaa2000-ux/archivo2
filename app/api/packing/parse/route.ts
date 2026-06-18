// C:\Users\uriel\Downloads\enero 26\archivo2\app\api\packing\parse\route.ts
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.N8N_PACKING_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: 'Falta N8N_PACKING_WEBHOOK_URL en variables de entorno.' },
        { status: 500 },
      )
    }

    const incomingForm = await request.formData()
    const archivo = incomingForm.get('archivo')

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'No llego archivo. El campo debe llamarse archivo.' },
        { status: 400 },
      )
    }

    const formToN8n = new FormData()
    formToN8n.append('archivo', archivo, archivo.name)
    formToN8n.append('parser_selector', String(incomingForm.get('parser_selector') ?? 'Auto'))
    formToN8n.append('proveedor', String(incomingForm.get('proveedor') ?? 'Auto'))
    formToN8n.append('cliente_b2b_id', String(incomingForm.get('cliente_b2b_id') ?? ''))
    formToN8n.append('proveedor_id', String(incomingForm.get('proveedor_id') ?? ''))
    formToN8n.append('orden_id', String(incomingForm.get('orden_id') ?? ''))
    formToN8n.append('contenedor_id', String(incomingForm.get('contenedor_id') ?? ''))
    formToN8n.append('contenedor_codigo', String(incomingForm.get('contenedor_codigo') ?? ''))
    formToN8n.append('celda_encabezado', String(incomingForm.get('celda_encabezado') ?? ''))
    formToN8n.append('columnas_leer', String(incomingForm.get('columnas_leer') ?? ''))
    formToN8n.append('fila_inicio_datos', String(incomingForm.get('fila_inicio_datos') ?? ''))
    formToN8n.append('fila_fin_datos', String(incomingForm.get('fila_fin_datos') ?? ''))

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formToN8n,
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
      return NextResponse.json(
        {
          ok: false,
          error: 'n8n respondio con error.',
          status: n8nResponse.status,
          data,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido procesando Packing List.',
      },
      { status: 500 },
    )
  }
}
