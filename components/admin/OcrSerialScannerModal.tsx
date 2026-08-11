// components/admin/OcrSerialScannerModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Camera, Plus, Sparkles, Upload, Trash2, CheckCircle2, Layers, X, Images,
  MoreVertical, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Scale, Building2
} from 'lucide-react'
import Image from 'next/image'
import { useOcrBatchQueue } from '@/hooks/useOcrBatchQueue'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const TIPO_LABELS: Record<string, { label: string; short: string; color: string }> = {
  entrada: { label: 'Entrada', short: 'ENT', color: 'bg-emerald-600 text-white border-emerald-500' },
  salida: { label: 'Salida', short: 'SAL', color: 'bg-blue-600 text-white border-blue-500' },
  traslado: { label: 'Traslado', short: 'TRF', color: 'bg-purple-600 text-white border-purple-500' },
  ajuste: { label: 'Ajuste', short: 'AJU', color: 'bg-amber-600 text-white border-amber-500' },
}

type CapturedFileItem = {
  id: string
  file: File
  previewUrl: string
  tipoHint: string
  origenHint?: string
  destinoHint?: string
}

export function OcrSerialScannerModal({
  trigger,
  defaultTipoHint = 'entrada',
}: {
  trigger?: React.ReactNode
  defaultTipoHint?: string
}) {
  const { addBatchToQueue } = useOcrBatchQueue()
  const [isOpen, setIsOpen] = useState(false)
  const [globalTipoHint, setGlobalTipoHint] = useState<string>(defaultTipoHint)
  const [globalOrigenHint, setGlobalOrigenHint] = useState<string>('AUTO')
  const [globalDestinoHint, setGlobalDestinoHint] = useState<string>('AUTO')
  const [bodegas, setBodegas] = useState<{ id: number; nombre: string; codigo: string }[]>([])

  // Lista de archivos capturados localmente en esta sesión
  const [capturedFiles, setCapturedFiles] = useState<CapturedFileItem[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadBodegas() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('bodegas')
          .select('id, nombre, codigo')
          .order('nombre', { ascending: true })
        if (data) {
          setBodegas(data as any)

          // Leer la bodega activa del encabezado (cookie bodega_activa_id)
          const cookieVal = typeof document !== 'undefined'
            ? document.cookie.split('; ').find((r) => r.startsWith('bodega_activa_id='))?.split('=')[1]
            : null
          const activeId = cookieVal ? parseInt(cookieVal, 10) : null
          if (activeId && activeId > 0) {
            const activeBodega = data.find((b: any) => b.id === activeId)
            if (activeBodega) {
              setGlobalOrigenHint(activeBodega.nombre)
            }
          }
        }
      } catch (e) {
        console.error('Error cargando bodegas:', e)
      }
    }
    if (isOpen && bodegas.length === 0) {
      loadBodegas()
    }
  }, [isOpen, bodegas.length])

  // Agregar archivos desde file input (múltiples de galería o disparos de cámara)
  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const newEntries: CapturedFileItem[] = Array.from(selectedFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      tipoHint: globalTipoHint || 'entrada',
      origenHint: globalOrigenHint !== 'AUTO' ? globalOrigenHint : undefined,
      destinoHint: globalDestinoHint !== 'AUTO' ? globalDestinoHint : undefined,
    }))

    setCapturedFiles((prev) => [...prev, ...newEntries])
    toast.success(`Se agregaron ${newEntries.length} ${newEntries.length === 1 ? 'foto' : 'fotos'} a la lista.`)

    // Resetear valor para permitir tomar más fotos consecutivas
    e.target.value = ''
  }

  const handleUpdateItemTipo = (id: string, newTipo: string) => {
    setCapturedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, tipoHint: newTipo } : item))
    )
  }

  const handleRemoveCaptured = (id: string) => {
    setCapturedFiles((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleClearAll = () => {
    capturedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setCapturedFiles([])
  }

  const handleConfirmAndProcess = () => {
    if (capturedFiles.length === 0) {
      toast.error('Captura o selecciona al menos una foto de la nota física.')
      return
    }

    const batch = capturedFiles.map((item) => ({
      file: item.file,
      tipoHint: item.tipoHint,
      origenHint: item.origenHint || (globalOrigenHint !== 'AUTO' ? globalOrigenHint : undefined),
      destinoHint: item.destinoHint || (globalDestinoHint !== 'AUTO' ? globalDestinoHint : undefined),
    }))

    addBatchToQueue(batch)

    // Limpiar estado local y cerrar modal
    setCapturedFiles([])
    setIsOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open && capturedFiles.length > 0) {
          handleClearAll()
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider shadow-lg hover:scale-102 transition-transform h-11 px-4 rounded-xl gap-2"
            >
              <div className="relative flex items-center justify-center">
                <Camera className="h-5 w-5" />
                <Plus className="h-3 w-3 absolute -top-1 -right-1 bg-amber-700 text-white rounded-full" />
              </div>
              <span>Fotos en Serie (OCR)</span>
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-2xl max-w-full w-full h-full sm:h-auto overflow-y-auto bg-gradient-to-br from-card to-background border shadow-2xl rounded-none sm:rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            Captura de Fotos en Serie (IA / OCR)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Toma fotos de varias notas físicas seguidas con la cámara o selecciona varias de la galería. Puedes asignar o cambiar la bodega de origen y destino por defecto si la nota en papel no las especifica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Inputs Ocultos */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesAdded}
            accept="image/*"
            multiple
            className="hidden"
          />

          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFilesAdded}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Configuración de Encabezado / Valores por Defecto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-muted/40 border">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tipo Predeterminado
              </Label>
              <Select value={globalTipoHint} onValueChange={(val) => val && setGlobalTipoHint(val)}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">📥 Entrada (Recepción)</SelectItem>
                  <SelectItem value="salida">📤 Salida (Venta)</SelectItem>
                  <SelectItem value="traslado">↔️ Traslado entre Bodegas</SelectItem>
                  <SelectItem value="ajuste">⚖️ Ajuste de Inventario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bodega Origen */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Origen (si no está en papel)
              </Label>
              <Select value={globalOrigenHint} onValueChange={(val) => val && setGlobalOrigenHint(val)}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Origen por defecto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">🤖 Deducir por OCR (o Defecto)</SelectItem>
                  {bodegas.map((b) => (
                    <SelectItem key={b.id} value={b.nombre}>
                      🏢 {b.nombre} ({b.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bodega Destino */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Destino (opcional)
              </Label>
              <Select value={globalDestinoHint} onValueChange={(val) => val && setGlobalDestinoHint(val)}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Destino por defecto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">🤖 Deducir por OCR (o ninguno)</SelectItem>
                  {bodegas.map((b) => (
                    <SelectItem key={b.id} value={b.nombre}>
                      🏢 {b.nombre} ({b.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones Principales de Captura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="h-20 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <div className="relative flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Camera className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <Plus className="h-3.5 w-3.5 absolute -top-1 -right-1 bg-amber-600 text-white rounded-full" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                📷 Tomar Foto con Cámara
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Disparo continuo secuencial</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Images className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                📁 Seleccionar Varias de Galería
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Subida masiva en lote</span>
            </Button>
          </div>

          {/* Carrete / Galería de Fotos Capturadas con Opciones de 3 Puntos */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Carrete de Notas Capturadas
                </Label>
                <Badge className="bg-amber-500 text-white font-black text-xs rounded-full px-2.5">
                  {capturedFiles.length} {capturedFiles.length === 1 ? 'foto' : 'fotos'}
                </Badge>
              </div>

              {capturedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-destructive hover:underline font-bold"
                >
                  Vaciar lista
                </button>
              )}
            </div>

            {capturedFiles.length === 0 ? (
              <div className="p-8 border border-dashed rounded-2xl text-center bg-muted/20 space-y-2">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground font-medium">
                  Aún no has capturado ninguna foto. Usa la cámara o selecciona archivos de tu galería para armar el paquete de notas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                {capturedFiles.map((item, index) => {
                  const info = TIPO_LABELS[item.tipoHint] || TIPO_LABELS.entrada
                  return (
                    <div
                      key={item.id}
                      className="relative group aspect-[3/4] rounded-xl overflow-hidden border bg-background shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <Image
                        src={item.previewUrl}
                        alt={`Nota ${index + 1}`}
                        fill
                        className="object-cover"
                      />

                      {/* Header overlay: Número y eliminar */}
                      <div className="relative z-10 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/70 to-transparent">
                        <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCaptured(item.id)}
                          className="p-1 bg-destructive/90 hover:bg-destructive text-white rounded-full transition-colors shadow-md"
                          title="Eliminar foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Footer overlay: Badge de tipo + 3 puntos verticales */}
                      <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-1">
                        <Badge
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-xs ${info.color}`}
                        >
                          {info.short}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-6 w-6 rounded-md bg-black/60 hover:bg-black/80 text-white border border-white/20 p-0"
                              title="Cambiar tipo de movimiento"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleUpdateItemTipo(item.id, 'entrada')}
                              className="text-xs font-bold gap-2 cursor-pointer"
                            >
                              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                              📥 Entrada
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateItemTipo(item.id, 'salida')}
                              className="text-xs font-bold gap-2 cursor-pointer"
                            >
                              <ArrowUpRight className="h-4 w-4 text-blue-500" />
                              📤 Salida
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateItemTipo(item.id, 'traslado')}
                              className="text-xs font-bold gap-2 cursor-pointer"
                            >
                              <ArrowLeftRight className="h-4 w-4 text-purple-500" />
                              ↔️ Traslado
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateItemTipo(item.id, 'ajuste')}
                              className="text-xs font-bold gap-2 cursor-pointer"
                            >
                              <Scale className="h-4 w-4 text-amber-500" />
                              ⚖️ Ajuste
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Acciones del Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto rounded-xl h-11"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleConfirmAndProcess}
              disabled={capturedFiles.length === 0}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider h-11 rounded-xl shadow-lg gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Procesar {capturedFiles.length > 0 ? `${capturedFiles.length} ` : ''}Notas en Segundo Plano
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
