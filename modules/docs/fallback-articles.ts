// c:\Users\uriel\Downloads\enero 26\archivo2\modules\docs\fallback-articles.ts
import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_DOC_ITEMS } from '@/lib/docs/default-registry'
import { parseMarkdownToGuide } from '@/lib/docs/markdown-importer'
import type { DocArticle, DocBlock } from '@/lib/docs/types'

interface GuideSourceSpec {
  guiones?: string[]
  infografias?: Array<{ file: string; alt: string; caption: string }>
  duracion?: string
  requisitos?: string[]
  extraBlocks?: DocBlock[]
}

const GUIDE_SOURCE_MAP: Record<string, GuideSourceSpec> = {
  'recorrido-general': {
    duracion: 'Lectura 5 min',
    requisitos: ['Usuario interno activo en el ERP inv-tienda.'],
    infografias: [
      {
        file: 'inv_01_inicio_paralelo.png',
        alt: 'Mapa general del recorrido de mercancía en inv-tienda',
        caption: 'Visión paralela de operación: Productos, Inventario y Ecommerce.',
      },
    ],
    extraBlocks: [
      {
        id: 'rec-h2-1',
        type: 'heading',
        level: 2,
        text: 'Los 3 pilares y sus 14 eslabones operativos',
      },
      {
        id: 'rec-steps',
        type: 'steps',
        title: 'Flujo completo de la mercancía',
        items: [
          {
            title: '1. Catálogo y Orden Rápida (Productos)',
            description:
              'Importar el Packing List Excel del proveedor en /ordenes-b2b/orden-rapida para dar de alta productos nuevos, matrices de cajas talla × color y vincular la orden al contenedor.',
          },
          {
            title: '2. Imágenes y Familias (Productos)',
            description:
              'Cargar fotografías masivas desde Canva en /catalogo/imagenes y ordenar familias en /catalogo/familias para reportes globales.',
          },
          {
            title: '3. Recepción en Bodega Virtual (Inventario)',
            description:
              'Surtir el contenedor en 2 pasos desde /contenedores/[id] hacia la bodega virtual asignada.',
          },
          {
            title: '4. Movimientos y Notas OCR (Inventario)',
            description:
              'Registrar entradas, salidas, traspasos y ajustes mediante /inventario/notas (manual o digitalizando notas físicas con OCR) hasta pasar a estado CONF.',
          },
          {
            title: '5. Conteo Físico y Reportes (Inventario)',
            description:
              'Auditar existencias en /inventario/stock comparando conteo físico OCR o Excel contra sistema e imprimir el Reporte Global por familias.',
          },
          {
            title: '6. Publicación y Venta Web (Ecommerce)',
            description:
              'Definir precio público/oferta, SEO y etiquetas en /ecommerce/productos-web, personalizar /inicio y dar seguimiento a cotizaciones en /ecommerce/ordenes-venta.',
          },
        ],
      },
      {
        id: 'rec-tip',
        type: 'callout',
        variant: 'tip',
        title: 'Regla de oro de inventario',
        text: 'El stock nunca se edita manualmente directo en inventario_stock. Todo cambio se procesa mediante una Nota confirmada (CONF) para mantener la trazabilidad en el kárdex.',
      },
    ],
  },
  'catalogo-productos': {
    duracion: 'Lectura 5 min',
    requisitos: [
      'Permiso catalogo_productos en el rol del usuario.',
      'Conocer el SKU base o familia del producto a consultar.',
    ],
    extraBlocks: [
      {
        id: 'cat-h2-1',
        type: 'heading',
        level: 2,
        text: 'Gestión del Catálogo Maestro (/catalogo)',
      },
      {
        id: 'cat-steps',
        type: 'steps',
        title: 'Operaciones principales',
        items: [
          {
            title: 'Cambiar entre vista Tabla y Cuadrícula',
            description:
              'En /catalogo usa el selector superior para alternar entre tabla operativa (ideal para revisar costos, piezas por caja y edición rápida) o cuadrícula visual con fotografías.',
          },
          {
            title: 'Filtrar sin perder el contexto',
            description:
              'Filtra por búsqueda de SKU/nombre, marca, género, temporada o estado. Los filtros se guardan en la URL para compartir la vista.',
          },
          {
            title: 'Editar ficha individual (/catalogo/[id])',
            description:
              'Haz clic en un producto para consultar variantes (talla × color), costo promedio, dimensiones de caja, historial de movimientos y galería de imágenes.',
          },
        ],
      },
      {
        id: 'cat-warn',
        type: 'callout',
        variant: 'info',
        title: 'Precios públicos vs Costo promedio',
        text: 'El costo promedio vive en las variantes del catálogo interno, mientras que el precio público y precio oferta de la tienda viven separados en /ecommerce/productos-web.',
      },
    ],
  },
  'orden-rapida-excel': {
    guiones: ['01_productos_orden_rapida_excel.md'],
    infografias: [
      {
        file: 'prod_01_orden_rapida.png',
        alt: 'Infografía de Orden Rápida Excel en 5 pasos',
        caption: 'Flujo completo de Orden Rápida: configuración, Excel n8n, cruce de SKUs, matrices y confirmación.',
      },
      {
        file: 'prod_02_contenedor_tabla_rosa.png',
        alt: 'Matriz talla por color y asignación a contenedor',
        caption: 'Resolución de colores y verificación de matrices antes de guardar en el contenedor.',
      },
    ],
  },
  'imagenes-masivas-canva': {
    guiones: ['02_productos_imagenes_masivas_canva.md'],
    infografias: [
      {
        file: 'prod_03_canva_imagenes.png',
        alt: 'Infografía de carga masiva de imágenes desde Canva',
        caption: 'Emparejamiento masivo de fotografías por SKU y selección de imagen principal.',
      },
    ],
  },
  'familias-y-orden-reportes': {
    guiones: ['03_productos_familias_y_orden_reporte.md'],
    infografias: [
      {
        file: 'prod_04_familias_orden.png',
        alt: 'Infografía de organizador de familias y orden para reportes',
        caption: 'Organización jerárquica de familias y orden de impresión en reportes globales.',
      },
    ],
  },
  'notas-inventario-ocr': {
    guiones: ['04_inventario_nota_ocr.md', '06_inventario_ajuste_manual.md'],
    infografias: [
      {
        file: 'inv_02_ocr_fotos_borrador.png',
        alt: 'Flujo de notas OCR desde fotografía hasta borrador',
        caption: 'Digitalización de notas físicas con OCR y revisión en bandeja de propuestas.',
      },
      {
        file: 'inv_03_anatomia_nota.png',
        alt: 'Anatomía de una nota de inventario',
        caption: 'Partes de una nota: encabezado, bodegas origen/destino, líneas por caja y estados PEND/CONF.',
      },
    ],
  },
  'surtir-contenedor-bodega-virtual': {
    guiones: ['05_inventario_surtir_contenedor_virtual.md'],
    infografias: [
      {
        file: 'inv_04_validacion_2_pasos.png',
        alt: 'Validación en 2 pasos al surtir contenedor a bodega virtual',
        caption: 'Proceso en 2 pasos para ingresar mercancía de contenedor a bodega virtual.',
      },
    ],
  },
  'conteo-fisico-ocr-y-ajustes-excel': {
    guiones: [
      '07_inventario_escanear_fisico_ocr.md',
      '08_inventario_importar_ajustes_excel.md',
      '09_inventario_reporte_global_imprimir.md',
    ],
    infografias: [
      {
        file: 'inv_05_recorrido_ajustes.png',
        alt: 'Recorrido de conteo físico y ajustes de inventario',
        caption: 'Comparación de inventario físico vs sistema mediante OCR o Excel y reporte global.',
      },
    ],
  },
  'publicar-productos-ecommerce': {
    guiones: ['10_ecommerce_publicar_productos.md'],
    infografias: [
      {
        file: 'ecom_01_producto_web.png',
        alt: 'Configuración de producto web en Ecommerce',
        caption: 'Herencia de datos desde Productos, precios públicos, SEO inteligente y etiquetas.',
      },
      {
        file: 'ecom_02_regla_stock_web.png',
        alt: 'Regla de visibilidad de stock en tienda pública',
        caption: 'Cómo afecta modo_visibilidad_catalogo a los productos con stock cero en /shop.',
      },
    ],
  },
  'editar-inicio-y-ordenes-venta': {
    guiones: [
      '11_ecommerce_editar_inicio.md',
      '12_visitante_favoritos_ecommerce.md',
      '13_visitante_crear_cotizacion_orden.md',
    ],
  },
}

