// lib/inventario/sku-ocr.ts
//
// Normalización y propuestas de búsqueda para SKUs leídos por OCR.
// Es puro: no toca Supabase, React ni variables de entorno.

const RE_AND_CON_SLASH = /^AND(\d{2})\s*\/\s*(\d{4})([A-Z]{0,4})$/i
// La familia puede traer un dígito leído por error (ej. Y526/07MCL -> YS26/07MCL).
const RE_MODERNO = /^([A-Z0-9]{1,5})(\d{2})\/(\d{2})([A-Z0-9]*)$/i
const RE_AND_CANONICO = /^AND\d{6}$/
// Un código con espacios alrededor de la barra NO debe fragmentarse:
// "B0248 / 1CAC" -> "B0248/1CAC", "MK26 / 08 SW" -> "MK26/08SW",
// "BO / 2C SETAF" -> "BO/2CSETAF". La familia debe empezar por letra para no
// absorber dos códigos distintos ("3VT8489 /AND250032").
const RE_CODIGO_CON_BARRA = /^[A-Z][A-Z0-9]{0,7}\/[A-Z0-9]{1,10}$/

// Confusiones de OCR dentro de la familia (prefijo). Solo dígito -> letra:
// el caso real es Y5 -> YS; B0 -> BO.
const FAMILIA_CONFUSIONES: Record<string, string> = {
  '5': 'S',
  '0': 'O',
}

// Sufijos que aparecen en el catálogo real. Se usan solo como propuestas:
// la RPC únicamente devuelve coincidencias que existan en productos activos.
const SUFIJOS_OCR = [
  'MW', 'USD', 'MSD', 'HC', 'HW', 'MC', 'HSD', 'SW', 'MST', 'MSTLY',
  'MCL', 'MCD', 'HD', 'MD', 'MAL', 'WBH', 'H', 'M', 'D', 'SD',
  'OSD', 'MSDLYC', 'HCCLOVI',
] as const

const CONFUSIONES: Record<string, string[]> = {
  '0': ['O', 'U'],
  '1': ['I', 'U'],
  '2': ['Z'],
  '4': ['A'],
  '5': ['S', 'U'],
  '6': ['G'],
  '7': ['T'],
  '8': ['B'],
  A: ['4'],
  B: ['8'],
  C: ['G', 'W'],
  D: ['O'],
  G: ['6', 'C'],
  H: ['M'],
  I: ['1'],
  M: ['H'],
  O: ['U', '0'],
  S: ['5'],
  T: ['7'],
  U: ['O', 'V'],
  V: ['U'],
  W: ['C'],
  Z: ['2'],
}

export type SkuOcrConsulta = {
  raw: string
  principales: string[]
  variantes: string[]
  vecinos: string[]
}

/** Normaliza para comparar: mayúsculas y sin espacios, puntos, comas, guiones ni barras. */
export function normalizarSku(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[\s.,\-/]+/g, '')
    .trim()
}

/** Convierte AND26/0016DC -> AND260016. No toca AND de 5 dígitos como AND20002. */
export function canonicalizarAnd(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ')
  const match = raw.match(RE_AND_CON_SLASH)
  if (!match) return raw
  return `AND${match[1]}${match[2]}`.toUpperCase()
}

/**
 * Separa una lectura que puede traer más de un código.
 * Ej: "3VT8489 /AND250032" -> ["3VT8489", "AND250032"].
 */
export function separarCodigos(value: string | null | undefined): string[] {
  let raw = String(value ?? '').trim()
  if (!raw) return []

  // Un solo AND con slash: no separar por la barra.
  if (RE_AND_CON_SLASH.test(raw)) return [canonicalizarAnd(raw)]

  // El OCR a veces mete espacios: "AND 26 0003", "AND 24 00 43".
  raw = raw.replace(/\bAND\s+([\d\s]{5,})\b/gi, (_m, digitos: string) => {
    return `AND${digitos.replace(/\s+/g, '')}`
  })

  // "AND 26 / 0016 DC" -> "AND26/0016DC".
  raw = raw.replace(
    /\bAND\s*(\d{2})\s*\/\s*(\d{4})\s*([A-Z]{0,4})\b/gi,
    (_m, anio: string, folio: string) => `AND${anio}${folio}`
  )

  // Si TODO el texto (sin espacios) es un unico codigo con barra, no lo fragmentes.
  // Sin esta regla "B0248 / 1CAC" se parte en "B0248" + "1CAC" y el SKU real se
  // pierde; ademas el fragmento "1CAC" arrastra candidatos ajenos al codigo.
  const compacto = raw.replace(/\s+/g, '').toUpperCase()
  if (RE_CODIGO_CON_BARRA.test(compacto)) return [compacto]

  // Espacios alrededor de la barra en familias modernas: "JA24 / 4DAML" -> "JA24/4DAML".
  // No toca "3VT8489 /AND250032" porque el código no empieza con letras+2 dígitos.
  raw = raw.replace(
    /\b([A-Z]{2,4}\d{2})\s*\/\s*([A-Z0-9]{1,8})\b/gi,
    (_m, familia: string, modelo: string) => `${familia}/${modelo}`
  )

  return raw
    .split(/\s+/)
    .map((token) => token.replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean)
    .map((token) => canonicalizarAnd(token))
}

function agregarUnicos(previos: string[], nuevos: Array<string | null | undefined>): string[] {
  const vistos = new Set(previos.map((v) => normalizarSku(v)).filter(Boolean))
  const salida = [...previos]
  for (const candidato of nuevos) {
    const texto = String(candidato ?? '').trim()
    const clave = normalizarSku(texto)
    if (!texto || !clave || vistos.has(clave)) continue
    vistos.add(clave)
    salida.push(texto)
  }
  return salida
}

