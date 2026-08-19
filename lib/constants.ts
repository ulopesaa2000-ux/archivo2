// lib/constants.ts

// ── Timezone ────────────────────────────────────────────────
export const TIMEZONE = 'America/Mexico_City' as const
export const LOCALE = 'es-MX' as const

// ── Estados de nota (IDs REALES de la BD) ───────────────────
export const ESTADO_NOTA = {
  PEND: 1,
  CONF: 2,
  CANC: 3,
  PROC: 4,
} as const

// ── Colores de badges por código de estado ──────────────────
export const ESTADO_NOTA_COLORS: Record<string, string> = {
  PEND: 'bg-yellow-100 text-yellow-800',
  CONF: 'bg-green-100 text-green-800',
  CANC: 'bg-red-100 text-red-800',
  PROC: 'bg-blue-100 text-blue-800',
}

export const ESTADO_NOTA_LABELS: Record<string, string> = {
  PEND: 'Pendiente',
  CONF: 'Confirmada',
  CANC: 'Cancelada',
  PROC: 'En Proceso',
}

// ── Tipos de movimiento ─────────────────────────────────────
export const TIPO_MOVIMIENTO_ICONS: Record<string, string> = {
  ENT: '↑',
  SAL: '↓',
  TRF: '↔',
  AJU: '⚖',
  DEV: '↩',
}

export const TIPO_MOVIMIENTO_COLORS: Record<string, string> = {
  ENT: 'bg-emerald-100 text-emerald-800',
  SAL: 'bg-red-100 text-red-800',
  TRF: 'bg-blue-100 text-blue-800',
  AJU: 'bg-amber-100 text-amber-800',
  DEV: 'bg-purple-100 text-purple-800',
}

export const ESTADO_PRODUCTO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  publicado: 'bg-green-100 text-green-800',
  pausado: 'bg-orange-100 text-orange-800',
  descontinuado: 'bg-red-100 text-red-800',
}

// ── Rutas admin ─────────────────────────────────────────────
export const ADMIN_ROUTES = {
  dashboard: '/dashboard',
  catalogo: {
    lista: '/catalogo',
    detalle: (id: number | string) => `/catalogo/${id}`,
    catalogos: '/catalogo/catalogos',
    imagenes: '/catalogo/imagenes',
    familias: '/catalogo/familias',
  },
  inventario: {
    notas: '/inventario/notas',
    notaNueva: '/inventario/notas/nueva',
    notaDetalle: (id: number) => `/inventario/notas/${id}`,
    notaPropuestas: '/inventario/notas/propuestas',
    stock: '/inventario/stock',
    bodegas: '/inventario/bodegas',
    config: '/inventario/config',
  },
  ordenesB2B: {
    lista: '/ordenes-b2b',
    detalle: (id: number) => `/ordenes-b2b/${id}`,
    cajas: '/ordenes-b2b/cajas',
  },
  contenedores: {
    lista: '/contenedores',
    detalle: (id: number) => `/contenedores/${id}`,
  },
  ecommerce: {
    productosWeb: '/ecommerce/productos-web',
    ordenesVenta: '/ecommerce/ordenes-venta',
    ordenDetalle: (id: number) => `/ecommerce/ordenes-venta/${id}`,
  },
  configuracion: {
    usuarios: '/configuracion/usuarios',
    roles: '/configuracion/roles',
    auditoriaProductos: '/configuracion/auditoria_producto',
    tablas: '/configuracion/tablas',
    tablasSoporte: '/configuracion/tablas-soporte',
    inventario: '/configuracion/inventario',
  },
  despachos: {
    lista: '/despachos',
    nuevo: '/despachos/nuevo',
    detalle: (id: number) => `/despachos/${id}`,
  },
  inventarioVirtual: {
    lista: '/inventario-virtual',
    detalle: (id: number) => `/inventario-virtual/${id}`,
  },
} as const

// ── Paginación ──────────────────────────────────────────────
export const PAGE_SIZE = 20 as const

// ── Estados de contenedor (CHECK constraint en BD) ──────────
export const ESTADOS_CONTENEDOR = [
  'borrador', 'en_transito', 'en_aduana', 'en_bodega',
  'surtido', 'completo', 'cerrado', 'cancelado',
] as const

export type EstadoContenedor = typeof ESTADOS_CONTENEDOR[number]

export const ESTADO_CONTENEDOR_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  en_transito: 'bg-blue-100 text-blue-800',
  en_aduana: 'bg-amber-100 text-amber-800',
  en_bodega: 'bg-emerald-100 text-emerald-800',
  surtido: 'bg-indigo-100 text-indigo-800',
  completo: 'bg-green-100 text-green-800',
  cerrado: 'bg-slate-100 text-slate-800',
  cancelado: 'bg-red-100 text-red-800',
}

export const ESTADO_CONTENEDOR_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_transito: 'En Tránsito',
  en_aduana: 'En Aduana',
  en_bodega: 'En Bodega',
  surtido: 'Surtido',
  completo: 'Completo',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
}

