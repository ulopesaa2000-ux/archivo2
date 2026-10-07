// lib/inventario/flujo-grafo.ts
// Constructor puro: TrazabilidadCompletaRespuesta → nodos/edges del diagrama de flujo.
// Sin dependencias de UI; testeable sin render. Los colores los resuelve el canvas.

import type { TrazabilidadCompletaRespuesta, FilaTrazabilidadMatriz, TimelineEvento } from '@/modules/inventario/trazabilidad'

export interface ResumenCiudad {
  ciudad: string
  stock: number
  entradas: number
  salidas: number
  traspasosEnviados: number
  traspasosRecibidos: number
  // Amarillo (trámite PEND/PROC): 2 valores separados
  pendEntradas: number
  pendSalidas: number
  pendNEntradas: number
  pendNSalidas: number
  tienePendiente: boolean
  bodegas: string[]
}

export interface FlowNode {
  id: string
  tipo: 'ciudad' | 'ventas' | 'entradas'
  ciudad?: string
  resumen?: ResumenCiudad
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  cajas: number
  tipo: 'traspaso' | 'venta' | 'entrada'
  notas?: { nota_id?: number; numero_nota?: string }[]
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
  ciudades: ResumenCiudad[]
}

function filasPlanas(filas: FilaTrazabilidadMatriz[]): FilaTrazabilidadMatriz[] {
  const out: FilaTrazabilidadMatriz[] = []
  filas.forEach((f) => {
    if (f.skus && f.skus.length > 0) out.push(...f.skus)
    else out.push(f)
  })
  return out
}

