// docs/generator/compilarManualMaestro.mjs
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

const capturasCatalogo = path.join(rootDir, 'docs/capturas/01_catalogo');
const capturasInventario = path.join(rootDir, 'docs/capturas/02_inventario');
const capturasB2B = path.join(rootDir, 'docs/capturas/03_ordenes_contenedores');
const capturasEcommerce = path.join(rootDir, 'docs/capturas/04_despachos_ecommerce');
const outputDocx = path.join(rootDir, 'docs/manuales/Manual_Maestro_Plataforma_InvTienda.docx');

// Paleta corporativa
const COLORS = {
  primary: '1E3A8A',    // Azul marino institucional
  secondary: '0D9488',  // Teal
  accent: '2563EB',     // Azul brillante
  text: '1F2937',       // Carbón oscuro
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

function title(texto, opciones = {}) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: opciones.before ?? 240, after: opciones.after ?? 120 },
  });
}

function heading1(texto, pageBreak = false) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    spacing: { before: 400, after: 180 },
    border: {
      bottom: {
        color: COLORS.primary,
        size: 16,
        style: BorderStyle.SINGLE,
        space: 6,
      },
    },
  });
}

function heading2(texto) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
  });
}

function heading3(texto) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
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
        size: opciones.size || 22, // 11pt
        font: 'Calibri',
      }),
    ],
    spacing: { after: opciones.after ?? 120, line: 276 },
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

