// modules/inventario/types.ts

import type {
  NotaInventarioRow,
  NotaDetalleProductoRow,
  InventarioStockRow,
  HistorialEstadoNotaRow,
  BodegaRow,
  TipoMovimientoRow,
  EstadoNotaRow,
  UsuarioBodegaRow,
  CajaProductoRow,
} from '@/lib/types/tables'

// ── Filtros del listado de notas ────────────────────────────
export type FiltrosNotas = {
  q?: string                 // numero_nota ILIKE
  tipo_movimiento_id?: number
  estado_codigo?: string     // PEND | CONF | CANC | PROC
  bodega_origen_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  sort_by?: string           // fecha_nota | numero_nota | bodega_origen_nombre | etc.
  order?: 'asc' | 'desc'
  page?: number
  limit_bodega_ids?: number[]
  limit_usuario_id?: number
  ciudad?: string
}

// ── Nota en el listado ──────────────────────────────────────
export type NotaListItem = {
  id: number
  numero_nota: string
  fecha_nota: string | null
  fecha_confirmacion: string | null
  total_cajas: number | null
  nota_referencia: string | null
  observaciones: string | null
  tipo_codigo: string
  tipo_nombre: string
  afecta_inventario: number
  estado_codigo: string
  estado_nombre: string
  estado_color: string | null
  bodega_origen_id: number
  bodega_origen_nombre: string
  bodega_origen_codigo: string
  bodega_destino_id: number | null
  bodega_destino_nombre: string | null
  bodega_destino_codigo: string | null
  usuario_nombre: string
  usuario_id: number
  costo_total: number | null
  comprobante_url: string | null
}

// ── Resultado del listado ───────────────────────────────────
export type ResultadoListadoNotas = {
  notas: NotaListItem[]
  total: number
}

// ── Nota completa (detalle) ─────────────────────────────────
export type NotaCompleta = {
  cabecera: NotaListItem
  detalles: NotaDetalleResuelto[]
  historial: HistorialEstadoResuelto[]
}

// ── Detalle de producto resuelto ────────────────────────────
export type NotaDetalleResuelto = {
  id: number
  nota_id: number
  producto_id: number | null
  variante_id: number | null
  cajas: number
  piezas_sueltas: number
  caja_id: number | null
  producto_sku: string | null
  producto_nombre: string | null
  producto_pz_en_caja: number | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
  variante_sku: string | null
  talla_codigo: string | null
  color_nombre: string | null
  codigo_original?: string | null
}

// ── Historial de estados resuelto ───────────────────────────
export type HistorialEstadoResuelto = {
  id: number
  nota_id: number
  estado_anterior_nombre: string | null
  estado_anterior_codigo: string | null
  estado_nuevo_nombre: string
  estado_nuevo_codigo: string
  usuario_nombre: string
  fecha_cambio: string | null
  comentario: string | null
}

// ── Stock en listado ────────────────────────────────────────
export type NotaImpactoStockItem = {
  nota_id: number
  numero_nota: string
  tipo_codigo: string
  tipo_nombre: string
  cajas: number
  delta: number
  observaciones?: string | null
  fecha_nota?: string | null
  destino_nombre?: string | null
}

export type FiltrosStock = {
  q?: string
  marca_id?: number
  con_stock_cero?: boolean
  page?: number
  limit?: number
  modo?: 'fisico' | 'pronostico'
  solo_afectados?: boolean
}

export type StockListItem = {
  id: number
  bodega_id: number
  producto_id: number
  cajas: number
  piezas_sueltas: number
  ubicacion_pasillo: string | null
  updated_at: string | null
  caja_id: number | null
  producto_sku: string
  producto_nombre: string | null
  producto_descripcion: string | null
  producto_familia: string | null
  producto_pz_en_caja: number | null
  marca_nombre: string | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
  // Campos para Modo Pronóstico
  entradas_pendientes?: number
  salidas_pendientes?: number
  delta_cajas?: number
  cajas_pronosticadas?: number
  notas_pendientes_afectando?: NotaImpactoStockItem[]
  tiene_movimiento_pendiente?: boolean
}

export type StockDetalleCaja = {
  id: number
  cajas: number
  piezas_sueltas: number
  caja_id: number
  caja_codigo: string | null
  caja_nombre_pack: string | null
  caja_piezas_por_caja: number | null
}

