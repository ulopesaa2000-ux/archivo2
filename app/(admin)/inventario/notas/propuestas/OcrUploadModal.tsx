// app/(admin)/inventario/notas/propuestas/OcrUploadModal.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Camera, Upload, Sparkles, Loader2, X, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

export function OcrUploadModal({
  trigger,
  redirectToNueva = false,
}: {
  trigger?: React.ReactNode
  redirectToNueva?: boolean
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tipo, setTipo] = useState<string>('entrada')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const clearSelection = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSubmit = () => {
    if (!file) {
      toast.error('Por favor, captura o selecciona una foto de la nota.')
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
            <Button className="font-bold uppercase tracking-wider shadow-lg hover:scale-102 transition-transform" />
          )
        }
      >
        {!trigger && (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Escanear OCR
          </>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-xl max-w-full w-full h-full sm:h-auto overflow-y-auto bg-gradient-to-br from-card to-background border shadow-2xl rounded-none sm:rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            Escanear Nota Física (OCR)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sube o toma una foto de tu orden física. Nuestra IA extraerá los productos y cantidades automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 relative">
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

          {/* Selectores de metadata básica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Movimiento Estimado</Label>
              <Select value={tipo} onValueChange={(val) => val && setTipo(val)} disabled={isPending}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecciona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Ingreso)</SelectItem>
                  <SelectItem value="salida">Salida (Egreso)</SelectItem>
                  <SelectItem value="traspaso">Traspaso (Movimiento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visualizador de imagen / Dropzone */}
          <div className="relative">
            {preview ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border bg-black shadow-inner group">
                <Image
                  src={preview}
                  alt="Vista previa de la nota"
                  fill
                  className="object-contain"
                />
                
                {/* Capa de Escaneo Animada Premium en Procesamiento */}
                {isPending && (
                  <div className="absolute inset-0 bg-black/30 pointer-events-none overflow-hidden">
                    <div className="w-full h-1 bg-yellow-500 shadow-[0_0_15px_#f59e0b] absolute left-0 animate-scan-beam" style={{
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

                {/* Botón borrar */}
                {!isPending && (
                  <button
                    onClick={clearSelection}
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors shadow-md"
                    title="Remover imagen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción Cámara */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-muted hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all text-center group min-h-[160px]"
                >
                  <div className="p-3 bg-primary/10 text-primary rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">Usar Cámara</span>
                  <span className="text-[10px] text-muted-foreground mt-1">Captura foto en vivo (móvil)</span>
                </button>

                {/* Opción Archivo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-muted hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all text-center group min-h-[160px]"
                >
                  <div className="p-3 bg-secondary/10 text-secondary-foreground rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">Cargar Archivo</span>
                  <span className="text-[10px] text-muted-foreground mt-1">Busca imágenes locales (.jpg, .png)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between border-t pt-4">
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
              className="rounded-xl uppercase font-black text-[10px] tracking-wider font-mono gap-1.5 shadow-md shadow-primary/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-yellow-400" />
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
