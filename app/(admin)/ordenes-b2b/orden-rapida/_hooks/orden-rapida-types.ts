// app/(admin)/ordenes-b2b/orden-rapida/_hooks/orden-rapida-types.ts
import type { PersonaRow } from '@/lib/types/tables'
import type { DbProductoData } from '@/modules/ordenes-b2b/actions'

export type ContainerMock = {
  id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  estado: string | null
  activo?: boolean | null
}

export type CatalogItemOption = { id: number; nombre: string }

export type WizardProps = {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  contenedores: ContainerMock[]
  marcas?: CatalogItemOption[]
  generos?: CatalogItemOption[]
  edades?: CatalogItemOption[]
  tipos_prenda?: CatalogItemOption[]
}

export type WizardWarning = {
  codigo?: string
  mensaje?: string
  detalle?: string
}

export type WizardProductoSnapshot = {
  sku_base: string
  nombre?: string
  descripcion?: string
  tipo_prenda?: string
  tipo_prenda_id?: number | null
  genero?: string
  genero_id?: number | null
  edad?: string
  edad_id?: number | null
  marca?: string
  marca_id?: number | null
  composicion?: string
  precio_unitario_usd?: number
}

export type WizardProducto = {
  temp_id?: string
  producto_id?: number | null
  sku_base: string
  sku_raw?: string
  nombre?: string
  marca?: string
  marca_id?: number | null
  genero?: string
  genero_id?: number | null
  edad?: string
  edad_id?: number | null
  tipo_prenda?: string
  tipo_prenda_id?: number | null
  json_marca?: string
  descripcion?: string
  composicion?: string
  precio_yuan?: number
  precio_unitario_usd?: number
  estado_temporal?: string
  es_nuevo?: boolean
  force_new?: boolean
  costo_promedio?: number
  packing_original?: WizardProductoSnapshot
  db_sincronizado?: DbProductoData | null
  [key: string]: unknown
}

export type WizardCaja = {
  producto_temp_id?: string
  producto_id?: number | null
  codigo_caja_temporal?: string
  codigo_caja: string
  sku_base?: string
  sku_raw?: string
  nombre_pack: string
  piezas_por_caja: number
  cantidad_cajas: number
  total_piezas: number
  peso_bruto_kg: number
  peso_bruto_total_kg: number
  peso_neto_kg: number
  peso_neto_total_kg: number
  largo_cm: number
  ancho_cm: number
  alto_cm: number
  cbm: number
  cbm_por_caja: number
  cbm_total_linea: number
  tallas: string[]
  colores: string[]
  matriz: {
    tallas: string[]
    colores: string[]
    valores: Record<string, Record<string, number>>
  }
  estado_temporal?: string
  validacion?: string | Record<string, unknown> | null
  tipo_caja?: string
  costo_promedio?: number
  [key: string]: unknown
}

export type OrdenProductoResumen = {
  sku: string
  nombre?: string
  marca?: string
  cantidad_total: number
  numero_cajas_reales: number
  cbm_total: number
  peso_bruto_total: number
}

export type OrdenProductoPack = {
  sku_base: string
  nombre_pack: string
  cajas_pedidas: number
  piezas_pedidas: number
  fuente?: string
}

export type SeparacionSugerida = {
  tipo?: string
  sku_base_original?: string
  header_row?: number | null
  productos_candidatos?: Array<{ sku_base: string; alias?: string | null; filas?: number[]; cartones?: string[] }>
  packs_candidatos?: Array<{ nombre_actual: string; sugerido?: string | null; cartones?: string[] }>
  reparto_exacto?: Array<{ codigo_caja_temporal: string; sku_base_sugerido: string; motivo?: string }>
  cajas_para_revisar?: string[]
  confianza?: string
  motivo?: string
  fuente?: string
}