export type FiltrosStockMatrix = {
  q?: string
  marca_id?: number
  con_stock_cero?: boolean
  ciudades?: string[]
  bodegas?: number[]
  page?: number
  limit?: number
  modo?: 'fisico' | 'pronostico'
  solo_afectados?: boolean
}

export type StockMatrixBodegaCell = {
  cajas: number
  piezas_sueltas: number
  total: number
  entradas?: number
  salidas?: number
  delta?: number
  pronosticado?: number
  tiene_movimiento?: boolean
  notas?: NotaImpactoStockItem[]
}

export type StockMatrixItem = {
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  producto_descripcion: string | null
  producto_familia: string | null
  pz_en_caja: number | null
  total_general: number
  stock_por_bodega: Record<number, StockMatrixBodegaCell>
  tiene_movimiento_pendiente?: boolean
  total_delta?: number
  total_pronosticado?: number
}

// ── Catálogos para formularios ──────────────────────────────
export type CatalogosInventario = {
  tiposMovimiento: TipoMovimientoRow[]
  estadosNota: EstadoNotaRow[]
  bodegas: BodegaRow[]
  ciudades?: string[]
}

// ── Stock Histórico (punto en el tiempo) ─────────────────────
import type { MatrizHistorica } from '@/lib/inventario/stock-historico'

export type AlcanceHistorico = {
  /** 'bodega' | 'ciudad' | 'todas' */
  tipo: 'bodega' | 'ciudad' | 'todas'
  bodegaId?: number | null
  ciudad?: string | null
}

export type StockHistoricoFila = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  producto_id: number
  producto_sku: string
  producto_descripcion: string | null
  producto_familia: string | null
  marca_nombre: string | null
  pz_en_caja: number | null
  /** Cajas actuales en la bodega (nivel producto). */
  cajas_hoy: number
  /** Ajuste aplicado para llegar a la fecha de corte (se suma a `cajas_hoy`). */
  ajuste: number
  /** Cajas al cierre de la fecha de corte. */
  cajas_historicas: number
  /** Cajas que ENTRARON después del corte (se revierten → restan). */
  entradas_posteriores: number
  /** Cajas que SALIERON después del corte (se revierten → suman). */
  salidas_posteriores: number
  /** Notas revertidas que afectan esta fila. */
  n_notas: number
  /** El corte documental dejó la fila en negativo → se marca, no se trunca. */
  valor_inconsistente: boolean
}

export type ResumenHistorico = {
  hoy: number
  ajuste: number
  historico: number
}

export type AjusteDirectoHistorico = {
  bodega_id: number
  bodega_nombre: string
  fecha: string
  filas_afectadas: number
  usuario_id: number | null
}

export type DescuadreBodega = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  /** Stock actual − suma de efectos de las notas activas (cajas sin explicar). */
  dif: number
  claves_descuadradas: number
  /** La bodega tiene Updates directos POSTERIORES al corte → la cifra histórica puede diferir. */
  tieneAjusteDirectoPostCorte: boolean
}

export type MovimientoRevertido = {
  nota_id: number
  numero_nota: string
  fecha_nota: string
  fecha_confirmacion: string | null
  tipo_codigo: string
  estado_codigo: string
  bodega_origen_id: number
  bodega_destino_id: number | null
  producto_id: number
  cajas: number
  /** Efecto firmado sobre la bodega del alcance (positivo = entró después del corte). */
  efecto: number
}

export type StockHistoricoResultado = {
  fechaCorte: string
  /** 'individual' = una bodega (tabla simple). 'agrupado' = matriz por columnas. */
  modo: 'individual' | 'agrupado'
  /** Filas de la página actual (el total va en `totalFilas`/`totalProductos`). */
  filas: StockHistoricoFila[]
  /** Filas planas del producto (producto × columna) de la página actual. */
  totalFilas: number
  /** Productos distintos de la página (la paginación es por producto). */
  totalProductos: number
  pagina: number
  limite: number
  /** Matriz pivoteada (solo en modo 'agrupado'). */
  matriz: MatrizHistorica | null
  totales: ResumenHistorico
  porBodega: (ResumenHistorico & { bodega_id: number; bodega_nombre: string; ciudad: string })[]
  porCiudad: (ResumenHistorico & { ciudad: string })[]
  ajustesDirectos: AjusteDirectoHistorico[]
  /** Bodegas cuyo stock actual no cuadra con la suma de sus notas activas. */
  descuadres: DescuadreBodega[]
  /** Filas que quedaron en negativo con el corte documental. */
  negativos: number
  /** Notas CONF/MODF posteriores al corte que se revirtieron. */
  notasRevertidas: number
  /** Detalle de los movimientos revertidos (una fila por nota × producto × bodega). */
  movimientosRevertidos: MovimientoRevertido[]
  /** Movimientos CONF/MODF leídos para el cálculo. */
  nMovimientos: number
  /** Bodegas del alcance sin ninguna fila de stock. */
  bodegasSinStock: number
}

