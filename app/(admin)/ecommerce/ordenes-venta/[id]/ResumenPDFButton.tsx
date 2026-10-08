// app/(admin)/ecommerce/ordenes-venta/[id]/ResumenPDFButton.tsx
'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generarPdfCotizacion } from '@/lib/utils/pdfCotizacion'
import type { OrdenVentaDetalle } from '@/modules/ecommerce/types'

export function ResumenPDFButton({ orden }: { orden: OrdenVentaDetalle }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = () => {
    setIsGenerating(true)
    try {
      generarPdfCotizacion(orden)
      toast.success('Hoja resumen descargada')
    } catch (err) {
      console.error('Error generando PDF:', err)
      toast.error('No se pudo generar el PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
      <FileDown className="h-4 w-4 mr-2" />
      {isGenerating ? 'Generando...' : 'Descargar hoja resumen (PDF)'}
    </Button>
  )
}
