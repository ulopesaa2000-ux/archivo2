// app/(admin)/inventario/stock/historico/_hooks/use-columnas-historico.ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Preferencias de columnas del Stock Histórico.
 *
 * - Familia y SKU son SIEMPRE visibles y fijas (sticky): son las columnas ancla.
 * - El resto se puede ocultar desde el panel retráctil.
 * - Se recuerda entre visitas con `localStorage` (clave versionada).
 *
 * Se usa `useSyncExternalStore` (en vez de useState + useEffect) para leer el
 * localStorage sin `setState` dentro de un effect y sin mismatch de hidratación.
 */

export const COLUMNAS_HISTORICO = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'marca', label: 'Marca' },
  { key: 'bodega', label: 'Bodega' },
  { key: 'cajas_hoy', label: 'Cajas hoy' },
  { key: 'ajuste', label: 'Ajuste al corte' },
  { key: 'cajas_corte', label: 'Al corte' },
  { key: 'notas', label: 'Notas' },
] as const

export type ColumnaHistorico = (typeof COLUMNAS_HISTORICO)[number]['key']

export type EstadoColumnasHistorico = {
  columnas: Record<ColumnaHistorico, boolean>
  agrupar: boolean
}

export const STORAGE_KEY_COLUMNAS = 'inventario:historico:columnas:v1'
const EVENTO = 'inventario:historico:columnas'

const COLUMNAS_FIJAS: ColumnaHistorico[] = []

export const ESTADO_POR_DEFECTO: EstadoColumnasHistorico = {
  columnas: {
    descripcion: true,
    marca: true,
    bodega: true,
    cajas_hoy: true,
    ajuste: true,
    cajas_corte: true,
    notas: true,
  },
  // Sin agrupar por defecto: se ve el producto directo (más útil para consultar).
  agrupar: false,
}

/** Valida la forma del dato guardado; si no cuadra, devuelve los defaults. */
export function parsearEstadoColumnas(raw: string | null | undefined): EstadoColumnasHistorico {
  if (!raw) return ESTADO_POR_DEFECTO
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return ESTADO_POR_DEFECTO
    const columnas = { ...ESTADO_POR_DEFECTO.columnas }
    const guardadas = (data as any).columnas
    if (guardadas && typeof guardadas === 'object') {
      for (const col of COLUMNAS_HISTORICO) {
        if (typeof guardadas[col.key] === 'boolean') columnas[col.key] = guardadas[col.key]
      }
    }
    return {
      columnas,
      agrupar: typeof (data as any).agrupar === 'boolean' ? (data as any).agrupar : ESTADO_POR_DEFECTO.agrupar,
    }
  } catch {
    return ESTADO_POR_DEFECTO
  }
}

// ── Cache del snapshot (useSyncExternalStore exige referencia estable) ──
let cache: { raw: string; estado: EstadoColumnasHistorico } | null = null

function leerEstado(): EstadoColumnasHistorico {
  if (typeof window === 'undefined') return ESTADO_POR_DEFECTO
  let raw = ''
  try {
    raw = window.localStorage.getItem(STORAGE_KEY_COLUMNAS) ?? ''
  } catch {
    return ESTADO_POR_DEFECTO
  }
  if (cache && cache.raw === raw) return cache.estado
  const estado = parsearEstadoColumnas(raw)
  cache = { raw, estado }
  return estado
}

function escribirEstado(estado: EstadoColumnasHistorico) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY_COLUMNAS, JSON.stringify(estado))
  } catch {
    /* modo privado / cuota llena: se ignora */
  }
  window.dispatchEvent(new Event(EVENTO))
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENTO, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENTO, callback)
  }
}

export function useColumnasHistorico() {
  const estado = useSyncExternalStore(subscribe, leerEstado, () => ESTADO_POR_DEFECTO)

  const setColumna = useCallback((key: ColumnaHistorico, visible: boolean) => {
    const actual = leerEstado()
    escribirEstado({
      ...actual,
      columnas: { ...actual.columnas, [key]: visible },
    })
  }, [])

  const setAgrupar = useCallback((agrupar: boolean) => {
    const actual = leerEstado()
    escribirEstado({ ...actual, agrupar })
  }, [])

  const reset = useCallback(() => {
    escribirEstado(ESTADO_POR_DEFECTO)
  }, [])

  const visible = useCallback(
    (key: ColumnaHistorico) => estado.columnas[key] !== false,
    [estado]
  )

  return { estado, setColumna, setAgrupar, reset, visible, fijas: COLUMNAS_FIJAS }
}
