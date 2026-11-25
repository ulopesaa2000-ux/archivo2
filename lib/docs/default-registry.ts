// c:\Users\uriel\Downloads\enero 26\archivo2\lib\docs\default-registry.ts
import type { DocRegistry, DocRegistryItem } from './types'

export const DEFAULT_DOC_ITEMS: DocRegistryItem[] = [
  {
    slug: 'recorrido-general',
    titulo: 'Recorrido General de la Mercancía (14 eslabones)',
    resumen:
      'Mapa completo de cómo fluye la mercancía desde la orden B2B y contenedor hasta el inventario y la tienda online.',
    rol: 'general',
    orden: 1,
    publicado: true,
    rutasAdmin: ['/dashboard'],
    docxOrigen: '04_Guia_General_Recorrido_Mercancia.docx',
  },
  {
    slug: 'catalogo-productos',
    titulo: 'Catálogo de Productos y Vista Individual',
    resumen:
      'Cómo consultar productos en tabla o cuadrícula, revisar variantes, costos y editar ficha individual.',
    rol: 'productos',
    orden: 1,
    publicado: true,
    rutasAdmin: ['/catalogo'],
    docxOrigen: '01_Guia_Administrador_Productos.docx',
  },
  {
    slug: 'orden-rapida-excel',
    titulo: 'Crear Orden Rápida usando Packing List en Excel',
    resumen:
      'Flujo en 5 pasos para importar un Packing List Excel vía n8n, validar SKUs, matrices talla × color y asignar contenedor.',
    rol: 'productos',
    orden: 2,
    publicado: true,
    rutasAdmin: ['/ordenes-b2b/orden-rapida', '/ordenes-b2b'],
    docxOrigen: '01_Guia_Administrador_Productos.docx',
  },
  {
    slug: 'imagenes-masivas-canva',
    titulo: 'Carga Masiva de Imágenes desde Canva',
    resumen:
      'Cómo subir lotes de fotografías, vincularlas por SKU y definir la imagen principal para catálogo y web.',
    rol: 'productos',
    orden: 3,
    publicado: true,
    rutasAdmin: ['/catalogo/imagenes'],
    docxOrigen: '01_Guia_Administrador_Productos.docx',
  },
  {
    slug: 'familias-y-orden-reportes',
    titulo: 'Administrar Familias y Orden para Reportes',
    resumen:
      'Organización de productos por familia y ajuste del orden oficial para impresiones y reportes globales.',
    rol: 'productos',
    orden: 4,
    publicado: true,
    rutasAdmin: ['/catalogo/familias'],
    docxOrigen: '01_Guia_Administrador_Productos.docx',
  },
  {
    slug: 'notas-inventario-ocr',
    titulo: 'Cómo hacer una Nota de Inventario (Manual y vía OCR)',
    resumen:
      'Digitalizar notas físicas con foto OCR, revisar propuestas, validar bodegas y confirmar movimiento (CONF).',
    rol: 'inventario',
    orden: 1,
    publicado: true,
    rutasAdmin: ['/inventario/notas', '/inventario/notas/nueva', '/inventario/notas/propuestas'],
    docxOrigen: '02_Guia_Administrador_Inventario.docx',
  },
  {
    slug: 'surtir-contenedor-bodega-virtual',
    titulo: 'Surtir Contenedor en 2 Pasos a Bodega Virtual',
    resumen:
      'Recepción de mercancía desde contenedor B2B hacia bodega virtual y trazabilidad de surtido.',
    rol: 'inventario',
    orden: 2,
    publicado: true,
    rutasAdmin: ['/contenedores', '/inventario-virtual'],
    docxOrigen: '02_Guia_Administrador_Inventario.docx',
  },
  {
    slug: 'conteo-fisico-ocr-y-ajustes-excel',
    titulo: 'Conteo Físico OCR, Importar Ajustes Excel y Reporte Global',
    resumen:
      'Comparar stock físico contra sistema mediante hojas OCR o Excel e imprimir el reporte global por familias.',
    rol: 'inventario',
    orden: 3,
    publicado: true,
    rutasAdmin: ['/inventario/stock', '/inventario/trazabilidad'],
    docxOrigen: '02_Guia_Administrador_Inventario.docx',
  },
  {
    slug: 'publicar-productos-ecommerce',
    titulo: 'Seleccionar, Configurar SEO y Publicar Productos Web',
    resumen:
      'Gestión de precios públicos, ofertas, etiquetas y visibilidad en la tienda online.',
    rol: 'ecommerce',
    orden: 1,
    publicado: true,
    rutasAdmin: ['/ecommerce/productos-web'],
    docxOrigen: '03_Guia_Administrador_Ecommerce.docx',
  },
  {
    slug: 'editar-inicio-y-ordenes-venta',
    titulo: 'Editar Portada (/inicio) y Atender Órdenes de Venta',
    resumen:
      'Uso del editor visual en /inicio, banners por categoría, favoritos de clientes y seguimiento de cotizaciones/pedidos.',
    rol: 'ecommerce',
    orden: 2,
    publicado: true,
    rutasAdmin: ['/ecommerce/config', '/ecommerce/ordenes-venta'],
    docxOrigen: '03_Guia_Administrador_Ecommerce.docx',
  },
]

export const DEFAULT_DOCS_REGISTRY: DocRegistry = {
  version: 1,
  updatedAt: '2026-11-25T00:00:00.000Z',
  items: DEFAULT_DOC_ITEMS,
}
