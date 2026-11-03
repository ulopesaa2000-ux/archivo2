// docs/generator/compilarCatalogo.ts
import path from 'path';
import { DocBuilder, type ManualConfig } from './docBuilder';

async function main() {
  const capturasDir = path.resolve(process.cwd(), 'docs/capturas/01_catalogo');
  const outputDocx = path.resolve(process.cwd(), 'docs/manuales/01_Manual_Catalogo_y_Fotos.docx');

  const config: ManualConfig = {
    titulo: 'Manual de Operación: Catálogo de Productos y Galería',
    subtitulo: 'Guía detallada para el alta de productos, gestión de variantes, familias y carga de fotografías',
    modulo: 'Catálogo & Galería',
    version: '1.0',
    fecha: 'Octubre 2026',
    outputPath: outputDocx,
    secciones: [
      {
        titulo: '1. Introducción al Catálogo Central',
        subtitulo: 'Estructura jerárquica del inventario y conceptos clave',
        descripcionIntro:
          'El módulo de Catálogo es el núcleo maestro del sistema inv-tienda. En él se definen las fichas técnicas de los productos, sus códigos de estilo (SKU base), las variantes por color y talla, sus atributos descriptivos (marca, género, tipo de prenda, tela) y su material fotográfico para uso interno y de ecommerce.',
        tablas: [
          {
            encabezados: ['Concepto', 'Definición', 'Regla de Negocio'],
            filas: [
              ['SKU Base', 'Identificador principal del estilo o modelo de la prenda.', 'Único e irrepetible en el catálogo.'],
              ['Variante', 'Combinación específica de color y talla de un SKU.', 'Hereda los atributos del producto y define costo y código de barras.'],
              ['Familia', 'Agrupación lógica de modelos con características compartidas.', 'Facilita la navegación, análisis y pedidos por bloques.'],
              ['Imagen Principal', 'Fotografía de portada almacenada en Supabase Storage.', 'Se usa la imagen real en alta calidad sin recortes sintéticos.'],
            ],
          },
        ],
      },
      {
        titulo: '2. Navegación y Búsqueda en el Catálogo',
        subtitulo: 'Filtros rápidos, vistas Grid / Tabla y selector de Bodega',
        descripcionIntro:
          'La pantalla principal permite visualizar los artículos en dos modalidades: cuadrícula visual (Grid) con fotografías y precio, o tabla densa de auditoría con columnas técnicas.',
        pasos: [
          {
            numero: 1,
            titulo: 'Visualización general y filtros de búsqueda',
            descripcion:
              'Utiliza la barra de búsqueda superior para filtrar al instante por prefijo de SKU, nombre o familia. Los selectores permiten acotar por marca, género y estado (Activo/Inactivo). Además, puedes alternar entre la vista en tarjetas visuales y la vista en tabla para análisis masivo.',
            capturaPath: path.join(capturasDir, '01_catalogo_grid.png'),
            pieDeFoto: 'Vista principal del Catálogo en modo cuadrícula (Grid) con filtros de búsqueda rápida.',
            tip: 'La búsqueda por SKU cuenta con respuesta instantánea con debounce de 300 ms sin recargar la página completa.',
          },
        ],
      },
      {
        titulo: '3. Alta de un Nuevo Producto',
        subtitulo: 'Paso a paso para registrar un modelo en el catálogo',
        descripcionIntro:
          'Para dar de alta un producto nuevo, los usuarios con permisos de creación disponen del botón destacado "+ Nuevo Producto" en la parte superior derecha.',
        pasos: [
          {
            numero: 2,
            titulo: 'Completar el formulario de alta',
            descripcion:
              'Al hacer clic en "+ Nuevo Producto", se despliega el diálogo modal. Es indispensable capturar el SKU Base (código de estilo), nombre descriptivo, seleccionar la marca, género, tipo de prenda y especificar las piezas promedio por caja (curva de empaque).',
            capturaPath: path.join(capturasDir, '02_modal_nuevo_producto.png'),
            pieDeFoto: 'Formulario modal para el registro de un nuevo producto en catálogo.',
            tip: 'Verifica bien el código de estilo antes de guardar, ya que será la raíz de todos los códigos de variantes generados posteriormente.',
            advertencia: 'No utilices caracteres especiales ni espacios dentro del código SKU Base.',
          },
        ],
      },
      {
        titulo: '4. Ficha Técnica y Gestión de Variantes',
        subtitulo: 'Detalle de producto, curvas de tallas y códigos de barra',
        descripcionIntro:
          'Al seleccionar cualquier producto del catálogo, se ingresa a su ficha técnica completa, la cual organiza toda la información en pestañas modulares.',
        pasos: [
          {
            numero: 3,
            titulo: 'Revisión de Variantes y Atributos Técnicos',
            descripcion:
              'En la pestaña "Variantes", se visualiza la matriz de colores y tallas asociadas al modelo. Cada variante cuenta con su código SKU completo, código de barras para escaneo por lector óptico y su costo promedio de adquisición.',
            capturaPath: path.join(capturasDir, '03_detalle_producto_variantes.png'),
            pieDeFoto: 'Ficha técnica del producto con resumen en cabecera y listado de variantes.',
          },
        ],
      },
      {
        titulo: '5. Carga y Administración de Fotografías',
        subtitulo: 'Reglas para subida de imágenes, foto principal y optimización',
        descripcionIntro:
          'Las imágenes del producto se sincronizan de forma segura con los buckets de Supabase Storage. El sistema optimiza la entrega en formatos modernos (WebP) para una carga ultrarrápida.',
        pasos: [
          {
            numero: 4,
            titulo: 'Gestión de la galería fotográfica',
            descripcion:
              'En la pestaña "Imágenes" del producto, puedes arrastrar y soltar nuevas fotografías o hacer clic en el área de carga. Puedes marcar una foto como "Principal", reordenar la galería y eliminar tomas obsoletas.',
            capturaPath: path.join(capturasDir, '04_galeria_imagenes_producto.png'),
            pieDeFoto: 'Pestaña de imágenes con visor de galería y selector de foto principal.',
            tip: 'La imagen marcada como Principal es la que se compartirá automáticamente en enlaces de WhatsApp, catálogo PDF y en la tienda online pública.',
            advertencia: 'Se recomienda subir imágenes en formato JPG o PNG con fondo uniforme para mantener la consistencia estética del catálogo.',
          },
        ],
      },
      {
        titulo: '6. Organizador de Familias',
        subtitulo: 'Agrupación visual de productos por líneas de diseño',
        descripcionIntro:
          'El módulo de Familias (/catalogo/familias) permite a los coordinadores de catálogo organizar y reasignar prendas entre familias de manera ágil.',
        pasos: [
          {
            numero: 5,
            titulo: 'Clasificación en el organizador de familias',
            descripcion:
              'Esta pantalla presenta las familias registradas en el sistema, mostrando el conteo de modelos agrupados, total de variantes y acceso rápido para reasignar artículos o crear nuevas familias de temporada.',
            capturaPath: path.join(capturasDir, '05_familias_organizer.png'),
            pieDeFoto: 'Módulo Organizador de Familias con conteos por categoría.',
          },
        ],
      },
    ],
  };

  console.log('Compilando manual de Catálogo...');
  const rutaFinal = await DocBuilder.compilarManual(config);
  console.log(`¡Manual generado exitosamente en: ${rutaFinal}!`);
}

main().catch((err) => {
  console.error('Error generando manual:', err);
  process.exit(1);
});
