// components/admin/ocr-sync/_hooks/ocr-sync-local.ts
import { compactarSkuOcr, normalizarSku } from '@/lib/inventario/sku-ocr'
import {
  buscarCandidatosEnCatalogo,
  type CatalogoSkuIndexado,
} from '@/lib/inventario/sku-matcher'
import type {
  NotaOcrCandidatoSku,
  NotaOcrLineaSincronizada,
  NotaOcrPropuestaLineRaw,
} from '@/modules/inventario/types'

export type MappedOcrLineaInput = {
  index: number
  estilo_raw: string
  cantidad_cajas: number
  piezas_por_caja: number | null
  piezas_detectadas_ref: number | null
  confianza: number
  descripcion_raw: string | null
  sku: string | null
  posibles_variantes: string[] | null
  decider_prob: number | null
  decider_model: string | null
  candidatos_sku?: NotaOcrCandidatoSku[]
}

export function mapInitialOcrLineas(
  initialLineas: NotaOcrPropuestaLineRaw[]
): MappedOcrLineaInput[] {
  return (initialLineas || []).map((l, i) => ({
    index: i,
    estilo_raw: compactarSkuOcr(l.estilo_raw ?? l.sku ?? ''),
    cantidad_cajas: l.cantidad_cajas ?? 1,
    piezas_por_caja: l.piezas_por_caja ?? null,
    piezas_detectadas_ref: l.piezas_detectadas_ref ?? l.piezas_por_caja ?? null,
    confianza: l.confianza_ia ?? l.confianza ?? 0.85,
    descripcion_raw: l.descripcion_raw ?? null,
    sku: l.sku ? compactarSkuOcr(l.sku) : null,
    posibles_variantes: l.posibles_variantes ?? null,
    decider_prob: l.decider_prob ?? null,
    decider_model: l.decider_model ?? null,
    candidatos_sku: l.candidatos_sku ?? undefined,
  }))
}

/**
 * Hidrata al instante (0 ms) las líneas desde los datos ya guardados por n8n
 * para que la tabla nunca aparezca vacía mientras termina el primer fetch.
 */
export function hidratarLineasOptimistas(
  initialLineas: NotaOcrPropuestaLineRaw[]
): NotaOcrLineaSincronizada[] {
  return (initialLineas || []).map((l, i) => {
    const rawCompacto = compactarSkuOcr(l.estilo_raw ?? l.sku ?? '')
    const cands = Array.isArray(l.candidatos_sku) ? l.candidatos_sku.slice(0, 4) : undefined
    const pzRef = l.piezas_detectadas_ref ?? l.piezas_por_caja ?? null
    const conf = l.confianza_ia ?? l.confianza ?? 0.85

    if (typeof l.producto_id === 'number' && l.sku) {
      const matchCand = cands?.find((c) => c.producto_id === l.producto_id)
      return {
        index: i,
        estilo_raw: rawCompacto,
        descripcion_raw: l.descripcion_raw ?? null,
        cantidad_cajas: l.cantidad_cajas ?? 1,
        piezas_por_caja: l.piezas_por_caja ?? matchCand?.pz_en_caja ?? null,
        piezas_detectadas_ref: pzRef,
        confianza: conf,
        producto_id: l.producto_id,
        producto_sku: l.sku,
        producto_nombre: matchCand?.descripcion ?? l.descripcion_raw ?? null,
        producto_pz_en_caja: matchCand?.pz_en_caja ?? l.piezas_por_caja ?? null,
        encontrado: true,
        es_propuesta: false,
        score: l.match_score ?? matchCand?.score ?? 1.0,
        metodo: l.metodo_match ?? matchCand?.metodo ?? null,
        decider_prob: l.decider_prob ?? null,
        decider_model: l.decider_model ?? null,
        candidatos_sku: cands,
      }
    }

    const propId = l.propuesta_producto_id ?? cands?.[0]?.producto_id ?? null
    const propSku = l.propuesta_producto_sku ?? cands?.[0]?.sku_base ?? null
    const propCand = propId != null ? cands?.find((c) => c.producto_id === propId) ?? cands?.[0] : cands?.[0]
    const topScore = l.match_score ?? propCand?.score ?? 0

    if (propId && propSku && topScore >= 0.70) {
      return {
        index: i,
        estilo_raw: rawCompacto,
        descripcion_raw: l.descripcion_raw ?? null,
        cantidad_cajas: l.cantidad_cajas ?? 1,
        piezas_por_caja: l.piezas_por_caja ?? propCand?.pz_en_caja ?? null,
        piezas_detectadas_ref: pzRef,
        confianza: conf,
        producto_id: null,
        producto_sku: null,
        producto_nombre: null,
        producto_pz_en_caja: null,
        encontrado: false,
        es_propuesta: true,
        propuesta_producto_id: propId,
        propuesta_producto_sku: propSku,
        propuesta_producto_nombre: propCand?.descripcion ?? null,
        propuesta_producto_pz_en_caja: propCand?.pz_en_caja ?? null,
        score: topScore,
        metodo: l.metodo_match ?? propCand?.metodo ?? null,
        decider_prob: l.decider_prob ?? null,
        decider_model: l.decider_model ?? null,
        candidatos_sku: cands,
      }
    }

    return {
      index: i,
      estilo_raw: rawCompacto,
      descripcion_raw: l.descripcion_raw ?? null,
      cantidad_cajas: l.cantidad_cajas ?? 1,
      piezas_por_caja: l.piezas_por_caja ?? null,
      piezas_detectadas_ref: pzRef,
      confianza: conf,
      encontrado: false,
      es_propuesta: false,
      score: topScore || undefined,
      decider_prob: l.decider_prob ?? null,
      decider_model: l.decider_model ?? null,
      candidatos_sku: cands,
    }
  })
}

