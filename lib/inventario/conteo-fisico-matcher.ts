// lib/inventario/conteo-fisico-matcher.ts
/**
 * Motor puro de cruce contra catálogo y Buscar/Reemplazar masivo (estilo Excel)
 * para Conteo Físico Manuscrito. Sin dependencias de React ni Supabase.
 */

import { canonicalizarAnd, compactarSkuOcr, normalizarSku } from './sku-ocr'
import {
  buscarCandidatosEnCatalogo,
  type CatalogoSkuIndexado,
} from './sku-matcher'
import type {
  CandidatoSkuSimple,
  HojaConteoFisico,
  RenglonConteoFisico,
} from '@/modules/inventario/conteo-fisico-types'

export type ModoReemplazo = 'prefijo' | 'contiene' | 'sufijo'
export type AlcanceReemplazo = 'sin_match' | 'hoja_actual' | 'todos'

export interface ReglaReemplazo {
  buscar: string
  reemplazar: string
  modo: ModoReemplazo
  alcance: AlcanceReemplazo
}

export interface MuestraReemplazo {
  id: string
  hojaNumero: number
  antes: string
  despues: string
  estadoNuevo: 'confirmado' | 'propuesta' | 'sin_match'
  skuDestino: string | null
}

export interface PreviewReemplazo {
  totalAfectados: number
  nuevosConfirmados: number
  nuevasPropuestas: number
  muestras: MuestraReemplazo[]
}

export interface SugerenciaReemplazo {
  buscar: string
  reemplazar: string
  modo: ModoReemplazo
  afectados: number
  potencialesMatches: number
}

export function normalizarTextoSkuConteo(value: string | null | undefined): string {
  const compacto = compactarSkuOcr(value)
  if (!compacto) return ''
  return canonicalizarAnd(compacto)
}

export function recalcularResumenHoja(
  renglones: RenglonConteoFisico[]
): HojaConteoFisico['resumen'] {
  let c1 = 0
  let r1 = 0
  let c2 = 0
  let r2 = 0

  for (const r of renglones) {
    const cajas = Number(r.cajas) || 0
    if (r.columna === 2) {
      c2 += cajas
      r2++
    } else {
      c1 += cajas
      r1++
    }
  }

  return {
    columna_1: { renglones: r1, cajas: c1 },
    columna_2: { renglones: r2, cajas: c2 },
    total_hoja: { renglones: r1 + r2, cajas: c1 + c2 },
  }
}

