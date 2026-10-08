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
