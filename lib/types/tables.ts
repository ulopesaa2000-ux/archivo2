// lib/types/tables.ts
import type { Database } from './database.types'
import type { PermissionMatrix } from '@/lib/auth/permissions'

type Schema = Database['inv-tienda']
type Tables = Schema['Tables']

// ── Productos ───────────────────────────────────────────────
export type ProductoRow = Omit<Tables['productos']['Row'], 'proveedor_id'> & {
  cliente_b2b_id: number | null
}
export type ProductoInsert = Omit<Tables['productos']['Insert'], 'proveedor_id'> & {
  cliente_b2b_id?: number | null
}
export type ProductoUpdate = Omit<Tables['productos']['Update'], 'proveedor_id'> & {
  cliente_b2b_id?: number | null
}
export type VarianteProductoRow = Tables['variantes_producto']['Row']
export type ProductoImagenRow = Tables['producto_imagenes']['Row']
export type ProductoTagRow = Tables['producto_tags']['Row']
export type AcabadoProductoRow = Tables['acabado_producto']['Row']
export type ComplementoProductoRow = Tables['complemento_producto']['Row']
export type MedidaProductoRow = Tables['medidas_producto']['Row']
export type ProductoConjuntoRow = Tables['producto_conjunto']['Row']
export type ProductoB2B = ProductoRow & {
  cliente_b2b_id: number | null
  fabricante_id: number | null
}


// ── Catálogos ───────────────────────────────────────────────
export type MarcaRow = Tables['cat_marcas']['Row']
export type TallaRow = Tables['cat_tallas']['Row']
export type ColorRow = Tables['cat_colores']['Row']
export type TelaRow = Tables['cat_telas']['Row']
export type GeneroRow = Tables['cat_generos']['Row']
export type EdadRow = Tables['cat_edades']['Row']
export type TipoPrendaRow = Tables['cat_tipo_prenda']['Row']
export type TipoTagRow = Tables['tipo_tag']['Row']
export type RefTagRow = Tables['ref_tag']['Row']
export type PuntoMedidaRow = Tables['puntos_medida']['Row']
export type TipoAcabadoRow = Tables['tipo_acabado']['Row']
export type DetalleAcabadoRow = Tables['detalle_acabado']['Row']
export type PatronAcabadoRow = Tables['patron_acabado']['Row']
export type LocalizacionAcabadoRow = Tables['localizacion_acabado']['Row']
export type PartePrendaCompRow = Tables['parte_prenda_comp']['Row']
export type TipoCompRow = Tables['tipo_comp']['Row']
export type CorteFormaCompRow = Tables['corte_forma_comp']['Row']

// ── Inventario ──────────────────────────────────────────────
export type NotaInventarioRow = Tables['notas_inventario']['Row']
export type NotaDetalleProductoRow = Tables['nota_detalle_productos']['Row']
export type InventarioStockRow = Tables['inventario_stock']['Row']
export type AuditoriaInventarioRow = Tables['auditoria_inventario']['Row']
export type HistorialEstadoNotaRow = Tables['historial_estados_nota']['Row']
export type BodegaRow = Tables['bodegas']['Row']
export type TipoMovimientoRow = Tables['cat_tipos_movimiento']['Row']
export type EstadoNotaRow = Tables['cat_estados_nota']['Row']

// ── Ecommerce ───────────────────────────────────────────────
export type ProductoWebRow = Tables['productos_web']['Row']
export type OrdenVentaRow = Tables['ordenes_venta']['Row']
export type OrdenItemRow = Tables['orden_items']['Row']
export type CarritoRow = Tables['carritos']['Row']
export type CarritoItemRow = Tables['carrito_items']['Row']

// ── B2B ─────────────────────────────────────────────────────
export type OrdenB2BRow = Tables['ordenes_b2b']['Row']
export type OrdenB2BUpdate = Tables['ordenes_b2b']['Update']
export type OrdenB2BDetalleRow = Tables['ordenes_b2b_detalles']['Row']
export type OrdenCajaRow = Tables['orden_cajas']['Row']
export type OrdenCompraRow = Tables['ordenes_compra']['Row']
export type CajaProductoRow = Tables['cajas_producto']['Row']
export type CajaDetalleRow = Tables['caja_detalles']['Row']
export type ContenedorRow = Tables['contenedores']['Row']

