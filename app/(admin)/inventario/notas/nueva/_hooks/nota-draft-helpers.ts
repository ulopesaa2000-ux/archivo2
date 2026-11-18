// app/(admin)/inventario/notas/nueva/_hooks/nota-draft-helpers.ts

import { todayMX, formatForDateInput } from '@/lib/utils'
import type { BodegaRow } from '@/lib/types/tables'
import type {
  CatalogosInventario,
  DraftNota,
  NotaCompleta,
  NotaOcrPropuesta,
} from '@/modules/inventario/types'
import type { ConfigInventario } from '@/modules/inventario/config-types'

export function buildInitialDraft(params: {
  mode: 'create' | 'edit'
  initialData?: NotaCompleta
  catalogos: CatalogosInventario
  defaultBodegaOrigenId?: number
  config?: ConfigInventario
  currentUserLevel: number
  userRoleId?: number
}): DraftNota {
  const { mode, initialData, catalogos, defaultBodegaOrigenId, config, currentUserLevel, userRoleId } = params

  if (mode === 'edit' && initialData) {
    return {
      tipo_movimiento_id:
        catalogos.tiposMovimiento.find((t) => t.codigo === initialData.cabecera.tipo_codigo)?.id ?? null,
      bodega_origen_id:
        catalogos.bodegas.find((b) => b.codigo === initialData.cabecera.bodega_origen_codigo)?.id ?? null,
      bodega_destino_id: initialData.cabecera.bodega_destino_codigo
        ? catalogos.bodegas.find((b) => b.codigo === initialData.cabecera.bodega_destino_codigo)?.id ?? null
        : null,
      fecha_nota: initialData.cabecera.fecha_nota ? formatForDateInput(initialData.cabecera.fecha_nota) : todayMX(),
      nota_referencia: initialData.cabecera.nota_referencia ?? '',
      observaciones: initialData.cabecera.observaciones ?? '',
      costo_total: initialData.cabecera.costo_total ?? 0,
      productos: initialData.detalles.map((d) => ({
        tempId: crypto.randomUUID(),
        producto_id: d.producto_id!,
        producto_sku: d.producto_sku ?? '',
        producto_nombre: d.producto_nombre,
        producto_pz_en_caja: d.producto_pz_en_caja,
        cajas: d.cajas,
        piezas_sueltas: d.piezas_sueltas,
        caja_id: d.caja_id,
        caja_codigo: d.caja_codigo,
        caja_nombre_pack: d.caja_nombre_pack,
        stock_origen_cajas: 0,
        stock_origen_piezas: 0,
      })),
    }
  }

  const rKey = userRoleId ? String(userRoleId) : ''
  const nKey = String(currentUserLevel)
  const defaultTipoCodigo =
    (rKey && config?.tipo_movimiento_default_por_rol?.[rKey]) ||
    config?.tipo_movimiento_default_por_rol?.[nKey] ||
    config?.tipo_movimiento_default_general ||
    (userRoleId === 18 ? 'SAL' : 'ENT')

  const matchedDefaultTipo = catalogos.tiposMovimiento.find((t) => t.codigo === defaultTipoCodigo)
  const initialTipoIdPorRol =
    config?.auto_seleccionar_tipo_default !== false ? (matchedDefaultTipo?.id ?? null) : null
  const initialBodegaOrigenId =
    config?.auto_seleccionar_bodega_activa !== false && defaultBodegaOrigenId ? defaultBodegaOrigenId : null

  if (initialData && (initialData.cabecera as any).productos_draft) {
    const hc = initialData.cabecera as any
    const ocrPriorizar = config?.ocr_priorizar_tipo_detectado !== false
    const finalOcrTipoId =
      ocrPriorizar && hc.tipo_movimiento_id
        ? hc.tipo_movimiento_id
        : (initialTipoIdPorRol ?? hc.tipo_movimiento_id ?? null)

    return {
      tipo_movimiento_id: finalOcrTipoId,
      bodega_origen_id: hc.bodega_origen_id || initialBodegaOrigenId,
      bodega_destino_id: hc.bodega_destino_id ?? null,
      fecha_nota: hc.fecha_nota ? formatForDateInput(hc.fecha_nota) : todayMX(),
      nota_referencia: hc.nota_referencia ?? '',
      observaciones: hc.observaciones ?? '',
      costo_total: 0,
      productos: hc.productos_draft || [],
    }
  }

  return {
    tipo_movimiento_id: initialTipoIdPorRol,
    bodega_origen_id: initialBodegaOrigenId,
    bodega_destino_id: null,
    fecha_nota: todayMX(),
    nota_referencia: '',
    observaciones: '',
    costo_total: 0,
    productos: [],
  }
}

export function normalizarTextoBodega(raw: string): string {
  if (!raw) return ''
  let s = String(raw).toUpperCase().trim()
  s = s.replace(/COSINA/g, 'COCINA')
  s = s.replace(/RIKA|RI Y KA|RI&KA/g, 'RI&KA')
  s = s.replace(/PANTACO|PANTACO 1/g, 'PANTACO')
  s = s.replace(/DURASNO/g, 'DURAZNO')
  s = s.replace(/SANDUNGA/g, 'ZANDUNGA')
  s = s.replace(/CHICONKUAC/g, 'CHICONCUAC')
  return s
}

