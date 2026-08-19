// app/(admin)/inventario/notas/nueva/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchCatalogosInventario, fetchOcrPropuestaById } from '@/modules/inventario/queries'
import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { NoteDraftBuilder } from './NoteDraftBuilder'
import { createStaticClient } from '@/lib/supabase/server'
import type { DraftNota, DraftProducto, NotaCompleta, NotaOcrPropuesta } from '@/modules/inventario/types'
import { AlertCircle } from 'lucide-react'
import { OcrUploadModal } from '../propuestas/OcrUploadModal'

import { fetchConfigInventario } from '@/modules/inventario/config-queries'

export const metadata: Metadata = {
  title: 'Nueva Nota de Inventario',
}

export default async function NuevaNotaPage({
  searchParams,
}: {
  searchParams: Promise<{ propuesta_id?: string; edit_ocr?: string }>
}) {
  const sp = await searchParams
  const propuestaId = sp.propuesta_id || undefined
  const autoOpenOcrSync = sp.edit_ocr === 'true'

  const catalogosPromise = fetchCatalogosInventario()
  const configPromise = fetchConfigInventario()
  const [{ user }, catalogos, config] = await Promise.all([
    verifySession(),
    catalogosPromise,
    configPromise,
  ])

  const cookieStore = await cookies()
  const bodegaCookie = cookieStore.get('bodega_activa_id')?.value
  const activeBodegaId = bodegaCookie ? parseInt(bodegaCookie, 10) : undefined

  const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 3)

  let initialData: NotaCompleta | undefined = undefined
  let ocrUnmatchedLines: { estilo_raw: string; descripcion_raw: string; cajas: number; pz_por_caja: number | null }[] = []
  let ocrProposalId: string | undefined = propuestaId
  let ocrProposal: NotaOcrPropuesta | null = null

  if (propuestaId) {
    const propuesta = await fetchOcrPropuestaById(propuestaId)
    if (propuesta) {
      ocrProposal = propuesta
      const supabase = createStaticClient()
      
      // 1. Mapeo de Tipo de Movimiento estimado
      let tipoId: number | null = null
      if (propuesta.tipo_movimiento_detectado) {
        const detectedLower = propuesta.tipo_movimiento_detectado.toLowerCase()
        const matchedTipo = catalogos.tiposMovimiento.find(t => 
          t.nombre.toLowerCase().includes(detectedLower) || 
          t.codigo.toLowerCase() === detectedLower ||
          detectedLower.includes(t.nombre.toLowerCase())
        )
        if (matchedTipo) tipoId = matchedTipo.id
      }

      // 2. Mapeo de Bodega Origen
      let origenId: number | null = null
      if (propuesta.origen_detectado) {
        const oLower = propuesta.origen_detectado.toLowerCase()
        const matchedBodega = catalogos.bodegas.find(b => 
          b.nombre.toLowerCase().includes(oLower) || 
          b.codigo.toLowerCase() === oLower ||
          oLower.includes(b.nombre.toLowerCase())
        )
        if (matchedBodega) origenId = matchedBodega.id
      }

      // 3. Mapeo de Bodega Destino
      let destinoId: number | null = null
      if (propuesta.destino_detectado) {
        const dLower = propuesta.destino_detectado.toLowerCase()
        const matchedBodega = catalogos.bodegas.find(b => 
          b.nombre.toLowerCase().includes(dLower) || 
          b.codigo.toLowerCase() === dLower ||
          dLower.includes(b.nombre.toLowerCase())
        )
        if (matchedBodega) destinoId = matchedBodega.id
      }

      // 4. Mapeo de líneas de productos
      const mappedProductos: DraftProducto[] = []
      
      if (propuesta.lineas && propuesta.lineas.length > 0) {
        // Extraer los SKUs detectados
        const rawSkus = propuesta.lineas
          .map(l => l.estilo_raw || l.descripcion_raw)
          .filter((val): val is string => !!val)

        // Buscar productos en la BD que coincidan con estos SKUs
        const { data: dbProducts } = rawSkus.length > 0
          ? await supabase
              .from('productos')
              .select('id, sku_base, nombre, descripcion, pz_en_caja')
              .eq('activo', true)
              .in('sku_base', rawSkus)
          : { data: [] }

        const dbProductsMap = new Map(dbProducts?.map(p => [p.sku_base.toUpperCase(), p]) || [])

        // Para cada línea extraída, intentar mapearla
        for (const line of propuesta.lineas) {
          const rawSku = (line.estilo_raw || line.descripcion_raw || '').toUpperCase().trim()
          const matchedDbProd = dbProductsMap.get(rawSku)

          if (matchedDbProd) {
            // Intentar buscar si hay un empaque (caja_producto) con las piezas correctas
            let matchedCajaId: number | null = null
            let matchedCajaCodigo: string | null = null
            let matchedCajaNombre: string | null = null

            if (line.piezas_por_caja) {
              const { data: cajas } = await supabase
                .from('cajas_producto')
                .select('id, codigo_caja, nombre_pack')
                .eq('producto_id', matchedDbProd.id)
                .eq('piezas_por_caja', line.piezas_por_caja)
                .eq('activo', true)
                .limit(1)

              if (cajas && cajas.length > 0) {
                matchedCajaId = cajas[0].id
                matchedCajaCodigo = cajas[0].codigo_caja
                matchedCajaNombre = cajas[0].nombre_pack
              }
            }

            mappedProductos.push({
              tempId: crypto.randomUUID(),
              producto_id: matchedDbProd.id,
              producto_sku: matchedDbProd.sku_base,
              producto_nombre: matchedDbProd.descripcion || matchedDbProd.nombre || '',
              producto_pz_en_caja: matchedDbProd.pz_en_caja,
              cajas: line.cantidad_cajas || 1,
              piezas_sueltas: 0,
              caja_id: matchedCajaId,
              caja_codigo: matchedCajaCodigo,
              caja_nombre_pack: matchedCajaNombre,
              stock_origen_cajas: 0,
              stock_origen_piezas: 0,
            })
          } else {
            // Si no se encuentra, registrar para mostrar advertencia en el formulario
            ocrUnmatchedLines.push({
              estilo_raw: line.estilo_raw || '—',
              descripcion_raw: line.descripcion_raw || '—',
              cajas: line.cantidad_cajas || 1,
              pz_por_caja: line.piezas_por_caja,
            })
          }
        }
      }

      initialData = {
        cabecera: {
          id: 0,
          numero_nota: 'PROPUESTA-OCR',
          fecha_nota: null,
          fecha_confirmacion: null,
          total_cajas: null,
          nota_referencia: propuesta.folio_detectado || `OCR-PROPUESTA-${propuesta.id}`,
          observaciones: `Propuesta OCR creada a partir del escaneo de la nota física #${propuesta.id}`,
          tipo_codigo: '',
          tipo_nombre: '',
          afecta_inventario: 0,
          estado_codigo: 'PEND',
          estado_nombre: 'Pendiente',
          estado_color: null,
          bodega_origen_id: origenId || 0,
          bodega_origen_nombre: '',
          bodega_origen_codigo: '',
          bodega_destino_id: destinoId,
          bodega_destino_nombre: null,
          bodega_destino_codigo: null,
          usuario_nombre: '',
          usuario_id: user.id,
          costo_total: null,
          comprobante_url: propuesta.comprobante_url,
        },
        detalles: [], // Se pasa a través del draft productos
        historial: [],
      }

      // Hack para meter el draft pre-mapeado y líneas OCR originales
      ;(initialData.cabecera as any).tipo_movimiento_id = tipoId
      ;(initialData.cabecera as any).productos_draft = mappedProductos
      ;(initialData.cabecera as any).ocr_lineas = propuesta.lineas
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {propuestaId ? 'Confirmar Propuesta OCR' : 'Nueva Nota de Inventario'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {propuestaId 
              ? 'Revisa y ajusta los productos detectados por la IA antes de generar la nota oficial.'
              : 'Selecciona el tipo de movimiento, verifica la bodega y agrega productos.'}
          </p>
        </div>
      </div>

      {ocrUnmatchedLines.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold tracking-tight">Advertencia: Algunos estilos del OCR no coinciden</p>
            <p className="text-xs opacity-90">
              No pudimos asociar automáticamente {ocrUnmatchedLines.length} línea{ocrUnmatchedLines.length !== 1 ? 's' : ''} con productos de la base de datos:
            </p>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-xs font-mono">
              {ocrUnmatchedLines.map((l, idx) => (
                <li key={idx}>
                  Estilo: <strong className="text-foreground">{l.estilo_raw}</strong> ({l.cajas} cajas {l.pz_por_caja ? `de ${l.pz_por_caja} pzs` : ''}) - {l.descripcion_raw}
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-80 mt-2">Por favor, agrégalos manualmente buscando por SKU correcto.</p>
          </div>
        </div>
      )}

      <NoteDraftBuilder
        catalogos={catalogos}
        usuarioId={user.id}
        mode="create"
        currentUserLevel={user.rol?.nivel_acceso ?? 3}
        userBodegas={userBodegas}
        initialData={initialData}
        ocrProposalId={ocrProposalId}
        ocrProposal={ocrProposal}
        defaultBodegaOrigenId={activeBodegaId}
        autoOpenOcrSync={autoOpenOcrSync}
        config={config}
        userRoleId={user.rol_id ?? user.rol?.id}
      />
    </div>
  )
}
