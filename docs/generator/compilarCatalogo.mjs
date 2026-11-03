// docs/generator/compilarCatalogo.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  ShadingType,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const capturasDir = path.join(rootDir, 'docs/capturas/01_catalogo');
const outputDocx = path.join(rootDir, 'docs/manuales/01_Manual_Catalogo_y_Fotos.docx');

// Paleta corporativa inv-tienda
const COLORS = {
  primary: '1E3A8A',    // Azul marino
  secondary: '0D9488',  // Teal
  text: '1F2937',       // Gris oscuro
  textMuted: '4B5563',  // Gris medio
  border: 'D1D5DB',     // Gris bordes
  tableHeader: '1E3A8A',
  tableHeaderTxt: 'FFFFFF',
  tableRowAlt: 'F9FAFB',
  alertInfoBg: 'EFF6FF',
  alertInfoBorder: '3B82F6',
  alertWarnBg: 'FEF3C7',
  alertWarnBorder: 'F59E0B',
  alertTipBg: 'F0FDF4',
  alertTipBorder: '10B981',
};

function heading1(texto) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    border: {
      bottom: {
        color: COLORS.primary,
        size: 12,
        style: BorderStyle.SINGLE,
        space: 4,
      },
    },
  });
}

function heading2(texto) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function parrafo(texto, opciones = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text: texto,
        bold: opciones.bold,
        italics: opciones.italic,
        color: opciones.color || COLORS.text,
        size: 22, // 11pt
        font: 'Calibri',
      }),
    ],
    spacing: { after: 120, line: 276 },
  });
}