function matchBodegaOcr(raw: string, preferId: number | null | undefined, bodegas: BodegaRow[]) {
  if (!raw) return null
  if (preferId) {
    const byId = bodegas.find((b) => b.id === Number(preferId))
    if (byId) return byId
  }
  const rawNorm = normalizarTextoBodega(raw)
  return (
    bodegas.find((b) => {
      const bName = b.nombre.toUpperCase().trim()
      const bCode = b.codigo.toUpperCase().trim()
      return bName === rawNorm || bCode === rawNorm || rawNorm.includes(bName) || bName.includes(rawNorm)
    }) ?? null
  )
}

export function computeOcrHeaderDiffs(params: {
  draft: DraftNota
  catalogos: CatalogosInventario
  ocrProposalId?: string
  ocrProposal?: NotaOcrPropuesta | null
  initialData?: NotaCompleta
  dismissed: boolean
}) {
  const { draft, catalogos, ocrProposalId, ocrProposal, initialData, dismissed } = params
  const hc = (initialData?.cabecera as any) ?? {}

  const detectedOrigenRaw = (ocrProposal?.origen_detectado || hc.origen_detectado || '').trim()
  const detectedDestinoRaw = (ocrProposal?.destino_detectado || hc.destino_detectado || '').trim()
  const detectedTipoRaw = (ocrProposal?.tipo_movimiento_detectado || hc.tipo_movimiento_detectado || '')
    .trim()
    .toUpperCase()
  const detectedFechaRaw =
    ocrProposal?.fecha_detectada || hc.fecha_detectada || (ocrProposal?.json_crudo as any)?.fecha || ''
  const detectedFolioRaw =
    ocrProposal?.folio_detectado || hc.folio_detectado || (ocrProposal?.json_crudo as any)?.folio || ''

  const detectedBodega = matchBodegaOcr(detectedOrigenRaw, ocrProposal?.bodega_origen_id, catalogos.bodegas)
  const detectedDestinoBodega = matchBodegaOcr(
    detectedDestinoRaw,
    ocrProposal?.bodega_destino_id,
    catalogos.bodegas
  )
  const detectedTipoObj = detectedTipoRaw
    ? (ocrProposal?.tipo_movimiento_id &&
        catalogos.tiposMovimiento.find((t) => t.id === Number(ocrProposal.tipo_movimiento_id))) ||
      catalogos.tiposMovimiento.find(
        (t) => t.codigo === detectedTipoRaw || t.nombre.toUpperCase() === detectedTipoRaw
      ) ||
      null
    : null

  const isOcrNote = Boolean(
    ocrProposalId ||
      ocrProposal?.origen_detectado ||
      detectedOrigenRaw ||
      detectedTipoRaw ||
      detectedFechaRaw ||
      detectedFolioRaw
  )

  const currentBodegaObj = catalogos.bodegas.find((b) => b.id === draft.bodega_origen_id)
  const currentDestinoObj = catalogos.bodegas.find((b) => b.id === draft.bodega_destino_id)

  const hasTipoMismatch =
    isOcrNote && Boolean(detectedTipoObj) && draft.tipo_movimiento_id !== detectedTipoObj?.id
  const hasOriginMismatch =
    isOcrNote &&
    Boolean(detectedOrigenRaw) &&
    (detectedBodega
      ? draft.bodega_origen_id !== detectedBodega.id
      : !currentBodegaObj ||
        !normalizarTextoBodega(currentBodegaObj.nombre).includes(normalizarTextoBodega(detectedOrigenRaw)))
  const hasDestinoMismatch =
    isOcrNote && Boolean(detectedDestinoBodega) && draft.bodega_destino_id !== detectedDestinoBodega?.id
  const hasFechaMismatch =
    isOcrNote && Boolean(detectedFechaRaw) && draft.fecha_nota !== formatForDateInput(detectedFechaRaw)
  const hasFolioMismatch =
    isOcrNote && Boolean(detectedFolioRaw) && draft.nota_referencia !== detectedFolioRaw

  const hasAnyHeaderMismatch =
    !dismissed &&
    isOcrNote &&
    (hasTipoMismatch || hasOriginMismatch || hasDestinoMismatch || hasFechaMismatch || hasFolioMismatch)

  return {
    detectedOrigenRaw,
    detectedDestinoRaw,
    detectedFechaRaw,
    detectedFolioRaw,
    detectedBodega,
    detectedDestinoBodega,
    detectedTipoObj,
    currentBodegaObj,
    currentDestinoObj,
    hasTipoMismatch,
    hasOriginMismatch,
    hasDestinoMismatch,
    hasFechaMismatch,
    hasFolioMismatch,
    hasAnyHeaderMismatch,
  }
}
