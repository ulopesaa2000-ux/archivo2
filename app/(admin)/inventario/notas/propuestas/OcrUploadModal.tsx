// app/(admin)/inventario/notas/propuestas/OcrUploadModal.tsx
'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Camera, Upload, Sparkles, Loader2, X, ClipboardPaste, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Scale, RotateCcw, Package } from 'lucide-react'
import { TIPO_MOVIMIENTO_COLORS } from '@/lib/constants'

const TIPO_MOV_ICONS: Record<string, any> = {
  ENT: ArrowDownLeft,
  SAL: ArrowUpRight,
  TRF: ArrowLeftRight,
  AJU: Scale,
  DEV: RotateCcw,
}

const CODIGO_TO_HINT: Record<string, string> = {
  ENT: 'entrada',
  SAL: 'salida',
  TRF: 'traslado',
  AJU: 'ajuste',
  DEV: 'devolucion',
}

const HINT_TO_CODIGO: Record<string, string> = {
  entrada: 'ENT',
  salida: 'SAL',
  traslado: 'TRF',
  traspaso: 'TRF',
  ajuste: 'AJU',
  devolucion: 'DEV',
}

export function OcrUploadModal({
  trigger,
  redirectToNueva = false,
  defaultTipo = 'entrada',
  defaultTipoCodigo,
  tiposMovimiento,
}: {
  trigger?: React.ReactNode
  redirectToNueva?: boolean
  defaultTipo?: string
  defaultTipoCodigo?: string
  tiposMovimiento?: { id: number; codigo: string; nombre: string }[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const initialCode = defaultTipoCodigo || HINT_TO_CODIGO[defaultTipo] || 'ENT'
  const [selectedCodigo, setSelectedCodigo] = useState<string>(initialCode)
  const [tipo, setTipo] = useState<string>(defaultTipo || CODIGO_TO_HINT[initialCode] || 'entrada')
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const code = defaultTipoCodigo || HINT_TO_CODIGO[defaultTipo] || 'ENT'
      setSelectedCodigo(code)
      setTipo(CODIGO_TO_HINT[code] || 'entrada')
    }
  }, [isOpen, defaultTipo, defaultTipoCodigo])

  const tiposDisponibles = tiposMovimiento && tiposMovimiento.length > 0
    ? tiposMovimiento
    : [
        { id: 1, codigo: 'ENT', nombre: 'Entrada' },
        { id: 2, codigo: 'SAL', nombre: 'Salida' },
        { id: 3, codigo: 'TRF', nombre: 'Transferencia' },
      ]

  // Helper para procesar y cargar archivo de imagen
  const processImageFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (.jpg, .png, .webp).')
      return
    }
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processImageFile(selectedFile)
    }
  }

  // Pegar desde Portapapeles (Click en Botón)
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        toast.info('Presiona Ctrl + V para pegar la imagen del portapapeles.')
        return
      }
      const items = await navigator.clipboard.read()
      let imageFound = false

      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const ext = imageType.split('/')[1] || 'jpg'
          const pastedFile = new File([blob], `nota_portapapeles_${Date.now()}.${ext}`, { type: imageType })
          processImageFile(pastedFile)
          toast.success('¡Imagen pegada desde el portapapeles!')
          imageFound = true
          break
        }
      }

      if (!imageFound) {
        toast.error('No se encontró ninguna imagen en el portapapeles. Copia una imagen o captura y vuelve a intentar.')
      }
    } catch (err) {
      console.error('Error leyendo portapapeles:', err)
      toast.info('No se pudo acceder al portapapeles directamente. Presiona Ctrl + V en tu teclado para pegarla.')
    }
  }

  // Listener global de pegar (Ctrl + V) cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return

    const handleWindowPaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items
      if (!clipboardItems) return

      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.startsWith('image/')) {
          const blob = clipboardItems[i].getAsFile()
          if (blob) {
            e.preventDefault()
            processImageFile(blob)
            toast.success('¡Imagen pegada desde el portapapeles (Ctrl + V)!')
            break
          }
        }
      }
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [isOpen, processImageFile])

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isPending) setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
    if (isPending) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      processImageFile(droppedFile)
      toast.success('¡Imagen soltada correctamente!')
    }
  }

  const clearSelection = () => {
    setFile(null)
    setPreview(null)
    setIsDraggingOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSubmit = () => {
    if (!file) {
      toast.error('Por favor, captura, pega o selecciona una foto de la nota.')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('foto', file)
      formData.append('tipo_hint', tipo)
      formData.append('client_request_id', crypto.randomUUID())

      try {
        const response = await fetch('/api/inventario/notas/ocr', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Error al procesar la propuesta con OCR.')
        }

        setIsOpen(false)
        clearSelection()
        
        if (redirectToNueva) {
          const notaId = result.data?.nota_id;
          const propuestaId = result.data?.propuesta_id;
          if (notaId) {
            toast.success('¡Nota creada y procesada por la IA exitosamente!');
            router.push(`/inventario/notas/${notaId}`);
          } else if (propuestaId) {
            toast.warning('Propuesta creada. Faltan datos de bodega; redirigiendo para completar.');
            router.push(`/inventario/notas/nueva?propuesta_id=${propuestaId}`);
          } else {
            toast.success('Procesada con éxito.');
            router.push('/inventario/notas/propuestas');
          }
        } else {
          toast.success('Nota enviada al OCR exitosamente. Procesando en segundo plano...');
          router.push('/inventario/notas/propuestas');
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : 'Error al conectar con el servidor.')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isPending) {
        setIsOpen(open)
        if (!open) clearSelection()
      }
    }}>
      <DialogTrigger
        render={
          trigger ? (
            trigger as any
          ) : (
            <Button className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-black uppercase tracking-wider shadow-lg shadow-orange-500/25 border-0 hover:scale-102 transition-all rounded-xl h-10 px-4" />
          )
        }
      >
        {!trigger && (
          <>
            <Sparkles className="mr-2 h-4 w-4 text-white animate-pulse" />
            Escanear OCR
          </>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-xl max-w-full w-full h-full sm:h-auto overflow-y-auto bg-gradient-to-br from-card to-background border shadow-2xl rounded-none sm:rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            Escanear Nota Física (OCR)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sube, arrastra, toma una foto o presiona <strong className="text-foreground">Ctrl + V</strong> para pegar tu nota física. La IA extraerá los productos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 relative">
          {/* Campo Oculto para subida de archivo */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isPending}
          />
          {/* Campo Oculto optimizado para Cámara Móvil */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isPending}
          />

          {/* Selector de tipo estimado con botones idénticos a Nueva Nota */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Tipo de Movimiento Estimado *</span>
              <span className="text-[10px] lowercase opacity-70 font-normal">sincronizado por rol</span>
            </Label>
            <div className={cn(
              "grid gap-2 sm:gap-3",
              tiposDisponibles.length === 1 ? "grid-cols-1" :
              tiposDisponibles.length === 2 ? "grid-cols-2" :
              tiposDisponibles.length === 3 ? "grid-cols-3" :
              tiposDisponibles.length === 4 ? "grid-cols-2 sm:grid-cols-4" :
              "grid-cols-2 sm:grid-cols-5"
            )}>
              {tiposDisponibles.map((t) => {
                const Icon = TIPO_MOV_ICONS[t.codigo] || Package
                const isSelected = selectedCodigo === t.codigo
                const colorMap = TIPO_MOVIMIENTO_COLORS[t.codigo] || 'bg-primary text-primary-foreground'
                return (
                  <button
                    key={t.codigo}
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setSelectedCodigo(t.codigo)
                      setTipo(CODIGO_TO_HINT[t.codigo] || 'entrada')
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all text-center gap-1.5 group min-h-[60px] sm:min-h-[68px]",
                      isPending && "opacity-50 cursor-not-allowed",
                      isSelected
                        ? cn("border-transparent font-bold shadow-lg shadow-black/10 scale-102 ring-2 ring-primary/20", colorMap.split(' ')[0], colorMap.split(' ')[1])
                        : "bg-background hover:bg-muted/80 text-muted-foreground border-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-none">
                      {t.nombre}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Visualizador de imagen / Dropzone Principal */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative"
          >
            {preview ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-primary/40 bg-black shadow-inner group">
                <Image
                  src={preview}
                  alt="Vista previa de la nota"
                  fill
                  className="object-contain"
                />
                
                {/* Capa de Escaneo Animada Premium en Procesamiento */}
                {isPending && (
                  <div className="absolute inset-0 bg-black/30 pointer-events-none overflow-hidden">
                    <div className="w-full h-1 bg-amber-500 shadow-[0_0_15px_#f59e0b] absolute left-0 animate-scan-beam" style={{
                      animation: 'scan 2.5s infinite ease-in-out'
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="flex flex-col items-center gap-2 p-4 bg-background/90 backdrop-blur rounded-2xl border shadow-lg">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest animate-pulse">Analizando Nota...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón borrar / cambiar */}
                {!isPending && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors shadow-md z-10"
                    title="Remover imagen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Dropzone Container */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all text-center",
                    isDraggingOver
                      ? "border-amber-500 bg-amber-500/10 scale-[1.01] shadow-lg shadow-amber-500/10"
                      : "border-muted-foreground/30 hover:border-amber-500/50 bg-background/60 hover:bg-muted/20"
                  )}
                >
                  <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl mb-2">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-bold tracking-tight">
                    {isDraggingOver ? '¡Suelta tu imagen aquí!' : 'Arrastra y suelta tu foto aquí'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    o pega directamente desde el portapapeles con <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono font-bold text-foreground">Ctrl + V</kbd>
                  </p>
                </div>

                {/* Opciones de Carga Rápida */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opción 1: Pegar Portapapeles */}
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-muted hover:border-amber-500/60 bg-background hover:bg-amber-500/5 transition-all text-center group"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl mb-1.5 group-hover:scale-110 transition-transform">
                      <ClipboardPaste className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight">Pegar Portapapeles</span>
                    <span className="text-[9px] text-muted-foreground">Ctrl + V</span>
                  </button>

                  {/* Opción 2: Archivo Local */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-muted hover:border-primary/60 bg-background hover:bg-primary/5 transition-all text-center group"
                  >
                    <div className="p-2 bg-primary/10 text-primary rounded-xl mb-1.5 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight">Cargar Archivo</span>
                    <span className="text-[9px] text-muted-foreground">.jpg, .png, .webp</span>
                  </button>

                  {/* Opción 3: Cámara Móvil */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-muted hover:border-blue-500/60 bg-background hover:bg-blue-500/5 transition-all text-center group"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl mb-1.5 group-hover:scale-110 transition-transform">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight">Usar Cámara</span>
                    <span className="text-[9px] text-muted-foreground">Foto en vivo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones del Footer */}
        <div className="flex items-center justify-between border-t pt-4 mt-2">
          {preview ? (
            <Button
              variant="outline"
              onClick={clearSelection}
              disabled={isPending}
              className="rounded-xl uppercase font-black text-[10px] tracking-wider"
            >
              Cambiar Foto
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsOpen(false)
                clearSelection()
              }}
              disabled={isPending}
              className="rounded-xl uppercase font-black text-[10px] tracking-wider"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || isPending}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white uppercase font-black text-[10px] tracking-wider font-mono gap-1.5 shadow-md shadow-orange-500/25 border-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white" />
                  Enviar al OCR
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* CSS Keyframes de animación inyectados dinámicamente para el scan beam */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </Dialog>
  )
}
