// lib/utils/pdfCatalogGenerator.ts
'use client'

import jsPDF from 'jspdf'
import type { ProductoPdfCatalog } from '@/modules/ecommerce/pdf-catalog-actions'

export interface OpcionesGeneracionPdf {
  tituloCatalogo: string
  subtitulo?: string
  layout: '3x3' | '4x3' | '3x2'
  mostrarPrecios: boolean
  mostrarStock: boolean
  mostrarMarca: boolean
  agruparPorCategoria?: boolean
  onProgress?: (progreso: number, texto: string) => void
}

interface ColorTheme {
  primary: [number, number, number]
  accent: [number, number, number]
  light: [number, number, number]
  border: [number, number, number]
  text: [number, number, number]
  label: string
}

const THEMES: Record<string, ColorTheme> = {
  dama: {
    primary: [157, 23, 77], // Rose / Frambuesa (#9D174D)
    accent: [190, 24, 93], // Rose 600
    light: [253, 242, 248], // Rose 50
    border: [251, 207, 232], // Rose 200
    text: [131, 24, 67],
    label: 'DAMA',
  },
  caballero: {
    primary: [30, 58, 138], // Azul Marino (#1E3A8A)
    accent: [37, 99, 235], // Blue 600
    light: [239, 246, 255], // Blue 50
    border: [191, 219, 254], // Blue 200
    text: [30, 58, 138],
    label: 'CABALLERO',
  },
  infantil: {
    primary: [4, 120, 87], // Verde Tierno / Esmeralda (#047857)
    accent: [5, 150, 105], // Emerald 600
    light: [236, 253, 245], // Emerald 50
    border: [167, 243, 208], // Emerald 200
    text: [6, 95, 70],
    label: 'INFANTIL',
  },
  general: {
    primary: [15, 23, 42], // Slate 900
    accent: [79, 70, 229], // Indigo 600
    light: [248, 250, 252], // Slate 50
    border: [226, 232, 240], // Slate 200
    text: [15, 23, 42],
    label: 'GENERAL',
  },
}

function getThemeForGenero(genero: string): ColorTheme {
  const g = (genero || '').toLowerCase()
  if (g.includes('dama') || g.includes('mujer')) return THEMES.dama
  if (g.includes('caballero') || g.includes('hombre')) return THEMES.caballero
  if (g.includes('niñ') || g.includes('infantil') || g.includes('nino') || g.includes('nina')) return THEMES.infantil
  return THEMES.general
}

function getThemeForProduct(prod: ProductoPdfCatalog): ColorTheme {
  return getThemeForGenero(prod.genero)
}

function getDominantTheme(productos: ProductoPdfCatalog[]): ColorTheme {
  if (!productos || productos.length === 0) return THEMES.general
  const counts: Record<string, number> = { dama: 0, caballero: 0, infantil: 0, general: 0 }
  for (const p of productos) {
    const t = getThemeForProduct(p)
    if (t === THEMES.dama) counts.dama++
    else if (t === THEMES.caballero) counts.caballero++
    else if (t === THEMES.infantil) counts.infantil++
    else counts.general++
  }

  if (counts.dama >= counts.caballero && counts.dama >= counts.infantil) return THEMES.dama
  if (counts.caballero >= counts.dama && counts.caballero >= counts.infantil) return THEMES.caballero
  if (counts.infantil >= counts.dama && counts.infantil >= counts.caballero) return THEMES.infantil
  return THEMES.general
}

interface LoadedImageInfo {
  base64: string
  width: number
  height: number
  aspectRatio: number
}

/**
 * Carga una imagen remota y la optimiza al DPI ideal para visualización fluida sin lag en PDF viewers
 */
async function cargarImagenOriginal(url: string): Promise<LoadedImageInfo | null> {
  try {
    return await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 480
          const h = img.naturalHeight || img.height || 640

          // Resolución óptima (180-200 DPI para visualización retina y móvil instantánea sin lag de renderizado)
          const maxW = 500
          let targetW = w
          let targetH = h

          if (w > maxW) {
            targetW = maxW
            targetH = Math.round(maxW * (h / w))
          }

          const canvas = document.createElement('canvas')
          canvas.width = targetW
          canvas.height = targetH

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, targetW, targetH)

          // Calidad 0.80: visualmente perfecta, decodificación ultrarrápida en GPU y scroll 100% fluido
          const base64 = canvas.toDataURL('image/jpeg', 0.80)
          resolve({
            base64,
            width: targetW,
            height: targetH,
            aspectRatio: targetW / targetH,
          })
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  } catch (err) {
    console.warn('Error cargando imagen para PDF:', url, err)
    return null
  }
}

