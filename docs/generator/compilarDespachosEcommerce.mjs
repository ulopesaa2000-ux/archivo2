// docs/generator/compilarDespachosEcommerce.mjs
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

const capturasDir = path.join(rootDir, 'docs/capturas/04_despachos_ecommerce');
const outputDocx = path.join(rootDir, 'docs/manuales/04_Manual_Despachos_y_Ecommerce.docx');

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
        size: 22,
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
  const prefijo = isWarn ? '⚠️ REGLA DE NEGOCIO: ' : isTip ? '💡 CONSEJO OPERATIVO: ' : 'ℹ️ INFORMACIÓN CLAVE: ';

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
  console.log('Iniciando compilación del Manual de Despachos y Ecommerce...');

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
      text: 'MANUAL DE OPERACIÓN: DESPACHOS Y ECOMMERCE',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'Guía oficial para la expedición de despachos a clientes, publicación en tienda web, fijación de precios y catálogo online.',
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
          text: 'Módulo: Despachos & Tienda Online | Versión: 1.0 | Entorno: Sandbox / Capacitación',
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

  // Sección 1: Despachos
  body.push(heading1('1. Módulo de Despachos y Salidas a Clientes'));
  body.push(heading2('Preparación de pedidos, guías de remisión y control de entregas'));
  body.push(
    parrafo(
      'El módulo de Despachos (/despachos) coordina el empaque final y entrega física de mercancía vendida a clientes mayoristas o transferida a tiendas satélite. Cada despacho vincula los artículos surtidos desde bodega con el chofer o paquetería encargada.'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 1: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Consultar el listado de despachos en curso', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la tabla principal se aprecian los folios de despacho, cliente destinatario, bodega emisora, número de bultos y el estatus logístico (Pendiente, En Tránsito, Entregado).'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '01_lista_despachos.png'), 'Tablero de Despachos con estatus de entrega y filtros de fecha.'));

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 2: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Registrar un nuevo despacho de mercancía', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Al presionar "+ Nuevo Despacho", se capturan los datos del destinatario, dirección de entrega, transportista y se seleccionan las notas o pedidos que componen la carga.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '02_nuevo_despacho.png'), 'Formulario de alta de nuevo despacho logístico.'));

  // Sección 2: Productos Web y Precios
  body.push(heading1('2. Administración de Productos Web (Ecommerce)'));
  body.push(heading2('Separación estricta de costos y fijación de precios al público'));
  body.push(
    parrafo(
      'En el sistema inv-tienda, la información de catálogo se sincroniza con el módulo de comercio electrónico (/ecommerce/productos-web). Aquí se decide qué prendas son visibles en internet, sus nombres comerciales y sus precios de venta.'
    )
  );

  body.push(
    alerta(
      'warning',
      'REGLA INQUEBRANTABLE #4: Los precios públicos viven en productos_web (precio_publico, precio_oferta), totalmente separados del costo en variantes_producto (costo_promedio). Ningún cliente de la tienda pública tiene acceso ni visibilidad de los costos de importación.'
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 3: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Publicar prendas y configurar precios en el panel ecommerce', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la tabla de Productos Web puedes activar o pausar estilos, asignar precios con descuento para rebajas de temporada y configurar el slug amigable para optimización en motores de búsqueda (SEO).'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '03_admin_productos_web.png'), 'Administrador de Productos Web con precios públicos y control de visibilidad.'));

  // Sección 3: Órdenes de Venta Online
  body.push(heading1('3. Órdenes de Venta y Pedidos Web'));
  body.push(heading2('Recepción de pedidos online, confirmación de pago y surtido'));
  body.push(
    parrafo(
      'En /ecommerce/ordenes-venta, el equipo de ventas y operaciones recibe las compras formalizadas a través de la tienda web o portal B2B digital.'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 4: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Revisar las órdenes recibidas y preparar el surtido', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Cada orden web cuenta con su desglose de prendas, importe total, datos de facturación y estatus de cobro. Una vez aprobada, se procede a su empaque y despacho.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '04_admin_ordenes_venta.png'), 'Panel de Órdenes de Venta recibidas en la tienda web.'));

  // Sección 4: Tienda Pública
  body.push(heading1('4. Catálogo Público de la Tienda Online (/shop)'));
  body.push(heading2('Experiencia del comprador, selector de variantes y carrito'));
  body.push(
    parrafo(
      'La tienda pública ofrece una experiencia de compra fluida y moderna para clientes mayoristas y minoristas. Los artículos se muestran con fotografías en alta definición servidas directamente desde Supabase Storage.'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 5: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Explorar la tienda en línea y filtrar por colección', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'El cliente visualiza el catálogo (/shop), explora las fotos de portada, precios vigentes y ofertas destacadas.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '05_tienda_publica_shop.png'), 'Catálogo online de la tienda pública con tarjetas de producto y buscador.'));

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 6: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Seleccionar talla, color y agregar al carrito', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la ficha técnica pública (/shop/[slug]), el comprador selecciona su talla y color deseado según la disponibilidad en tiempo real y procede al carrito para concretar su pedido.'
    )
  );
  body.push(alerta('tip', 'El carrito y la disponibilidad verifican existencias en línea para prevenir ventas de productos agotados.'));
  body.push(...imagenConPie(path.join(capturasDir, '06_tienda_producto_detalle.png'), 'Ficha de producto en la tienda online con galería y selector de tallas.'));

  // Documento final
  const doc = new Document({
    creator: 'Sistema inv-tienda',
    title: 'Manual de Operación: Despachos y Ecommerce',
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
                    text: 'Sistema inv-tienda | Manual de Operación: Despachos y Ecommerce',
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
  console.log(`Manual de Despachos y Ecommerce generado en: ${outputDocx} (${buffer.length} bytes)`);
}

compilar().catch((err) => {
  console.error('Error al compilar documento Word de Despachos y Ecommerce:', err);
  process.exit(1);
});

