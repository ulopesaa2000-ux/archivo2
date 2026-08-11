// modules/config/tablas-soporte/types.ts
import type { Database } from '@/lib/types/database.types'

export type SchemaInvTienda = Database['inv-tienda']['Tables']

export type TablaSoporteKey =
  | 'personas'
  | 'cat_marcas'
  | 'cat_tallas'
  | 'cat_colores'
  | 'cat_telas'
  | 'cat_generos'
  | 'cat_edades'
  | 'cat_tipo_prenda'
  | 'cat_tipos_movimiento'
  | 'cat_estados_nota'

export type PersonaRow = SchemaInvTienda['personas']['Row']
export type CatMarcaRow = SchemaInvTienda['cat_marcas']['Row']
export type CatTallaRow = SchemaInvTienda['cat_tallas']['Row']
export type CatColorRow = SchemaInvTienda['cat_colores']['Row']
export type CatTelaRow = SchemaInvTienda['cat_telas']['Row']
export type CatGeneroRow = SchemaInvTienda['cat_generos']['Row']
export type CatEdadRow = SchemaInvTienda['cat_edades']['Row']
export type CatTipoPrendaRow = SchemaInvTienda['cat_tipo_prenda']['Row']
export type CatTipoMovimientoRow = SchemaInvTienda['cat_tipos_movimiento']['Row']
export type CatEstadoNotaRow = SchemaInvTienda['cat_estados_nota']['Row']

export type TablaSoporteRowMap = {
  personas: PersonaRow
  cat_marcas: CatMarcaRow
  cat_tallas: CatTallaRow
  cat_colores: CatColorRow
  cat_telas: CatTelaRow
  cat_generos: CatGeneroRow
  cat_edades: CatEdadRow
  cat_tipo_prenda: CatTipoPrendaRow
  cat_tipos_movimiento: CatTipoMovimientoRow
  cat_estados_nota: CatEstadoNotaRow
}

export type TablaSoporteConfig = {
  key: TablaSoporteKey
  label: string
  descripcion: string
  hasActivoCol: boolean
  searchFields: string[]
}

export const TABLAS_SOPORTE_CONFIG: Record<TablaSoporteKey, TablaSoporteConfig> = {
  personas: {
    key: 'personas',
    label: 'Personas',
    descripcion: 'Directorio de personas y entidades comerciales (Clientes B2B, Proveedores, Empleados)',
    hasActivoCol: true,
    searchFields: ['nombre_completo', 'identificacion_fiscal', 'email_contacto', 'tipo_entidad'],
  },
  cat_marcas: {
    key: 'cat_marcas',
    label: 'Marcas',
    descripcion: 'Catálogo de marcas de productos comercializados',
    hasActivoCol: true,
    searchFields: ['nombre'],
  },
  cat_tallas: {
    key: 'cat_tallas',
    label: 'Tallas',
    descripcion: 'Tallas y medidas para variantes de prendas',
    hasActivoCol: true,
    searchFields: ['codigo', 'nombre', 'categoria'],
  },
  cat_colores: {
    key: 'cat_colores',
    label: 'Colores',
    descripcion: 'Catálogo de colores con código HEX y tipo de color',
    hasActivoCol: true,
    searchFields: ['nombre', 'codigo', 'hex_code', 'nombre_intern'],
  },
  cat_telas: {
    key: 'cat_telas',
    label: 'Telas',
    descripcion: 'Catálogo de telas, composiciones y familias textiles',
    hasActivoCol: false,
    searchFields: ['nombre', 'composicion', 'familia_tela', 'tela_material'],
  },
  cat_generos: {
    key: 'cat_generos',
    label: 'Géneros',
    descripcion: 'Géneros / públicos objetivo para clasificación de catálogo',
    hasActivoCol: true,
    searchFields: ['nombre', 'codigo'],
  },
  cat_edades: {
    key: 'cat_edades',
    label: 'Edades',
    descripcion: 'Rangos de edad y etiquetado por etapa de desarrollo',
    hasActivoCol: false,
    searchFields: ['rango', 'edad_talla'],
  },
  cat_tipo_prenda: {
    key: 'cat_tipo_prenda',
    label: 'Tipos de Prenda',
    descripcion: 'Categorización de prendas (Superior, Inferior, Complementos)',
    hasActivoCol: true,
    searchFields: ['nombre', 'descripcion_prenda', 'sup_inf_compl'],
  },
  cat_tipos_movimiento: {
    key: 'cat_tipos_movimiento',
    label: 'Tipos de Movimiento',
    descripcion: 'Tipos de movimiento de notas de inventario (Entradas, Salidas, Ajustes)',
    hasActivoCol: false,
    searchFields: ['codigo', 'nombre'],
  },
  cat_estados_nota: {
    key: 'cat_estados_nota',
    label: 'Estados de Nota',
    descripcion: 'Estados posibles del flujo de notas de inventario (PEND, CONF, CANC)',
    hasActivoCol: false,
    searchFields: ['codigo', 'nombre', 'descripcion'],
  },
}

export type FiltrosTablasSoporte = {
  tabla: TablaSoporteKey
  q?: string
  estado?: 'todos' | 'activos' | 'inactivos'
}
