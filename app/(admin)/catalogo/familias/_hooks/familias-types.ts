// app/(admin)/catalogo/familias/_hooks/familias-types.ts
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'

export interface ProductListItem {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  precio_ec: number | null
  pz_en_caja: number | null
  activo: boolean
  imagen_principal?: string | null
}

export function isUnassignedFamily(name: string | null): boolean {
  return !name || name === 'Sin Clasificar' || name === 'F000-000C'
}

export function buildInitialProductsMap(famList: FamiliaResumen[]): Record<string, ProductListItem[]> {
  const map: Record<string, ProductListItem[]> = {}
  for (const f of famList) {
    const famKey = f.familia || 'F000-000C'
    if (f.skus && f.skus.length > 0) {
      map[famKey] = f.skus.map((s) => ({
        id: s.id,
        sku_base: s.sku_base,
        nombre: null,
        descripcion: s.descripcion,
        familia: f.familia,
        precio_ec: null,
        pz_en_caja: null,
        activo: s.activo ?? true,
        imagen_principal: s.imagen_principal ?? null,
      }))
    }
  }
  return map
}

export function buildNetSkusForFamilies({
  familias,
  stagedMoves,
  loadedProducts,
  mostrarInactivos,
}: {
  familias: FamiliaResumen[]
  stagedMoves: Record<number, string>
  loadedProducts: Record<string, ProductListItem[]>
  mostrarInactivos: boolean
}): Record<string, FamiliaResumenSku[]> {
  const netSkus: Record<string, FamiliaResumenSku[]> = {}

  familias.forEach((f) => {
    const familyKey = f.familia || 'null'
    const originalSkus = f.skus ? [...f.skus] : []
    netSkus[familyKey] = mostrarInactivos ? originalSkus : originalSkus.filter((s) => s.activo !== false)
  })

  Object.entries(stagedMoves).forEach(([prodIdStr, targetFamily]) => {
    const prodId = parseInt(prodIdStr, 10)
    const targetKey = targetFamily || 'null'

    let foundSku: FamiliaResumenSku | undefined

    for (const f of familias) {
      const item = f.skus?.find((s) => s.id === prodId)
      if (item) {
        foundSku = item
        break
      }
    }

    if (!foundSku) {
      for (const prods of Object.values(loadedProducts)) {
        const item = prods.find((p) => p.id === prodId)
        if (item) {
          foundSku = {
            id: item.id,
            sku_base: item.sku_base,
            descripcion: item.descripcion || null,
            activo: item.activo,
          }
          break
        }
      }
    }

    if (!foundSku) {
      foundSku = {
        id: prodId,
        sku_base: `ID #${prodId}`,
        descripcion: null,
        activo: true,
      }
    }

    Object.keys(netSkus).forEach((famKey) => {
      netSkus[famKey] = netSkus[famKey].filter((s) => s.id !== prodId)
    })

    if (!netSkus[targetKey]) {
      netSkus[targetKey] = []
    }
    if (foundSku) {
      if (mostrarInactivos || foundSku.activo !== false) {
        if (!netSkus[targetKey].some((s) => s.id === prodId)) {
          netSkus[targetKey].push(foundSku)
        }
      }
    }
  })

  Object.keys(netSkus).forEach((famKey) => {
    netSkus[famKey].sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))
  })

  return netSkus
}

export function getVisibleProductsInFamily({
  familyCode,
  loadedProducts,
  stagedMoves,
  mostrarInactivos,
}: {
  familyCode: string
  loadedProducts: Record<string, ProductListItem[]>
  stagedMoves: Record<number, string>
  mostrarInactivos: boolean
}): ProductListItem[] {
  const rawList = loadedProducts[familyCode] || []
  return rawList
    .map((p) => {
      const currentDest = stagedMoves[p.id]
      return {
        ...p,
        familia: currentDest !== undefined ? currentDest : p.familia,
      }
    })
    .filter((p) => {
      const currentFam = p.familia || 'F000-000C'
      if (currentFam !== familyCode) return false
      return mostrarInactivos || p.activo !== false
    })
    .sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))
}

// Regla V2: B = sola (1 producto), A = agrupada (2 o más), acepta extensión F###-###A1
export function computeAutoSuffixRenames(
  netCounts: Record<string, number>,
  stagedRenames: Record<string, string>
): Record<string, string> {
  const autoRenames: Record<string, string> = {}
  const regex = /^(F\d{3}-\d{3})([AB])(\d+)?$/i

  Object.entries(netCounts).forEach(([familyCode, finalCount]) => {
    if (stagedRenames[familyCode]) return

    const match = familyCode.match(regex)
    if (match) {
      const base = match[1]
      const currentSuffix = match[2].toUpperCase()
      const ext = match[3] ?? ''

      let targetSuffix = currentSuffix
      if (finalCount === 1) {
        targetSuffix = 'B'
      } else if (finalCount >= 2) {
        targetSuffix = 'A'
      }

      if (currentSuffix !== targetSuffix) {
        autoRenames[familyCode] = `${base}${targetSuffix}${ext}`
      }
    }
  })

  return autoRenames
}

export function getFinalFamilyName(
  familyName: string,
  stagedRenames: Record<string, string>,
  autoRenames: Record<string, string>
): string {
  if (stagedRenames[familyName]) return stagedRenames[familyName]
  if (autoRenames[familyName]) return autoRenames[familyName]
  return familyName
}
