// modules/catalogo/actions/hex.ts
// Fase 2 orden-rapida: sugerencia de HEX para colores nuevos.
// Orden: biblioteca local -> API gratuita color.pizza (match exacto) ->
// negro #000000 para no trabar (el humano ajusta en el modal).
'use server'

import { cleanColorRaw, hexBiblioteca } from '@/lib/color-match'
import { getCurrentUser } from '@/modules/auth/queries'

export type HexFuente = 'biblioteca' | 'api' | 'negro'

export interface HexSugerido {
  hex: string
  fuente: HexFuente
  /** Nombre devuelto por la API (null si no aplica). */
  nombreApi: string | null
}

const HEX_NEGRO = '#000000'
// Cache por instancia: mismo EN -> mismo HEX siempre (estable, sin re-llamadas).
const cacheApi = new Map<string, HexSugerido>()

interface ColorPizzaHit {
  name?: string
  hex?: string
  similarity?: number
}

/** Solo match exacto (nombre igual + similarity 1): evita falsos HEX. */
function elegirExacto(en: string, colors: ColorPizzaHit[]): ColorPizzaHit | null {
  for (const c of colors || []) {
    if (String(c.name || '').toUpperCase() === en && Number(c.similarity) === 1 && /^#[0-9A-Fa-f]{6}$/.test(String(c.hex || ''))) {
      return c
    }
  }
  return null
}

export async function resolverHexColorAction(nombreEs: string, nombreIntern?: string | null): Promise<HexSugerido> {
  const user = await getCurrentUser()
  if (!user) return { hex: HEX_NEGRO, fuente: 'negro', nombreApi: null }

  const deLib = hexBiblioteca(nombreEs || '')
  if (deLib) return { hex: deLib.toUpperCase(), fuente: 'biblioteca', nombreApi: null }

  const en = cleanColorRaw(nombreIntern || '')
  if (!en || en.length < 3) return { hex: HEX_NEGRO, fuente: 'negro', nombreApi: null }
  const hitCache = cacheApi.get(en)
  if (hitCache) return hitCache

  const negro: HexSugerido = { hex: HEX_NEGRO, fuente: 'negro', nombreApi: null }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    let res: Response
    try {
      res = await fetch(`https://api.color.pizza/v1/names/?name=${encodeURIComponent(en)}`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      })
    } finally {
      clearTimeout(t)
    }
    if (!res.ok) {
      cacheApi.set(en, negro)
      return negro
    }
    const json = (await res.json()) as { colors?: ColorPizzaHit[] }
    const exacto = elegirExacto(en, json.colors || [])
    if (!exacto?.hex) {
      cacheApi.set(en, negro)
      return negro
    }
    const out: HexSugerido = { hex: exacto.hex.toUpperCase(), fuente: 'api', nombreApi: String(exacto.name || '') || null }
    cacheApi.set(en, out)
    return out
  } catch {
    // API caida, timeout o sin red: negro para no trabar (acordado Fase 2).
    cacheApi.set(en, negro)
    return negro
  }
}