export function evaluarRenglonContraCatalogo(
  renglon: RenglonConteoFisico,
  catalogo: CatalogoSkuIndexado[],
  opts?: { textoOverride?: string; forzarReevaluacion?: boolean }
): RenglonConteoFisico {
  if (
    !opts?.forzarReevaluacion &&
    renglon.modificado_manualmente &&
    renglon.producto_id &&
    renglon.sku_match
  ) {
    return renglon
  }

  const textoCrudo = opts?.textoOverride !== undefined
    ? opts.textoOverride
    : renglon.sku_candidato || renglon.estilo_raw || ''
  const textoCompacto = normalizarTextoSkuConteo(textoCrudo)
  const skuParaCampo = opts?.textoOverride !== undefined ? opts.textoOverride : textoCompacto

  if (!textoCompacto) {
    return {
      ...renglon,
      sku_candidato: skuParaCampo,
      producto_id: null,
      sku_match: null,
      descripcion: null,
      familia: null,
      match_score: 0,
      metodo_match: null,
      es_propuesta: false,
      propuesta_producto_id: null,
      propuesta_sku: null,
      propuesta_descripcion: null,
      propuesta_familia: null,
      candidatos: [],
      prefijos_sugeridos: [],
    }
  }

  const res = buscarCandidatosEnCatalogo(
    {
      estilo_raw: textoCompacto,
      posibles_variantes: renglon.posibles_variantes ?? null,
    },
    catalogo,
    5
  )

  const candidatos: CandidatoSkuSimple[] = res.candidatos.map((c) => ({
    producto_id: c.producto_id,
    sku: c.sku_base,
    nombre: c.descripcion,
    score: c.score,
    metodo: c.metodo,
    familia: c.familia,
    pz_en_caja: c.pz_en_caja,
    proveedor_nombre: c.proveedor_nombre,
    razon: c.razon,
    diff_indices: c.diff_indices,
  }))

  const prefijos_sugeridos = res.por_prefijo.map((p) => ({
    prefijo: p.prefijo,
    total: p.total,
  }))

  const top = candidatos[0] ?? null
  const second = candidatos[1] ?? null
  const topScore = top?.score ?? 0
  const margin = top ? topScore - (second ? second.score : 0) : 0

  const autoPorExacto = res.estado === 'EXACTO' && topScore >= 0.99
  const autoPorAlta =
    res.estado === 'PROPUESTA_ALTA' && topScore >= 0.93 && margin >= 0.10

  if ((autoPorExacto || autoPorAlta) && top) {
    return {
      ...renglon,
      sku_candidato: skuParaCampo,
      producto_id: top.producto_id,
      sku_match: top.sku,
      descripcion: top.nombre,
      familia: top.familia ?? null,
      match_score: top.score,
      metodo_match: top.metodo ?? null,
      es_propuesta: false,
      propuesta_producto_id: null,
      propuesta_sku: null,
      propuesta_descripcion: null,
      propuesta_familia: null,
      candidatos,
      prefijos_sugeridos,
    }
  }

  if (top && topScore >= 0.70) {
    return {
      ...renglon,
      sku_candidato: skuParaCampo,
      producto_id: null,
      sku_match: null,
      descripcion: null,
      familia: null,
      match_score: top.score,
      metodo_match: top.metodo ?? null,
      es_propuesta: true,
      propuesta_producto_id: top.producto_id,
      propuesta_sku: top.sku,
      propuesta_descripcion: top.nombre,
      propuesta_familia: top.familia ?? null,
      candidatos,
      prefijos_sugeridos,
    }
  }

  return {
    ...renglon,
    sku_candidato: skuParaCampo,
    producto_id: null,
    sku_match: null,
    descripcion: null,
    familia: null,
    match_score: topScore,
    metodo_match: null,
    es_propuesta: false,
    propuesta_producto_id: null,
    propuesta_sku: null,
    propuesta_descripcion: null,
    propuesta_familia: null,
    candidatos,
    prefijos_sugeridos,
  }
}

export function sincronizarHojasConCatalogo(
  hojas: HojaConteoFisico[],
  catalogo: CatalogoSkuIndexado[],
  opts?: { forzarTodos?: boolean }
): HojaConteoFisico[] {
  if (catalogo.length === 0) return hojas
  return hojas.map((h) => {
    const renglones = (h.renglones || []).map((r) =>
      evaluarRenglonContraCatalogo(r, catalogo, {
        forzarReevaluacion: opts?.forzarTodos,
      })
    )
    return {
      ...h,
      renglones,
      resumen: recalcularResumenHoja(renglones),
    }
  })
}

export function aplicarPatronTexto(
  texto: string,
  buscar: string,
  reemplazar: string,
  modo: ModoReemplazo
): string | null {
  const origen = String(texto ?? '').toUpperCase().trim()
  const needle = String(buscar ?? '').toUpperCase().trim()
  if (!origen || !needle) return null
  const repl = String(reemplazar ?? '').toUpperCase()

  if (modo === 'prefijo') {
    if (!origen.startsWith(needle)) return null
    const next = repl + origen.slice(needle.length)
    return next !== origen ? next : null
  }
  if (modo === 'sufijo') {
    if (!origen.endsWith(needle)) return null
    const next = origen.slice(0, origen.length - needle.length) + repl
    return next !== origen ? next : null
  }
  if (!origen.includes(needle)) return null
  const next = origen.split(needle).join(repl)
  return next !== origen ? next : null
}