const GUIONES_DIR = path.join(
  process.cwd(),
  'docs',
  'manuales',
  'videoguias',
  'guiones'
)

/**
 * Construye una guía completa desde los archivos `.md` e infografías del repositorio
 * cuando el artículo aún no ha sido personalizado en el bucket `documentation`.
 */
export async function loadFallbackDocArticle(
  slug: string
): Promise<DocArticle | null> {
  const item = DEFAULT_DOC_ITEMS.find((entry) => entry.slug === slug)
  if (!item) return null

  const spec = GUIDE_SOURCE_MAP[slug] ?? {}
  const blocks: DocBlock[] = []
  const requisitosSet = new Set<string>(spec.requisitos ?? [])
  let duracionEstimada = spec.duracion

  if (spec.infografias && spec.infografias.length > 0) {
    spec.infografias.forEach((info, index) => {
      blocks.push({
        id: `info-${slug}-${index}`,
        type: 'image',
        src: `/api/docs/asset?kind=infografia&file=${encodeURIComponent(info.file)}`,
        alt: info.alt,
        caption: info.caption,
      })
    })
  }

  if (spec.extraBlocks) {
    blocks.push(...spec.extraBlocks)
  }

  if (spec.guiones && spec.guiones.length > 0) {
    for (let idx = 0; idx < spec.guiones.length; idx++) {
      const filename = spec.guiones[idx]
      const fullPath = path.join(GUIONES_DIR, filename)

      try {
        const mdContent = await fs.readFile(fullPath, 'utf8')
        const parsed = parseMarkdownToGuide(mdContent)

        if (!duracionEstimada && parsed.duracionEstimada) {
          duracionEstimada = parsed.duracionEstimada
        }
        parsed.requisitosPrevios.forEach((req) => requisitosSet.add(req))

        if (spec.guiones.length > 1 && parsed.title) {
          blocks.push({
            id: `part-${idx}-${slug}`,
            type: 'heading',
            level: 2,
            text: parsed.title,
          })
        }

        const prefixedBlocks = parsed.blocks.map((block) => ({
          ...block,
          id: `g${idx}-${block.id}`,
        }))
        blocks.push(...prefixedBlocks)
      } catch (err) {
        console.warn(`[docs/fallback] No se pudo leer ${filename}:`, err)
      }
    }
  }

  return {
    slug: item.slug,
    titulo: item.titulo,
    resumen: item.resumen,
    rol: item.rol,
    publicado: item.publicado,
    rutasAdmin: item.rutasAdmin,
    duracionEstimada,
    requisitosPrevios: Array.from(requisitosSet),
    docxOrigen: item.docxOrigen,
    blocks,
    updatedAt: '2026-11-25T00:00:00.000Z',
    updatedBy: 'Sistema (Base del repositorio)',
  }
}