function alerta(tipo, texto) {
  const isWarn = tipo === 'warning';
  const isTip = tipo === 'tip';

  const bgColor = isWarn ? COLORS.alertWarnBg : isTip ? COLORS.alertTipBg : COLORS.alertInfoBg;
  const borderColor = isWarn ? COLORS.alertWarnBorder : isTip ? COLORS.alertTipBorder : COLORS.alertInfoBorder;
  const prefijo = isWarn ? '⚠️ ADVERTENCIA: ' : isTip ? '💡 CONSEJO PRÁCTICO: ' : 'ℹ️ NOTA IMPORTANTE: ';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: bgColor },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: prefijo, bold: true, color: borderColor, size: 20 }),
                  new TextRun({ text: texto, color: COLORS.text, size: 20 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function imagenConPie(rutaAbsoluta, pieDeFoto, ancho = 560, alto = 315) {
  if (!fs.existsSync(rutaAbsoluta)) {
    return [alerta('warning', `Captura pendiente de inserción: ${path.basename(rutaAbsoluta)}`)];
  }

  const imagenBuffer = fs.readFileSync(rutaAbsoluta);

  const tablaImagen = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: imagenBuffer,
                    transformation: { width: ancho, height: alto },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const elementos = [tablaImagen];

  if (pieDeFoto) {
    elementos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Figura: ${pieDeFoto}`,
            italics: true,
            size: 18,
            color: COLORS.textMuted,
          }),
        ],
        spacing: { before: 60, after: 180 },
      })
    );
  }

  return elementos;
}

function tabla(encabezados, filas) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: encabezados.map((enc) => (
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: COLORS.tableHeader },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: enc, bold: true, color: COLORS.tableHeaderTxt, size: 20 }),
            ],
          }),
        ],
      })
    )),
  });

  const bodyRows = filas.map((fila, idx) => (
    new TableRow({
      children: fila.map((celda) => (
        new TableCell({
          shading: {
            type: ShadingType.CLEAR,
            fill: idx % 2 === 1 ? COLORS.tableRowAlt : 'FFFFFF',
          },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: celda, size: 20, color: COLORS.text }),
              ],
            }),
          ],
        })
      )),
    })
  ));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...bodyRows],
  });
}

async function compilar() {
  console.log('Iniciando compilación del Manual de Catálogo...');

  const body = [];

  // Portada
  body.push(
    new Paragraph({
      text: 'SISTEMA INV-TIENDA',
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({ text: 'SISTEMA INV-TIENDA', bold: true, size: 20, color: COLORS.secondary }),
      ],
    }),
    new Paragraph({
      text: 'MANUAL DE OPERACIÓN: CATÁLOGO Y FOTOGRAFÍAS',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'Guía oficial paso a paso para el registro de productos, variantes, organizador de familias y carga de fotos.',
          italics: true,
          size: 24,
          color: COLORS.textMuted,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: 'Módulo: Catálogo & Galería | Versión: 1.0 | Entorno: Sandbox / Capacitación',
          size: 20,
          color: COLORS.primary,
          bold: true,
        }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary },
      },
    })
  );

  // Sección 1
  body.push(heading1('1. Estructura del Catálogo y Conceptos Clave'));
  body.push(
    parrafo(
      'El módulo de Catálogo es el repositorio maestro de información técnica y visual de cada prenda. La base de datos organiza las prendas de forma jerárquica para permitir control fino tanto en bodega interna como en la tienda web pública.'
    )
  );

  body.push(
    tabla(
      ['Entidad', 'Definición Técnica', 'Función Operativa'],
      [
        ['SKU Base', 'Identificador único del modelo o estilo (ej. F000-000C).', 'Agrupa todas las variantes del mismo diseño.'],
        ['Variantes', 'Combinación de Color × Talla de un SKU Base.', 'Tiene código de barras y costo promedio de adquisición.'],
        ['Familias', 'Categoría lógica de prendas con atributos compartidos.', 'Facilita la navegación, reportes y compras por lote.'],
        ['Imagen Principal', 'Foto real de Supabase Storage sin recorte.', 'Portada oficial mostrada en web, PDF y WhatsApp.'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 180 } }));

  // Sección 2: Navegación y Búsqueda
  body.push(heading1('2. Búsqueda y Navegación en el Catálogo'));
  body.push(heading2('Filtros dinámicos y modos de visualización (Grid / Tabla)'));
  body.push(
    parrafo(
      'La pantalla principal (/catalogo) permite localizar rápidamente cualquier prenda mediante la barra de búsqueda en tiempo real (con debounce de 300 ms sin recarga brusca) y alternar entre dos vistas especializadas:'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 1: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Filtrar y visualizar en modo Cuadrícula (Grid)', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la vista Grid puedes visualizar las miniaturas fotográficas, el SKU base, la familia asignada, el estado actual de la prenda y el precio público. Desde cada tarjeta se puede acceder a la ficha técnica o compartir la prenda.'
    )
  );
  body.push(alerta('tip', 'Puedes buscar por las primeras letras del SKU o nombre para que la lista filtre automáticamente.'));
  body.push(...imagenConPie(path.join(capturasDir, '01_catalogo_grid.png'), 'Pantalla de Catálogo en modo Cuadrícula (Grid) con buscador y filtros.'));

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 2: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Alternar a vista en Tabla para auditoría masiva', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Al presionar el botón "Tabla", la vista cambia a un formato tabular denso donde puedes ordenar columnas por SKU, Familia, Marca, Piezas por Caja y Estado, ideal para auditorías de datos.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '01_catalogo_tabla.png'), 'Catálogo en modo Tabla con columnas de auditoría y ordenamiento.'));

  // Sección 3: Alta de nuevo producto
  body.push(heading1('3. Registro de un Nuevo Producto'));
  body.push(heading2('Formulario de alta con validación de SKU y atributos'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 3: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Abrir el formulario "+ Nuevo Producto" y capturar datos', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Haz clic en el botón superior derecho "+ Nuevo Producto". En la ventana emergente, completa los siguientes campos obligatorios:'
    )
  );
  body.push(
    parrafo('• SKU Base: Código de estilo del fabricante (ej. CH-890). No usar espacios ni símbolos raros.\n• Nombre: Título comercial de la prenda.\n• Marca y Género: Selecciona de los menús desplegables precargados.\n• Piezas en Caja: Curva base de empaque para cálculo automático en órdenes B2B y contenedores.')
  );
  body.push(alerta('warning', 'El SKU Base no debe duplicarse en el sistema; si ya existe, el sistema indicará un error de validación.'));
  body.push(...imagenConPie(path.join(capturasDir, '02_modal_nuevo_producto.png'), 'Diálogo modal de creación con campos de estilo, marca y empaque.'));

  // Sección 4: Ficha técnica y variantes
  body.push(heading1('4. Ficha Técnica y Curvas de Variantes'));
  body.push(heading2('Detalle del modelo, colores, tallas y códigos de barras'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 4: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Gestionar las variantes del producto', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Al ingresar al detalle de un producto (/catalogo/[id]), el sistema despliega el Hero informativo superior con métricas clave y las pestañas de configuración. En la pestaña "Variantes", se administran las combinaciones de color y talla activas, sus códigos de barra individuales para escaneo físico y el costo de reposición.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '03_detalle_producto_variantes.png'), 'Ficha técnica del producto: cabecera con datos maestros y tabla de variantes.'));

  // Sección 5: Fotografías
  body.push(heading1('5. Subida y Organización de Fotografías'));
  body.push(heading2('Reglas de Supabase Storage y fotografía principal'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 5: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Cargar fotografías a la galería del producto', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la pestaña "Imágenes", arrastra los archivos fotográficos tomados en estudio. El sistema sube los archivos directamente al bucket de Supabase Storage y genera versiones optimizadas en WebP. Marca la mejor toma con la estrella de "Principal".'
    )
  );
  body.push(alerta('info', 'Regla de negocio: Se preserva la imagen original sin recortes automáticos ni imágenes sintéticas, garantizando compatibilidad total al compartir links en WhatsApp y redes sociales.'));
  body.push(...imagenConPie(path.join(capturasDir, '04_galeria_imagenes_producto.png'), 'Pestaña de galería fotográfica con selector de imagen principal.'));

  // Sección 6: Familias
  body.push(heading1('6. Organizador de Familias'));
  body.push(heading2('Clasificación visual y agrupación de líneas de prenda'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 6: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Organizar productos dentro de familias', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En el módulo /catalogo/familias puedes consultar la distribución de prendas por categoría familiar, revisar el número de variantes acumuladas y el semáforo de existencias generales. Este módulo ayuda al equipo de compras y diseño a mantener el catálogo ordenado por colecciones de temporada.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '05_familias_organizer.png'), 'Módulo del Organizador de Familias con conteos y agrupación.'));

  // Documento final
  const doc = new Document({
    creator: 'Sistema inv-tienda',
    title: 'Manual de Catálogo y Fotografías',
    description: 'Manual de usuario con capturas paso a paso.',
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: COLORS.text,
          },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Sistema inv-tienda | Manual de Operación: Catálogo y Fotografías',
                    size: 16,
                    color: COLORS.textMuted,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Página ', size: 16, color: COLORS.textMuted }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COLORS.textMuted }),
                  new TextRun({ text: ' de ', size: 16, color: COLORS.textMuted }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: COLORS.textMuted }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputDocx, buffer);
  console.log(`Documento Word generado exitosamente: ${outputDocx} (${buffer.length} bytes)`);
}

compilar().catch((err) => {
  console.error('Error al compilar documento Word:', err);
  process.exit(1);
});