export type ColorPorConfirmar = {
  raw: string
  en?: string | null
  es?: string | null
  cajas?: string[]
  fuente?: string
  estado: 'nuevo' | 'mapeado' | 'creado' | 'omitido' | 'existente'
  color_id?: number | null
  via?: string | null
}

export type ColorDraft = {
  nombre: string
  nombre_intern: string
  codigo: string
  hex_code: string
  tipo_color: string
  mapear_a_id: number | null
}

export type WizardParsedData = {
  orden: {
    estado: string
    total_productos: number
    total_cajas: number
    total_piezas: number
    cbm_estimado: number
    peso_bruto_total_kg: number
    costo_estimado_usd: number
    moneda: string
    orden_productos: OrdenProductoResumen[]
  }
  productos: WizardProducto[]
  cajas: WizardCaja[]
  detalles: Array<Record<string, unknown>>
  warnings: WizardWarning[]
  orden_productos_pack: OrdenProductoPack[]
  separacion_sugerida: SeparacionSugerida[]
  colores_por_confirmar: Array<{ raw: string; en?: string | null; es?: string | null; cajas?: string[]; fuente?: string }>
  colores_traducidos: Array<{ raw: string; en?: string | null; es?: string | null; motivo?: string }>
  requiere_revision_manual: boolean
  staging_por_codigo: Record<string, number>
  raw: unknown
}

export type N8nDebugInfo = {
  topLevelType: string
  topLevelKeys: string[]
  productosCount: number
  cajasCount: number
  detallesCount: number
  warningsCount: number
  rawPreview: string
  unwrappedPreview: string
}

export type AlertaN8nLocal = {
  tipo?: string
  severidad?: string
  sku_base?: string | null
  codigo_caja_temporal?: string | null
  detalle?: string
  issue?: string
}

export type PackMatchDif = {
  sku: string
  pack: string
  linea: number
  armadas: number
  piezas: number
  dif: number
  estado: 'OK' | 'DIF' | 'SIN_CAJAS' | 'SIN_LINEA'
}

export type ErrorSubida = {
  id: string
  codigo:
    | 'SOCIO_PROVEEDOR_FALTANTE'
    | 'SOCIO_CLIENTE_FALTANTE'
    | 'CONTENEDOR_CODIGO_VACIO'
    | 'ORDEN_SIN_PRODUCTOS'
    | 'ORDEN_SIN_CAJAS'
    | 'SKU_VACIO'
    | 'SKU_DUPLICADO'
    | 'PRODUCTO_SIN_CAJAS'
    | 'CODIGO_VACIO'
    | 'CODIGO_DUPLICADO'
    | 'SIN_PZ'
    | 'CANTIDAD_INVALIDA'
    | 'MATRIZ_VACIA'
    | 'COLOR_SIN_RESOLVER'
    | 'MATCH_CAJAS_DIF'
    | 'MATCH_PACK_DIF'
    | 'CONTENEDOR_NUM_LARGO'
    | 'SKU_LARGO'
    | 'CBM_KG_DIF_JSON'
    | 'COLOR_IGNORABLE_OMITIDO'
  mensaje: string
  detalle?: string
  sku?: string
  codigoCaja?: string
  pack?: string
  paso: 1 | 3 | 4
  fix: string
}

export type ParserFormatOption = {
  id: string
  label: string
  shortDesc: string
  fullDesc: string
  headerPreview: string
  proveedoresEjemplo: string
  badgeColor: string
}