export type UsuarioPersonaRow = {
  id: number
  usuario_id: string
  persona_id: number
  created_at: string
}

export type OrdenDetallesComentarioRow = {
  id: number
  orden_detalle_id: number
  usuario_id: string
  comentario: string
  archivo_adjunto_url: string | null
  created_at: string
}

export type OrdenDetalleEventoRow = {
  id: number
  orden_detalle_id: number
  usuario_id: string
  tipo_evento: string
  datos: any
  created_at: string
}


// ── Usuarios ────────────────────────────────────────────────
export type UsuarioRow = Tables['usuarios']['Row']
export type RolRow = Tables['roles']['Row']
export type RolPermisoRow = Tables['rol_permisos']['Row']
export type UsuarioPermisoRow = Tables['usuario_permisos']['Row']
export type UsuarioBodegaRow = Tables['usuario_bodegas']['Row']
export type PersonaRow = Tables['personas']['Row']
export type PersonaAsignadaComercial = {
  id: number
  nombre_completo: string
  tipo_entidad: TipoEntidadPersona
  rol_asignacion: string | null
  created_at: string | null
}

// ── Compuestos ──────────────────────────────────────────────
export type UsuarioConRol = UsuarioRow & {
  rol: RolRow
  permisos: UsuarioPermisoRow | null
  effective_permissions?: PermissionMatrix
  persona?: {
    id: number
    tipo_entidad: string
  } | null
}

export type CommercialScope = {
  is_super_admin: boolean
  primary_persona_id: number | null
  primary_persona_tipo: TipoEntidadPersona | string | null
  assigned_persona_ids: number[]
  allowed_cliente_ids: number[]
  allowed_proveedor_ids: number[]
  assigned_personas: PersonaAsignadaComercial[]
  restricts_b2b: boolean
}

export type OrdenDetalleComentario = {
  id: number
  orden_detalle_id: number
  orden_id: number
  producto_id: number | null
  usuario_id: number
  mensaje: string
  archivo_adjunto_url: string | null
  created_at: string | null
  autor_nombre: string | null
  autor_email: string | null
  autor_persona_tipo: string | null
}

export type OrdenDetalleEventoTipo =
  | 'solicitud_cambio'
  | 'aprobacion_cambio'
  | 'rechazo_cambio'
  | 'cambio_estado'
  | 'cambio_precio'

export type OrdenDetalleEvento = {
  id: number
  orden_detalle_id: number
  orden_id: number
  usuario_id: number
  tipo_evento: OrdenDetalleEventoTipo
  comentario_id: number | null
  payload: Record<string, unknown> | null
  created_at: string | null
  autor_nombre: string | null
  autor_email: string | null
  autor_persona_tipo: string | null
}

// ── Despachos ───────────────────────────────────────────────
export type DespachoRow = Tables['despachos']['Row']
export type DespachoDetalleRow = Tables['despachos_detalles']['Row']
export type DespachoInsert = Tables['despachos']['Insert']
export type DespachoUpdate = Tables['despachos']['Update']

// ── Enums ───────────────────────────────────────────────────
export type EstadoNotaCodigo = 'PEND' | 'PROC' | 'CONF' | 'CANC'
export type AfectaInventario = 1 | -1 | 0
export type TipoEntidadPersona = 'Proveedor' | 'Cliente B2B' | 'Cliente Retail' | 'Empleado' | 'Administrador'
export type EstadoProducto = 'borrador' | 'pendiente' | 'publicado' | 'pausado' | 'descontinuado'
export type EstadoContenedor = 'borrador' | 'en_transito' | 'en_aduana' | 'en_bodega' | 'completo' | 'cerrado' | 'cancelado'
export type UsoImagen = 'principal_ecommerce' | 'galeria_secundaria' | 'ficha_tecnica' | 'marketing_banner' | 'etiqueta_logistica' | 'color_variacion' | 'tallas_variacion'
export type MonedaOrden = 'USD' | 'MXN' | 'CNY'
export type CrearNotaResponse = { nota_id: number; numero_nota: string }
export type NavegacionProducto = {
  posicion: number; total: number
  id_anterior: number | null; sku_anterior: string | null
  id_siguiente: number | null; sku_siguiente: string | null
}