interface GrupoSeccion {
  titulo: string
  genero: string
  tipoPrenda: string
  productos: { producto: ProductoPdfCatalog; imgInfo: LoadedImageInfo | null }[]
}

/**
 * Agrupa productos por género y tipo de prenda en orden lógico
 */
function agruparProductosPorSeccion(
  items: { producto: ProductoPdfCatalog; imgInfo: LoadedImageInfo | null }[]
): GrupoSeccion[] {
  const gruposMap = new Map<string, GrupoSeccion>()

  // Orden previo de items
  const genOrder: Record<string, number> = { Dama: 1, Mujer: 1, Caballero: 2, Hombre: 2, Niño: 3, Niña: 3, Infantil: 3, Unisex: 4 }

  const sortedItems = [...items].sort((a, b) => {
    const gA = genOrder[a.producto.genero] || 9
    const gB = genOrder[b.producto.genero] || 9
    if (gA !== gB) return gA - gB

    const tComp = (a.producto.tipo_prenda || '').localeCompare(b.producto.tipo_prenda || '')
    if (tComp !== 0) return tComp

    return b.producto.id - a.producto.id
  })

  for (const item of sortedItems) {
    const tipo = (item.producto.tipo_prenda || 'VARIOS').toUpperCase()
    const genero = (item.producto.genero || 'GENERAL').toUpperCase()
    const titulo = `${tipo} ${genero}`
    const key = `${genero}__${tipo}`

    if (!gruposMap.has(key)) {
      gruposMap.set(key, {
        titulo,
        genero: item.producto.genero,
        tipoPrenda: item.producto.tipo_prenda || '',
        productos: [],
      })
    }

    gruposMap.get(key)!.productos.push(item)
  }

  return Array.from(gruposMap.values())
}

/**
 * Genera y descarga el catálogo PDF profesional con separación por títulos grandes subrayados
 */
