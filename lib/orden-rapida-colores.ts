// C:\Users\uriel\Downloads\enero 26\archivo2\lib\orden-rapida-colores.ts
// Logica pura Fase 2 (testeable): siembra de colores por confirmar,
// siguiente letra de pack y particion de rangos de carton.
import { resolveColor, type CatalogColor } from '@/lib/color-match'

export interface N8nColorRow {
  raw: string
  en?: string | null
  es?: string | null
  cajas?: string[]
  fuente?: string
}

export interface DetalleColorRow {
  color_raw?: string
  codigo_caja_temporal?: string
}

export type EstadoColor = 'nuevo' | 'mapeado' | 'creado' | 'omitido' | 'existente'

export interface SeededColor {
  raw: string
  en?: string | null
  es?: string | null
  cajas?: string[]
  fuente?: string
  estado: EstadoColor
  color_id?: number | null
  via?: string | null
}

/** Siguiente letra de pack (PACK B -> PACK C); si no es letra, sufija B. */
export function siguienteLetraPack(pack: string): string {
  const m = String(pack || '').trim().toUpperCase().match(/^PACK ([A-Z])$/)
  if (m && m[1] < 'Z') return `PACK ${String.fromCharCode(m[1].charCodeAt(0) + 1)}`
  return `${String(pack || 'PACK').trim()} B`
}

/**
 * Parte rangos de carton en conservar/mover por la mitad (los ultimos se mueven).
 * Con 2 rangos (caso PACK B duplicado) mueve exactamente el segundo.
 */
export function partirRangosCarton(rangos: string[]): { conservar: string[]; mover: string[] } {
  const unicos = Array.from(new Set((rangos || []).map((x) => String(x).trim()).filter(Boolean)))
  if (unicos.length < 2) return { conservar: unicos, mover: [] }
  const corte = Math.ceil(unicos.length / 2)
  return { conservar: unicos.slice(0, corte), mover: unicos.slice(corte) }
}

export interface RepartoCandidato {
  sku_base: string
  filas?: number[]
}

/**
 * Deriva a que candidato pertenece cada caja por posicion en el documento:
 * la caja hereda el ultimo SKU candidato visto en (o antes de) su fila de
 * creacion. Exacto aunque dos SKUs compartan carton (ej. CTN 73 bajo
 * AND260030 en fila 82 y bajo AND260029 en fila 90).
 * Solo asigna cajas con fila conocida; el resto lo resuelve el llamador.
 */
export function derivarRepartoPorFilas(
  codigos: string[],
  filaPorCodigo: Record<string, number>,
  candidatos: RepartoCandidato[],
): { mapa: Map<string, string>; sinPosicion: string[] } {
  const mapa = new Map<string, string>()
  const sinPosicion: string[] = []
  const cands = (candidatos || [])
    .map((c) => ({
      sku: String(c.sku_base || '').trim(),
      minFila: Math.min(...(c.filas || []).map((f) => Number(f)).filter((f) => Number.isFinite(f))),
    }))
    .filter((c) => c.sku && Number.isFinite(c.minFila))
    .sort((a, b) => a.minFila - b.minFila)
  if (cands.length === 0) return { mapa, sinPosicion: [...codigos] }
  for (const cod of codigos) {
    const f = Number(filaPorCodigo[cod])
    if (!Number.isFinite(f)) { sinPosicion.push(cod); continue }
    let elegido = cands[0].sku
    for (const c of cands) {
      if (c.minFila <= f) elegido = c.sku
      else break
    }
    mapa.set(cod, elegido)
  }
  return { mapa, sinPosicion }
}

/** Minima fila_origen por codigo desde lineas staging (una entrada por fila procesada). */
export function stagingMinFilaPorCodigo(
  lineas: Array<{ codigo_caja_temporal?: string; fila_origen?: number }>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of lineas || []) {
    const cod = String(l.codigo_caja_temporal || '')
    const f = Number(l.fila_origen)
    if (!cod || !Number.isFinite(f)) continue
    if (!(cod in out) || f < out[cod]) out[cod] = f
  }
  return out
}

/** Entrada de separacion (shape minimo compatible con SeparacionSugerida del wizard). */
export interface SeparacionEntrada {
  tipo?: string
  sku_base_original?: string
  productos_candidatos?: Array<{ sku_base: string; filas?: number[]; cartones?: string[] }>
  reparto_exacto?: Array<{ codigo_caja_temporal: string; sku_base_sugerido: string }>
  cajas_para_revisar?: string[]
}

/**
 * Riqueza de una sugerencia: la rica del parser trae filas/cartones por
 * candidato; la pobre (fallback IA) solo trae SKUs. Sirve para dedupe.
 */
export function riquezaSeparacion(s: SeparacionEntrada): number {
  let score = 0
  for (const c of s.productos_candidatos || []) {
    if ((c.filas || []).length > 0) score += 2
    if ((c.cartones || []).length > 0) score += 1
  }
  if ((s.reparto_exacto || []).length > 0) score += 3
  if ((s.cajas_para_revisar || []).length > 0) score += 1
  return score
}