/**
 * Sincroniza un lote completo contra el catálogo indexado en memoria (<5 ms),
 * replicando exactamente la lógica del servidor y preservando señales Decider.
 */
export function sincronizarBatchLocal(
  lineasInput: Array<
    MappedOcrLineaInput & {
      manual?: boolean
      producto_id?: number | null
      producto_sku?: string | null
      producto_nombre?: string | null
      producto_pz_en_caja?: number | null
      encontrado?: boolean
      score?: number | null
      metodo?: string | null
    }
  >,
  catalogo: CatalogoSkuIndexado[]
): NotaOcrLineaSincronizada[] {
  return lineasInput.map((item, idx) => {
    const itemIndex = item.index ?? idx
    const rawCompacto = compactarSkuOcr(item.estilo_raw || item.sku || '')
    const cajas = item.cantidad_cajas ?? 0
    const descTexto = item.descripcion_raw || ''
    const pzRef = item.piezas_detectadas_ref ?? item.piezas_por_caja ?? null

    if (item.manual && item.encontrado && item.producto_id && item.producto_sku) {
      return {
        index: itemIndex,
        estilo_raw: rawCompacto,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? item.producto_pz_en_caja ?? null,
        piezas_detectadas_ref: pzRef,
        confianza: Number(item.confianza ?? 0.85),
        producto_id: item.producto_id,
        producto_sku: item.producto_sku,
        producto_nombre: item.producto_nombre ?? null,
        producto_pz_en_caja: item.producto_pz_en_caja ?? null,
        encontrado: true,
        es_propuesta: false,
        score: item.score ?? 1.0,
        metodo: item.metodo ?? 'MANUAL',
        decider_prob: item.decider_prob ?? null,
        decider_model: item.decider_model ?? null,
        candidatos_sku: item.candidatos_sku,
        manual: true,
      }
    }

    if (!rawCompacto) {
      return {
        index: itemIndex,
        estilo_raw: '',
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_detectadas_ref: pzRef,
        confianza: 0,
        encontrado: false,
      }
    }

    const resMatch = buscarCandidatosEnCatalogo(
      {
        estilo_raw: rawCompacto,
        sku_ia: item.sku,
        descripcion_raw: descTexto,
        piezas_detectadas: pzRef,
        posibles_variantes: item.posibles_variantes,
      },
      catalogo,
      5
    )

    const prevDeciderByPid = new Map<number, number>()
    for (const prevCand of item.candidatos_sku ?? []) {
      if (prevCand.decider_prob != null) {
        prevDeciderByPid.set(prevCand.producto_id, prevCand.decider_prob)
      }
    }

    const candidatos: NotaOcrCandidatoSku[] = resMatch.candidatos.map((c) => {
      const dProb = c.decider_prob ?? prevDeciderByPid.get(c.producto_id) ?? null
      return {
        producto_id: c.producto_id,
        sku_base: c.sku_base,
        descripcion: c.descripcion,
        pz_en_caja: c.pz_en_caja,
        score: c.score,
        metodo: c.metodo,
        origen: rawCompacto,
        familia: c.familia,
        proveedor_nombre: c.proveedor_nombre,
        razon: c.razon,
        diff_indices: c.diff_indices,
        ...(dProb != null ? { decider_prob: dProb } : {}),
      }
    })

    const itemSkuNorm = item.sku ? normalizarSku(item.sku) : ''
    const deciderCand =
      item.decider_prob != null && item.decider_prob >= 0.65 && itemSkuNorm
        ? candidatos.find((c) => normalizarSku(c.sku_base) === itemSkuNorm) ?? null
        : null

    if (deciderCand && (item.decider_prob ?? 0) >= 0.65) {
      candidatos.sort((a, b) => {
        if (a.producto_id === deciderCand.producto_id) return -1
        if (b.producto_id === deciderCand.producto_id) return 1
        return (b.decider_prob ?? 0) - (a.decider_prob ?? 0) || b.score - a.score
      })
    }

    const topCand = candidatos[0] ?? null
    const secondCand = candidatos[1] ?? null
    const topScore = topCand?.score ?? 0
    const margin = topCand ? topScore - (secondCand ? secondCand.score : 0) : 0
    const deciderProbTop = topCand?.decider_prob ?? item.decider_prob ?? null

    const autoPorExacto = resMatch.estado === 'EXACTO' && topScore >= 0.99
    const autoPorAlta =
      resMatch.estado === 'PROPUESTA_ALTA' && topScore >= 0.93 && margin >= 0.10
    const autoPorDecider =
      !!deciderCand && (item.decider_prob ?? 0) >= 0.80 && deciderCand.score >= 0.75

    const prefijosSugeridos = resMatch.por_prefijo.map((p) => ({
      prefijo: p.prefijo,
      total: p.total,
    }))

    if ((autoPorExacto || autoPorAlta || autoPorDecider) && topCand) {
      const elegido = autoPorDecider && deciderCand ? deciderCand : topCand
      return {
        index: itemIndex,
        estilo_raw: rawCompacto,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? elegido.pz_en_caja,
        piezas_detectadas_ref: pzRef,
        confianza: Number(item.confianza ?? 0.85),
        producto_id: elegido.producto_id,
        producto_sku: elegido.sku_base,
        producto_nombre: elegido.descripcion,
        producto_pz_en_caja: elegido.pz_en_caja,
        encontrado: true,
        es_propuesta: false,
        score: elegido.score,
        metodo: elegido.metodo,
        decider_prob: deciderProbTop,
        decider_model: item.decider_model ?? null,
        candidatos_sku: candidatos.slice(0, 4),
        prefijos_sugeridos: prefijosSugeridos,
      }
    }

    if (topCand && topScore >= 0.70) {
      return {
        index: itemIndex,
        estilo_raw: rawCompacto,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? topCand.pz_en_caja,
        piezas_detectadas_ref: pzRef,
        confianza: Number(item.confianza ?? 0.85),
        producto_id: null,
        producto_sku: null,
        producto_nombre: null,
        producto_pz_en_caja: null,
        encontrado: false,
        es_propuesta: true,
        propuesta_producto_id: topCand.producto_id,
        propuesta_producto_sku: topCand.sku_base,
        propuesta_producto_nombre: topCand.descripcion,
        propuesta_producto_pz_en_caja: topCand.pz_en_caja,
        score: topScore,
        metodo: topCand.metodo,
        decider_prob: deciderProbTop,
        decider_model: item.decider_model ?? null,
        candidatos_sku: candidatos.slice(0, 4),
        prefijos_sugeridos: prefijosSugeridos,
      }
    }

    return {
      index: itemIndex,
      estilo_raw: rawCompacto,
      descripcion_raw: item.descripcion_raw ?? null,
      cantidad_cajas: cajas,
      piezas_por_caja: item.piezas_por_caja ?? null,
      piezas_detectadas_ref: pzRef,
      confianza: Number(item.confianza ?? 0.5),
      producto_id: null,
      producto_sku: null,
      producto_nombre: null,
      producto_pz_en_caja: null,
      encontrado: false,
      es_propuesta: false,
      score: topScore,
      metodo: null,
      decider_prob: deciderProbTop,
      decider_model: item.decider_model ?? null,
      candidatos_sku: candidatos.length > 0 ? candidatos.slice(0, 4) : undefined,
      prefijos_sugeridos: prefijosSugeridos,
    }
  })
}