export async function generarCatalogoPdf(
  productosEntrada: ProductoPdfCatalog[],
  opciones: OpcionesGeneracionPdf
): Promise<void> {
  const {
    tituloCatalogo = 'Catálogo de Productos',
    subtitulo = '',
    layout = '3x2', // Por defecto 6 productos por página como pidió el usuario
    mostrarPrecios = true,
    mostrarStock = true,
    onProgress,
  } = opciones

  if (!productosEntrada || productosEntrada.length === 0) {
    throw new Error('No hay productos seleccionados para el catálogo.')
  }

  onProgress?.(5, 'Iniciando carga optimizada de imágenes...')

  // Precarga paralela en bloques de 5 para máxima velocidad
  const itemsConImagen: { producto: ProductoPdfCatalog; imgInfo: LoadedImageInfo | null }[] = new Array(productosEntrada.length)
  const batchSize = 5
  let completados = 0

  for (let i = 0; i < productosEntrada.length; i += batchSize) {
    const batch = productosEntrada.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (prod, bIdx) => {
        const globalIdx = i + bIdx
        if (prod.imagen_url) {
          const imgInfo = await cargarImagenOriginal(prod.imagen_url)
          itemsConImagen[globalIdx] = { producto: prod, imgInfo }
        } else {
          itemsConImagen[globalIdx] = { producto: prod, imgInfo: null }
        }
        completados++
        const pct = 5 + Math.floor((completados / productosEntrada.length) * 65)
        onProgress?.(pct, `Optimizando imagen ${completados} de ${productosEntrada.length}...`)
      })
    )
  }

  onProgress?.(75, 'Organizando secciones y títulos...')

  const secciones = agruparProductosPorSeccion(itemsConImagen)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true, // Compresión de flujos internos de PDF para navegación ultrarrápida
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 215.9 mm
  const pageHeight = doc.internal.pageSize.getHeight() // 279.4 mm

  const marginX = 8.5
  const marginTop = 17.5
  const marginBottom = 8.5
  const usableWidth = pageWidth - marginX * 2
  const maxPageY = pageHeight - marginBottom

  // Columnas fijas a 3 (o 4 si layout es 4x3)
  const cols = layout === '4x3' ? 4 : 3
  const gapX = 3.5
  const gapY = 3.5
  const cellWidth = (usableWidth - gapX * (cols - 1)) / cols

  // Altura de tarjeta: para que quepan 6 por página (2 filas) con holgura para títulos
  const cellHeight = layout === '3x3' ? 76.0 : (layout === '4x3' ? 76.0 : 104.0)
  const textSpace = layout === '3x2' ? 16.0 : 13.5
  const imgBoxHeight = cellHeight - textSpace
  const imgBoxWidth = cellWidth

  const titleHeight = 9.5 // Alto reservado para el título grande subrayado

  const dominantTheme = getDominantTheme(productosEntrada)

  let currentPage = 1

  const drawHeader = (pageNumber: number, theme: ColorTheme) => {
    // Franja Superior con el Color de la Línea
    doc.setFillColor(...theme.primary)
    doc.rect(0, 0, pageWidth, 13.0, 'F')

    // Franja decorativa delgada
    doc.setFillColor(...theme.accent)
    doc.rect(0, 13.0, pageWidth, 0.8, 'F')

    // Título Principal IDOL NAVY
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('IDOL NAVY', marginX, 6.0)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.0)
    doc.setTextColor(255, 255, 255)
    doc.text(`|  ${tituloCatalogo}`, marginX + 21, 6.0)

    // Subtítulo / Fecha
    doc.setFontSize(6.5)
    doc.setTextColor(241, 245, 249)
    const fechaStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    const subTexto = [subtitulo || 'Colección Mayorista & Ecommerce', fechaStr].filter(Boolean).join('  |  ')
    doc.text(subTexto, marginX, 10.2)

    // Paginación a la derecha (placeholder)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(255, 255, 255)
    const pageStr = `Pág. ${pageNumber}`
    doc.text(pageStr, pageWidth - marginX - doc.getTextWidth(pageStr), 8.2)
  }

  const drawFooter = (theme: ColorTheme) => {
    doc.setDrawColor(...theme.border)
    doc.setLineWidth(0.3)
    doc.line(marginX, pageHeight - 6.5, pageWidth - marginX, pageHeight - 6.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.0)
    doc.setTextColor(100, 116, 139)
    doc.text('IDOL NAVY  •  Catálogo Oficial  •  Precios y existencias sujetos a confirmación de pedido', marginX, pageHeight - 3.2)

    const waText = 'WhatsApp Ventas: 248 125 1671 / 248 132 8934'
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...theme.primary)
    doc.text(waText, pageWidth - marginX - doc.getTextWidth(waText), pageHeight - 3.2)
  }

  // Iniciar primera página
  let currentY = marginTop
  let currentTheme = dominantTheme
  drawHeader(currentPage, currentTheme)
  drawFooter(currentTheme)

  onProgress?.(85, 'Dibujando secciones y tarjetas...')

  for (let sIdx = 0; sIdx < secciones.length; sIdx++) {
    const seccion = secciones[sIdx]
    const theme = getThemeForGenero(seccion.genero)

    // Verificar si el título + al menos 1 fila de productos cabe en la página actual
    const espacioNecesario = titleHeight + cellHeight
    if (currentY + espacioNecesario > maxPageY) {
      doc.addPage('letter', 'portrait')
      currentPage++
      currentTheme = theme
      drawHeader(currentPage, currentTheme)
      drawFooter(currentTheme)
      currentY = marginTop
    }

    // ─────────────────────────────────────────────────────────────
    // DIBUJAR TÍTULO GRANDE DE SECCIÓN (Mayúscula, Negrita y Subrayado)
    // ─────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(...theme.primary)

    const titleText = seccion.titulo.toUpperCase()
    const titleTextWidth = doc.getTextWidth(titleText)
    const titleY = currentY + 5.5

    doc.text(titleText, marginX, titleY)

    // Línea de subrayado elegante bajo el título
    doc.setDrawColor(...theme.primary)
    doc.setLineWidth(0.6)
    doc.line(marginX, titleY + 1.5, marginX + titleTextWidth + 1.0, titleY + 1.5)

    // Línea sutil de guía que se extiende a la derecha
    doc.setDrawColor(...theme.border)
    doc.setLineWidth(0.25)
    doc.line(marginX + titleTextWidth + 3.0, titleY + 1.5, pageWidth - marginX, titleY + 1.5)

    currentY += titleHeight

    // ─────────────────────────────────────────────────────────────
    // DIBUJAR PRODUCTOS DE LA SECCIÓN EN FILAS
    // ─────────────────────────────────────────────────────────────
    const prods = seccion.productos
    for (let pIdx = 0; pIdx < prods.length; pIdx += cols) {
      // Verificar si cabe esta fila en la página
      if (currentY + cellHeight > maxPageY) {
        doc.addPage('letter', 'portrait')
        currentPage++
        currentTheme = theme
        drawHeader(currentPage, currentTheme)
        drawFooter(currentTheme)
        currentY = marginTop
      }

      // Dibujar los productos de la fila (1 a `cols`)
      const fila = prods.slice(pIdx, pIdx + cols)
      for (let colIdx = 0; colIdx < fila.length; colIdx++) {
        const item = fila[colIdx]
        const prod = item.producto
        const imgInfo = item.imgInfo

        const x = marginX + colIdx * (cellWidth + gapX)
        const y = currentY

        // 1. CONTENEDOR DE IMAGEN (Aspect 3:4 con contain, sin recortes)
        doc.setFillColor(...theme.light)
        doc.setDrawColor(...theme.border)
        doc.setLineWidth(0.35)
        doc.roundedRect(x, y, imgBoxWidth, imgBoxHeight, 1.8, 1.8, 'FD')

        if (imgInfo && imgInfo.base64) {
          const boxRatio = imgBoxWidth / imgBoxHeight
          const imgRatio = imgInfo.aspectRatio

          let renderW = imgBoxWidth - 1.0
          let renderH = imgBoxHeight - 1.0

          if (imgRatio > boxRatio) {
            renderH = renderW / imgRatio
          } else {
            renderW = renderH * imgRatio
          }

          const offsetX = x + (imgBoxWidth - renderW) / 2
          const offsetY = y + (imgBoxHeight - renderH) / 2

          try {
            doc.addImage(imgInfo.base64, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST')
          } catch {
            doc.setTextColor(148, 163, 184)
            doc.setFontSize(6.5)
            doc.text('Foto no disponible', x + imgBoxWidth / 2 - 10, y + imgBoxHeight / 2)
          }
        } else {
          doc.setTextColor(148, 163, 184)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(6.5)
          doc.text('Sin Fotografía', x + imgBoxWidth / 2 - 8, y + imgBoxHeight / 2)
        }

        // 2. BLOQUE DE TEXTO ORGANIZADO Y COMPACTO
        const textPadX = x + 0.5
        const textW = cellWidth - 1.0

        // Fila A: Marca a la izquierda, Precio a la derecha
        const row1Y = y + imgBoxHeight + 2.8
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(cols === 4 ? 5.2 : 5.8)
        doc.setTextColor(100, 116, 139)
        const marcaStr = (prod.marca || 'IDOL NAVY').toUpperCase()
        doc.text(marcaStr, textPadX, row1Y)

        if (mostrarPrecios && prod.precio_publico) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(cols === 4 ? 5.8 : 6.6)
          doc.setTextColor(185, 28, 28)
          const precioStr = `$${Number(prod.precio_publico).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          const precioW = doc.getTextWidth(precioStr)
          doc.text(precioStr, x + cellWidth - precioW - 0.5, row1Y)
        }

        // Fila B: Nombre / Descripción del Producto
        const row2Y = row1Y + 3.0
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(cols === 4 ? 5.6 : 6.3)
        doc.setTextColor(15, 23, 42)

        const textoTitulo = (prod.descripcion && prod.descripcion.trim() !== prod.sku.trim())
          ? prod.descripcion.trim()
          : (prod.nombre || prod.sku)

        const lineas = doc.splitTextToSize(textoTitulo, textW)
        const maxLines = cols === 4 ? 2 : (layout === '3x2' ? 3 : 2)
        const lineasAMostrar = lineas.slice(0, maxLines)

        let currentTextY = row2Y
        for (const linea of lineasAMostrar) {
          doc.text(linea, textPadX, currentTextY)
          currentTextY += (cols === 4 ? 2.4 : 2.7)
        }

        // Fila C: SKU pegado abajo de la descripción + Stock
        const row3Y = currentTextY + 0.6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(cols === 4 ? 5.4 : 6.2)
        doc.setTextColor(71, 85, 105)
        doc.text(prod.sku, textPadX, row3Y)

        if (mostrarStock && prod.cajas_stock > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(cols === 4 ? 5.2 : 5.8)
          doc.setTextColor(4, 120, 87)
          const stockStr = `Stock: ${prod.cajas_stock} cjs`
          const stockW = doc.getTextWidth(stockStr)
          doc.text(stockStr, x + cellWidth - stockW - 0.5, row3Y)
        }
      }

      currentY += cellHeight + gapY
    }

    // Pequeño espacio separador entre secciones si no termina en salto de página
    currentY += 2.0
  }

  // Actualizar paginación exacta en todas las páginas generadas
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(255, 255, 255)
    const pStr = `Pág. ${p} de ${totalPages}`
    const pW = doc.getTextWidth(pStr)
    doc.text(pStr, pageWidth - marginX - pW, 8.2)
  }

  const cleanTitle = tituloCatalogo
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  const fileName = `${cleanTitle || 'Catalogo_IDOL_NAVY'}.pdf`

  doc.save(fileName)
  onProgress?.(100, '¡Catálogo descargado con éxito!')
}
