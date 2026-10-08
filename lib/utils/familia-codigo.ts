// lib/utils/familia-codigo.ts
// Algoritmo V2 para códigos de familia F###-###X con extensión infinita F###-###X<n>
// - Bisección con mitad del rango restante (nunca genera "1000")
// - Gap mínimo configurable (por defecto 5)
// - Overflow infinito vía sufijo numérico A1, A2... (orden alfabético garantizado)
// - Detección + compactación de bloques densos a decenas limpias
// familia es solo un string en productos.familia: compactar = renombrar strings, sin migración.

export const FAMILIA_GAP_MIN_DEFAULT = 5
export const FAMILIA_NUM_MAX = 999

const RAW_RE = /^F(\d{3})-(\d{3})([A-Z])(\d+)?$/i

export interface FamiliaCodeParts {
  prefijo: string // ej. "F426"
  p1: string // ej. "426"
  num: number // 0..999
  sufijo: string // "A" | "B" (mayúsculas)
  ext: string | null // sufijo numérico extendido, ej. "1" en F426-999A1
  raw: string // código normalizado en mayúsculas
}

export type EstrategiaCodigo =
  | 'decena-limpia'
  | 'mitad-rango'
  | 'unidad'
  | 'overflow-extendido'
  | 'bloque-lleno'

export interface SugerenciaCodigo {
  codigo: string
  estrategia: EstrategiaCodigo
  /** true si no había hueco entero y se usó extensión o se requiere compactar */
  requiereCompactar: boolean
}

export function parseFamiliaCode(code: string): FamiliaCodeParts | null {
  if (!code) return null
  const m = code.trim().match(RAW_RE)
  if (!m) return null
  const p1 = m[1]
  const num = parseInt(m[2], 10)
  if (Number.isNaN(num) || num < 0 || num > 999) return null
  const sufijo = (m[3] || 'A').toUpperCase()
  const ext = m[4] ?? null
  return {
    prefijo: `F${p1}`,
    p1,
    num,
    sufijo,
    ext,
    raw: buildFamiliaCode(`F${p1}`, num, sufijo, ext),
  }
}

export function isRawFamilia(code: string | null | undefined): boolean {
  if (!code) return false
  return RAW_RE.test(code.trim())
}

export function buildFamiliaCode(
  prefijo: string,
  num: number,
  sufijo: string,
  ext: string | number | null = null,
): string {
  const p = prefijo.toUpperCase()
  const s = (sufijo || 'A').toUpperCase()
  const n = Math.max(0, Math.min(999, Math.floor(num)))
  const extStr = ext === null || ext === undefined || ext === '' ? '' : String(ext)
  return `${p}-${String(n).padStart(3, '0')}${s}${extStr}`
}