function esRenglonEnAlcance(
  r: RenglonConteoFisico,
  hojaNumero: number,
  alcance: AlcanceReemplazo,
  filtroHoja: number | 'todas'
): boolean {
  if (alcance === 'sin_match') return !r.producto_id
  if (alcance === 'hoja_actual' && filtroHoja !== 'todas') {
    return Number(r.numero_hoja || hojaNumero) === Number(filtroHoja)
  }
  return true
}

const EXACT_SKU_SET_CACHE = new WeakMap<CatalogoSkuIndexado[], Set<string>>()

function buildExactSkuSet(catalogo: CatalogoSkuIndexado[]): Set<string> {
  let set = EXACT_SKU_SET_CACHE.get(catalogo)
  if (!set) {
    set = new Set<string>()
    for (const item of catalogo) {
      if (item.sku_alnum) set.add(item.sku_alnum)
      for (const tok of item.tokens_alnum) {
        if (tok) set.add(tok)
      }
    }
    EXACT_SKU_SET_CACHE.set(catalogo, set)
  }
  return set
}

export function previsualizarReemplazo(
  hojas: HojaConteoFisico[],
  regla: ReglaReemplazo,
  catalogo: CatalogoSkuIndexado[],
  filtroHoja: number | 'todas' = 'todas'
): PreviewReemplazo {
  if (!regla.buscar.trim()) {
    return { totalAfectados: 0, nuevosConfirmados: 0, nuevasPropuestas: 0, muestras: [] }
  }

  const exactSet = catalogo.length > 0 ? buildExactSkuSet(catalogo) : null
  let totalAfectados = 0
  let nuevosConfirmados = 0
  let nuevasPropuestas = 0
  const muestras: MuestraReemplazo[] = []

  for (const h of hojas) {
    for (const r of h.renglones || []) {
      if (!esRenglonEnAlcance(r, h.numero_hoja, regla.alcance, filtroHoja)) continue
      const baseTexto = r.sku_candidato || r.estilo_raw || ''
      const nuevoTexto = aplicarPatronTexto(baseTexto, regla.buscar, regla.reemplazar, regla.modo)
      if (!nuevoTexto) continue

      totalAfectados++
      const normNuevo = normalizarSku(nuevoTexto)
      const esExactoO1 = Boolean(exactSet && normNuevo && exactSet.has(normNuevo))

      let estadoNuevo: MuestraReemplazo['estadoNuevo'] = esExactoO1 ? 'confirmado' : 'sin_match'
      let skuDestino: string | null = esExactoO1 ? nuevoTexto : null

      if (esExactoO1) {
        if (!r.producto_id) nuevosConfirmados++
      } else if (catalogo.length > 0 && muestras.length < 6) {
        const evaluado = evaluarRenglonContraCatalogo(r, catalogo, {
          textoOverride: nuevoTexto,
          forzarReevaluacion: true,
        })
        if (evaluado.producto_id) {
          estadoNuevo = 'confirmado'
          skuDestino = evaluado.sku_match || null
          if (!r.producto_id) nuevosConfirmados++
        } else if (evaluado.es_propuesta) {
          estadoNuevo = 'propuesta'
          skuDestino = evaluado.propuesta_sku || null
          if (!r.producto_id && !r.es_propuesta) nuevasPropuestas++
        }
      }

      if (muestras.length < 6) {
        muestras.push({
          id: r.id,
          hojaNumero: Number(r.numero_hoja || h.numero_hoja || 1),
          antes: baseTexto,
          despues: nuevoTexto,
          estadoNuevo,
          skuDestino,
        })
      }
    }
  }

  return { totalAfectados, nuevosConfirmados, nuevasPropuestas, muestras }
}