/**
 * Dedupe: conserva la mas rica por (tipo, sku original). El workflow vivo
 * puede traer la rica del parser + una pobre duplicada del fallback IA;
 * sin esto el banner muestra dos botones y el pobre mueve 0 cajas.
 */
export function dedupSeparaciones<T extends SeparacionEntrada>(seps: T[]): T[] {
  const porTipo = new Map<string, T>()
  for (const s of seps || []) {
    const t = String(s.tipo || '')
    const prev = porTipo.get(t)
    if (!prev || riquezaSeparacion(s) > riquezaSeparacion(prev)) porTipo.set(t, s)
  }
  return [...porTipo.values()]
}

export interface CajaOrigenReparto {
  codigo: string
  carton: string
}

export interface CandidatoReparto {
  sku_base: string
  filas?: number[]
  cartones?: string[]
}

export interface FilaRepartoExacto {
  codigo_caja_temporal: string
  sku_base_sugerido: string
}

/**
 * Calcula destino por codigo en 3 niveles (puro, sin efectos):
 * A) reparto_exacto del workflow; B) filas staging (exacto aunque compartan
 * carton); C) cartones unicos sin solapar. `exactas` cuenta A+B.
 */
export function calcularDestinos(
  origen: CajaOrigenReparto[],
  stagingPorCodigo: Record<string, number>,
  candidatos: CandidatoReparto[],
  repartoExacto?: FilaRepartoExacto[],
  esDestinoValido?: (sku: string) => boolean,
): { destinos: Map<string, string>; exactas: number } {
  const valido = esDestinoValido ?? (() => true)
  const codsOrigen = new Set(origen.map((o) => o.codigo))
  const destinos = new Map<string, string>()
  let exactas = 0
  // Nivel A
  for (const r of repartoExacto || []) {
    const cod = String(r.codigo_caja_temporal || '')
    const skuD = String(r.sku_base_sugerido || '').trim()
    if (!cod || !skuD || destinos.has(cod)) continue
    if (!valido(skuD)) continue
    if (!codsOrigen.has(cod)) continue
    destinos.set(cod, skuD)
    exactas++
  }
  // Nivel B
  if (destinos.size < origen.length) {
    const restantes = origen.map((o) => o.codigo).filter((cod) => cod && !destinos.has(cod))
    const { mapa } = derivarRepartoPorFilas(
      restantes,
      stagingPorCodigo || {},
      (candidatos || []).map((c) => ({ sku_base: c.sku_base, filas: c.filas })),
    )
    for (const [cod, skuD] of mapa) {
      if (!valido(skuD)) continue
      destinos.set(cod, skuD)
      exactas++
    }
  }
  // Nivel C
  const cands = (candidatos || []).map((c) => ({
    sku: String(c.sku_base || '').trim(),
    cartones: (c.cartones || []).map((x) => String(x).trim()).filter(Boolean),
  })).filter((c) => c.sku)
  const reclamados = new Set<string>(cands[0]?.cartones || [])
  for (const c of cands.slice(1)) {
    const unicos = c.cartones.filter((x) => !reclamados.has(x))
    for (const o of origen) {
      if (!o.codigo || destinos.has(o.codigo)) continue
      if (!valido(c.sku)) continue
      if (unicos.includes(o.carton)) destinos.set(o.codigo, c.sku)
    }
    for (const x of c.cartones) reclamados.add(x)
  }
  return { destinos, exactas }
}

/**
 * Siembra pendientes: une filas n8n (raw + tripletes IA) con barrido de
 * detalles, deduplica por raw (merge de cajas) y resuelve contra catalogo.
 */
export function seedColoresPorConfirmar(
  n8nRows: N8nColorRow[],
  detalles: DetalleColorRow[],
  catalog: CatalogColor[],
): SeededColor[] {
  const seen = new Map<string, SeededColor>()
  const push = (rawInput: string, en?: string | null, es?: string | null, cajas?: string[], fuente?: string) => {
    const raw = String(rawInput || '').trim()
    if (!raw) return
    const key = raw.toUpperCase()
    if (seen.has(key)) {
      const prev = seen.get(key)!
      if (cajas && cajas.length > 0) {
        prev.cajas = Array.from(new Set([...(prev.cajas ?? []), ...cajas])).slice(0, 25)
      }
      return
    }
    const m = resolveColor(raw, catalog)
    seen.set(key, {
      raw,
      en: en ?? null,
      es: es ?? null,
      cajas: (cajas ?? []).slice(0, 25),
      fuente,
      estado: m.found ? 'existente' : 'nuevo',
      color_id: m.id ?? null,
      via: m.via,
    })
  }
  for (const c of n8nRows || []) {
    push(String(c.raw ?? ''), c.en ?? null, c.es ?? null, c.cajas ?? [], c.fuente)
  }
  for (const d of detalles || []) {
    const raw = String(d.color_raw ?? '').trim()
    if (raw) push(raw, null, null, [String(d.codigo_caja_temporal ?? '')].filter(Boolean), 'wizard')
  }
  return [...seen.values()]
}