/** Mismo criterio de orden que la UI: localeCompare es base */
export function compararFamilias(a: string, b: string): number {
  return (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' })
}

function cuantizarADecenaInferior(n: number): number {
  return Math.floor(n / 10) * 10
}

/** Incrementa el sufijo extendido de un código. F426-999A -> F426-999A1, A1 -> A2 ...
 * NOTA de orden: "A10" < "A2" en localeCompare (el '1' < '2' en 2ª posición),
 * así que tras "9" NO se genera "10": se anexa ("9" -> "95" -> "955"...), infinito
 * y siempre mayor lexicográficamente. Como familia es solo un string, compactar
 * a decenas cuando haya muchos overflow también es válido y barato. */
export function suggestExtendedCode(prevCode: string, targetSuffix?: string): string {
  const parsed = parseFamiliaCode(prevCode)
  if (!parsed) return prevCode
  const sufijo = (targetSuffix || parsed.sufijo || 'A').toUpperCase()
  if (parsed.ext === null) {
    return buildFamiliaCode(parsed.prefijo, parsed.num, sufijo, '1')
  }
  const n = parseInt(parsed.ext, 10)
  // Incremento simple solo mientras sea un dígito 1..8 (orden seguro en localeCompare)
  if (parsed.ext.length === 1 && Number.isFinite(n) && n >= 1 && n < 9) {
    return buildFamiliaCode(parsed.prefijo, parsed.num, sufijo, String(n + 1))
  }
  // Caso general infinito: anexar "5" (siempre mayor, nunca rompe el orden)
  // "9" -> "95" -> "955"..., "15" -> "155"..., todo < "B" y < siguiente base.
  return buildFamiliaCode(parsed.prefijo, parsed.num, sufijo, `${parsed.ext}5`)
}

/**
 * Punto medio extendido entre dos sufijos ext (strings de dígitos).
 * Devuelve null si no hay string intermedio simple → la UI debe ofrecer compactar.
 */
function suggestExtBetween(prevExt: string, nextExt: string): string | null {
  if (prevExt === nextExt) return `${prevExt}5`
  // Mismo largo: punto medio numérico si hay hueco
  if (prevExt.length === nextExt.length) {
    const a = parseInt(prevExt, 10)
    const b = parseInt(nextExt, 10)
    if (Number.isFinite(a) && Number.isFinite(b) && b - a >= 2) {
      return String(a + Math.floor((b - a) / 2))
    }
    return `${prevExt}5`
  }
  // next cuelga de prev (prev="1", next="15"): buscar dígito intermedio
  if (nextExt.startsWith(prevExt)) {
    const nextChar = nextExt[prevExt.length]
    const d = parseInt(nextChar, 10)
    if (Number.isFinite(d) && d >= 2) {
      return `${prevExt}${Math.floor(d / 2)}`
    }
    return null
  }
  // prev cuelga de next o ramas distintas: anexar "5" suele quedar en medio
  // (ej. prev "1", next "2" -> "15": "1" < "15" < "2")
  const candidato = `${prevExt}5`
  if (candidato !== nextExt && candidato.localeCompare(nextExt, 'es', { sensitivity: 'base' }) < 0) {
    return candidato
  }
  return null
}

/**
 * Genera el siguiente código intermedio.
 * - Nunca devuelve 4 dígitos ("1000"): tope en 999 y luego extensión A1, A2...
 * - Usa la mitad del hueco disponible y cuantiza a decena cuando hay espacio.
 * - gapMin: hueco mínimo a respetar antes de declarar bloque lleno (default 5).
 */
export function generateIntermediateCodeV2(
  prevCode: string,
  nextCode: string | undefined,
  targetSuffix: string,
  gapMin: number = FAMILIA_GAP_MIN_DEFAULT,
): SugerenciaCodigo {
  const sufijo = (targetSuffix || 'B').toUpperCase()
  const parsedPrev = parseFamiliaCode(prevCode)
  if (!parsedPrev) return { codigo: prevCode, estrategia: 'bloque-lleno', requiereCompactar: true }
  const gap = Math.max(1, Math.floor(gapMin))

  const parsedNext = nextCode ? parseFamiliaCode(nextCode) : null
  const mismoPrefijo = parsedNext && parsedNext.prefijo === parsedPrev.prefijo

  // ── Caso A: insertar ENTRE prev y next del mismo prefijo ──
  if (parsedNext && mismoPrefijo) {
    // Ambos con el mismo número base pero con extensión (bloque 999A1, 999A2...)
    if (parsedNext.num === parsedPrev.num && (parsedPrev.ext !== null || parsedNext.ext !== null)) {
      const prevExt = parsedPrev.ext ?? '0'
      const nextExt = parsedNext.ext ?? '0'
      // Si prev no tiene ext y next es ...A1, el hueco es usar ...A? ya ocupado por prev.
      // Se inserta anexando dígito a prev.
      const mid = suggestExtBetween(prevExt, nextExt)
      if (mid !== null) {
        const codigo = buildFamiliaCode(parsedPrev.prefijo, parsedPrev.num, sufijo, mid)
        // Validar orden lexicográfico real
        if (compararFamilias(prevCode, codigo) < 0 && compararFamilias(codigo, nextCode as string) < 0) {
          return { codigo, estrategia: 'overflow-extendido', requiereCompactar: false }
        }
      }
      return {
        codigo: suggestExtendedCode(prevCode, sufijo),
        estrategia: 'bloque-lleno',
        requiereCompactar: true,
      }
    }

    const diff = parsedNext.num - parsedPrev.num
    if (diff < 2) {
      // Sin entero libre: extensión sobre prev (infinito) + aviso de compactar
      return {
        codigo: suggestExtendedCode(prevCode, sufijo),
        estrategia: 'bloque-lleno',
        requiereCompactar: true,
      }
    }
    if (diff >= 20) {
      const mid = parsedPrev.num + Math.floor(diff / 2)
      const decena = cuantizarADecenaInferior(mid)
      // No pisar prev ni next; si la decena colisiona, usar mid tal cual
      const candidato = decena > parsedPrev.num && decena < parsedNext.num ? decena : mid
      return {
        codigo: buildFamiliaCode(parsedPrev.prefijo, candidato, sufijo),
        estrategia: 'decena-limpia',
        requiereCompactar: false,
      }
    }
    if (diff >= 6) {
      const mid = parsedPrev.num + Math.floor(diff / 2)
      return {
        codigo: buildFamiliaCode(parsedPrev.prefijo, mid, sufijo),
        estrategia: 'mitad-rango',
        requiereCompactar: false,
      }
    }
    // diff 2..5: apenas hay hueco, usar el inmediato siguiente
    return {
      codigo: buildFamiliaCode(parsedPrev.prefijo, parsedPrev.num + 1, sufijo),
      estrategia: 'unidad',
      requiereCompactar: diff - 1 < gap,
    }
  }

  // ── Caso B: fin de bloque (sin next del mismo prefijo) ──
  const remaining = FAMILIA_NUM_MAX - parsedPrev.num
  if (remaining <= 0) {
    return {
      codigo: suggestExtendedCode(prevCode, sufijo),
      estrategia: 'overflow-extendido',
      requiereCompactar: true,
    }
  }
  if (remaining < gap) {
    // Quedan menos de gapMin libres: extensión infinita para no cerrar el bloque
    return {
      codigo: suggestExtendedCode(prevCode, sufijo),
      estrategia: 'overflow-extendido',
      requiereCompactar: true,
    }
  }
  const paso = Math.max(gap, Math.floor(remaining / 2))
  let candidato = parsedPrev.num + paso
  if (remaining >= 20) {
    candidato = cuantizarADecenaInferior(candidato)
    if (candidato <= parsedPrev.num) candidato = cuantizarADecenaInferior(parsedPrev.num + 10)
  }
  if (candidato > FAMILIA_NUM_MAX) candidato = FAMILIA_NUM_MAX
  if (candidato <= parsedPrev.num) {
    return {
      codigo: suggestExtendedCode(prevCode, sufijo),
      estrategia: 'overflow-extendido',
      requiereCompactar: true,
    }
  }
  return {
    codigo: buildFamiliaCode(parsedPrev.prefijo, candidato, sufijo),
    estrategia: remaining >= 20 ? 'decena-limpia' : 'mitad-rango',
    requiereCompactar: false,
  }
}

// ── Detección y compactación de bloques densos ──────────────────────────────

export interface DenseBlock {
  prefijo: string
  miembros: string[] // códigos ordenados del bloque
  nums: number[]
  siguienteFueraDelBloque: string | null
  siguienteNum: number | null
}

/**
 * Detecta corridas densas (paso medio <=10) de longitud >= minLen dentro de un prefijo.
 * Entrada: lista de códigos raw del mismo prefijo (puede incluir borradores locales).
 */
export function detectDenseBlocks(codigos: string[], minLen = 4): DenseBlock[] {
  const parsed = codigos
    .map((c) => ({ code: c, parts: parseFamiliaCode(c) }))
    .filter((x): x is { code: string; parts: FamiliaCodeParts } => !!x.parts && x.parts.ext === null)
  const porPrefijo = new Map<string, { code: string; parts: FamiliaCodeParts }[]>()
  for (const p of parsed) {
    const arr = porPrefijo.get(p.parts.prefijo) ?? []
    arr.push(p)
    porPrefijo.set(p.parts.prefijo, arr)
  }
  const bloques: DenseBlock[] = []
  for (const [prefijo, arr] of porPrefijo) {
    const ordenados = [...arr].sort((a, b) => a.parts.num - b.parts.num)
    let inicio = 0
    for (let i = 1; i <= ordenados.length; i++) {
      const gap = i < ordenados.length ? ordenados[i].parts.num - ordenados[i - 1].parts.num : Infinity
      const denso = gap > 0 && gap <= 10
      if (!denso) {
        const ventana = ordenados.slice(inicio, i)
        if (ventana.length >= minLen) {
          // Verificar densidad promedio (evita falsos positivos con un salto grande)
          const span = ventana[ventana.length - 1].parts.num - ventana[0].parts.num
          if (span <= (ventana.length - 1) * 10 + 5) {
            const siguiente = ordenados[i] ?? null
            bloques.push({
              prefijo,
              miembros: ventana.map((v) => v.code),
              nums: ventana.map((v) => v.parts.num),
              siguienteFueraDelBloque: siguiente ? siguiente.code : null,
              siguienteNum: siguiente ? siguiente.parts.num : null,
            })
          }
        }
        inicio = i
      }
    }
  }
  return bloques
}

export interface CompactResult {
  /** mapa viejo -> nuevo, listo para stagedRenames */
  renames: Record<string, string>
  /** nuevos códigos en orden */
  nuevos: string[]
  /** true si no cupo en decenas y se requiere extensión o mover el límite */
  cupo: boolean
}

/**
 * Compacta un bloque a decenas limpias dejando 9 huecos libres entre cada familia.
 * Como familia es solo un string en productos, esto equivale a renombrar strings.
 * Preserva el sufijo A/B de cada código original.
 */
export function compactBlockToTens(
  bloque: DenseBlock,
  gapMin: number = FAMILIA_GAP_MIN_DEFAULT,
): CompactResult {
  const n = bloque.miembros.length
  const ancla = Math.floor(bloque.nums[0] / 10) * 10
  const limite = (bloque.siguienteNum ?? FAMILIA_NUM_MAX + gapMin) - gapMin
  const renames: Record<string, string> = {}
  const nuevos: string[] = []
  for (let i = 0; i < n; i++) {
    const viejo = bloque.miembros[i]
    const parts = parseFamiliaCode(viejo)
    if (!parts) continue
    const nuevoNum = ancla + i * 10
    if (nuevoNum > limite || nuevoNum > FAMILIA_NUM_MAX) {
      return { renames: {}, nuevos: [], cupo: false }
    }
    const nuevo = buildFamiliaCode(bloque.prefijo, nuevoNum, parts.sufijo)
    nuevos.push(nuevo)
    if (nuevo !== viejo) renames[viejo] = nuevo
  }
  return { renames, nuevos, cupo: true }
}
