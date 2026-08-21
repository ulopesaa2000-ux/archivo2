// modules/inventario/config-types.ts
// Tipos de configuración global del módulo de Inventario

import type { BodegaRow } from '@/lib/types/tables'

export type TipoMovimientoCodigo = 'ENT' | 'SAL' | 'TRF' | 'AJU' | 'DEV'
export type AlcanceVisionNotas = 'todas_bodegas' | 'solo_propias'
export type AccionEliminarNota = 'eliminar_soft' | 'solo_cancelar' | 'ninguno'

export type VistaDefaultStock = 'individual' | 'matriz'
export type AgrupacionDefaultStock = 'plano' | 'familia'
export type CriterioOrdenBodegas = 'manual' | 'por_ciudad' | 'alfabetico'

export interface ConfigInventario {
  id: number
  // ── 1. Notas de Inventario y Visión ──
  limite_notas_pendientes_panel: number
  prefijo_numero_nota: string
  auto_generar_numero_nota: boolean
  requiere_aprobacion_traspaso: boolean
  requiere_aprobacion_ajuste: boolean
  requiere_aprobacion_entrada: boolean
  requiere_aprobacion_salida: boolean
  permitir_editar_bodega_origen: boolean
  mostrar_piezas_en_notas: boolean
  dias_limite_notas_pendientes_alerta: number
  auto_seleccionar_bodega_activa: boolean
  auto_seleccionar_tipo_default: boolean
  modo_vision_notas_nueva: 'completo' | 'compacto'

  // ── 1.1 Configuración de Notas OCR ──
  alertar_discrepancia_ocr: boolean
  ocr_priorizar_tipo_detectado: boolean
  ocr_auto_abrir_sincronizador: boolean
  ocr_tipo_movimiento_fallback: TipoMovimientoCodigo

  // ── 2. Permisos, Tipo Predeterminado, Visión y Eliminación por Rol ──
  // Record<nivel_acceso | rol_id, TipoMovimientoCodigo[]>
  permisos_tipos_movimiento: Record<string, TipoMovimientoCodigo[]>
  // Record<rol_id | nivel_acceso, TipoMovimientoCodigo>
  tipo_movimiento_default_por_rol: Record<string, TipoMovimientoCodigo>
  tipo_movimiento_default_general: TipoMovimientoCodigo
  // Record<rol_id | nivel_acceso, AlcanceVisionNotas>
  alcance_vision_notas_por_rol: Record<string, AlcanceVisionNotas>
  // Record<rol_id | nivel_acceso, AccionEliminarNota>
  accion_eliminar_nota_por_rol: Record<string, AccionEliminarNota>
  // Record<`${usuario_id}_${bodega_id}`, boolean> para autorizaciones individuales de devolución
  permisos_devolucion_usuario_bodega?: Record<string, boolean>

  // ── 3. Stock y Visualización ──
  vista_default_stock: VistaDefaultStock
  agrupacion_default_stock: AgrupacionDefaultStock
  mostrar_stock_cero_default: boolean
  paginacion_stock_tamano: number
  excel_incluir_totales_cajas: boolean
  excel_incluir_fila_bodegas: boolean
  excel_incluir_totales_piezas: boolean

  // ── 4. Orden de Bodegas y Ciudades ──
  criterio_orden_bodegas: CriterioOrdenBodegas
  orden_ciudades: string[]
  orden_bodegas_ids: number[]
  bodegas_virtuales_al_final: boolean

  // ── 5. Bodegas y Políticas Generales ──
  bodega_principal_id: number | null
  permitir_stock_negativo: boolean
  permitir_bodegas_virtuales: boolean
  umbral_alerta_stock_minimo_cajas: number

  // ── 6. Notificaciones ──
  email_notificaciones_inventario: string | null
  notificar_notas_pendientes: boolean

  // ── Metadatos ──
  created_at?: string
  updated_at?: string
  updated_by?: number | null
}

export type ConfigInventarioUpdate = Partial<Omit<ConfigInventario, 'id' | 'created_at'>>

