// hooks/useOcrBatchQueue.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export type OcrQueueItem = {
  id: string
  file: File
  previewUrl: string
  tipoHint: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  errorMsg?: string
  resultNotaId?: number
  resultPropuestaId?: string
  createdAt: number
}

interface OcrQueueContextType {
  items: OcrQueueItem[]
  addFilesToQueue: (files: File[], tipoHint?: string) => void
  addBatchToQueue: (batch: { file: File; tipoHint: string }[]) => void
  clearCompleted: () => void
  removeItem: (id: string) => void
  retryItem: (id: string) => void
  isProcessing: boolean
  stats: {
    total: number
    pending: number
    uploading: number
    done: number
    error: number
  }
}

const OcrQueueContext = createContext<OcrQueueContextType | null>(null)

const MAX_CONCURRENT_UPLOADS = 2

export function OcrBatchQueueProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [items, setItems] = useState<OcrQueueItem[]>([])

  const addFilesToQueue = useCallback((files: File[], tipoHint: string = 'entrada') => {
    if (files.length === 0) return

    const newItems: OcrQueueItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      tipoHint,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    }))

    setItems((prev) => [...prev, ...newItems])
    toast.info(`Se agregaron ${files.length} ${files.length === 1 ? 'nota' : 'notas'} a la cola de procesamiento IA.`)
  }, [])

  const addBatchToQueue = useCallback((batch: { file: File; tipoHint: string }[]) => {
    if (batch.length === 0) return

    const newItems: OcrQueueItem[] = batch.map((item) => ({
      id: crypto.randomUUID(),
      file: item.file,
      previewUrl: URL.createObjectURL(item.file),
      tipoHint: item.tipoHint || 'entrada',
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    }))

    setItems((prev) => [...prev, ...newItems])
    toast.info(`Se agregaron ${batch.length} ${batch.length === 1 ? 'nota' : 'notas'} a la cola de procesamiento IA.`)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => {
        if (i.status === 'done' && i.previewUrl) {
          URL.revokeObjectURL(i.previewUrl)
        }
      })
      return prev.filter((i) => i.status !== 'done')
    })
  }, [])

  const retryItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'pending', errorMsg: undefined, progress: 0 } : i))
    )
  }, [])

  // ── Worker de procesamiento en segundo plano ─────────────
  useEffect(() => {
    const activeUploading = items.filter((i) => i.status === 'uploading').length
    const pendingItems = items.filter((i) => i.status === 'pending')

    if (activeUploading >= MAX_CONCURRENT_UPLOADS || pendingItems.length === 0) {
      return
    }

    const itemToProcess = pendingItems[0]
    const itemId = itemToProcess.id

    // Marcar como subiendo
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: 'uploading', progress: 10 } : i))
    )

    // Iniciar llamada asíncrona
    const processItem = async () => {
      try {
        const formData = new FormData()
        formData.append('foto', itemToProcess.file)
        formData.append('tipo_hint', itemToProcess.tipoHint)
        formData.append('client_request_id', itemId)

        const res = await fetch('/api/inventario/notas/ocr', {
          method: 'POST',
          body: formData,
        })

        const result = await res.json()

        if (!res.ok || !result.ok) {
          throw new Error(result.error || 'Fallo el procesamiento OCR en el servidor.')
        }

        const notaId = result.data?.nota_id
        const propuestaId = result.data?.propuesta_id

        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: 'done',
                  progress: 100,
                  resultNotaId: notaId,
                  resultPropuestaId: propuestaId,
                }
              : i
          )
        )
      } catch (err) {
        console.error('Error procesando nota en cola OCR:', err)
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: 'error',
                  progress: 0,
                  errorMsg: err instanceof Error ? err.message : 'Error al procesar la imagen.',
                }
              : i
          )
        )
      }
    }

    processItem()
  }, [items])

  // Notificación al completar un lote de subidas
  useEffect(() => {
    if (items.length === 0) return
    const hasUploading = items.some((i) => i.status === 'uploading' || i.status === 'pending')
    const completedCount = items.filter((i) => i.status === 'done').length

    if (!hasUploading && completedCount > 0) {
      toast.success(`🎉 Lote finalizado: ${completedCount} ${completedCount === 1 ? 'nota escaneada' : 'notas escaneadas'} con IA.`, {
        action: {
          label: 'Ver notas',
          onClick: () => router.push('/inventario/notas'),
        },
      })
      router.refresh()
    }
  }, [items, router])

  const stats = useMemo(() => {
    const total = items.length
    const pending = items.filter((i) => i.status === 'pending').length
    const uploading = items.filter((i) => i.status === 'uploading').length
    const done = items.filter((i) => i.status === 'done').length
    const error = items.filter((i) => i.status === 'error').length

    return { total, pending, uploading, done, error }
  }, [items])

  const isProcessing = stats.pending > 0 || stats.uploading > 0

  return (
    <OcrQueueContext.Provider
      value={{
        items,
        addFilesToQueue,
        addBatchToQueue,
        clearCompleted,
        removeItem,
        retryItem,
        isProcessing,
        stats,
      }}
    >
      {children}
    </OcrQueueContext.Provider>
  )
}

export function useOcrBatchQueue() {
  const context = useContext(OcrQueueContext)
  if (!context) {
    throw new Error('useOcrBatchQueue debe usarse dentro de un OcrBatchQueueProvider')
  }
  return context
}
