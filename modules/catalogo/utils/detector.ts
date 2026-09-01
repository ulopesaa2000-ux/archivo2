// modules/catalogo/utils/detector.ts

export interface DetectorCatalogos {
  marcas?: { id: number; nombre: string }[]
  generos?: { id: number; nombre: string }[]
  edades?: { id: number; nombre: string }[]
  tipos_prenda?: { id: number; nombre: string }[]
}

export interface DetectedAttributes {
  tipo_prenda_id?: number
  tipo_prenda_nombre?: string
  genero_id?: number
  genero_nombre?: string
  edad_id?: number
  edad_nombre?: string
  marca_id?: number
  marca_nombre?: string
  detectedCount: number
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Infiere el id de edad automáticamente según el género y el texto de la descripción
 */
export function inferEdadFromGeneroAndText(
  generoId: number | string | null | undefined,
  text: string,
  catalogos: DetectorCatalogos
): { id?: number; nombre?: string } {
  if (!catalogos.edades || catalogos.edades.length === 0) return {}

  const normText = ` ${normalize(text || '')} `

  // Prioridad 1: Bebé / Baby explícito
  if (/\b(bebe|bebes|baby|babies|maternal|lactante)\b/i.test(normText)) {
    const found = catalogos.edades.find((e) => {
      const n = normalize(e.nombre)
      return n.includes('bebe') || n.includes('baby') || n.includes('maternal')
    })
    if (found) return found
  }

  // Prioridad 2: Juvenil / Teen explícito
  if (/\b(joven|jovenes|juvenil|adolescente|teen|teens|junior)\b/i.test(normText)) {
    const found = catalogos.edades.find((e) => {
      const n = normalize(e.nombre)
      return n.includes('juvenil') || n.includes('joven') || n.includes('teen')
    })
    if (found) return found
  }

  // Prioridad 3: Según Género
  if (generoId && catalogos.generos) {
    const gObj = catalogos.generos.find((g) => String(g.id) === String(generoId))
    if (gObj) {
      const normGen = normalize(gObj.nombre)
      // Dama o Caballero -> Adulto General
      if (normGen.includes('dama') || normGen.includes('mujer') || normGen.includes('caballero') || normGen.includes('hombre')) {
        const found = catalogos.edades.find((e) => {
          const n = normalize(e.nombre)
          return n.includes('adulto')
        })
        if (found) return found
      }
      // Niña o Niño -> Infantil
      if (normGen.includes('nina') || normGen.includes('nino') || normGen.includes('infantil')) {
        const found = catalogos.edades.find((e) => {
          const n = normalize(e.nombre)
          return n.includes('infantil') || n.includes('nino') || n.includes('nina')
        })
        if (found) return found
      }
    }
  }

  // Prioridad 4: Análisis por palabras clave en texto
  if (/\b(dama|damas|mujer|mujeres|caballero|caballeros|hombre|hombres|senor|senora|adulto|adultos)\b/i.test(normText)) {
    const found = catalogos.edades.find((e) => normalize(e.nombre).includes('adulto'))
    if (found) return found
  }

  if (/\b(nina|ninas|nino|ninos|infantil|kids|kid)\b/i.test(normText)) {
    const found = catalogos.edades.find((e) => normalize(e.nombre).includes('infantil') || normalize(e.nombre).includes('nino'))
    if (found) return found
  }

  // Por defecto si es unisex o general -> Adulto
  const defaultAdulto = catalogos.edades.find((e) => normalize(e.nombre).includes('adulto'))
  return defaultAdulto || catalogos.edades[0] || {}
}

/**
 * Función reutilizable que analiza un texto (ej. descripción de producto)
 * para detectar automáticamente Tipo de Prenda, Género, Edad y Marca.
 */
export function detectProductAttributesFromText(
  text: string,
  catalogos: DetectorCatalogos
): DetectedAttributes {
  const result: DetectedAttributes = { detectedCount: 0 }
  if (!text || typeof text !== 'string') return result

  const normText = ` ${normalize(text)} `

  // 1. Detectar TIPO DE PRENDA
  if (catalogos.tipos_prenda && catalogos.tipos_prenda.length > 0) {
    const sortedPrendas = [...catalogos.tipos_prenda].sort((a, b) => b.nombre.length - a.nombre.length)
    for (const p of sortedPrendas) {
      const normPrenda = normalize(p.nombre)
      if (!normPrenda || normPrenda.length < 2) continue
      
      // Coincidencia exacta o plural
      const regex = new RegExp(`\\b${normPrenda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?\\b`, 'i')
      if (regex.test(normText)) {
        result.tipo_prenda_id = p.id
        result.tipo_prenda_nombre = p.nombre
        result.detectedCount++
        break
      }
    }
  }

  // 2. Detectar GÉNERO
  if (catalogos.generos && catalogos.generos.length > 0) {
    const generoAliases: { pattern: RegExp; aliases: string[] }[] = [
      { pattern: /\b(dama|damas|mujer|mujeres|femenino|femenina|senora|senorita|chica|chicas|girl)\b/i, aliases: ['dama', 'mujer', 'femenino'] },
      { pattern: /\b(caballero|caballeros|hombre|hombres|masculino|masculina|senor|chico|chicos|boy)\b/i, aliases: ['caballero', 'hombre', 'masculino'] },
      { pattern: /\b(nina|ninas)\b/i, aliases: ['nina', 'ninas'] },
      { pattern: /\b(nino|ninos)\b/i, aliases: ['nino', 'ninos'] },
      { pattern: /\b(unisex|ambos|mixto)\b/i, aliases: ['unisex'] },
    ]

    for (const g of catalogos.generos) {
      const normNombre = normalize(g.nombre)
      if (new RegExp(`\\b${normNombre}\\b`, 'i').test(normText)) {
        result.genero_id = g.id
        result.genero_nombre = g.nombre
        result.detectedCount++
        break
      }
    }

    if (!result.genero_id) {
      for (const { pattern, aliases } of generoAliases) {
        if (pattern.test(normText)) {
          const found = catalogos.generos.find((g) => {
            const ng = normalize(g.nombre)
            return aliases.some((a) => ng.includes(a) || a.includes(ng))
          })
          if (found) {
            result.genero_id = found.id
            result.genero_nombre = found.nombre
            result.detectedCount++
            break
          }
        }
      }
    }
  }

  // 3. Detectar EDAD (según género y texto)
  const inferredEdad = inferEdadFromGeneroAndText(result.genero_id, text, catalogos)
  if (inferredEdad.id) {
    result.edad_id = inferredEdad.id
    result.edad_nombre = inferredEdad.nombre
    result.detectedCount++
  }

  // 4. Detectar MARCA
  if (catalogos.marcas && catalogos.marcas.length > 0) {
    const sortedMarcas = [...catalogos.marcas].sort((a, b) => b.nombre.length - a.nombre.length)
    for (const m of sortedMarcas) {
      const normMarca = normalize(m.nombre)
      if (!normMarca || normMarca.length < 2) continue
      const pattern = new RegExp(`\\b${normMarca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (pattern.test(normText)) {
        result.marca_id = m.id
        result.marca_nombre = m.nombre
        result.detectedCount++
        break
      }
    }
  }

  return result
}