/**
 * Genera propuestas de variantes por confusiones típicas de OCR y por los
 * sufijos reales del catálogo. Nunca se autopromueven por sí solas: la RPC
 * solo devuelve las que existen y el resolver decide con el score.
 */
export function generarVariantesSku(
  raw: string,
  skuSugerido?: string | null,
  variantesIa?: string[] | null
): string[] {
  const salida: string[] = []
  const agregar = (valor: string | null | undefined) => {
    const texto = String(valor ?? '').trim()
    if (!texto) return
    if (normalizarSku(texto) === normalizarSku(raw)) return
    salida.push(texto)
  }

  for (const variante of variantesIa ?? []) agregar(variante)

  const base = String(skuSugerido ?? '').trim() || String(raw ?? '').trim()
  for (const codigo of separarCodigos(base)) {
    const match = codigo.match(RE_MODERNO)
    if (!match) {
      // AND agotado (todo 00): proponer el vecino lógico 10. Solo si existe.
      if (RE_AND_CANONICO.test(normalizarSku(codigo)) && codigo.endsWith('00')) {
        agregar(`${codigo.slice(0, -2)}10`)
      }
      continue
    }

    const [, familia, anio, secuencia, modelo] = match
    const familiaUpper = familia.toUpperCase()
    const prefijo = `${familiaUpper}${anio}/${secuencia}`
    const modeloUpper = modelo.toUpperCase()

    // Correcciones de familia (Y5 -> YS, B0 -> BO) con el mismo modelo: van primero.
    const prefijos = [prefijo]
    for (let i = 0; i < familiaUpper.length; i += 1) {
      const reemplazo = FAMILIA_CONFUSIONES[familiaUpper[i]]
      if (!reemplazo) continue
      prefijos.push(
        `${familiaUpper.slice(0, i)}${reemplazo}${familiaUpper.slice(i + 1)}${anio}/${secuencia}`
      )
    }
    for (const pref of prefijos) {
      if (pref !== prefijo) agregar(`${pref}${modeloUpper}`)
    }

    for (const pref of prefijos) {
      for (const sufijo of SUFIJOS_OCR) {
        if (sufijo !== modeloUpper) agregar(`${pref}${sufijo}`)
      }

      for (let i = 0; i < modeloUpper.length; i += 1) {
        const caracter = modeloUpper[i]
        for (const reemplazo of CONFUSIONES[caracter] ?? []) {
          agregar(`${pref}${modeloUpper.slice(0, i)}${reemplazo}${modeloUpper.slice(i + 1)}`)
        }
      }
    }
  }

  return agregarUnicos([], salida).slice(0, 40)
}

/**
 * Vecinos de secuencia (±1) con el mismo modelo/sufijos. Se usan solo como
 * segunda pasada cuando la lectura principal no devolvió ningún candidato.
 */
export function generarVecinosSku(raw: string, skuSugerido?: string | null): string[] {
  const salida: string[] = []
  const base = String(skuSugerido ?? '').trim() || String(raw ?? '').trim()

  for (const codigo of separarCodigos(base)) {
    const match = codigo.match(RE_MODERNO)
    if (!match) continue

    const [, familia, anio, secuencia, modelo] = match
    const numero = Number(secuencia)
    if (!Number.isFinite(numero)) continue

    const modelos = new Set<string>([modelo.toUpperCase(), ...SUFIJOS_OCR])
    for (const delta of [-1, 1]) {
      const siguiente = numero + delta
      if (siguiente < 0 || siguiente > 99) continue
      const seq = String(siguiente).padStart(2, '0')
      for (const sufijo of modelos) {
        salida.push(`${familia.toUpperCase()}${anio}/${seq}${sufijo}`)
      }
    }
  }

  return agregarUnicos([], salida)
    .filter((valor) => normalizarSku(valor) !== normalizarSku(raw))
    .slice(0, 50)
}

/**
 * Construye todas las búsquedas de una línea OCR:
 * - principales: códigos canónicos/raw que se mandan como `sku` a la RPC.
 * - variantes: propuestas de sufijo/confusión que se mandan en `posibles_variantes`.
 * - vecinos: segunda pasada si no hubo ningún candidato.
 */
export function construirConsultaSku(
  raw: string | null | undefined,
  skuSugerido?: string | null,
  variantesIa?: string[] | null
): SkuOcrConsulta {
  const rawLimpio = String(raw ?? '').trim()
  const sugeridoLimpio = String(skuSugerido ?? '').trim()

  const principalesRaw = separarCodigos(rawLimpio)
  const sugeridoEsAndCanonico = /^AND\d{6}$/.test(normalizarSku(sugeridoLimpio))
  const principalesSugerido =
    sugeridoLimpio && (principalesRaw.length === 0 || sugeridoEsAndCanonico)
      ? separarCodigos(sugeridoLimpio)
      : []

  const principales = agregarUnicos([], [...principalesRaw, ...principalesSugerido])

  // Un `sku` de la IA que difiere de la lectura literal se trata como variante
  // (0.85), nunca como acierto exacto: así no se autopromueve una corrección dudosa.
  const variantesIaEfectivas = [...(variantesIa ?? [])]
  if (
    sugeridoLimpio &&
    normalizarSku(sugeridoLimpio) !== normalizarSku(rawLimpio) &&
    !sugeridoEsAndCanonico
  ) {
    variantesIaEfectivas.push(sugeridoLimpio)
  }

  return {
    raw: rawLimpio,
    principales,
    variantes: generarVariantesSku(rawLimpio, null, variantesIaEfectivas),
    vecinos: generarVecinosSku(rawLimpio, null),
  }
}