// ── Kardex (movimientos de un periodo con saldo acumulado) ───
export type KardexFila = {
  clave: string
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  producto_id: number
  producto_sku: string
  producto_descripcion: string | null
  producto_familia: string | null
  nota_id: number
  numero_nota: string
  fecha_nota: string
  fecha_confirmacion: string | null
  tipo_codigo: string
  tipo_nombre: string
  estado_codigo: string
  bodega_origen_id: number
  bodega_origen_nombre: string
  bodega_destino_id: number | null
  bodega_destino_nombre: string | null
  cajas: number
  /** Efecto firmado sobre la bodega del alcance. */
  efecto: number
  /** Saldo acumulado del producto × bodega después de este movimiento. */
  saldo: number
}

export type KardexResultado = {
  desde: string
  hasta: string
  /** Filas de la página actual (el total va en `totalFilas`). */
  filas: KardexFila[]
  totalFilas: number
  pagina: number
  limite: number
  totales: {
    entradas: number
    salidas: number
    saldoInicial: number
    saldoFinal: number
  }
  notasDistintas: number
}

// ── Sustituto Inteligente por Familia y Similitud ───────────
export type ProductoSustitutoAmpliado = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  marca_id: number | null
  marca_nombre: string | null
  pz_en_caja: number | null
  cajas_disponibles: number
  piezas_disponibles: number
  similitud_tipo: 'misma_raiz' | 'misma_familia' | 'misma_marca' | 'descripcion_similar'
}

// ── Draft local (para crear/editar nota) ────────────────────
export type DraftProducto = {
  tempId: string              // ID temporal para key en React
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  producto_pz_en_caja: number | null
  cajas: number
  piezas_sueltas: number
  caja_id: number | null
  caja_codigo: string | null
  caja_nombre_pack: string | null
  stock_origen_cajas: number | null
  stock_origen_piezas: number | null
  codigo_original?: string | null
}

export type DraftNota = {
  tipo_movimiento_id: number | null
  bodega_origen_id: number | null
  bodega_destino_id: number | null
  fecha_nota?: string
  nota_referencia: string
  observaciones: string
  costo_total: number | null
  productos: DraftProducto[]
}

// ── Resultado de búsqueda de productos ──────────────────────
export type ProductoBusqueda = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  pz_en_caja: number | null
  marca_nombre: string | null
  imagen_url: string | null
}

// ── Caja para selector ──────────────────────────────────────
export type CajaParaSelector = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  piezas_por_caja: number | null
}

// ── Propuestas OCR ──────────────────────────────────────────
export type NotaOcrCandidatoSku = {
  producto_id: number
  sku_base: string
  descripcion: string | null
  pz_en_caja: number | null
  score: number
  metodo: string | null
  origen?: string | null
}

export type NotaOcrPropuestaLineRaw = {
  cantidad_cajas: number | null
  piezas_por_caja: number | null
  estilo_raw: string | null
  descripcion_raw: string | null
  confianza: number
  /** Confianza original de la IA (se conserva aunque la BD dé un score distinto). */
  confianza_ia?: number | null
  /** Código canónico propuesto por la IA (puede diferir de estilo_raw). */
  sku?: string | null
  /** Variantes sugeridas por la IA o por el normalizador OCR. */
  posibles_variantes?: string[] | null
}

export type NotaOcrLineaSincronizada = {
  index: number
  estilo_raw: string
  descripcion_raw?: string | null
  cantidad_cajas: number
  piezas_por_caja?: number | null
  confianza: number
  producto_id?: number | null
  producto_sku?: string | null
  producto_nombre?: string | null
  producto_pz_en_caja?: number | null
  encontrado: boolean
  es_propuesta?: boolean
  propuesta_producto_id?: number | null
  propuesta_producto_sku?: string | null
  propuesta_producto_nombre?: string | null
  propuesta_producto_pz_en_caja?: number | null
  /** Score de coincidencia en base de datos (0-1). */
  score?: number | null
  metodo?: string | null
  /** Todas las coincidencias devueltas por la RPC para mostrar variantes. */
  candidatos_sku?: NotaOcrCandidatoSku[]
  /** El usuario eligió/confirmó manualmente: no se pisa al re-sincronizar. */
  manual?: boolean
}