export function buildUpdatedRawOcrLineas(
  lineas: NotaOcrLineaSincronizada[]
): NotaOcrPropuestaLineRaw[] {
  return lineas.map((l) => ({
    estilo_raw: compactarSkuOcr(l.estilo_raw),
    cantidad_cajas: l.cantidad_cajas,
    descripcion_raw: l.descripcion_raw ?? l.estilo_raw,
    piezas_por_caja: l.piezas_por_caja ?? null,
    piezas_detectadas_ref: l.piezas_detectadas_ref ?? null,
    confianza: l.confianza,
    confianza_ia: l.confianza ?? null,
    producto_id: l.encontrado ? l.producto_id ?? null : null,
    sku: l.encontrado ? l.producto_sku ?? null : compactarSkuOcr(l.estilo_raw),
    propuesta_producto_id: l.propuesta_producto_id ?? null,
    propuesta_producto_sku: l.propuesta_producto_sku ?? null,
    match_score: l.score ?? null,
    metodo_match: l.metodo ?? null,
    decider_prob: l.decider_prob ?? null,
    decider_model: l.decider_model ?? null,
    candidatos_sku: l.candidatos_sku ?? null,
    posibles_variantes: l.candidatos_sku?.map((c) => c.sku_base) ?? null,
  }))
}

