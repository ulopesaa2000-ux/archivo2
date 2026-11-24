// app/api/inventario/conteo-fisico/ocr/route.ts
/**
 * Route handler para digitalizar y analizar hojas manuscritas de inventario físico
 * en libreta cuadriculada (2 columnas, operaciones aritméticas 1.1 / 4+2, etc.).
 * RBAC: Restringido a usuarios con nivel_acceso <= 2 o administradores de inventario.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySessionOptional } from '@/lib/dal'
import { isSuperAdmin, can } from '@/lib/auth/permissions'
import { fetchCatalogoOcrIndexado } from '@/modules/inventario/ocr-catalog-queries'
import { guardarHojaConteoOcrAction } from '@/modules/inventario/conteo-fisico-actions'
import {
  evaluarRenglonContraCatalogo,
  normalizarTextoSkuConteo,
  recalcularResumenHoja,
} from '@/lib/inventario/conteo-fisico-matcher'
import type { HojaConteoFisico, RenglonConteoFisico } from '@/modules/inventario/conteo-fisico-types'

export const maxDuration = 120 // Hasta 2 minutos para procesamiento de IA y visión

const N8N_CONTEO_FISICO_WEBHOOK =
  process.env.N8N_CONTEO_FISICO_WEBHOOK_URL ||
  'https://n8n.sistemaindumentaria.com/webhook/conteo-fisico-hojas-ocr'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar sesión y autenticación
    const { isAuth, user } = await verifySessionOptional()
    if (!isAuth || !user) {
      return NextResponse.json(
        { ok: false, error: 'Sesión no válida o no autenticado.' },
        { status: 401 }
      )
    }

    // 2. Verificar RBAC: nivel_acceso <= 2 o superadmin o permiso de inventario
    const nivelAcceso = user.rol?.nivel_acceso ?? 99
    const esAutorizado =
      isSuperAdmin(user) ||
      nivelAcceso <= 2 ||
      can(user, 'inventario_stock', 'puede_editar') ||
      can(user, 'inventario_notas', 'puede_crear')

    if (!esAutorizado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Permisos insuficientes. El escaneo de inventario físico requiere nivel de acceso 2 (Administrador) o superior.',
        },
        { status: 403 }
      )
    }

    // 3. Extraer FormData (foto y metadatos)
    const incomingForm = await request.formData()
    const foto = incomingForm.get('foto')

    if (!(foto instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'No se recibió ningún archivo de imagen (campo "foto").' },
        { status: 400 }
      )
    }

    const numeroHoja = parseInt(String(incomingForm.get('numero_hoja') || '1'), 10) || 1
    const totalHojas = parseInt(String(incomingForm.get('total_hojas') || '1'), 10) || 1
    const bodegaIdRaw = incomingForm.get('bodega_id')
    const bodegaId = bodegaIdRaw ? parseInt(String(bodegaIdRaw), 10) : null
    const clientRequestIdRaw = incomingForm.get('client_request_id')
    const clientRequestId = clientRequestIdRaw ? String(clientRequestIdRaw) : `hoja_${numeroHoja}_${Date.now()}`

    // 4. Optimizar imagen con Sharp para orientación EXIF y resolución nítida
    const rawBuffer = Buffer.from(await foto.arrayBuffer())
    let optimizedBuffer: Buffer

    try {
      const sharp = (await import('sharp')).default
      optimizedBuffer = await sharp(rawBuffer)
        .rotate() // Respeta rotación EXIF de móviles (evita que la hoja quede girada 90°)
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

    // 5. Enviar al webhook de n8n y cargar catálogo indexado en paralelo
    const n8nForm = new FormData()
    const optimizedBlob = new Blob([new Uint8Array(optimizedBuffer)], { type: 'image/jpeg' })
    n8nForm.append('foto', optimizedBlob, `hoja_${numeroHoja}.jpg`)
    n8nForm.append('numero_hoja', String(numeroHoja))
    n8nForm.append('total_hojas', String(totalHojas))

    const [n8nResponse, catalogoIndexado] = await Promise.all([
      fetch(N8N_CONTEO_FISICO_WEBHOOK, {
        method: 'POST',
        body: n8nForm,
      }),
      fetchCatalogoOcrIndexado(),
    ])

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('Error desde webhook n8n:', n8nResponse.status, errorText)
      return NextResponse.json(
        {
          ok: false,
          error: `Error procesando la imagen con IA (${n8nResponse.status}). Intente de nuevo o verifique la nitidez de la foto.`,
        },
        { status: 502 }
      )
    }

    const n8nData = await n8nResponse.json()
    const renglonesRaw = Array.isArray(n8nData.renglones) ? n8nData.renglones : []

    // 6. Enriquecer renglones con el motor 2-partes de lib/inventario/sku-matcher.ts
    const renglonesEnriquecidos: RenglonConteoFisico[] = renglonesRaw.map((r: any, idx: number) => {
      const col: 1 | 2 = r.columna === 2 ? 2 : 1
      const skuCandidato = normalizarTextoSkuConteo(r.sku_candidato || r.estilo_raw || '')
      const estiloRaw = String(r.estilo_raw || skuCandidato).trim()
      const cajas = Number(r.cajas) || 0
      const variantes = Array.isArray(r.posibles_variantes)
        ? r.posibles_variantes.map((v: unknown) => String(v || '').trim()).filter(Boolean)
        : undefined

      const baseRenglon: RenglonConteoFisico = {
        id: r.id || `h${numeroHoja}_c${col}_r${idx + 1}`,
        numero_hoja: numeroHoja,
        columna: col,
        renglon: r.renglon || idx + 1,
        estilo_raw: estiloRaw,
        sku_candidato: skuCandidato,
        cajas_raw: String(r.cajas_raw || r.cajas || '1'),
        cajas,
        confianza: typeof r.confianza === 'number' ? r.confianza : 0.95,
        posibles_variantes: variantes,
        modificado_manualmente: false,
      }

      return evaluarRenglonContraCatalogo(baseRenglon, catalogoIndexado, {
        forzarReevaluacion: true,
      })
    })

    const hojaResult: HojaConteoFisico = {
      id: clientRequestId,
      numero_hoja: numeroHoja,
      comprobante_url: n8nData.comprobante_url || undefined,
      encabezado: n8nData.encabezado || '',
      fecha_detectada: n8nData.fecha_detectada || '',
      resumen: recalcularResumenHoja(renglonesEnriquecidos),
      renglones: renglonesEnriquecidos,
    }

    // 7. Persistir automáticamente en "inv-tienda".nota_ocr_propuestas (CONTEO_PENDIENTE)
    try {
      const dbSaveRes = await guardarHojaConteoOcrAction(hojaResult, bodegaId)
      if (dbSaveRes.success) {
        hojaResult.propuesta_db_id = dbSaveRes.data.propuestaId
      }
    } catch (saveDbErr) {
      console.warn('Advertencia: no se pudo persistir inmediatamente en DB propuesta:', saveDbErr)
    }

    return NextResponse.json({
      ok: true,
      hoja: hojaResult,
    })
  } catch (error: any) {
    console.error('Error in route /api/inventario/conteo-fisico/ocr:', error)
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error interno al procesar el conteo físico.' },
      { status: 500 }
    )
  }
}