export function aplicarReemplazoMasivo(
  hojas: HojaConteoFisico[],
  regla: ReglaReemplazo,
  catalogo: CatalogoSkuIndexado[],
  filtroHoja: number | 'todas' = 'todas'
): {
  hojas: HojaConteoFisico[]
  totalAfectados: number
  nuevosConfirmados: number
  nuevasPropuestas: number
} {
  if (!regla.buscar.trim()) {
    return { hojas, totalAfectados: 0, nuevosConfirmados: 0, nuevasPropuestas: 0 }
  }

  let totalAfectados = 0
  let nuevosConfirmados = 0
  let nuevasPropuestas = 0

  const hojasActualizadas = hojas.map((h) => {
    let cambioHoja = false
    const renglones = (h.renglones || []).map((r) => {
      if (!esRenglonEnAlcance(r, h.numero_hoja, regla.alcance, filtroHoja)) return r
      const baseTexto = r.sku_candidato || r.estilo_raw || ''
      const nuevoTexto = aplicarPatronTexto(baseTexto, regla.buscar, regla.reemplazar, regla.modo)
      if (!nuevoTexto) return r

      cambioHoja = true
      totalAfectados++

      const evaluado =
        catalogo.length > 0
          ? evaluarRenglonContraCatalogo(
              { ...r, modificado_manualmente: false },
              catalogo,
              { textoOverride: nuevoTexto, forzarReevaluacion: true }
            )
          : {
              ...r,
              sku_candidato: nuevoTexto,
              producto_id: null,
              sku_match: null,
              descripcion: null,
              es_propuesta: false,
            }

      if (evaluado.producto_id && !r.producto_id) nuevosConfirmados++
      else if (evaluado.es_propuesta && !r.producto_id && !r.es_propuesta) nuevasPropuestas++

      return {
        ...evaluado,
        modificado_manualmente: true,
      }
    })

    if (!cambioHoja) return h
    return {
      ...h,
      renglones,
      resumen: recalcularResumenHoja(renglones),
    }
  })

  return { hojas: hojasActualizadas, totalAfectados, nuevosConfirmados, nuevasPropuestas }
}

const PATRONES_CONOCIDOS_OCR: Array<{ buscar: string; reemplazar: string; modo: ModoReemplazo }> = [
  { buscar: 'AU0', reemplazar: 'AND', modo: 'prefijo' },
  { buscar: 'AN0', reemplazar: 'AND', modo: 'prefijo' },
  { buscar: 'A0', reemplazar: 'AND', modo: 'prefijo' },
  { buscar: 'B0', reemplazar: 'BO', modo: 'prefijo' },
  { buscar: 'Y5', reemplazar: 'YS', modo: 'prefijo' },
  { buscar: 'J0', reemplazar: 'JO', modo: 'prefijo' },
  { buscar: 'L0', reemplazar: 'LO', modo: 'prefijo' },
  { buscar: '1E', reemplazar: 'JE', modo: 'prefijo' },
  { buscar: 'JAK', reemplazar: 'JA', modo: 'prefijo' },
]

export function detectarSugerenciasReemplazo(
  hojas: HojaConteoFisico[],
  catalogo: CatalogoSkuIndexado[]
): SugerenciaReemplazo[] {
  const sinMatch: RenglonConteoFisico[] = []
  for (const h of hojas) {
    for (const r of h.renglones || []) {
      if (!r.producto_id) sinMatch.push(r)
    }
  }
  if (sinMatch.length === 0) return []

  const exactSet = catalogo.length > 0 ? buildExactSkuSet(catalogo) : null
  const sugerencias: SugerenciaReemplazo[] = []

  for (const patron of PATRONES_CONOCIDOS_OCR) {
    let afectados = 0
    let potencialesMatches = 0
    for (const r of sinMatch) {
      const base = r.sku_candidato || r.estilo_raw || ''
      const nuevo = aplicarPatronTexto(base, patron.buscar, patron.reemplazar, patron.modo)
      if (!nuevo) continue
      afectados++
      if (exactSet && exactSet.has(normalizarSku(nuevo))) {
        potencialesMatches++
      }
    }
    if (afectados > 0) {
      sugerencias.push({
        buscar: patron.buscar,
        reemplazar: patron.reemplazar,
        modo: patron.modo,
        afectados,
        potencialesMatches,
      })
    }
  }

  return sugerencias
    .sort((a, b) => b.potencialesMatches - a.potencialesMatches || b.afectados - a.afectados)
    .slice(0, 5)
}
