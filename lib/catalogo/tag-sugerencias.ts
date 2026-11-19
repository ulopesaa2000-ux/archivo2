// lib/catalogo/tag-sugerencias.ts
import type { RefTagCatalogo, TagResuelto, TipoTagCatalogo } from '@/modules/catalogo/types'

export type TagSugerido = {
  tipo_tag_id: number
  ref_tag_id: number
  tipo_nombre: string
  tipo_codigo: string | null
  ref_nombre: string
  razon: string
  es_multiple: boolean
}

type ReglaTag = {
  tipoCodigo: string
  refNombreMatch: string
  keywords: string[]
  excludeKeywords?: string[]
  razon: string
}

export function normalizeTagText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const REGLAS_DESCRIPCION: ReglaTag[] = [
  {
    tipoCodigo: 'GORRO',
    refNombreMatch: 'CON GORRO',
    keywords: ['CON GORRO', 'GORRO', 'CAPUCHA', 'HOODIE'],
    excludeKeywords: ['SIN GORRO', 'SIN CAPUCHA'],
    razon: 'Menciona gorro/capucha',
  },
  {
    tipoCodigo: 'GORRO',
    refNombreMatch: 'SIN GORRO',
    keywords: ['SIN GORRO', 'SIN CAPUCHA'],
    razon: 'Indica sin gorro',
  },
  {
    tipoCodigo: 'TALLA EXTRA',
    refNombreMatch: 'TALLAS REGULARES',
    keywords: ['TALLAS NORMALES', 'TALLA NORMAL', 'TALLAS REGULARES'],
    razon: 'Indica tallas normales',
  },
  {
    tipoCodigo: 'TALLA EXTRA',
    refNombreMatch: 'TALLAS EXTRA',
    keywords: ['TALLA EXTRA', 'TALLAS EXTRA', 'PLUS SIZE', 'CURVY'],
    razon: 'Indica tallas extra',
  },
  {
    tipoCodigo: 'RELLENO',
    refNombreMatch: 'CON RELLENO',
    keywords: ['CON RELLENO', 'RELLENO', 'BORREGA', 'FUR', 'PELUCHE', 'CAPITONADO', 'CAPITONADA', 'ACOLCHADO', 'ACOLCHADA'],
    excludeKeywords: ['SIN RELLENO'],
    razon: 'Indica relleno o forro cálido',
  },
  {
    tipoCodigo: 'RELLENO',
    refNombreMatch: 'SIN RELLENO',
    keywords: ['SIN RELLENO'],
    razon: 'Indica sin relleno',
  },
  {
    tipoCodigo: 'RELLENO',
    refNombreMatch: 'LIGERA',
    keywords: ['DELGADO', 'DELGADA', 'LIGERO', 'LIGERA', 'LIVIANO', 'LIVIANA'],
    razon: 'Describe prenda ligera/delgada',
  },
  {
    tipoCodigo: 'RELLENO',
    refNombreMatch: 'GRUESA',
    keywords: ['GRUESO', 'GRUESA', 'PESADO', 'PESADA', 'AFELPADO', 'AFELPADA'],
    razon: 'Describe prenda gruesa/afelpada',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'DESMONTABLE',
    keywords: ['DESMONTABLE'],
    razon: 'Palabra clave "desmontable"',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'REVERSIBLE',
    keywords: ['REVERSIBLE', 'DOBLE VISTA'],
    razon: 'Prenda reversible / doble vista',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'ROMPEVIENTOS',
    keywords: ['ROMPEVIENTOS', 'ROMPE VIENTOS', 'WINDBREAKER'],
    razon: 'Palabra clave "rompevientos"',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'IMPERMEABLE',
    keywords: ['IMPERMEABLE', 'REPELENTE'],
    razon: 'Protección contra agua',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'TERMICO',
    keywords: ['TERMICO', 'TERMICA'],
    razon: 'Prenda térmica',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'ELASTICO',
    keywords: ['STRETCH', 'ELASTICO', 'ELASTICA', 'LICRA'],
    razon: 'Tela con elasticidad',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'CAPITONADO',
    keywords: ['CAPITONADO', 'CAPITONADA', 'ACOLCHADO', 'ACOLCHADA'],
    razon: 'Acabado capitonado/acolchado',
  },
  {
    tipoCodigo: 'ATRIBUTO FUNCIONAL',
    refNombreMatch: 'REFLECTANTE',
    keywords: ['REFLECTANTE', 'REFLEJANTE'],
    razon: 'Detalles reflectantes',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'BASICO',
    keywords: ['BASICO', 'BASICA'],
    razon: 'Estilo básico',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'DEPORTIVO',
    keywords: ['DEPORTIVO', 'DEPORTIVA', 'SPORT', 'GYM'],
    razon: 'Estilo deportivo',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'CASUAL',
    keywords: ['CASUAL'],
    razon: 'Estilo casual',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'URBANO',
    keywords: ['URBANO', 'URBANA'],
    razon: 'Estilo urbano',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'ELEGANTE',
    keywords: ['ELEGANTE', 'VESTIR'],
    razon: 'Estilo elegante',
  },
  {
    tipoCodigo: 'ESTILO',
    refNombreMatch: 'FORMAL',
    keywords: ['FORMAL', 'SASTRE'],
    razon: 'Estilo formal',
  },
  {
    tipoCodigo: 'LARGO/LONGITUD',
    refNombreMatch: 'LARGO',
    keywords: ['LARGO', 'LARGA'],
    excludeKeywords: ['EXTRALARGO', 'EXTRALARGA'],
    razon: 'Longitud larga',
  },
  {
    tipoCodigo: 'LARGO/LONGITUD',
    refNombreMatch: 'CORTO',
    keywords: ['CORTO', 'CORTA'],
    razon: 'Longitud corta',
  },
  {
    tipoCodigo: 'LARGO/LONGITUD',
    refNombreMatch: 'CROP TOP',
    keywords: ['CROP', 'CROP TOP'],
    razon: 'Corte crop',
  },
  {
    tipoCodigo: 'AJUSTE',
    refNombreMatch: 'OVERSIZED',
    keywords: ['OVERSIZE', 'OVERSIZED'],
    razon: 'Ajuste oversized',
  },
  {
    tipoCodigo: 'AJUSTE',
    refNombreMatch: 'SLIM',
    keywords: ['SLIM', 'ENTALLADO', 'ENTALLADA'],
    razon: 'Ajuste slim/entallado',
  },
  {
    tipoCodigo: 'AJUSTE',
    refNombreMatch: 'SKINNY',
    keywords: ['SKINNY', 'CENIDO', 'CENIDA'],
    razon: 'Ajuste skinny',
  },
  {
    tipoCodigo: 'TIPO/CARACTERISTICA',
    refNombreMatch: 'CANVAS',
    keywords: ['CANVAS', 'CANVA'],
    razon: 'Material/estilo canvas',
  },
  {
    tipoCodigo: 'TIPO/CARACTERISTICA',
    refNombreMatch: 'BOMBER',
    keywords: ['BOMBER'],
    razon: 'Modelo bomber',
  },
  {
    tipoCodigo: 'TIPO/CARACTERISTICA',
    refNombreMatch: 'TEDDY',
    keywords: ['TEDDY'],
    razon: 'Textura teddy',
  },
  {
    tipoCodigo: 'TIPO/CARACTERISTICA',
    refNombreMatch: 'BULLSTAFF',
    keywords: ['BULLSTAFF'],
    razon: 'Referencia Bullstaff',
  },
  {
    tipoCodigo: 'GAMA DE COLOR',
    refNombreMatch: 'BICOLOR',
    keywords: ['BICOLOR', 'DOS TONOS'],
    razon: 'Combinación bicolor',
  },
  {
    tipoCodigo: 'GAMA DE COLOR',
    refNombreMatch: 'MULTICOLOR',
    keywords: ['MULTICOLOR', 'COMBINADO', 'COMBINADA'],
    razon: 'Varios colores',
  },
]

