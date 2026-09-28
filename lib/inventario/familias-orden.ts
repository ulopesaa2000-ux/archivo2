// lib/inventario/familias-orden.ts
// Orden canónico clásico de familias: alfabético A→Z (es-MX) con F000-000C / sin clasificar al final.
// Fuente única de verdad para /inventario/stock, /inventario/trazabilidad y exports Excel.

export function isUnassignedFamily(fam: string | null | undefined): boolean {
  if (!fam) return true
  const norm = fam.trim().toUpperCase()
  return (
    norm === 'F000-000C' ||
    norm === 'F000-000' ||
    norm === 'SIN_FAMILIA' ||
    norm === 'SIN FAMILIA' ||
    norm === 'SIN ASIGNAR' ||
    norm === 'SIN CLASIFICAR' ||
    norm === 'SIN CIUDAD' ||
    norm === '—' ||
    norm === '-' ||
    norm === 'NULL' ||
    norm === 'UNDEFINED'
  )
}

export function normalizeCiudad(ciudad: string | null | undefined): string {
  const t = (ciudad || '').trim()
  return t === '' ? 'sin_asignar' : t
}

export function ciudadLabel(ciudad: string | null | undefined): string {
  const n = normalizeCiudad(ciudad)
  return n === 'sin_asignar' ? 'Sin asignar' : n
}

/**
 * Comparador clásico: A→Z, no-asignadas al final.
 * Clásico pedido: F0001-000A → última, F000-000C siempre abajo.
 */
export function compareFamiliaAsc(a: string, b: string): number {
  const aUn = isUnassignedFamily(a)
  const bUn = isUnassignedFamily(b)
  if (aUn && !bUn) return 1
  if (!aUn && bUn) return -1
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

export function compareSkuAsc(a: string | null | undefined, b: string | null | undefined): number {
  return (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' })
}

/**
 * Ordena ciudades según config.orden_ciudades; las no listadas van al final alfabéticas.
 * `sin_asignar` siempre al final salvo que esté explícita en config.
 */
export function sortCiudadesWithConfig(ciudades: string[], ordenCiudades?: string[] | null): string[] {
  const pos = new Map<string, number>()
  ;(ordenCiudades || []).forEach((c, i) => pos.set(c.toLowerCase().trim(), i))
  const inConfig = (c: string) => pos.has(c.toLowerCase().trim())
  return [...ciudades].sort((a, b) => {
    const aKey = normalizeCiudad(a).toLowerCase()
    const bKey = normalizeCiudad(b).toLowerCase()
    const aIn = pos.has(aKey)
    const bIn = pos.has(bKey)
    // sin_asignar al final si no está en config
    if (aKey === 'sin_asignar' && !aIn && bKey !== 'sin_asignar') return 1
    if (bKey === 'sin_asignar' && !bIn && aKey !== 'sin_asignar') return -1
    if (aIn && bIn) return pos.get(aKey)! - pos.get(bKey)!
    if (aIn && !bIn) return -1
    if (!aIn && bIn) return 1
    if (inConfig(a) !== inConfig(b)) return inConfig(a) ? -1 : 1
    return a.localeCompare(b, 'es', { sensitivity: 'base' })
  })
}