export const PARSER_FORMATS: ParserFormatOption[] = [
  {
    id: 'auto',
    label: '✨ Auto (Detectar por Proveedor)',
    shortDesc: 'Selecciona automáticamente la rama según el proveedor origen',
    fullDesc: 'Analiza el nombre del socio comercial y elige la plantilla más adecuada (MOTI, Bonnie, Jackie, Tianyi o General).',
    headerPreview: 'Auto-detección basada en el socio comercial',
    proveedoresEjemplo: 'Cualquier proveedor',
    badgeColor: 'border-primary/40 bg-primary/10 text-primary',
  },
  {
    id: 'bonnie',
    label: '🏷️ Formato Bonnie / TMB',
    shortDesc: 'Tallas en columnas (CH/S, M/M, G/L) con PACK A/B y triple QTY',
    fullDesc:
      'Para archivos con encabezados STYLE NO | COLOR | SIZE (C/NO) y tallas en columnas horizontales, seguidas de columnas triples: QTY (cajas), PACKING (pzs/caja), QTY (total). Soporta packs (PACK A, PACK B) y cajas sueltas/remanentes.',
    headerPreview: 'STYLE NO | COLOR | SIZE (C/NO) | CH/S | M/M | G/L | EG/XL | QTY | PACKING | QTY',
    proveedoresEjemplo: 'Bonnie, TMB, fabricantes de conjuntos y sets deportivos',
    badgeColor: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    id: 'moti',
    label: '📦 Formato MOTI Bloques',
    shortDesc: 'Bloques matriciales repetidos con encabezados de 2 filas y subtotales',
    fullDesc:
      'Para archivos estructurados en bloques separados por filas vacías, con encabezados de 2 filas (CTN NO., OF CTNS, STYLE NO.) y tablas de subtotales al pie de cada bloque (TTL CBM, TTL G.W.).',
    headerPreview: 'CTN. NO. | QTY OF CTNS | STYLE NO. | BRAND NAME | COMPOSICION | PRECIO | S/CH | M/M...',
    proveedoresEjemplo: 'MOTI, Movamoda, confecciones en bloques',
    badgeColor: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    id: 'jackie',
    label: '📑 Formato Jackie / Venkat',
    shortDesc: 'Libros de Excel con múltiples hojas/pestañas de modelos',
    fullDesc: 'Para archivos que desglosan cada estilo o modelo en pestañas independientes dentro del mismo libro de Excel.',
    headerPreview: '[Hoja 1: Estilo A] [Hoja 2: Estilo B] [Hoja 3: Desglose Cajas]',
    proveedoresEjemplo: 'Jackie, Jacky, Venkat, Vencart, QingQing, Honor, camisería multi-hoja',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  },
  {
    id: 'jenny',
    label: '🧵 Formato Jenny / Beterlon',
    shortDesc: 'Multi-hoja con Style No. como verdad, PACK opcional y cartones únicos por rango',
    fullDesc:
      'Para archivos SHISHI BETERLON con varias hojas: toma la columna Style No. (nunca el nombre de hoja), agrupa por pack y cuenta cartones únicos del rango. Sin cajas remanente.',
    headerPreview: 'Style No. | PACK | Color | tallas... | Pcs/Ctn | Ctn no. | Ctns',
    proveedoresEjemplo: 'Jenny, Shishi Beterlon',
    badgeColor: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  },
  {
    id: 'tianyi',
    label: '📊 Formato Tianyi Resumen',
    shortDesc: 'Tabla con cabecera de resumen consolidado superior',
    fullDesc: 'Para archivos con un cuadro resumen superior de totales y desglose continuo de cajas en la parte inferior.',
    headerPreview: 'RESUMEN: [TOTAL CTNS | TOTAL PCS | TOTAL CBM] ... DETALLE: [CTN 1..N]',
    proveedoresEjemplo: 'Tianyi, exportadores textiles consolidados',
    badgeColor: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    id: 'general',
    label: '📄 Formato General Estándar',
    shortDesc: 'Plantilla tabular clásica de fila por variante',
    fullDesc:
      'Para plantillas sencillas donde cada fila representa una combinación de producto, color y talla con columnas de piezas y cajas.',
    headerPreview: 'SKU | DESCRIPCION | COLOR | TALLA | PIEZAS_POR_CAJA | TOTAL_CAJAS',
    proveedoresEjemplo: 'Proveedores genéricos, plantillas estándar',
    badgeColor: 'border-gray-300 bg-gray-50 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',
  },
]