const PRENDAS_INVIERNO = ['CHAMARRA', 'CHALECO', 'ABRIGO', 'SUDADERA', 'SUETER', 'GABARDINA', 'ROMPEVIENTOS']
const PRENDAS_VERANO = ['VESTIDO', 'SHORT', 'BERMUDA', 'FALDA', 'BLUSA', 'PLAYERA', 'TOP']

function containsWholePhrase(haystack: string, needle: string): boolean {
  const paddedHaystack = ` ${haystack} `
  const paddedNeedle = ` ${needle} `
  return paddedHaystack.includes(paddedNeedle)
}

export function sugerirTagsDesdeProducto(params: {
  descripcion?: string | null
  tipoPrenda?: string | null
  tiposTag: TipoTagCatalogo[]
  refTags: RefTagCatalogo[]
  tagsActuales: TagResuelto[]
}): TagSugerido[] {
  const { descripcion, tipoPrenda, tiposTag, refTags, tagsActuales } = params
  const texto = normalizeTagText(`${descripcion ?? ''} ${tipoPrenda ?? ''}`)
  const prendaNorm = normalizeTagText(tipoPrenda)
  if (!texto && !prendaNorm) return []

  const existingRefIds = new Set(
    tagsActuales.map((t) => t.ref_tag_id).filter((id): id is number => id != null)
  )
  const tipoById = new Map(tiposTag.map((t) => [t.id, t]))
  const tipoByCodigo = new Map(
    tiposTag
      .filter((t) => t.codigo)
      .map((t) => [normalizeTagText(t.codigo), t])
  )

  const sugerenciasMap = new Map<number, TagSugerido>()

  const addSugerencia = (tipo: TipoTagCatalogo, ref: RefTagCatalogo, razon: string) => {
    if (existingRefIds.has(ref.id) || sugerenciasMap.has(ref.id)) return
    sugerenciasMap.set(ref.id, {
      tipo_tag_id: tipo.id,
      ref_tag_id: ref.id,
      tipo_nombre: tipo.nombre,
      tipo_codigo: tipo.codigo ?? null,
      ref_nombre: ref.nombre,
      razon,
      es_multiple: Boolean(tipo.es_multiple),
    })
  }

  // 1. Reglas explícitas de palabras clave y sinónimos
  for (const regla of REGLAS_DESCRIPCION) {
    if (regla.excludeKeywords?.some((kw) => containsWholePhrase(texto, kw))) continue
    if (!regla.keywords.some((kw) => containsWholePhrase(texto, kw))) continue

    const tipo = tipoByCodigo.get(normalizeTagText(regla.tipoCodigo))
    if (!tipo) continue

    const targetNorm = normalizeTagText(regla.refNombreMatch)
    const ref = refTags.find(
      (r) => r.tipo_tag_id === tipo.id && normalizeTagText(r.nombre).includes(targetNorm)
    )
    if (ref) addSugerencia(tipo, ref, regla.razon)
  }

  // 2. Coincidencia directa con nombres de ref_tag (>= 4 caracteres para evitar falsos positivos)
  for (const ref of refTags) {
    if (existingRefIds.has(ref.id) || sugerenciasMap.has(ref.id)) continue
    const tipo = tipoById.get(ref.tipo_tag_id)
    if (!tipo) continue

    const tokens = normalizeTagText(ref.nombre)
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s.length >= 4)

    if (tokens.some((tok) => containsWholePhrase(texto, tok))) {
      addSugerencia(tipo, ref, 'Coincide con descripción')
    }
  }

  // 3. Regla estacional por tipo de prenda
  const tempTipo = tipoByCodigo.get('TEMPORADA')
  if (tempTipo && prendaNorm) {
    if (PRENDAS_INVIERNO.some((p) => prendaNorm.includes(p))) {
      const refInv = refTags.find(
        (r) => r.tipo_tag_id === tempTipo.id && normalizeTagText(r.nombre).includes('INVIERNO')
      )
      if (refInv) addSugerencia(tempTipo, refInv, `Sugerido para ${tipoPrenda}`)
    } else if (PRENDAS_VERANO.some((p) => prendaNorm.includes(p))) {
      const refVer = refTags.find(
        (r) => r.tipo_tag_id === tempTipo.id && normalizeTagText(r.nombre).includes('VERANO')
      )
      if (refVer) addSugerencia(tempTipo, refVer, `Sugerido para ${tipoPrenda}`)
    }
  }

  return Array.from(sugerenciasMap.values())
}

const CATEGORY_STYLES: Record<string, string> = {
  'AJUSTE': 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  'CORTE': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  'ATRIBUTO FUNCIONAL': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'ESTILO': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'LARGO/LONGITUD': 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  'TIPO/CARACTERISTICA': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'ACCESORIOS': 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
  'TEMPORADA': 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'GAMA DE COLOR': 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',
  'RELLENO': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  'GORRO': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'OCASION': 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  'COLECCION': 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'TALLA EXTRA': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
}

export function getTagCategoryStyle(codigoOrNombre: string | null | undefined): string {
  const key = normalizeTagText(codigoOrNombre)
  return CATEGORY_STYLES[key] ?? 'bg-muted text-foreground border-border'
}