async function compilarManualMaestro() {
  console.log('Compilando Manual Maestro Unificado de la Plataforma inv-tienda...');

  const body = [];

  // ==========================================
  // PORTADA OFICIAL
  // ==========================================
  body.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 120 },
      children: [
        new TextRun({ text: 'SISTEMA INTEGRAL ERP & ECOMMERCE', bold: true, size: 26, color: COLORS.secondary }),
      ],
    }),
    new Paragraph({
      text: 'MANUAL MAESTRO DE OPERACIÓN Y USUARIO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'PLATAFORMA INV-TIENDA',
          bold: true,
          size: 34,
          color: COLORS.primary,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: 'Documentación Oficial de Procesos, Reglas de Negocio Inquebrantables, Guías Paso a Paso y Evidencia Gráfica de Módulos.',
          italics: true,
          size: 24,
          color: COLORS.textMuted,
        }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 16, color: COLORS.primary },
      },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({ text: 'Versión del Sistema: ', bold: true, size: 22 }),
        new TextRun({ text: 'Release 2026.10 / PostgreSQL Supabase Enterprise\n', size: 22 }),
        new TextRun({ text: 'Cobertura de Módulos: ', bold: true, size: 22 }),
        new TextRun({ text: 'Catálogo, Inventario, Notas CONF, B2B, Cajas, Contenedores, Despachos y Ecommerce\n', size: 22 }),
        new TextRun({ text: 'Ambiente de Validación: ', bold: true, size: 22 }),
        new TextRun({ text: 'Base de Datos Sandbox con Datos Reales y Triggers Activos\n', size: 22 }),
        new TextRun({ text: 'Fecha de Emisión: ', bold: true, size: 22 }),
        new TextRun({ text: 'Noviembre 2026\n', size: 22 }),
      ],
    })
  );

  // ==========================================
  // TABLA DE CONTENIDOS Y MAPA ESTRUCTURAL
  // ==========================================
  body.push(heading1('TABLA DE CONTENIDO Y ESTRUCTURA GENERAL', true));
  body.push(
    parrafo(
      'Este manual consolida todas las especificaciones funcionales y operativas de la plataforma inv-tienda. Ha sido diseñado para ser el instrumento de referencia de administradores, supervisores de almacén, compradores internacionales y operadores web.'
    )
  );

  body.push(
    tabla(
      ['Sección', 'Título del Módulo', 'Alcance y Foco Operativo'],
      [
        ['Capítulo 1', 'Arquitectura y Reglas de Oro Inquebrantables', 'Principios rectores de BD, triggers, seguridad y separación de costos/precios.'],
        ['Capítulo 2', 'Catálogo de Productos y Galería Fotográfica', 'Fichas técnicas, variantes (color/talla), organizador de familias y Supabase Storage.'],
        ['Capítulo 3', 'Inventario, Notas de Movimiento y Kardex', 'Existencias por bodega, semáforos, ciclo PEND/PROC/CONF y trazabilidad.'],
        ['Capítulo 4', 'Cadena de Suministro: B2B, Cajas y Contenedores', 'Órdenes de compra mayoristas, matriz talla/color por bulto y fletes marítimos.'],
        ['Capítulo 5', 'Despachos, Productos Web y Tienda Online', 'Guías de remisión, catálogo comercial público, slugs SEO y carrito de compra.'],
        ['Capítulo 6', 'Matriz de Permisos, Roles y Glosario Maestro', 'Control de acceso granular RBAC y terminología oficial del sistema.'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 200 } }));

  // ==========================================
  // CAPÍTULO 1: REGLAS INQUEBRANTABLES
  // ==========================================
  body.push(heading1('CAPÍTULO 1: ARQUITECTURA Y REGLAS DE ORO INQUEBRANTABLES', true));
  body.push(
    parrafo(
      'La plataforma inv-tienda está construida sobre una base de datos PostgreSQL alojada en Supabase bajo el esquema dedicado "inv-tienda". Para asegurar la máxima integridad de los datos, existen 5 reglas inquebrantables que gobiernan toda la aplicación:'
    )
  );

  body.push(
    alerta(
      'warning',
      'REGLA 1 (Inventario Protegido): Todo movimiento de inventario se procesa EXCLUSIVAMENTE a través de la tabla notas_inventario. Queda estrictamente prohibido alterar directamente o insertar registros manuales en la tabla inventario_stock.'
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    alerta(
      'info',
      'REGLA 2 (Trigger Automático de Confirmación): El trigger PostgreSQL fn_procesar_nota_inventario ejecuta de forma atómica y segura los incrementos o decrementos de stock únicamente cuando la nota pasa a estado CONF (Confirmada).'
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    alerta(
      'tip',
      'REGLA 3 (Nivel de Stock): El inventario se trackea a nivel de producto físico (inventario_stock.producto_id), mientras que las variantes definen los códigos de barras, curvas de tallas y costos promedio.'
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    alerta(
      'warning',
      'REGLA 4 (Separación Precios vs Costos): Los precios al consumidor final viven en productos_web (precio_publico, precio_oferta), completamente aislados de los costos de importación y adquisición que residen en variantes_producto (costo_promedio).'
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));

  body.push(
    alerta(
      'info',
      'REGLA 5 (SEO Fotográfico e Integridad de Medios): Las imágenes del producto se guardan en su resolución original en Supabase Storage. No se generan imágenes sintéticas recortadas, garantizando compatibilidad total con miniaturas en WhatsApp, redes sociales y catálogos PDF.'
    )
  );
  body.push(new Paragraph({ spacing: { after: 200 } }));

  // ==========================================
  // CAPÍTULO 2: CATÁLOGO Y FOTOS
  // ==========================================
  body.push(heading1('CAPÍTULO 2: CATÁLOGO DE PRODUCTOS Y GALERÍA FOTOGRÁFICA', true));
  body.push(
    parrafo(
      'El módulo de Catálogo centraliza la identidad técnica, comercial y visual de todas las prendas comercializadas. Permite administrar el estilo raíz (SKU Base), la matriz de variantes y la clasificación en familias.'
    )
  );

  body.push(heading2('2.1 Vistas del Catálogo: Cuadrícula (Grid) y Tabla'));
  body.push(
    parrafo(
      'Los operadores pueden alternar entre dos modos de visualización según la tarea: el modo Cuadrícula ofrece una inspección visual rápida de las prendas con sus fotos de portada, mientras que el modo Tabla permite realizar auditorías masivas de códigos, marcas y piezas por caja.'
    )
  );
  body.push(...imagenConPie(path.join(capturasCatalogo, '01_catalogo_grid.png'), 'Catálogo en vista Cuadrícula (Grid) con buscador rápido y filtros por género y marca.'));
  body.push(...imagenConPie(path.join(capturasCatalogo, '01_catalogo_tabla.png'), 'Catálogo en vista Tabla densa para análisis de auditoría y ordenamiento multicriterio.'));

  body.push(heading2('2.2 Alta de Nuevos Modelos en Catálogo'));
  body.push(
    parrafo(
      'Mediante el botón "+ Nuevo Producto", se abre el diálogo de captura. Es requisito definir un SKU Base irrepetible (código de diseño), nombre de la prenda, marca, género y la cantidad promedio de piezas por caja para empaque.'
    )
  );
  body.push(...imagenConPie(path.join(capturasCatalogo, '02_modal_nuevo_producto.png'), 'Formulario modal para registro de nuevo producto en el catálogo.'));

  body.push(heading2('2.3 Ficha Técnica, Variantes y Códigos de Barras'));
  body.push(
    parrafo(
      'Al ingresar a la ficha técnica del producto (/catalogo/[id]), se presenta el Hero resumen y las pestañas de gestión. En "Variantes" se configuran los colores y tallas correspondientes, con sus códigos SKU completos para escaneo con lector óptico.'
    )
  );
  body.push(...imagenConPie(path.join(capturasCatalogo, '03_detalle_producto_variantes.png'), 'Ficha técnica del producto con cabecera de datos maestros y tabla de variantes.'));

  body.push(heading2('2.4 Galería Fotográfica y Portada Principal'));
  body.push(
    parrafo(
      'En la pestaña "Imágenes", el usuario puede arrastrar múltiples tomas fotográficas. El sistema las almacena de forma segura en Supabase Storage y optimiza su distribución. Al marcar una imagen con la estrella, se designa como Portada Principal para la web y redes sociales.'
    )
  );
  body.push(...imagenConPie(path.join(capturasCatalogo, '04_galeria_imagenes_producto.png'), 'Pestaña de galería fotográfica con selector de imagen principal.'));

  body.push(heading2('2.5 Organizador de Familias'));
  body.push(
    parrafo(
      'El módulo /catalogo/familias agrupa prendas bajo colecciones y estilos compartidos, facilitando la planificación de temporadas y compras por lote a fábricas.'
    )
  );
  body.push(...imagenConPie(path.join(capturasCatalogo, '05_familias_organizer.png'), 'Organizador de Familias con conteos de modelos y variantes agrupadas.'));

  // ==========================================
  // CAPÍTULO 3: INVENTARIO Y NOTAS
  // ==========================================
  body.push(heading1('CAPÍTULO 3: INVENTARIO, NOTAS DE MOVIMIENTO Y KARDEX', true));
  body.push(
    parrafo(
      'El subsistema de inventario proporciona una gestión rigurosa y auditable de existencias físicas entre múltiples bodegas, garantizando trazabilidad completa en cada movimiento.'
    )
  );

  body.push(heading2('3.1 Consulta de Existencias por Bodega'));
  body.push(
    parrafo(
      'En /inventario/stock se supervisa el nivel de existencias en tiempo real. Los semáforos indican de inmediato el estado del producto: Verde (Stock Óptimo), Amarillo (Stock Bajo) o Rojo (Agotado o crítico).'
    )
  );
  body.push(...imagenConPie(path.join(capturasInventario, '01_stock_por_bodega.png'), 'Consulta de Stock por Bodega con selector de sucursal y semáforos de disponibilidad.'));

  body.push(heading2('3.2 Registro Histórico de Notas de Movimiento'));
  body.push(
    parrafo(
      'En /inventario/notas se listan cronológicamente todas las notas creadas, con filtros avanzados por folio, tipo de movimiento (ENT, SAL, TRF, AJU) y estado del documento.'
    )
  );
  body.push(
    tabla(
      ['Tipo de Nota', 'Código', 'Operación en Almacén', 'Efecto Contable'],
      [
        ['Entrada', 'ENT', 'Recepción de compra o contenedor', '+ Aumenta existencias en bodega destino'],
        ['Salida', 'SAL', 'Venta a cliente o merma operativa', '- Reduce existencias en bodega origen'],
        ['Transferencia', 'TRF', 'Traslado entre sucursales', '↔ Resta en origen y suma en destino'],
        ['Ajuste', 'AJU', 'Conciliación por inventario físico', '⚖ Regulariza faltantes o sobrantes'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 120 } }));
  body.push(...imagenConPie(path.join(capturasInventario, '02_lista_notas_movimiento.png'), 'Bandeja de Notas de Inventario con badges de estado y selector de tipo de movimiento.'));

  body.push(heading2('3.3 Constructor de Nueva Nota (NoteDraftBuilder)'));
  body.push(
    parrafo(
      'Para generar un movimiento, el operador accede a /inventario/notas/nueva. En esta pantalla se selecciona la bodega, el tipo de movimiento y se agregan los artículos especificando número de cajas y piezas sueltas.'
    )
  );
  body.push(...imagenConPie(path.join(capturasInventario, '03_crear_nota_draft.png'), 'Constructor de notas de inventario con captura dinámica de renglones.'));

  body.push(heading2('3.4 Confirmación de Nota y Afectación Inmediata'));
  body.push(
    parrafo(
      'Mientras la nota permanece en estado "Pendiente" (PEND) o "En Proceso" (PROC), las cantidades pueden corregirse libremente. Una vez validada la mercancía física en rampa, el supervisor presiona "Confirmada" (CONF), momento en el cual el trigger actualiza el stock oficial y bloquea la edición del documento.'
    )
  );
  body.push(...imagenConPie(path.join(capturasInventario, '04_detalle_nota_edicion.png'), 'Detalle de la nota con panel de autorización y cambio de estado a CONF.'));

  body.push(heading2('3.5 Trazabilidad Geográfica y Matriz Kardex'));
  body.push(
    parrafo(
      'El módulo /inventario/trazabilidad permite seguir el rastro de lotes específicos: qué bodega originó el despacho, cuándo fue recibido y cuál es la tasa de rotación por plaza comercial.'
    )
  );
  body.push(...imagenConPie(path.join(capturasInventario, '05_trazabilidad_kardex.png'), 'Módulo de Trazabilidad y rotación de mercancía por sucursales y familias.'));

  // ==========================================
  // CAPÍTULO 4: B2B, CAJAS Y CONTENEDORES
  // ==========================================
  body.push(heading1('CAPÍTULO 4: CADENA DE SUMINISTRO: B2B, CAJAS Y CONTENEDORES', true));
  body.push(
    parrafo(
      'Este subsistema administra los procesos de importación y compras mayoristas con proveedores internacionales, controlando cubicajes (CBM), curvas de empaque en cajas y arribos marítimos.'
    )
  );

  body.push(heading2('4.1 Tablero de Órdenes de Compra B2B'));
  body.push(
    parrafo(
      'En /ordenes-b2b se gestionan los pedidos contractuales a fábricas. Cada orden registra moneda de negociación (USD/MXN), proveedor asignado, volumen CBM total y estatus de producción.'
    )
  );
  body.push(...imagenConPie(path.join(capturasB2B, '01_lista_ordenes_b2b.png'), 'Listado de Órdenes B2B con filtros por folio de fabricante y opción de expandir fila.'));

  body.push(heading2('4.2 Emisión y Ficha de Órdenes B2B'));
  body.push(
    parrafo(
      'A través del botón "Nueva Orden", se inicializa el pedido mayorista. En el detalle (/ordenes-b2b/[id]), se especifican los estilos solicitados, precios acordados y fechas compromiso de embarque.'
    )
  );
  body.push(...imagenConPie(path.join(capturasB2B, '02_modal_nueva_orden.png'), 'Modal para creación de nueva orden mayorista B2B.'));
  body.push(...imagenConPie(path.join(capturasB2B, '03_detalle_orden_b2b.png'), 'Ficha técnica de la orden B2B con desglose financiero y operativo.'));

  body.push(heading2('4.3 Matriz de Cajas por Curva Talla × Color'));
  body.push(
    parrafo(
      'En indumentaria, las prendas no se transportan sueltas sino en cajas pre-empacadas con un surtido exacto de tallas y colores. El módulo /ordenes-b2b/cajas permite configurar y auditar estas matrices para agilizar la descarga y almacenamiento.'
    )
  );
  body.push(...imagenConPie(path.join(capturasB2B, '04_matriz_cajas_talla_color.png'), 'Matriz de empaque en cajas con desglose de tallas y colores por bulto master.'));

  body.push(heading2('4.4 Gestión y Seguimiento de Contenedores de Importación'));
  body.push(
    parrafo(
      'En /contenedores se lleva el control del transporte marítimo y aduanal. Cada contenedor registra su número oficial (ej. MSCU, COSU), naviera, puerto de entrada y fecha estimada de arribo (ETA) a almacén central.'
    )
  );
  body.push(...imagenConPie(path.join(capturasB2B, '05_lista_contenedores.png'), 'Tablero de Contenedores de importación con fechas estimadas de llegada (ETA).'));
  body.push(...imagenConPie(path.join(capturasB2B, '06_reporte_anual_contenedores.png'), 'Reporte consolidado anual de importaciones y volumen acumulado.'));

  // ==========================================
  // CAPÍTULO 5: DESPACHOS Y ECOMMERCE
  // ==========================================
  body.push(heading1('CAPÍTULO 5: DESPACHOS, PRODUCTOS WEB Y TIENDA PÚBLICA', true));
  body.push(
    parrafo(
      'El ciclo comercial concluye con la venta y expedición de mercancía. inv-tienda integra tanto la entrega física mediante guías de despacho como la venta digital en la tienda en línea.'
    )
  );

  body.push(heading2('5.1 Preparación y Emisión de Despachos'));
  body.push(
    parrafo(
      'En /despachos se controlan las salidas de bodega hacia clientes finales o puntos de entrega. Cada despacho agrupa los bultos preparados, genera la documentación de transporte y actualiza el estatus de entrega.'
    )
  );
  body.push(...imagenConPie(path.join(capturasEcommerce, '01_lista_despachos.png'), 'Tablero de Despachos con monitoreo de estatus de envío a clientes.'));
  body.push(...imagenConPie(path.join(capturasEcommerce, '02_nuevo_despacho.png'), 'Formulario para captura de nuevo despacho con transportista y dirección.'));

  body.push(heading2('5.2 Publicación de Productos Web y Fijación de Precios'));
  body.push(
    parrafo(
      'En el módulo administrativo /ecommerce/productos-web se configuran los productos que serán visibles en la tienda online. Se asignan precios al público, precios de oferta promocional y slugs optimizados para buscadores (SEO).'
    )
  );
  body.push(...imagenConPie(path.join(capturasEcommerce, '03_admin_productos_web.png'), 'Panel de administración de Productos Web con asignación de precios públicos.'));

  body.push(heading2('5.3 Monitoreo de Órdenes de Venta Web'));
  body.push(
    parrafo(
      'En /ecommerce/ordenes-venta se reciben automáticamente los pedidos completados en la tienda online, permitiendo al equipo de operaciones surtir los artículos de inmediato.'
    )
  );
  body.push(...imagenConPie(path.join(capturasEcommerce, '04_admin_ordenes_venta.png'), 'Listado de Órdenes de Venta generadas desde la tienda pública.'));

  body.push(heading2('5.4 Experiencia en la Tienda Pública (/shop)'));
  body.push(
    parrafo(
      'La tienda pública ofrece un catálogo interactivo con filtrado por categorías, fotografías en alta definición y navegación rápida.'
    )
  );
  body.push(...imagenConPie(path.join(capturasEcommerce, '05_tienda_publica_shop.png'), 'Catálogo online de la tienda pública con galería de productos y precios de venta.'));

  body.push(heading2('5.5 Ficha de Producto y Proceso de Compra'));
  body.push(
    parrafo(
      'En la ficha pública del producto (/shop/[slug]), el comprador selecciona color y talla con verificación automática de stock disponible, y añade prendas al carrito de compra.'
    )
  );
  body.push(...imagenConPie(path.join(capturasEcommerce, '06_tienda_producto_detalle.png'), 'Ficha técnica en tienda pública con selector dinámico de tallas y botón de compra.'));

  // ==========================================
  // CAPÍTULO 6: PERMISOS Y GLOSARIO
  // ==========================================
  body.push(heading1('CAPÍTULO 6: MATRIZ DE PERMISOS, ROLES Y GLOSARIO', true));
  body.push(
    parrafo(
      'Para salvaguardar la seguridad operativa, la plataforma implementa Control de Acceso Basado en Roles (RBAC) con permisos granulares por módulo.'
    )
  );

  body.push(heading2('6.1 Matriz de Acceso por Rol'));
  body.push(
    tabla(
      ['Módulo del Sistema', 'SuperAdmin', 'Administrador', 'Almacén / Logística', 'Ventas / Ecommerce'],
      [
        ['Catálogo de Productos', 'Total (CRUD + Familias)', 'Total (CRUD + Familias)', 'Solo Lectura', 'Lectura + Fotos Web'],
        ['Inventario & Stock', 'Total + Auditoría', 'Total + Auditoría', 'Emisión y Conteo', 'Solo Consulta'],
        ['Confirmar Notas (CONF)', 'Habilitado', 'Habilitado', 'Requiere Validación', 'Denegado'],
        ['Órdenes B2B & Cajas', 'Total', 'Total', 'Recepción en Rampa', 'Consulta de Fechas'],
        ['Contenedores', 'Total', 'Total', 'Registro de Arribo', 'Solo Consulta'],
        ['Despachos', 'Total', 'Total', 'Expedición Física', 'Creación de Guías'],
        ['Productos Web & Precios', 'Total', 'Total', 'Denegado', 'Edición de Precios/SEO'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 180 } }));

  body.push(heading2('6.2 Glosario de Términos Maestros'));
  body.push(
    tabla(
      ['Término', 'Definición Operativa en inv-tienda'],
      [
        ['SKU Base', 'Código alfanumérico que define el estilo y modelo de diseño de la prenda.'],
        ['Variante', 'Subcódigo que combina un SKU Base con una talla y color específico.'],
        ['CBM', 'Metros cúbicos (Cubic Meters), medida internacional para cubicaje en contenedores.'],
        ['Nota CONF', 'Nota de inventario en estado Confirmado que dispara el trigger de stock en BD.'],
        ['Curva de Empaque', 'Cantidad y proporción predeterminada de tallas contenidas en una caja de cartón master.'],
        ['Kardex', 'Registro cronológico inmutable de entradas, salidas y saldos físicos de cada producto.'],
        ['Slug Web', 'Texto amigable para la URL de la tienda que optimiza el posicionamiento orgánico en Google.'],
      ]
    )
  );
  body.push(new Paragraph({ spacing: { after: 200 } }));

  // ==========================================
  // CONFIGURACIÓN DEL DOCUMENTO COMPLETO
  // ==========================================
  const doc = new Document({
    creator: 'Sistema inv-tienda',
    title: 'Manual Maestro de Operación y Usuario - Plataforma inv-tienda',
    description: 'Manual integral oficial de la plataforma inv-tienda con evidencia fotográfica y guías operativas.',
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
                    text: 'inv-tienda | Manual Maestro de Operaciones y Usuario',
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
  console.log(`¡Manual Maestro compilado con éxito en: ${outputDocx} (${buffer.length} bytes)!`);
}

compilarManualMaestro().catch((err) => {
  console.error('Error al compilar Manual Maestro:', err);
  process.exit(1);
});

