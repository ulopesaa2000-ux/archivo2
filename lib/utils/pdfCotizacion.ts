// lib/utils/pdfCotizacion.ts
import jsPDF from 'jspdf'
import { getRegionOrden } from '@/modules/ecommerce/utils'
import type { OrdenVentaDetalle } from '@/modules/ecommerce/types'

function mxn(valor: number | null | undefined): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(valor ?? 0)
}

function trimNum(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(2)))
}

function precioCaja(precioUnitario: number | null | undefined, factor: number): number {
  return (precioUnitario ?? 0) * factor
}

/**
 * Hoja resumen de la cotización en PDF (una o más páginas carta).
 * Datos visibles: folio, cliente, contacto, región, estado, partidas y total.
 */
export function generarPdfCotizacion(orden: OrdenVentaDetalle): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const maxY = pageHeight - 15
  let y = 18

  const nuevaPaginaSiFalta = (alto: number) => {
    if (y + alto > maxY) {
      doc.addPage()
      y = 18
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Cotización IDOL NAVY', margin, y)
  y += 7
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Folio: ${orden.numero_orden}   ·   Estado: ${orden.estado.toUpperCase()}`, margin, y)
  y += 8

  doc.setFontSize(10)
  const lineas = [
    `Cliente: ${orden.nombre_cliente || '—'}`,
    `Email: ${orden.email_cliente || '—'}   ·   Tel: ${orden.telefono_cliente || '—'}`,
    `Región de atención: ${getRegionOrden(orden)}`,
    `Fecha: ${orden.fecha_orden ? new Date(orden.fecha_orden).toLocaleDateString('es-MX') : '—'}`,
  ]
  for (const linea of lineas) {
    doc.text(linea, margin, y)
    y += 5.5
  }
  y += 2

  doc.setFont('helvetica', 'bold')
  doc.text('Partidas', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  orden.items.forEach((item, index) => {
    const nombre = `${index + 1}. ${item.producto_nombre || 'Producto'}${item.talla ? ` · Talla ${item.talla}` : ''}${item.color ? ` · ${item.color}` : ''}`
    const factor = item.pz_por_caja && item.pz_por_caja > 0 ? item.pz_por_caja : null
    const detalle = factor
      ? `   ${item.sku_completo || ''}  ·  ${trimNum(item.cantidad / factor)} cajas x ${factor} pz  ·  ${mxn(item.precio_unitario)}/pz  =  ${mxn(precioCaja(item.precio_unitario, factor))}/caja  =  ${mxn(item.subtotal)}`
      : `   ${item.sku_completo || ''}  ·  ${item.cantidad} pz × ${mxn(item.precio_unitario)}  =  ${mxn(item.subtotal)}`
    nuevaPaginaSiFalta(12)
    doc.text(nombre.slice(0, 110), margin, y)
    y += 4.5
    const detalleLineas = doc.splitTextToSize(detalle, pageWidth - margin * 2)
    for (const linea of detalleLineas as string[]) {
      nuevaPaginaSiFalta(5)
      doc.text(linea, margin, y)
      y += 4.5
    }
    y += 1.5
  })

  nuevaPaginaSiFalta(20)
  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOTAL: ${mxn(orden.total)}`, margin, y)

  if (orden.notas_cliente) {
    y += 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Notas:', margin, y)
    y += 5
    const notas = doc.splitTextToSize(orden.notas_cliente, pageWidth - margin * 2)
    for (const linea of notas as string[]) {
      nuevaPaginaSiFalta(5)
      doc.text(linea, margin, y)
      y += 5
    }
  }

  doc.save(`${orden.numero_orden || 'cotizacion'}.pdf`)
}
