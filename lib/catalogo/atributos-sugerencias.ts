// lib/catalogo/atributos-sugerencias.ts
import type {
  AcabadoResuelto,
  CatalogosEdicion,
  ComplementoResuelto,
} from '@/modules/catalogo/types'
import { normalizeTagText } from './tag-sugerencias'

export type ComplementoSugerido = {
  parte_prenda_id: number | null
  parte_nombre: string
  tipo_comp_id: number | null
  tipo_nombre: string
  material_id: number | null
  material_nombre: string | null
  corte_forma_id: number | null
  corte_nombre: string | null
  razon: string
}

export type AcabadoSugerido = {
  tipo_acabado_id: number | null
  tipo_nombre: string
  detalle_acabado_id: number | null
  detalle_nombre: string | null
  patron_acabado_id: number | null
  patron_nombre: string | null
  localizacion_id: number | null
  localizacion_nombre: string | null
  razon: string
}

function hasPhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `)
}

export function sugerirComplementosDesdeProducto(params: {
  descripcion?: string | null
  tipoPrenda?: string | null
  catalogos: CatalogosEdicion
  actuales: ComplementoResuelto[]
}): ComplementoSugerido[] {
  const { descripcion, tipoPrenda, catalogos, actuales } = params
  const texto = normalizeTagText(`${descripcion ?? ''} ${tipoPrenda ?? ''}`)
  if (!texto) return []

  const findParte = (match: string) =>
    catalogos.partes.find((p) => normalizeTagText(p.nombre).includes(normalizeTagText(match)))
  const findTipo = (match: string, en?: string) =>
    catalogos.componente_tipos.find(
      (t) =>
        normalizeTagText(t.nombre).includes(normalizeTagText(match)) &&
        (!en || t.complemento_en === en || t.complemento_en === 'TODO')
    )
  const findCorte = (match: string) =>
    catalogos.corte_formas.find((c) => normalizeTagText(c.nombre).includes(normalizeTagText(match)))
  const findMaterial = (match: string) =>
    catalogos.materiales.find((m) => normalizeTagText(m.nombre).includes(normalizeTagText(match)))

  const existingKeys = new Set(
    actuales.map(
      (a) => `${a.parte_prenda_id ?? ''}:${a.tipo_comp_id ?? ''}:${a.corte_forma_id ?? ''}`
    )
  )

  const sugerencias: ComplementoSugerido[] = []
  const add = (
    parteMatch: string,
    tipoMatch: string | null,
    corteMatch: string | null,
    materialMatch: string | null,
    razon: string
  ) => {
    const parte = findParte(parteMatch)
    if (!parte) return
    const tipo = tipoMatch ? findTipo(tipoMatch, parte.nombre) ?? findTipo(tipoMatch) : undefined
    const corte = corteMatch ? findCorte(corteMatch) : undefined
    const material = materialMatch ? findMaterial(materialMatch) : undefined

    const key = `${parte.id}:${tipo?.id ?? ''}:${corte?.id ?? ''}`
    if (existingKeys.has(key)) return
    existingKeys.add(key)

    sugerencias.push({
      parte_prenda_id: parte.id,
      parte_nombre: parte.nombre,
      tipo_comp_id: tipo?.id ?? null,
      tipo_nombre: tipo?.nombre ?? 'N/A',
      material_id: material?.id ?? null,
      material_nombre: material?.nombre ?? null,
      corte_forma_id: corte?.id ?? null,
      corte_nombre: corte?.nombre ?? null,
      razon,
    })
  }

  if (hasPhrase(texto, 'GORRO') || hasPhrase(texto, 'CON GORRO') || hasPhrase(texto, 'CAPUCHA')) {
    const tipo = hasPhrase(texto, 'DESMONTABLE') ? 'DESMONTABLE' : 'FIJO'
    add('GORRO', tipo, null, null, 'Menciona gorro/capucha')
  } else if (hasPhrase(texto, 'DESMONTABLE')) {
    add('GORRO', 'DESMONTABLE', null, null, 'Indica pieza desmontable')
  }

  if (hasPhrase(texto, 'RIB')) {
    if (hasPhrase(texto, 'PUNO') || hasPhrase(texto, 'PUNOS')) {
      add('PUNO', 'RIB', null, null, 'Menciona rib en puños')
    }
    if (hasPhrase(texto, 'CINTURA')) {
      add('CINTURA', 'RIB', null, null, 'Menciona rib en cintura')
    }
    if (!hasPhrase(texto, 'PUNO') && !hasPhrase(texto, 'PUNOS') && !hasPhrase(texto, 'CINTURA')) {
      add('PUNO', 'RIB', null, null, 'Menciona acabado rib')
    }
  }

  if (hasPhrase(texto, 'FUR') || hasPhrase(texto, 'BORREGA') || hasPhrase(texto, 'PELUCHE') || hasPhrase(texto, 'FORRO')) {
    const mat = hasPhrase(texto, 'FUR') ? 'FUR' : hasPhrase(texto, 'POLAR') ? 'POLAR' : null
    add('REVESTIMIENTO', 'N/A', 'COMPLETO', mat, 'Menciona revestimiento/forro')
  }

  if (hasPhrase(texto, 'CREMALLERA') || hasPhrase(texto, 'ZIPPER') || hasPhrase(texto, 'CIERRE')) {
    add('CIERRE FRONTAL', 'CREMALLERA', null, null, 'Menciona cierre/cremallera')
  } else if (hasPhrase(texto, 'BOTONES') || hasPhrase(texto, 'BOTON')) {
    add('CIERRE FRONTAL', 'BOTONES', null, null, 'Menciona botones')
  }

  if (hasPhrase(texto, 'CARGO')) {
    add('COSTADOS', 'BOLSAS', 'CARGO', null, 'Estilo cargo con bolsillos')
  } else if (hasPhrase(texto, 'BOLSAS') || hasPhrase(texto, 'BOLSILLOS')) {
    add('COSTADOS', 'BOLSAS', null, null, 'Menciona bolsas/bolsillos')
  }

  if (hasPhrase(texto, 'MANGA LARGA')) add('MANGA', 'LARGA', null, null, 'Manga larga')
  if (hasPhrase(texto, 'MANGA CORTA')) add('MANGA', 'CORTA', null, null, 'Manga corta')
  if (hasPhrase(texto, 'CUELLO ALTO')) add('CUELLO', 'N/A', 'ALTO', null, 'Cuello alto')
  if (hasPhrase(texto, 'CUELLO MAO')) add('CUELLO', 'N/A', 'MAO', null, 'Cuello mao')

  return sugerencias
}

export function sugerirAcabadosDesdeProducto(params: {
  descripcion?: string | null
  tipoPrenda?: string | null
  catalogos: CatalogosEdicion
  actuales: AcabadoResuelto[]
}): AcabadoSugerido[] {
  const { descripcion, tipoPrenda, catalogos, actuales } = params
  const texto = normalizeTagText(`${descripcion ?? ''} ${tipoPrenda ?? ''}`)
  if (!texto) return []

  const findTipo = (match: string) =>
    catalogos.acabado_tipos.find((t) => normalizeTagText(t.nombre).includes(normalizeTagText(match)))
  const findDetalle = (match: string) =>
    catalogos.acabado_detalles.find((d) => normalizeTagText(d.nombre).includes(normalizeTagText(match)))
  const findPatron = (match: string) =>
    catalogos.acabado_patrones.find((p) => normalizeTagText(p.nombre).includes(normalizeTagText(match)))
  const findLoc = (match: string) =>
    catalogos.localizaciones.find((l) => normalizeTagText(l.nombre).includes(normalizeTagText(match)))

  const existingKeys = new Set(
    actuales.map(
      (a) => `${a.tipo_acabado_id ?? ''}:${a.detalle_acabado_id ?? ''}:${a.patron_acabado_id ?? ''}`
    )
  )

  const sugerencias: AcabadoSugerido[] = []
  const add = (
    tipoMatch: string,
    detalleMatch: string | null,
    patronMatch: string | null,
    locMatch: string | null,
    razon: string
  ) => {
    const tipo = findTipo(tipoMatch)
    if (!tipo) return
    const detalle = detalleMatch ? findDetalle(detalleMatch) : undefined
    const patron = patronMatch ? findPatron(patronMatch) : undefined
    const loc = locMatch ? findLoc(locMatch) : undefined

    const key = `${tipo.id}:${detalle?.id ?? ''}:${patron?.id ?? ''}`
    if (existingKeys.has(key)) return
    existingKeys.add(key)

    sugerencias.push({
      tipo_acabado_id: tipo.id,
      tipo_nombre: tipo.nombre,
      detalle_acabado_id: detalle?.id ?? null,
      detalle_nombre: detalle?.nombre ?? null,
      patron_acabado_id: patron?.id ?? null,
      patron_nombre: patron?.nombre ?? null,
      localizacion_id: loc?.id ?? null,
      localizacion_nombre: loc?.nombre ?? null,
      razon,
    })
  }

  if (hasPhrase(texto, 'PRINT') || hasPhrase(texto, 'ESTAMPADO') || hasPhrase(texto, 'ESTAMPADA')) {
    const patron = hasPhrase(texto, 'FLOREADO') || hasPhrase(texto, 'FLORAL')
      ? 'FLOREADO'
      : hasPhrase(texto, 'CUADROS')
      ? 'CUADROS'
      : hasPhrase(texto, 'ANIMAL')
      ? 'ANIMAL'
      : hasPhrase(texto, 'MILITAR') || hasPhrase(texto, 'CAMUFLAJE')
      ? 'MILITAR'
      : hasPhrase(texto, 'TRIBAL')
      ? 'TRIBAL'
      : null
    add('TECNICAS DE DECORACION', 'ESTAMPADO', patron, 'EXTERIOR COMPLETO', 'Menciona print/estampado')
  }

  if (hasPhrase(texto, 'BORDADO') || hasPhrase(texto, 'BORDADA')) {
    add('TECNICAS DE DECORACION', 'BORDADOS', null, 'EXTERIOR LOCALIZADO', 'Menciona bordado')
  }
  if (hasPhrase(texto, 'CAPITONADO') || hasPhrase(texto, 'CAPITONADA') || hasPhrase(texto, 'ACOLCHADO') || hasPhrase(texto, 'ACOLCHADA')) {
    add('TEXTURA', 'ACOLCHADO', null, 'EXTERIOR COMPLETO', 'Textura acolchada/capitonada')
  }
  if (hasPhrase(texto, 'CANALE') || hasPhrase(texto, 'ACANALADO')) {
    add('TEXTURA', 'CANALE', null, 'EXTERIOR COMPLETO', 'Textura canalé/acanalado')
  }
  if (hasPhrase(texto, 'PLISADO') || hasPhrase(texto, 'PLISADA')) {
    add('TEXTURA', 'PLISADO', null, 'EXTERIOR COMPLETO', 'Textura plisada')
  }
  if (hasPhrase(texto, 'LISO') || hasPhrase(texto, 'LISA')) {
    add('TEXTURA', 'LISO', null, 'EXTERIOR COMPLETO', 'Superficie lisa')
  }
  if (hasPhrase(texto, 'LENTEJUELA') || hasPhrase(texto, 'LENTEJUELAS')) {
    add('APLICACIONES', 'LENTEJUELAS', null, 'EXTERIOR LOCALIZADO', 'Aplicaciones de lentejuelas')
  }
  if (hasPhrase(texto, 'PARCHE') || hasPhrase(texto, 'PARCHES')) {
    add('APLICACIONES', 'PARCHES', null, 'EXTERIOR LOCALIZADO', 'Aplicaciones de parches')
  }
  if (hasPhrase(texto, 'PEDRERIA')) {
    add('APLICACIONES', 'PEDRERIA', null, 'EXTERIOR LOCALIZADO', 'Aplicaciones de pedrería')
  }
  if (hasPhrase(texto, 'DESGASTADO') || hasPhrase(texto, 'DESLAVADO')) {
    add('ACABADO', 'EFECTO DESGASTADO', null, 'EXTERIOR COMPLETO', 'Efecto desgastado')
  }
  if (hasPhrase(texto, 'BRILLOSO') || hasPhrase(texto, 'SATIN')) {
    add('ACABADO', 'BRILLOSO', null, 'EXTERIOR COMPLETO', 'Acabado brilloso')
  }
  if (hasPhrase(texto, 'REFLECTANTE') || hasPhrase(texto, 'REFLEJANTE')) {
    add('ACABADO', 'REFLECTANTE', null, 'EXTERIOR LOCALIZADO', 'Acabado reflectante')
  }

  return sugerencias
}
