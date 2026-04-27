// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\fixtures\admin-routes.ts
/**
 * Rutas del panel (admin) para pruebas de rendimiento.
 * IDs opcionales (env) para segmentos dinámicos.
 */

export type Ready =
  | { type: 'h1'; name: RegExp }
  | { type: 'tab'; name: RegExp }
  /** heading O texto (p. ej. stock sin cookie de bodega) */
  | { type: 'h1OrText'; h1: RegExp; text: RegExp }

export type AdminRouteDef = {
  path: string
  ready: Ready
  timeoutMs?: number
}

const catalogoId = process.env.TEST_CATALOGO_ID
const ordenB2BId = process.env.TEST_ORDEN_B2B_ID
const contenedorId = process.env.TEST_CONTENEDOR_ID
const notaId = process.env.TEST_NOTA_ID

export const ADMIN_STATIC_ROUTES: AdminRouteDef[] = [
  { path: '/dashboard', ready: { type: 'h1', name: /^Dashboard$/ } },
  { path: '/catalogo', ready: { type: 'h1', name: /Catálogo de Productos/ }, timeoutMs: 120_000 },
  {
    path: '/inventario/stock',
    ready: {
      type: 'h1OrText',
      h1: /Stock (Consolidado|por Bodega)/,
      text: /Selecciona una bodega en el header/i,
    },
    timeoutMs: 120_000,
  },
  { path: '/inventario/bodegas', ready: { type: 'h1', name: /^Bodegas$/ } },
  { path: '/inventario/notas', ready: { type: 'h1', name: /Notas de Inventario/ }, timeoutMs: 120_000 },
  { path: '/inventario/notas/nueva', ready: { type: 'h1', name: /Nueva Nota de Inventario/ } },
  { path: '/ordenes-b2b', ready: { type: 'h1', name: /^Órdenes B2B$/ }, timeoutMs: 120_000 },
  { path: '/ordenes-b2b/cajas', ready: { type: 'h1', name: /Cajas de Producto/ }, timeoutMs: 120_000 },
  { path: '/contenedores', ready: { type: 'h1', name: /^Contenedores$/ }, timeoutMs: 120_000 },
  { path: '/ecommerce/config', ready: { type: 'h1', name: /Configuración Ecommerce/ } },
  { path: '/ecommerce/productos-web', ready: { type: 'h1', name: /Catálogo Web/ } },
  { path: '/ecommerce/ordenes-venta', ready: { type: 'h1', name: /Órdenes de Venta/ } },
  { path: '/configuracion/usuarios', ready: { type: 'h1', name: /Usuarios y Permisos/ } },
  { path: '/configuracion/roles', ready: { type: 'h1', name: /Roles y Permisos/ } },
  { path: '/configuracion/tablas', ready: { type: 'h1', name: /Configuración de Tablas/ } },
  { path: '/configuracion/auditoria_producto', ready: { type: 'h1', name: /Auditoría de Productos/ } },
]

function dynamic(
  basePath: string,
  id: string | undefined,
  ready: Ready,
  timeoutMs?: number
): AdminRouteDef | null {
  if (!id) return null
  return { path: `${basePath.replace(/\/$/, '')}/${id}`, ready, timeoutMs }
}

export const ADMIN_DYNAMIC_ROUTES: AdminRouteDef[] = [
  dynamic('/catalogo', catalogoId, { type: 'tab', name: /^Catálogos$/ }, 120_000),
  dynamic('/ordenes-b2b', ordenB2BId, { type: 'tab', name: /Cajas/ }, 120_000),
  dynamic('/contenedores', contenedorId, { type: 'tab', name: /^Órdenes/ }, 120_000),
  dynamic('/inventario/notas', notaId, { type: 'h1', name: /Editar Nota/ }, 120_000),
].filter((r): r is AdminRouteDef => r !== null)

export function allAdminRoutesForPerf(): AdminRouteDef[] {
  return [...ADMIN_STATIC_ROUTES, ...ADMIN_DYNAMIC_ROUTES]
}