// Transiciones válidas de contenedor
export const TRANSICIONES_CONTENEDOR: Record<string, string[]> = {
  borrador: ['en_transito', 'cancelado'],
  en_transito: ['en_aduana', 'cancelado'],
  en_aduana: ['en_bodega', 'cancelado'],
  en_bodega: ['completo', 'cancelado'],
  surtido: ['completo', 'cancelado'],
  completo: ['cerrado'],
  cerrado: [],
  cancelado: [],
}

// ── Estados de orden B2B (sin CHECK, viven aquí) ────────────
export const ESTADOS_ORDEN_B2B = [
  'Borrador', 'Enviada', 'Confirmada', 'En Producción',
  'Producción Completa', 'Embarcada', 'Recibida', 'Cerrada', 'Cancelada',
] as const

export type EstadoOrdenB2B = typeof ESTADOS_ORDEN_B2B[number]

export const ESTADO_ORDEN_B2B_COLORS: Record<string, string> = {
  Borrador: 'bg-gray-100 text-gray-800',
  Enviada: 'bg-sky-100 text-sky-800',
  Confirmada: 'bg-blue-100 text-blue-800',
  'En Producción': 'bg-amber-100 text-amber-800',
  'Producción Completa': 'bg-lime-100 text-lime-800',
  Embarcada: 'bg-indigo-100 text-indigo-800',
  Recibida: 'bg-emerald-100 text-emerald-800',
  Cerrada: 'bg-slate-100 text-slate-800',
  Cancelada: 'bg-red-100 text-red-800',
}

// ── Estados de detalle B2B ──────────────────────────────────
export const ESTADOS_DETALLE_B2B = [
  'Pendiente', 'Confirmado', 'En Producción',
  'Producción Completa', 'Recibido', 'Parcial', 'Cancelado',
] as const

export const ESTADO_DETALLE_B2B_COLORS: Record<string, string> = {
  Pendiente: 'bg-yellow-100 text-yellow-800',
  Confirmado: 'bg-blue-100 text-blue-800',
  'En Producción': 'bg-amber-100 text-amber-800',
  'Producción Completa': 'bg-lime-100 text-lime-800',
  Recibido: 'bg-green-100 text-green-800',
  Parcial: 'bg-orange-100 text-orange-800',
  Cancelado: 'bg-red-100 text-red-800',
}

// ── Años disponibles ────────────────────────────────────────
export const AÑOS_DISPONIBLES = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const

// ── Monedas ─────────────────────────────────────────────────
export const MONEDAS = ['USD', 'MXN', 'CNY'] as const
export const B2B_CHAT_ATTACHMENTS_BUCKET = 'b2b_chat_attachments' as const

// ── Catálogo Maestro de Tallas (Cacheado) ────────────────────
export const CAT_TALLAS_MAESTRO = [
  { id: 1, codigo: '0', categoria: 'ADULTO', nombre: 'CERO' },
  { id: 2, codigo: 'ECH', categoria: 'ADULTO', nombre: 'EXTRA CHICA' },
  { id: 3, codigo: 'CH', categoria: 'ADULTO', nombre: 'CHICA' },
  { id: 4, codigo: 'M', categoria: 'ADULTO', nombre: 'MEDIANA' },
  { id: 5, codigo: 'G', categoria: 'ADULTO', nombre: 'GRANDE' },
  { id: 6, codigo: 'EG', categoria: 'ADULTO', nombre: 'EXTRA GRANDE' },
  { id: 7, codigo: '2EG', categoria: 'ADULTO', nombre: '2X EXTRA GRANDE' },
  { id: 8, codigo: '3EG', categoria: 'ADULTO', nombre: '3X EXTRA GRANDE' },
  { id: 9, codigo: '4EG', categoria: 'ADULTO', nombre: '4X EXTRA GRANDE' },
  { id: 10, codigo: '5EG', categoria: 'ADULTO', nombre: '5X EXTRA GRANDE' },
  { id: 11, codigo: '2', categoria: 'INFANTIL', nombre: 'TALLA 2' },
  { id: 12, codigo: '3', categoria: 'ADULTO', nombre: 'TALLA 3' },
  { id: 13, codigo: '4', categoria: 'INFANTIL', nombre: 'TALLA 4' },
  { id: 14, codigo: '5', categoria: 'ADULTO', nombre: 'TALLA 5' },
  { id: 15, codigo: '6', categoria: 'INFANTIL', nombre: 'TALLA 6' },
  { id: 16, codigo: '8', categoria: 'INFANTIL', nombre: 'TALLA 8' },
  { id: 17, codigo: '10', categoria: 'INFANTIL', nombre: 'TALLA 10' },
  { id: 18, codigo: '12', categoria: 'INFANTIL', nombre: 'TALLA 12' },
  { id: 19, codigo: '14', categoria: 'INFANTIL', nombre: 'TALLA 14' },
  { id: 20, codigo: '16', categoria: 'INFANTIL', nombre: 'TALLA 16' },
  { id: 21, codigo: 'UNITALLA', categoria: 'ADULTO', nombre: 'UNITALLA' },
] as const
