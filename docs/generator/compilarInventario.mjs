// docs/generator/compilarInventario.mjs
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

const capturasDir = path.join(rootDir, 'docs/capturas/02_inventario');
const outputDocx = path.join(rootDir, 'docs/manuales/02_Manual_Inventario_y_Notas.docx');

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
  const prefijo = isWarn ? '⚠️ REGLA DE ORO / ADVERTENCIA: ' : isTip ? '💡 CONSEJO OPERATIVO: ' : 'ℹ️ INFORMACIÓN IMPORTANTE: ';

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
  console.log('Iniciando compilación del Manual de Inventario...');

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
      text: 'MANUAL DE OPERACIÓN: INVENTARIO Y NOTAS DE MOVIMIENTO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'Guía oficial para la consulta de stock por bodega, emisión de notas de entrada/salida/transferencia y auditoría de movimientos.',
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
          text: 'Módulo: Inventario & Movimientos | Versión: 1.0 | Entorno: Sandbox / Capacitación',
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

  // Sección 1: Reglas de Oro
  body.push(heading1('1. Arquitectura de Inventario y Reglas Inquebrantables'));
  body.push(
    parrafo(
      'El control de inventario en inv-tienda está blindado por triggers y procedimientos almacenados en la base de datos PostgreSQL. Esta arquitectura garantiza que no existan discrepancias entre existencias físicas y registros contables.'
    )
  );

  body.push(
    alerta(
      'warning',
      'REGLA INQUEBRANTABLE #1: Ningún usuario ni proceso modifica inventario_stock de forma manual o directa. El 100% de los movimientos de stock debe originarse forzosamente a través de una Nota de Inventario (notas_inventario).'
    )
  );
  body.push(new Paragraph({ spacing: { after: 100 } }));

  body.push(
    alerta(
      'info',
      'TRIGGER AUTOMÁTICO: El trigger fn_procesar_nota_inventario se activa únicamente cuando la nota pasa a estado CONF (Confirmada). En ese milisegundo exacto se recalculan y asientan las existencias físicas en la bodega destino u origen.'
    )
  );
  body.push(new Paragraph({ spacing: { after: 180 } }));

  body.push(
    tabla(
      ['Tipo de Movimiento', 'Código', 'Efecto en Stock', 'Uso Principal'],
      [
        ['Entrada', 'ENT', '+ Incrementa existencias', 'Recepción de compra, importación o producción.'],
        ['Salida', 'SAL', '- Decrementa existencias', 'Venta mayorista, merma, muestra o donación.'],
        ['Transferencia', 'TRF', '↔ Resta en Origen / Suma en Destino', 'Traslado de mercancía entre bodegas físicas.'],
        ['Ajuste', 'AJU', '⚖ Regulariza según conteo físico', 'Conciliación periódica tras auditoría cíclica.'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 180 } }));

  // Sección 2: Consulta de Stock
  body.push(heading1('2. Consulta de Existencias por Bodega'));
  body.push(heading2('Semáforos de disponibilidad y selector de bodega activa'));
  body.push(
    parrafo(
      'El módulo /inventario/stock presenta la radiografía completa del inventario. El sistema está multi-bodega: cada usuario visualiza el inventario filtrado por la bodega activa que tiene asignada o puede navegar entre bodegas si cuenta con los permisos correspondientes.'
    )
  );

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 1: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Revisar existencias y filtrar por estilo o marca', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En la tabla de existencias se desglosa el SKU, descripción, piezas disponibles, cajas completas estimadas y el estatus del semáforo (Verde = Óptimo, Amarillo = Bajo, Rojo = Sin stock o crítico).'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '01_stock_por_bodega.png'), 'Pantalla de Stock por Bodega con selector de sucursal y tabla de cantidades.'));

  // Sección 3: Listado de Notas
  body.push(heading1('3. Gestión de Notas de Movimiento'));
  body.push(heading2('Historial de folios, estados y filtros de auditoría'));
  body.push(
    parrafo(
      'En la ruta /inventario/notas se encuentra el repositorio histórico de todas las notas emitidas. Puedes filtrar por rango de fechas, bodega, tipo de movimiento (ENT/SAL/TRF/AJU) y estado del documento.'
    )
  );

  body.push(
    tabla(
      ['Estado', 'Código', '¿Permite Edición?', '¿Afecta Stock?'],
      [
        ['Pendiente', 'PEND', 'Sí (Borrador activo)', 'No'],
        ['En Proceso', 'PROC', 'Sí (En revisión física)', 'No'],
        ['Confirmada', 'CONF', 'No (Lectura y auditoría)', 'Sí (Automático e irreversible)'],
        ['Cancelada', 'CANC', 'No (Documento anulado)', 'No'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 2: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Monitorear el estado de las notas en la tabla', bold: true, size: 24 }),
      ],
    })
  );
  body.push(...imagenConPie(path.join(capturasDir, '02_lista_notas_movimiento.png'), 'Listado de notas de movimiento con badges de estado y selector de tipo.'));

  // Sección 4: Constructor de Nueva Nota
  body.push(heading1('4. Emisión de una Nueva Nota de Inventario'));
  body.push(heading2('Captura de cabecera, renglones de producto y cantidades'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 3: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Completar el constructor de nota (NoteDraftBuilder)', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Al ingresar a /inventario/notas/nueva, se abre el constructor interactivo. El flujo para armar la nota comprende:\n1. Definir Tipo de Movimiento (Entrada, Salida, Transferencia, Ajuste).\n2. Seleccionar la Bodega Origen y (en caso de transferencia) la Bodega Destino.\n3. Agregar productos mediante el buscador rápido o selector por catálogo.\n4. Indicar el número de cajas y piezas por producto.\n5. Guardar el borrador para obtener folio provisional.'
    )
  );
  body.push(alerta('tip', 'Puedes guardar la nota en estado PEND cuantas veces sea necesario mientras el equipo de almacén realiza el conteo físico.'));
  body.push(...imagenConPie(path.join(capturasDir, '03_crear_nota_draft.png'), 'Constructor de nota de inventario con cabecera y tabla de captura dinámica.'));

  // Sección 5: Confirmación de Nota
  body.push(heading1('5. Confirmación y Afectación del Stock'));
  body.push(heading2('Paso de estado PEND/PROC a CONF y ejecución de trigger'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 4: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Confirmar la nota para consolidar el inventario', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'Una vez verificado que los productos y cantidades coinciden con la mercancía real, el responsable de almacén o supervisor hace clic en el botón de estado "Confirmada" (CONF).'
    )
  );
  body.push(
    alerta(
      'warning',
      'Una vez confirmada (CONF), la nota pasa a modo SOLO LECTURA. No se podrán alterar las cantidades ni los productos. Si hubo un error en conteo, se deberá emitir una nueva nota de ajuste o devolución debidamente justificada.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '04_detalle_nota_edicion.png'), 'Detalle de la nota de inventario con panel de cambio de estado a CONF.'));

  // Sección 6: Trazabilidad y Kardex
  body.push(heading1('6. Kardex y Trazabilidad de Movimientos'));
  body.push(heading2('Seguimiento cronológico, rotación y flujo geográfico'));
  body.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({ text: 'Paso 5: ', bold: true, color: COLORS.primary, size: 24 }),
        new TextRun({ text: 'Auditar el flujo de mercancía en el módulo de Trazabilidad', bold: true, size: 24 }),
      ],
    })
  );
  body.push(
    parrafo(
      'En /inventario/trazabilidad, el sistema permite visualizar el historial de rotación de cada producto o familia. Se desglosa en diagramas de flujo y matrices qué bodega despachó mercancía, qué bodega la recibió y la velocidad de desplazamiento de cada estilo.'
    )
  );
  body.push(...imagenConPie(path.join(capturasDir, '05_trazabilidad_kardex.png'), 'Módulo de Trazabilidad con matriz de rotación y flujo entre sucursales.'));

  // Generar Documento
  const doc = new Document({
    creator: 'Sistema inv-tienda',
    title: 'Manual de Operación: Inventario y Notas de Movimiento',
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
                    text: 'Sistema inv-tienda | Manual de Operación: Inventario y Notas',
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
  console.log(`Manual de Inventario generado exitosamente en: ${outputDocx} (${buffer.length} bytes)`);
}

compilar().catch((err) => {
  console.error('Error al compilar documento Word de Inventario:', err);
  process.exit(1);
});
