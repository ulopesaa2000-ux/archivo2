// modules/catalogo/types.ts
import type {
  ProductoRow, MarcaRow, GeneroRow, TelaRow,
  ProductoWebRow, ProductoImagenRow, CajaProductoRow,
  CajaDetalleRow, TallaRow, ColorRow,
} from '@/lib/types/tables'

// ── Filtros del listado ─────────────────────────────────────
export type FiltrosCatalogo = {
  q?: string              // Busca en sku_base y descripcion
  estado?: string         // borrador | pendiente | publicado | pausado | descontinuado
  marca_id?: number
  genero_id?: number
  destacados?: boolean    // true = solo destacado=true, false/undefined = sin filtro
  incluir_inactivos?: boolean // true = sin filtro activo, false/undefined = solo activo=true
  page?: number
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

// ── Catálogos para filtros ──────────────────────────────────
export type CatalogosParaFiltros = {
  marcas: Pick<MarcaRow, 'id' | 'nombre'>[]
  generos: Pick<GeneroRow, 'id' | 'nombre'>[]
  telas: Pick<TelaRow, 'id' | 'nombre'>[]
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
  tipo_tag_nombre: string | null
  tipo_tag_codigo: string | null
  ref_tag_nombre: string | null
  ref_tag_codigo: string | null
  valor_texto: string | null
}

// ── Complemento resuelto ────────────────────────────────────
export type ComplementoResuelto = {
  id: number
  parte_prenda: string | null
  tipo_complemento: string | null
  material: string | null
  corte_forma: string | null
  descripcion_adicional: string | null
}

// ── Acabado resuelto ────────────────────────────────────────
export type AcabadoResuelto = {
  id: number
  tipo_acabado: string | null
  detalle: string | null
  patron: string | null
  localizacion: string | null
}

// ── Variante resuelta ───────────────────────────────────────
export type VarianteResuelta = {
  id: number
  sku_completo: string | null
  talla_codigo: string | null
  talla_nombre: string | null
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
