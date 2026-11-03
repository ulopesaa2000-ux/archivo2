// docs/generator/compilarB2BContenedores.mjs
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

const capturasDir = path.join(rootDir, 'docs/capturas/03_ordenes_contenedores');
const outputDocx = path.join(rootDir, 'docs/manuales/03_Manual_Ordenes_B2B_Cajas_y_Contenedores.docx');

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
  console.log('Iniciando compilación del Manual de Órdenes B2B, Cajas y Contenedores...');

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
      text: 'MANUAL DE OPERACIÓN: ÓRDENES B2B, CAJAS Y CONTENEDORES',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'Guía oficial para la gestión de órdenes de compra con proveedores internacionales, cálculo de cajas por talla/color y logística marítima.',
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
          text: 'Módulo: Cadena de Suministro B2B | Versión: 1.0 | Entorno: Sandbox / Capacitación',
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

  // Sección 1: Conceptos B2B
  body.push(heading1('1. Cadena de Suministro y Estructura B2B'));
  body.push(
    parrafo(
      'El subsistema de Órdenes B2B y Contenedores gestiona el abastecimiento internacional de indumentaria. Desde la emisión de pedidos a fábrica en moneda extranjera (USD/MXN), el cálculo de cubicaje (CBM), hasta el seguimiento marítimo y la recepción aduanal.'
    )
  );

  body.push(
    tabla(
      ['Elemento', 'Definición Técnica', 'Importancia Logística'],
      [
        ['Orden B2B', 'Contrato de compra a proveedor o fábrica.', 'Fija precios unitarios, fechas pactadas y condiciones de entrega.'],
        ['Cajas Talla × Color', 'Empaque estandarizado con surtido predefinido.', 'Unidad física de maniobra en contenedores y tarimas.'],
        ['Volumen CBM', 'Metros cúbicos de carga por bulto/caja.', 'Determina la capacidad de llenado de contenedores de 20ft / 40ft HQ.'],
        ['Contenedor', 'Unidad de flete marítimo internacional.', 'Agrupa una o varias órdenes B2B bajo un mismo BL (Bill of Lading).'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 180 } }));

  // Sección 2: Gestión de Órdenes B2B
  body.push(heading1('2. Gestión de Órdenes de Compra B2B'));
  body.push(heading2('Listado general, búsqueda por folio proveedor y estados'));
  body.push(
    parrafo(
      'En la ruta /ordenes-b2b se concentra el tablero maestro de compras mayoristas. El usuario puede buscar por folio del proveedor, filtrar por estado del pedido (Borrador, En Producción, Embarcado, Recibido) y consultar el CBM total consolidado.'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 1: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Monitorear el tablero de órdenes y expandir detalles', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Cada renglón cuenta con un botón para expandir la fila y visualizar al instante el cliente B2B asignado, el volumen en metros cúbicos y el desglose de importes.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '01_lista_ordenes_b2b.png'), 'Tablero de Órdenes B2B con filtros por estado, proveedor y moneda.'));

  // Sección 3: Nueva Orden B2B
  body.push(heading1('3. Emisión de una Nueva Orden B2B'));
  body.push(heading2('Asignación de proveedor, moneda y condiciones de pago'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 2: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Abrir el modal "Nueva Orden" y capturar datos maestros', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Al pulsar el botón "Nueva Orden", se despliega el formulario para seleccionar el proveedor registrado, asignar el folio del fabricante, seleccionar la divisa operativa (USD o MXN) y agregar notas especiales de entrega.'
    )
  );
  body.push(alerta('warning', 'El proveedor es obligatorio para poder inicializar la orden.'));
  body.push(...imagenConPie(path.join(capturasDir, '02_modal_nueva_orden.png'), 'Diálogo modal para el alta de orden B2B.'));

  // Sección 4: Ficha de la Orden
  body.push(heading1('4. Ficha Técnica de la Orden y Desglose'));
  body.push(heading2('Renglones de producto, importes y avance del pedido'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 3: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Revisar la ficha técnica de la orden B2B', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la vista de detalle (/ordenes-b2b/[id]), el sistema despliega el resumen ejecutivo con el total de piezas ordenadas, cajas previstas y el estado operativo del pedido.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '03_detalle_orden_b2b.png'), 'Ficha de detalle de la orden B2B con panel de control.'));

  // Sección 5: Matriz de Cajas
  body.push(heading1('5. Matriz de Cajas y Empaque (Talla × Color)'));
  body.push(heading2('Configuración de curvas de distribución por bulto'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 4: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Auditar la matriz de cajas en /ordenes-b2b/cajas', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'El módulo de cajas permite conocer exactamente cómo viene distribuida la mercancía dentro de cada caja de cartón master: cuántas piezas corresponden a cada talla (CH, MED, GDE, XG) y qué colores componen la curva.'
    )
  );
  body.push(alerta('tip', 'La curva de cajas estandarizada permite que los operarios de almacén ingresen inventario por bultos completos sin necesidad de abrir y contar prenda por prenda.'));
  body.push(...imagenConPie(path.join(capturasDir, '04_matriz_cajas_talla_color.png'), 'Módulo de Cajas con matriz de prendas por talla y color.'));

  // Sección 6: Contenedores
  body.push(heading1('6. Logística de Contenedores de Importación'));
  body.push(heading2('Seguimiento marítimo, navieras y fechas estimadas de llegada'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 5: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Gestionar contenedores y fechas de arribo', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En /contenedores se lleva el control de los embarques marítimos. Cada registro incluye el número de contenedor oficial (ej. MSCU1234567), la naviera responsable, el puerto de origen y las fechas estimadas (ETA) para planificar la recepción en bodega.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '05_lista_contenedores.png'), 'Listado de contenedores de importación con fechas estimadas de arribo.'));

  // Sección 7: Reporte Anual
  body.push(heading1('7. Estadísticas y Reporte Anual de Contenedores'));
  body.push(heading2('Volumen acumulado por ejercicio y estatus aduanal'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 6: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Consultar el reporte consolidado anual', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'La vista de reporte anual agrupa los contenedores por meses y trimestres, facilitando el análisis financiero de fletes y la proyección de entrada de inventario para temporadas pico.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '06_reporte_anual_contenedores.png'), 'Vista de reporte anual de contenedores por periodo.'));

  // Documento final
  const doc = new Document({
    creator: 'Sistema inv-tienda',
    title: 'Manual de Operación: Órdenes B2B, Cajas y Contenedores',
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
                    text: 'Sistema inv-tienda | Manual de Operación: Órdenes B2B y Contenedores',
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
  console.log(`Manual B2B y Contenedores generado exitosamente en: ${outputDocx} (${buffer.length} bytes)`);
}

compilar().catch((err) => {
  console.error('Error al compilar documento Word de B2B y Contenedores:', err);
  process.exit(1);
});