export function toSincronizadaFromLocal(
  prev: NotaOcrLineaSincronizada,
  rawInput: string,
  catalogo: CatalogoSkuIndexado[]
): NotaOcrLineaSincronizada {
  const compacto = compactarSkuOcr(rawInput)
  if (!compacto) {
    return {
      ...prev,
      estilo_raw: rawInput,
      producto_id: null,
      producto_sku: null,
      producto_nombre: null,
      producto_pz_en_caja: null,
      propuesta_producto_id: null,
      propuesta_producto_sku: null,
      propuesta_producto_nombre: null,
      propuesta_producto_pz_en_caja: null,
      encontrado: false,
      es_propuesta: false,
      score: 0,
      metodo: null,
      candidatos_sku: [],
      prefijos_sugeridos: [],
      manual: false,
    }
  }

  const res = buscarCandidatosEnCatalogo(
    {
      estilo_raw: compacto,
      descripcion_raw: prev.descripcion_raw ?? '',
      piezas_detectadas: prev.piezas_detectadas_ref ?? prev.piezas_por_caja ?? null,
    },
    catalogo,
    4
  )

  const candidatos: NotaOcrCandidatoSku[] = res.candidatos.map((c) => ({
    producto_id: c.producto_id,
    sku_base: c.sku_base,
    descripcion: c.descripcion,
    pz_en_caja: c.pz_en_caja,
    score: c.score,
    metodo: c.metodo,
    origen: compacto,
    familia: c.familia,
    proveedor_nombre: c.proveedor_nombre,
    razon: c.razon,
    diff_indices: c.diff_indices,
  }))
  const prefijos = res.por_prefijo.map((p) => ({ prefijo: p.prefijo, total: p.total }))
  const top = candidatos[0] ?? null

  if (res.estado === 'EXACTO' && top) {
    return {
      ...prev,
      estilo_raw: rawInput,
      producto_id: top.producto_id,
      producto_sku: top.sku_base,
      producto_nombre: top.descripcion,
      producto_pz_en_caja: top.pz_en_caja,
      propuesta_producto_id: null,
      propuesta_producto_sku: null,
      propuesta_producto_nombre: null,
      propuesta_producto_pz_en_caja: null,
      encontrado: true,
      es_propuesta: false,
      score: top.score,
      metodo: top.metodo,
      decider_prob: null,
      candidatos_sku: candidatos,
      prefijos_sugeridos: prefijos,
      manual: false,
    }
  }

  if (top && top.score >= 0.70) {
    return {
      ...prev,
      estilo_raw: rawInput,
      producto_id: null,
      producto_sku: null,
      producto_nombre: null,
      producto_pz_en_caja: null,
      propuesta_producto_id: top.producto_id,
      propuesta_producto_sku: top.sku_base,
      propuesta_producto_nombre: top.descripcion,
      propuesta_producto_pz_en_caja: top.pz_en_caja,
      encontrado: false,
      es_propuesta: true,
      score: top.score,
      metodo: top.metodo,
      decider_prob: null,
      candidatos_sku: candidatos,
      prefijos_sugeridos: prefijos,
      manual: false,
    }
  }

  return {
    ...prev,
    estilo_raw: rawInput,
    producto_id: null,
    producto_sku: null,
    producto_nombre: null,
    producto_pz_en_caja: null,
    propuesta_producto_id: null,
    propuesta_producto_sku: null,
    propuesta_producto_nombre: null,
    propuesta_producto_pz_en_caja: null,
    encontrado: false,
    es_propuesta: false,
    score: top?.score ?? 0,
    metodo: null,
    decider_prob: null,
    candidatos_sku: candidatos,
    prefijos_sugeridos: prefijos,
    manual: false,
  }
}