export type NotaOcrPropuestaLineConfirmed = {
  producto_id: number
  cajas: number
  piezas_sueltas: number
  caja_id: number | null
  producto_sku?: string | null
  producto_nombre?: string | null
}

export type NotaOcrPropuesta = {
  id: string
  created_at: string
  client_request_id: string | null
  comprobante_url: string | null
  storage_path: string | null
  folio_detectado: string | null
  fecha_detectada: string | null
  tipo_movimiento_detectado: string | null
  origen_detectado: string | null
  destino_detectado: string | null
  lineas: NotaOcrPropuestaLineRaw[]
  json_crudo: any
  confianza_global: number | null
  tipo_movimiento_id: number | null
  bodega_origen_id: number | null
  bodega_destino_id: number | null
  lineas_confirmadas: NotaOcrPropuestaLineConfirmed[]
  revisado_por: number | null
  revisado_en: string | null
  nota_id: number | null
  estado: 'PENDIENTE_REVISION' | 'REVISADO'
  // Atributos de joins descriptivos
  tipo_movimiento_nombre?: string
  tipo_movimiento_codigo?: string
  bodega_origen_nombre?: string
  bodega_destino_nombre?: string
  revisado_por_nombre?: string
  nota_numero?: string
  nota_estado_codigo?: string
}

export type FiltrosOcrPropuestas = {
  estado?: string
  page?: number
  q?: string
  bodega_origen_id?: number | string
  bodega_destino_id?: number | string
  fecha_desde?: string
  fecha_hasta?: string
  sort_by?: 'fecha_escaneo' | 'origen' | 'destino' | 'confianza' | 'id' | string
  order?: 'asc' | 'desc'
}

// ── Productos Sustitutos por Familia con Stock ──────────────
export type ProductoSustitutoFamilia = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  pz_en_caja: number | null
  cajas_disponibles: number
  piezas_disponibles: number
  marca_nombre: string | null
  es_misma_familia: boolean
}

// ── Navegación Secuencial de Notas de Inventario ────────────
export type NavegacionNotaItem = {
  id: number
  numero_nota: string
  estado_codigo: 'PEND' | 'CONF' | 'CANC' | 'PROC' | string
  estado_nombre: string
  estado_color?: string | null
}

export type NavegacionNota = {
  posicion: number
  total: number
  anterior: NavegacionNotaItem | null
  siguiente: NavegacionNotaItem | null
  actual: NavegacionNotaItem
  bodega_filtro_id: number | null
  bodega_filtro_nombre: string | null
}

// ── Auditoría inversa CONF (stock actual − movimientos aceptados = stock inicial) ──
export type AuditoriaConfNota = {
  nota_id: number
  numero_nota: string
  fecha_nota: string | null
  fecha_confirmacion: string | null
  tipo_codigo: string
  tipo_nombre: string
  bodega_origen_id: number | null
  bodega_origen_nombre: string | null
  bodega_origen_ciudad: string | null
  bodega_destino_id: number | null
  bodega_destino_nombre: string | null
  bodega_destino_ciudad: string | null
  cajas: number
  piezas_sueltas: number
  efecto_cajas: number // +entra / −sale respecto a la bodega consultada
  usuario_nombre: string | null
  observaciones: string | null
}

export type AuditoriaInversaBodega = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  stock_actual_cajas: number
  entradas_conf: number
  salidas_conf: number
  stock_inicial_cajas: number
  notas: AuditoriaConfNota[]
}

export type AuditoriaInversaProducto = {
  producto_id: number
  producto_sku: string
  producto_familia: string | null
  producto_nombre: string | null
  bodegas: AuditoriaInversaBodega[]
  total_actual: number
  total_entradas: number
  total_salidas: number
  total_inicial: number
}

export type AuditoriaInversaFamilia = {
  familia: string
  productos: AuditoriaInversaProducto[]
  total_actual: number
  total_entradas: number
  total_salidas: number
  total_inicial: number
  total_notas: number
}

