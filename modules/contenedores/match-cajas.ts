// modules/contenedores/match-cajas.ts
// Comparación base línea-vs-físico en puras cajas (modo solo cajas).
// La tabla de verdad es la línea de producto (cajas_pedidas por product_id);
// el físico (orden_cajas / cajas armadas) solo comprueba. Sin tolerancia:
// las cajas son enteras, cualquier diferencia bloquea.

export type EstadoMatchCajas = 'OK' | 'DIF' | 'SIN_CAJAS' | 'SIN_LINEA'

export type LineaCajasMatch = {
  ordenId?: number | null
  productoId?: number | null
  /** SKU en mayúsculas para llave cuando no hay ids */
  sku: string
  cajas: number
}

export type FisicoCajasMatch = {
  ordenId?: number | null
  productoId?: number | null
  sku: string
  cajas: number
}

export type DifCajasMatch = {
  ordenId?: number | null
  productoId?: number | null
  sku: string
  cajasLinea: number
  cajasFisicas: number
  /** cajasLinea - cajasFisicas */
  dif: number
  estado: EstadoMatchCajas
}

function llaveMatch(ordenId: number | null | undefined, productoId: number | null | undefined, sku: string): string {
  const s = String(sku || '').trim().toUpperCase()
  if (ordenId != null && productoId != null) return `${ordenId}:${productoId}`
  if (ordenId != null) return `${ordenId}|${s}`
  return s
}

/**
 * Compara líneas contra físico agrupando por (orden, producto) o SKU.
 * Reglas:
 * - línea > 0 sin físico → SIN_CAJAS
 * - físico > 0 sin línea (o línea en 0) → DIF (negativo)
 * - ambos con distinto total → DIF
 * - ambos en 0 o ausentes → se omiten (nada que mover)
 */
export function compararCajasLineasVsFisico(
  lineas: LineaCajasMatch[],
  fisicos: FisicoCajasMatch[]
): { ok: boolean; diffs: DifCajasMatch[] } {
  const mapLinea = new Map<string, { ordenId?: number | null; productoId?: number | null; sku: string; cajas: number }>()
  for (const l of lineas) {
    const key = llaveMatch(l.ordenId, l.productoId, l.sku)
    const prev = mapLinea.get(key)
    if (prev) {
      prev.cajas += Number(l.cajas ?? 0)
    } else {
      mapLinea.set(key, { ordenId: l.ordenId, productoId: l.productoId, sku: l.sku, cajas: Number(l.cajas ?? 0) })
    }
  }

  const mapFisico = new Map<string, { ordenId?: number | null; productoId?: number | null; sku: string; cajas: number }>()
  for (const f of fisicos) {
    const key = llaveMatch(f.ordenId, f.productoId, f.sku)
    const prev = mapFisico.get(key)
    if (prev) {
      prev.cajas += Number(f.cajas ?? 0)
    } else {
      mapFisico.set(key, { ordenId: f.ordenId, productoId: f.productoId, sku: f.sku, cajas: Number(f.cajas ?? 0) })
    }
  }

  const keys = new Set<string>([...mapLinea.keys(), ...mapFisico.keys()])
  const diffs: DifCajasMatch[] = []
  for (const key of keys) {
    const lin = mapLinea.get(key)
    const fis = mapFisico.get(key)
    const cajasLinea = lin?.cajas ?? 0
    const cajasFisicas = fis?.cajas ?? 0
    if (cajasLinea === 0 && cajasFisicas === 0) continue
    const dif = cajasLinea - cajasFisicas
    let estado: EstadoMatchCajas
    if (!lin) {
      estado = 'SIN_LINEA'
    } else if (cajasFisicas === 0 && cajasLinea > 0) {
      estado = 'SIN_CAJAS'
    } else if (dif !== 0) {
      estado = 'DIF'
    } else {
      estado = 'OK'
    }
    diffs.push({
      ordenId: lin?.ordenId ?? fis?.ordenId ?? null,
      productoId: lin?.productoId ?? fis?.productoId ?? null,
      sku: lin?.sku ?? fis?.sku ?? key,
      cajasLinea,
      cajasFisicas,
      dif,
      estado,
    })
  }

  diffs.sort((a, b) => {
    const rank = (e: EstadoMatchCajas): number => (e === 'OK' ? 1 : 0)
    if (rank(a.estado) !== rank(b.estado)) return rank(a.estado) - rank(b.estado)
    return String(a.sku).localeCompare(String(b.sku))
  })

  return { ok: diffs.every((d) => d.estado === 'OK'), diffs }
}
