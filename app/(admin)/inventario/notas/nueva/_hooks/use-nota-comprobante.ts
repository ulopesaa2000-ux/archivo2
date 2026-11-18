// app/(admin)/inventario/notas/nueva/_hooks/use-nota-comprobante.ts
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function useNotaComprobante(initialUrl?: string | null) {
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(initialUrl ?? null)
  const [isDraggingComprobante, setIsDraggingComprobante] = useState(false)

  const processComprobanteFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (.jpg, .png, .webp).')
      return
    }
    setComprobanteFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setComprobantePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processComprobanteFile(file)
  }

  const handlePasteComprobanteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        toast.info('Presiona Ctrl + V para pegar la imagen del portapapeles.')
        return
      }
      const items = await navigator.clipboard.read()
      let found = false
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const ext = imageType.split('/')[1] || 'jpg'
          const file = new File([blob], `comprobante_${Date.now()}.${ext}`, { type: imageType })
          processComprobanteFile(file)
          toast.success('¡Comprobante pegado desde el portapapeles!')
          found = true
          break
        }
      }
      if (!found) {
        toast.error('No se encontró ninguna imagen en el portapapeles.')
      }
    } catch (err) {
      console.error(err)
      toast.info('No se pudo leer el portapapeles directamente. Presiona Ctrl + V.')
    }
  }

  const handleComprobanteDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingComprobante(true)
  }

  const handleComprobanteDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingComprobante(false)
  }

  const handleComprobanteDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingComprobante(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      processComprobanteFile(droppedFiles[0])
      toast.success('¡Comprobante cargado correctamente!')
    }
  }

  const handleClearFile = () => {
    setComprobanteFile(null)
    setComprobantePreview(null)
    setIsDraggingComprobante(false)
  }

  return {
    comprobanteFile,
    comprobantePreview,
    isDraggingComprobante,
    handleFileChange,
    handlePasteComprobanteFromClipboard,
    handleComprobanteDragOver,
    handleComprobanteDragLeave,
    handleComprobanteDrop,
    handleClearFile,
  }
}
