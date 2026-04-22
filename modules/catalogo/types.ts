// modules/catalogo/types.ts
import type {
  ProductoRow, MarcaRow, GeneroRow, TelaRow,
  ProductoWebRow, ProductoImagenRow, CajaProductoRow,
  CajaDetalleRow, TallaRow, ColorRow,
  TipoPrendaRow, EdadRow, PersonaRow,
} from '@/lib/types/tables'

// ── Columnas ordenables del listado ─────────────────────────
export type CatalogoSortBy =
  | 'sku_base'
  | 'familia'
  | 'marca_id'
  | 'pz_en_caja'
  | 'precio_ec'
  | 'estado'
  | 'id' // por defecto: más recientes

// ── Filtros del listado ─────────────────────────────────────
export type FiltrosCatalogo = {
  q?: string              // Busca en sku_base y descripcion
  estado?: string         // borrador | pendiente | publicado | pausado | descontinuado
  marca_id?: number
  genero_id?: number
  destacados?: boolean    // true = solo destacado=true, false/undefined = sin filtro
  incluir_inactivos?: boolean // true = sin filtro activo, false/undefined = solo activo=true
  page?: number
  sort_by?: CatalogoSortBy // columna de ordenamiento
  order?: 'asc' | 'desc'  // dirección
}

// ── Producto en el listado ──────────────────────────────────
export type ProductoListItem = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  familia: string | null
  estado: string
  precio_ec: number | null
  pz_en_caja: number | null
  activo: boolean
  destacado: boolean | null
  es_conjunto: boolean | null
  marca_id: number | null
  genero_id: number | null
  tela_ext_id: number | null
}

// ── Catálogos para filtros (listado) ───────────────────────
export type CatalogosParaFiltros = {
  marcas: Pick<MarcaRow, 'id' | 'nombre'>[]
  generos: Pick<GeneroRow, 'id' | 'nombre'>[]
  telas: Pick<TelaRow, 'id' | 'nombre'>[]
}

// ── Catálogos para edición de producto (detalle) ────────────
// Incluye todos los FK que aparecen en el formulario del Hero
export type CatalogoItem = { id: number; nombre: string; codigo?: string }

export type TipoTagCatalogo = { id: number; nombre: string; es_multiple: boolean | null }
export type RefTagCatalogo = { id: number; nombre: string; tipo_tag_id: number }

// Tipos de catálogo con campos de filtrado jerárquico
export type TipoCompCatalogo = { id: number; nombre: string; complemento_en: string | null }
export type CorteFormaCatalogo = { id: number; nombre: string; corte_forma_en: string | null }

export type CatalogosEdicion = {
  marcas:       CatalogoItem[]
  generos:      CatalogoItem[]
  telas:        CatalogoItem[]   // tela_ext y tela_forro
  tipos_prenda: CatalogoItem[]
  edades:       CatalogoItem[]   // label viene de rango en BD (Infantil, Joven, etc.)
  personas:     CatalogoItem[]   // label viene de nombre_completo en BD

  // Para Tabs
  tipos_tag:    TipoTagCatalogo[]
  ref_tags:     RefTagCatalogo[]
  partes:       CatalogoItem[]
  componente_tipos: TipoCompCatalogo[]
  materiales:   CatalogoItem[]
  acabado_tipos:    CatalogoItem[]
  acabado_detalles: CatalogoItem[]
  acabado_patrones: CatalogoItem[]
  corte_formas: CorteFormaCatalogo[]
  localizaciones:   CatalogoItem[]
  tallas:           CatalogoItem[]
  colores:          CatalogoItem[]
}

// ── Resultado del listado ───────────────────────────────────
export type ResultadoListado = {
  productos: ProductoListItem[]
  total: number
  catalogos: CatalogosParaFiltros
}

// ── FK descriptivas resueltas ───────────────────────────────
export type FKDescriptivas = {
  marca: string | null
  genero: string | null
  edad: string | null
  tipo_prenda: string | null
  tela_forro: string | null
  tela_exterior: string | null
  persona: string | null
}

// ── Caja con detalle matricial ──────────────────────────────
export type CajaContenidoMap = {
  tallas: string[]
  colores: string[]
  matriz: Record<string, Record<string, number>>
  totalPiezas: number
}

export type CajaConDetalle = CajaProductoRow & {
  detalles: (CajaDetalleRow & {
    talla_codigo: string | null
    talla_nombre: string | null
    color_nombre: string | null
    color_hex: string | null
  })[]
  contenidoMap: CajaContenidoMap | null
}

// ── Tag resuelto ────────────────────────────────────────────
export type TagResuelto = {
  id: number
  tipo_tag_id: number | null
  tipo_tag_nombre: string | null
  tipo_tag_codigo: string | null
  ref_tag_id: number | null
  ref_tag_nombre: string | null
  ref_tag_codigo: string | null
  valor_texto: string | null
}

// ── Complemento resuelto ────────────────────────────────────
export type ComplementoResuelto = {
  id: number
  parte_prenda_id: number | null
  parte_prenda: string | null
  tipo_comp_id: number | null
  tipo_complemento: string | null
  material_id: number | null
  material: string | null
  corte_forma_id: number | null
  corte_forma: string | null
  descripcion_adicional: string | null
}

// ── Acabado resuelto ────────────────────────────────────────
export type AcabadoResuelto = {
  id: number
  tipo_acabado_id: number | null
  tipo_acabado: string | null
  detalle_acabado_id: number | null
  detalle: string | null
  patron_acabado_id: number | null
  patron: string | null
  localizacion_id: number | null
  localizacion: string | null
}

// ── Variante resuelta ───────────────────────────────────────
export type VarianteResuelta = {
  id: number
  sku_completo: string | null
  talla_id: number | null
  talla_codigo: string | null
  talla_nombre: string | null
  color_id: number | null
  color_nombre: string | null
  color_hex: string | null
  costo_promedio: number | null
  precio_venta: number | null
  activo: boolean
}

// ── Medida resuelta ─────────────────────────────────────────
export type MedidaResuelta = {
  id: number
  talla_codigo: string | null
  punto_medida: string | null
  clasificacion: string | null
  medida_cm: number | null
  medida_ft: number | null
}

// ── Conjunto resuelto ───────────────────────────────────────
export type ConjuntoResuelto = {
  id: number
  producto_hijo_id: number
  hijo_sku: string
  hijo_nombre: string | null
  hijo_imagen: string | null
  cantidad: number
  es_requerido: boolean
  orden: number
}