export const DEFAULT_CONFIG_INVENTARIO: ConfigInventario = {
  id: 1,
  limite_notas_pendientes_panel: 5,
  prefijo_numero_nota: 'N-',
  auto_generar_numero_nota: true,
  requiere_aprobacion_traspaso: true,
  requiere_aprobacion_ajuste: true,
  requiere_aprobacion_entrada: false,
  requiere_aprobacion_salida: true,
  permitir_editar_bodega_origen: true,
  mostrar_piezas_en_notas: true,
  dias_limite_notas_pendientes_alerta: 7,
  auto_seleccionar_bodega_activa: true,
  auto_seleccionar_tipo_default: true,
  modo_vision_notas_nueva: 'completo',

  alertar_discrepancia_ocr: true,
  ocr_priorizar_tipo_detectado: true,
  ocr_auto_abrir_sincronizador: false,
  ocr_tipo_movimiento_fallback: 'ENT',

  permisos_tipos_movimiento: {
    '1': ['ENT', 'SAL', 'TRF', 'AJU', 'DEV'],
    '2': ['ENT', 'SAL', 'TRF', 'AJU', 'DEV'],
    '3': ['ENT', 'SAL', 'TRF'],
    '4': ['ENT', 'SAL'],
    '5': ['ENT', 'SAL'],
  },
  tipo_movimiento_default_por_rol: {
    '6': 'ENT',
    '9': 'ENT',
    '10': 'ENT',
    '18': 'SAL',
  },
  tipo_movimiento_default_general: 'ENT',
  alcance_vision_notas_por_rol: {
    '6': 'todas_bodegas',
    '9': 'todas_bodegas',
    '10': 'todas_bodegas',
    '18': 'solo_propias',
  },
  accion_eliminar_nota_por_rol: {
    '6': 'eliminar_soft',
    '9': 'eliminar_soft',
    '10': 'eliminar_soft',
    '18': 'solo_cancelar',
  },
  permisos_devolucion_usuario_bodega: {},

  vista_default_stock: 'individual',
  agrupacion_default_stock: 'familia',
  mostrar_stock_cero_default: false,
  paginacion_stock_tamano: 20,
  excel_incluir_totales_cajas: true,
  excel_incluir_fila_bodegas: true,
  excel_incluir_totales_piezas: false,

  criterio_orden_bodegas: 'por_ciudad',
  orden_ciudades: [
    'Chiconcuac',
    'Toluca',
    'San Martin',
    'San Diego',
    'Nezahualcoyotl',
    'Tulancingo',
  ],
  orden_bodegas_ids: [],
  bodegas_virtuales_al_final: true,

  bodega_principal_id: null,
  permitir_stock_negativo: false,
  permitir_bodegas_virtuales: true,
  umbral_alerta_stock_minimo_cajas: 5,

  email_notificaciones_inventario: null,
  notificar_notas_pendientes: false,
}

/**
 * Ordena una lista de bodegas de acuerdo a la configuración de inventario.
 */
export function sortBodegasWithConfig(
  bodegas: BodegaRow[],
  config: ConfigInventario | null | undefined
): BodegaRow[] {
  if (!bodegas || bodegas.length === 0) return []
  const cfg = config ?? DEFAULT_CONFIG_INVENTARIO

  const list = [...bodegas]

  if (cfg.criterio_orden_bodegas === 'alfabetico') {
    return list.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''))
  }

  // Mapa de posición manual de bodegas si existe
  const bodegaPosMap = new Map<number, number>()
  if (Array.isArray(cfg.orden_bodegas_ids)) {
    cfg.orden_bodegas_ids.forEach((id, index) => {
      bodegaPosMap.set(id, index)
    })
  }

  // Mapa de posición de ciudades
  const ciudadPosMap = new Map<string, number>()
  if (Array.isArray(cfg.orden_ciudades)) {
    cfg.orden_ciudades.forEach((c, index) => {
      ciudadPosMap.set(c.toLowerCase().trim(), index)
    })
  }

  return list.sort((a, b) => {
    // 1. Bodegas virtuales al final si está configurado
    if (cfg.bodegas_virtuales_al_final) {
      if (a.es_virtual && !b.es_virtual) return 1
      if (!a.es_virtual && b.es_virtual) return -1
    }

    if (cfg.criterio_orden_bodegas === 'por_ciudad') {
      const ciudadA = (a.ciudad || 'Sin Ciudad').toLowerCase().trim()
      const ciudadB = (b.ciudad || 'Sin Ciudad').toLowerCase().trim()

      const posCiudadA = ciudadPosMap.has(ciudadA) ? ciudadPosMap.get(ciudadA)! : 999
      const posCiudadB = ciudadPosMap.has(ciudadB) ? ciudadPosMap.get(ciudadB)! : 999

      if (posCiudadA !== posCiudadB) {
        return posCiudadA - posCiudadB
      }
    }

    // Orden por posición de ID explícito si existe
    const posA = bodegaPosMap.has(a.id) ? bodegaPosMap.get(a.id)! : 9999
    const posB = bodegaPosMap.has(b.id) ? bodegaPosMap.get(b.id)! : 9999

    if (posA !== posB) {
      return posA - posB
    }

    // Fallback: Nombre alfabético
    return (a.nombre ?? '').localeCompare(b.nombre ?? '')
  })
}
