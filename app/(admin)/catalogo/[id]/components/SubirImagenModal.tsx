// app/(admin)/catalogo/[id]/components/SubirImagenModal.tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon, Loader2, Star, Link2, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { uploadImagenAction } from '@/modules/catalogo/actions'
import { toast } from 'sonner'
import type { UsoImagen } from '@/lib/types/tables'
import { USO_IMAGEN_LABELS, USO_OPTIONS } from './imagenesConstants'
import { cn } from '@/lib/utils'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB (se optimizará a < 2.5MB)

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(str: string) {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// ─── Componente ────────────────────────────────────────────────────────────────

interface SubirImagenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productoId: number
  skuBase: string
  totalImagenes: number
}

export function SubirImagenModal({
  open,
  onOpenChange,
  productoId,
  skuBase,
  totalImagenes,
}: SubirImagenModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Modo: 'local' | 'url_externa' ─────────────────────────
  // Se detecta automáticamente: si el usuario escribe una URL → externo
  //                              si selecciona un archivo → local
  const [modo, setModo]               = useState<'local' | 'url_externa'>('local')

  // Campos comunes
  const [usoImagen, setUsoImagen]     = useState<UsoImagen>('principal_ecommerce')
  const [altText, setAltText]         = useState('')
  const [orden, setOrden]             = useState(totalImagenes)
  const [esPrincipal, setEsPrincipal] = useState(false)

  // Modo local
  const [preview, setPreview]         = useState<string | null>(null)
  const [file, setFile]               = useState<File | null>(null)
  const [fileError, setFileError]     = useState<string | null>(null)

  // Modo URL externa
  const [urlExterna, setUrlExterna]   = useState('')
  const [urlError, setUrlError]       = useState<string | null>(null)
  const [urlPreview, setUrlPreview]   = useState<string | null>(null)

  const [isPending, startTransition]  = useTransition()

  // ── Reset completo ─────────────────────────────────────────
  const handleClose = () => {
    if (isPending) return
    setModo('local')
    setPreview(null); setFile(null); setFileError(null)
    setUrlExterna(''); setUrlError(null); setUrlPreview(null)
    setUsoImagen('principal_ecommerce')
    setAltText(''); setOrden(totalImagenes); setEsPrincipal(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  // ── Selección de archivo ───────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    setFileError(null)
    if (!selected) { setFile(null); setPreview(null); return }

    if (!selected.type.startsWith('image/')) {
      setFileError('Solo se permiten archivos de imagen.')
      setFile(null); setPreview(null); return
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFileError(`El archivo supera el máximo de 5 MB (${(selected.size / 1024 / 1024).toFixed(1)} MB).`)
      setFile(null); setPreview(null); return
    }

    // Al elegir archivo → modo local, limpiar URL
    setModo('local')
    setUrlExterna(''); setUrlPreview(null); setUrlError(null)
    setFile(selected)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(selected)
  }

  // ── Cambio en campo URL ────────────────────────────────────
  const handleUrlChange = (val: string) => {
    setUrlExterna(val)
    setUrlError(null)
    if (!val.trim()) {
      setUrlPreview(null)
      // Si no hay URL y había modo externo, volver a local
      if (modo === 'url_externa') setModo('local')
      return
    }
    if (isValidUrl(val.trim())) {
      // Al escribir una URL válida → modo URL externa, limpiar archivo
      setModo('url_externa')
      setFile(null); setPreview(null); setFileError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUrlPreview(val.trim())
    } else {
      setUrlError('Ingresa una URL válida (https://...)')
      setUrlPreview(null)
    }
  }

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (modo === 'local' && !file) {
      setFileError('Selecciona un archivo o ingresa una URL.')
      return
    }
    if (modo === 'url_externa') {
      if (!urlExterna.trim()) { setUrlError('Ingresa la URL de la imagen.'); return }
      if (!isValidUrl(urlExterna.trim())) { setUrlError('URL inválida.'); return }
    }

    const fd = new FormData()
    fd.append('producto_id',   String(productoId))
    fd.append('sku_base',      skuBase)
    fd.append('uso_imagen',    usoImagen)
    fd.append('alt_text',      altText)
    fd.append('orden',         String(orden))
    fd.append('es_principal',  esPrincipal ? 'true' : 'false')
    fd.append('origen_imagen', modo)

    if (modo === 'local' && file) {
      fd.append('file', file)
    } else {
      fd.append('url_externa', urlExterna.trim())
    }

    startTransition(async () => {
      const res = await uploadImagenAction(fd)
      if (res.success) {
        toast.success(modo === 'local' ? 'Imagen subida correctamente.' : 'URL registrada correctamente.')
        handleClose()
      } else {
        toast.error(res.error ?? 'Error al guardar la imagen.')
      }
    })
  }

  const canSubmit = modo === 'local' ? !!file : (!!urlExterna && isValidUrl(urlExterna))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-[540px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Agregar Imagen
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-5">

            {/* ── Tabs Modo: Local / URL ──────────────────── */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setModo('local'); setUrlExterna(''); setUrlPreview(null); setUrlError(null) }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 transition-colors',
                  modo === 'local'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <HardDrive className="h-3.5 w-3.5" />
                Subir archivo
              </button>
              <button
                type="button"
                onClick={() => { setModo('url_externa'); setFile(null); setPreview(null); setFileError(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 border-l transition-colors',
                  modo === 'url_externa'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
                URL externa
              </button>
            </div>

            {/* ── Zona de archivo (modo local) ─────────────── */}
            {modo === 'local' && (
              <div className="grid gap-2">
                {preview ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted/30">
                    <Image src={preview} alt="preview" fill className="object-contain" unoptimized />
                    <button
                      type="button"
                      onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5">
                      {file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 aspect-video w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all text-muted-foreground"
                  >
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <span className="text-sm font-medium">Haz clic para seleccionar</span>
                    <span className="text-xs opacity-70">PNG, JPG, WebP · Máx 5 MB (Auto-optimizado)</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              </div>
            )}

            {/* ── Campo URL externa ────────────────────────── */}
            {modo === 'url_externa' && (
              <div className="grid gap-2">
                <Label htmlFor="url_externa" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  URL de la imagen
                </Label>
                <Input
                  id="url_externa"
                  value={urlExterna}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className={urlError ? 'border-destructive' : ''}
                  autoFocus
                />
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}

                {/* Preview de URL */}
                {urlPreview && (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted/30">
                    <Image
                      src={urlPreview}
                      alt="preview"
                      fill
                      unoptimized
                      className="object-contain"
                      onError={() => { setUrlError('No se pudo cargar la imagen desde esa URL.'); setUrlPreview(null) }}
                    />
                    <div className="absolute top-2 right-2 text-[10px] bg-orange-500/90 text-white rounded-full px-2 py-0.5 font-semibold">
                      URL Externa
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tipo de uso + Orden ──────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="uso_imagen">Tipo de uso</Label>
                <Select value={usoImagen} onValueChange={(v) => setUsoImagen(v as UsoImagen)}>
                  <SelectTrigger id="uso_imagen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USO_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{USO_IMAGEN_LABELS[u]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  min={0}
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                />
              </div>
            </div>

            {/* ── Alt text ────────────────────────────────── */}
            <div className="grid gap-2">
              <Label htmlFor="alt_text">
                Texto alternativo{' '}
                <span className="text-muted-foreground font-normal">(SEO)</span>
              </Label>
              <Input
                id="alt_text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder={`${skuBase} — vista frontal`}
              />
            </div>

            {/* ── Es principal ────────────────────────────── */}
            <div className="flex items-center gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-4 py-3">
              <Star className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Imagen principal</p>
                <p className="text-xs text-muted-foreground">
                  Se usará como imagen destacada en listados y e-commerce
                </p>
              </div>
              <Switch id="es_principal" checked={esPrincipal} onCheckedChange={setEsPrincipal} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isPending
                ? 'Guardando…'
                : modo === 'url_externa' ? 'Registrar URL' : 'Subir imagen'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