export function construirFlujo(data: TrazabilidadCompletaRespuesta): FlowGraph {
  const planas = filasPlanas(data.matriz)
  const porCiudad = new Map<string, ResumenCiudad>()
  const traspasos = new Map<string, { cajas: number; notas: { nota_id?: number; numero_nota?: string }[] }>()

  const get = (cd: string): ResumenCiudad => {
    let r = porCiudad.get(cd)
    if (!r) {
      r = {
        ciudad: cd, stock: 0, entradas: 0, salidas: 0,
        traspasosEnviados: 0, traspasosRecibidos: 0,
        pendEntradas: 0, pendSalidas: 0, pendNEntradas: 0, pendNSalidas: 0,
        tienePendiente: false, bodegas: [],
      }
      porCiudad.set(cd, r)
    }
    return r
  }

  planas.forEach((f) => {
    Object.entries(f.salidas_por_ciudad || {}).forEach(([cd, cant]) => {
      get(cd).salidas += cant
    })
    Object.entries(f.stock_por_ciudad || {}).forEach(([cd, cant]) => {
      get(cd).stock += cant
    })
    if (f.tiene_pendiente) {
      // El pendiente es por producto (sin desglose por ciudad en la fuente).
      // Para no duplicar cifras: marca amarilla en las ciudades con stock del SKU,
      // pero los 2 valores solo se suman si el SKU vive en una sola ciudad.
      const cds = Object.keys(f.stock_por_ciudad || {})
      cds.forEach((cd) => { get(cd).tienePendiente = true })
      if (cds.length === 1) {
        const r = get(cds[0])
        r.pendEntradas += f.pend_entradas ?? 0
        r.pendSalidas += f.pend_salidas ?? 0
        r.pendNEntradas += f.pend_n_entradas ?? 0
        r.pendNSalidas += f.pend_n_salidas ?? 0
      }
    }
    ;(f.traspasos_flujo || []).forEach((t) => {
      const key = `${t.origen_ciudad}→${t.destino_ciudad}`
      const agg = traspasos.get(key) || { cajas: 0, notas: [] }
      agg.cajas += t.cajas
      if (t.numero_nota && !agg.notas.some((n) => n.numero_nota === t.numero_nota)) {
        agg.notas.push({ nota_id: t.nota_id, numero_nota: t.numero_nota })
      }
      traspasos.set(key, agg)
      get(t.origen_ciudad).traspasosEnviados += t.cajas
      get(t.destino_ciudad).traspasosRecibidos += t.cajas
      const bOrig = get(t.origen_ciudad).bodegas
      if (t.origen_bodega && !bOrig.includes(t.origen_bodega)) bOrig.push(t.origen_bodega)
      const bDest = get(t.destino_ciudad).bodegas
      if (t.destino_bodega && !bDest.includes(t.destino_bodega)) bDest.push(t.destino_bodega)
    })
  })

  // Entradas por ciudad desde los KPIs (CONF/MODF del período)
  ;(data.kpis.ciudadesSalidas || []).forEach((c) => {
    get(c.ciudad).entradas += c.cajas_entrada || 0
  })

  const ciudades = Array.from(porCiudad.values())
    .filter((r) => r.stock > 0 || r.salidas > 0 || r.entradas > 0 || r.traspasosEnviados > 0 || r.traspasosRecibidos > 0)
    .sort((a, b) => b.salidas - a.salidas)

  const nodes: FlowNode[] = [
    { id: 'src-entradas', tipo: 'entradas' },
    ...ciudades.map((r) => ({ id: `cd-${r.ciudad}`, tipo: 'ciudad' as const, ciudad: r.ciudad, resumen: r })),
    { id: 'sink-ventas', tipo: 'ventas' },
  ]

  const edges: FlowEdge[] = []
  traspasos.forEach((agg, key) => {
    const [o, d] = key.split('→')
    edges.push({ id: `tr-${o}-${d}`, source: `cd-${o}`, target: `cd-${d}`, cajas: agg.cajas, tipo: 'traspaso', notas: agg.notas })
  })
  ciudades.forEach((r) => {
    if (r.entradas > 0) edges.push({ id: `en-${r.ciudad}`, source: 'src-entradas', target: `cd-${r.ciudad}`, cajas: r.entradas, tipo: 'entrada' })
    if (r.salidas > 0) edges.push({ id: `sa-${r.ciudad}`, source: `cd-${r.ciudad}`, target: 'sink-ventas', cajas: r.salidas, tipo: 'venta' })
  })

  return { nodes, edges, ciudades }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grafo por SKU (modal Kardex): nodos = bodegas + externos, edges por evento.
// El firmado es direccional: SAL −, ENT/DEV +, TRF − en origen / + en destino.
// ─────────────────────────────────────────────────────────────────────────────
export interface SkuFlowNode {
  id: string
  tipo: 'bodega' | 'ext-in' | 'ext-out'
  nombre: string
  ciudad?: string | null
  entradas: number
  salidas: number
}

export interface SkuFlowEdge {
  id: string
  source: string
  target: string
  cajas: number
  tipo: 'traspaso' | 'venta' | 'entrada' | 'ajuste'
  eventos: TimelineEvento[]
}

export interface SkuFlowGraph {
  nodes: SkuFlowNode[]
  edges: SkuFlowEdge[]
}

export function firmadoEvento(ev: TimelineEvento, bodega: string): number {
  const t = (ev.tipo_codigo || '').toUpperCase()
  const cajas = Math.abs(ev.cajas)
  if (t === 'SAL') return -cajas
  if (t === 'ENT' || t === 'DEV') return cajas
  if (t === 'TRF') return ev.origen_bodega === bodega ? -cajas : cajas
  if (t === 'AJU') return ev.cajas >= 0 ? Math.abs(ev.cajas) : -Math.abs(ev.cajas)
  return cajas
}

export function construirFlujoSku(eventos: TimelineEvento[]): SkuFlowGraph {
  const nodos = new Map<string, SkuFlowNode>()
  const edges = new Map<string, SkuFlowEdge>()

  const bgId = (nombre: string) => `bg-${nombre}`
  const getBg = (nombre: string, ciudad?: string | null): SkuFlowNode => {
    const id = bgId(nombre)
    let n = nodos.get(id)
    if (!n) {
      n = { id, tipo: 'bodega', nombre, ciudad: ciudad || null, entradas: 0, salidas: 0 }
      nodos.set(id, n)
    }
    return n
  }

  eventos.forEach((ev, idx) => {
    const t = (ev.tipo_codigo || '').toUpperCase()
    if (t === 'TRF' && ev.origen_bodega && ev.destino_bodega) {
      const o = getBg(ev.origen_bodega, ev.origen_ciudad)
      const d = getBg(ev.destino_bodega, ev.destino_ciudad)
      o.salidas += Math.abs(ev.cajas)
      d.entradas += Math.abs(ev.cajas)
      const key = `${bgId(ev.origen_bodega)}→${bgId(ev.destino_bodega)}`
      const e = edges.get(key) || { id: `e-${key}`, source: bgId(ev.origen_bodega), target: bgId(ev.destino_bodega), cajas: 0, tipo: 'traspaso' as const, eventos: [] }
      e.cajas += Math.abs(ev.cajas)
      e.eventos.push(ev)
      edges.set(key, e)
    } else if (t === 'SAL' && ev.origen_bodega) {
      const o = getBg(ev.origen_bodega, ev.origen_ciudad)
      o.salidas += Math.abs(ev.cajas)
      const key = `${bgId(ev.origen_bodega)}→ext-out-${idx}`
      edges.set(key, { id: `e-${key}`, source: bgId(ev.origen_bodega), target: 'ext-out', cajas: Math.abs(ev.cajas), tipo: 'venta', eventos: [ev] })
    } else if ((t === 'ENT' || t === 'DEV') && ev.origen_bodega) {
      const o = getBg(ev.origen_bodega, ev.origen_ciudad)
      o.entradas += Math.abs(ev.cajas)
      const key = `ext-in→${bgId(ev.origen_bodega)}-${idx}`
      edges.set(key, { id: `e-${key}`, source: 'ext-in', target: bgId(ev.origen_bodega), cajas: Math.abs(ev.cajas), tipo: 'entrada', eventos: [ev] })
    } else if (t === 'AJU' && ev.origen_bodega) {
      const o = getBg(ev.origen_bodega, ev.origen_ciudad)
      if (ev.cajas >= 0) o.entradas += Math.abs(ev.cajas)
      else o.salidas += Math.abs(ev.cajas)
    }
  })

  if (!nodos.has('ext-in')) nodos.set('ext-in', { id: 'ext-in', tipo: 'ext-in', nombre: 'Entradas externas', entradas: 0, salidas: 0 })
  if (!nodos.has('ext-out')) nodos.set('ext-out', { id: 'ext-out', tipo: 'ext-out', nombre: 'Salidas / ventas', entradas: 0, salidas: 0 })

  return { nodes: Array.from(nodos.values()), edges: Array.from(edges.values()) }
}

