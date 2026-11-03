// docs/generator/docBuilder.ts
import fs from 'fs';
import path from 'path';
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

export interface PasoDoc {
  numero: number;
  titulo: string;
  descripcion: string;
  capturaPath?: string;
  pieDeFoto?: string;
  tip?: string;
  advertencia?: string;
}

export interface SeccionDoc {
  titulo: string;
  subtitulo?: string;
  descripcionIntro?: string;
  pasos?: PasoDoc[];
  tablas?: {
    encabezados: string[];
    filas: string[][];
  }[];
}

export interface ManualConfig {
  titulo: string;
  subtitulo: string;
  modulo: string;
  version: string;
  fecha: string;
  secciones: SeccionDoc[];
  outputPath: string;
}

// Colores corporativos del sistema inv-tienda
const COLORS = {
  primary: '1E3A8A',    // Azul marino oscuro
  secondary: '0D9488',  // Teal
  text: '1F2937',       // Gris carbón
  textMuted: '4B5563',  // Gris medio
  border: 'E5E7EB',     // Gris claro bordes
  tableHeader: '1E3A8A',
  tableHeaderTxt: 'FFFFFF',
  tableRowAlt: 'F9FAFB',
  alertInfoBg: 'EFF6FF',
  alertInfoBorder: '3B82F6',
  alertWarnBg: 'FEF3C7',
  alertWarnBorder: 'F59E0B',
};

export class DocBuilder {
  /**
   * Crea un párrafo de título 1 con estilo corporativo
   */
  static heading1(texto: string): Paragraph {
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

  /**
   * Crea un párrafo de título 2
   */
  static heading2(texto: string): Paragraph {
    return new Paragraph({
      text: texto,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    });
  }

  /**
   * Párrafo de texto regular
   */
  static parrafo(texto: string, opciones?: { bold?: boolean; italic?: boolean; color?: string }): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: texto,
          bold: opciones?.bold,
          italics: opciones?.italic,
          color: opciones?.color || COLORS.text,
          size: 22, // 11pt
          font: 'Calibri',
        }),
      ],
      spacing: { after: 120, line: 276 },
    });
  }

  /**
   * Cuadro de alerta informativa o advertencia
   */
  static alerta(tipo: 'info' | 'warning' | 'tip', texto: string): Table {
    const isWarn = tipo === 'warning';
    const isTip = tipo === 'tip';

    const bgColor = isWarn ? COLORS.alertWarnBg : COLORS.alertInfoBg;
    const borderColor = isWarn ? COLORS.alertWarnBorder : isTip ? COLORS.secondary : COLORS.alertInfoBorder;
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

  /**
   * Incrusta una imagen/captura con marco sutil y pie de foto centrado
   */
  static imagenConPie(rutaAbsoluta: string, pieDeFoto?: string, ancho = 560, alto = 315): (Paragraph | Table)[] {
    if (!fs.existsSync(rutaAbsoluta)) {
      return [
        DocBuilder.alerta('warning', `Captura pendiente de inserción: ${path.basename(rutaAbsoluta)}`),
      ];
    }

    const imagenBuffer = fs.readFileSync(rutaAbsoluta);

    const elementos: (Paragraph | Table)[] = [];

    // Tabla de un solo bloque para darle marco sutil a la captura
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
                      transformation: {
                        width: ancho,
                        height: alto,
                      },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    elementos.push(tablaImagen);

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

  /**
   * Genera una tabla estilizada de datos
   */
  static tabla(encabezados: string[], filas: string[][]): Table {
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

  /**
   * Compila el documento completo y lo guarda en disco
   */
  static async compilarManual(config: ManualConfig): Promise<string> {
    const bodyChildren: any[] = [];

    // Portada / Encabezado principal
    bodyChildren.push(
      new Paragraph({
        text: config.titulo.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        text: config.subtitulo,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: config.subtitulo, italics: true, size: 26, color: COLORS.secondary }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [
          new TextRun({
            text: `Módulo: ${config.modulo} | Versión: ${config.version} | Fecha: ${config.fecha}`,
            size: 20,
            color: COLORS.textMuted,
          }),
        ],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.primary },
        },
      })
    );

    // Iterar secciones
    for (const sec of config.secciones) {
      bodyChildren.push(DocBuilder.heading1(sec.titulo));

      if (sec.subtitulo) {
        bodyChildren.push(DocBuilder.heading2(sec.subtitulo));
      }

      if (sec.descripcionIntro) {
        bodyChildren.push(DocBuilder.parrafo(sec.descripcionIntro));
      }

      // Tablas si existen
      if (sec.tablas) {
        for (const t of sec.tablas) {
          bodyChildren.push(DocBuilder.tabla(t.encabezados, t.filas));
          bodyChildren.push(new Paragraph({ spacing: { after: 180 } }));
        }
      }

      // Pasos detallados
      if (sec.pasos) {
        for (const paso of sec.pasos) {
          bodyChildren.push(
            new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: `Paso ${paso.numero}: `,
                  bold: true,
                  color: COLORS.primary,
                  size: 24,
                }),
                new TextRun({
                  text: paso.titulo,
                  bold: true,
                  size: 24,
                  color: COLORS.text,
                }),
              ],
            })
          );

          bodyChildren.push(DocBuilder.parrafo(paso.descripcion));

          if (paso.tip) {
            bodyChildren.push(DocBuilder.alerta('tip', paso.tip));
            bodyChildren.push(new Paragraph({ spacing: { after: 100 } }));
          }

          if (paso.advertencia) {
            bodyChildren.push(DocBuilder.alerta('warning', paso.advertencia));
            bodyChildren.push(new Paragraph({ spacing: { after: 100 } }));
          }

          if (paso.capturaPath) {
            const imgElems = DocBuilder.imagenConPie(paso.capturaPath, paso.pieDeFoto);
            bodyChildren.push(...imgElems);
          }
        }
      }
    }

    const doc = new Document({
      creator: 'Sistema inv-tienda',
      title: config.titulo,
      description: config.subtitulo,
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
                      text: `Sistema inv-tienda - Manual de Usuario: ${config.modulo}`,
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
          children: bodyChildren,
        },
      ],
    });

    const dir = path.dirname(config.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(config.outputPath, buffer);

    return config.outputPath;
  }
}
