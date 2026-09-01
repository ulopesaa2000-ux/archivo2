// app/(admin)/catalogo/components/ShareProductoModal.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { formatCurrency } from '@/lib/utils'
import type { ProductoListItem } from '@/modules/catalogo/types'
import {
  Copy,
  Check,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Loader2,
  Share2,
  Sparkles,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  producto: ProductoListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Convierte cualquier imagen (JPEG, WebP, PNG) a PNG Blob y File vía Canvas
 * para Clipboard API y Web Share API.
 */
async function getImageBlobAndFile(
  imageUrl: string,
  filename: string
): Promise<{ blob: Blob; file: File }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('No se pudo inicializar el contexto de canvas')
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('No se pudo generar el blob de la imagen'))
            return
          }
          const file = new File([blob], `${filename}.png`, { type: 'image/png' })
          resolve({ blob, file })
        }, 'image/png')
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => {
      reject(new Error('No se pudo cargar la imagen'))
    }
    img.src = imageUrl
  })
}

export function ShareProductoModal({ producto, open, onOpenChange }: Props) {
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copyingImage, setCopyingImage] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [incluirPrecio, setIncluirPrecio] = useState(false)
  const [incluirLinkFoto, setIncluirLinkFoto] = useState(true)

  if (!producto) return null

  const descripcionLimpia = (producto.descripcion ?? producto.nombre ?? '').trim()
  const directImageUrl = producto.imagen_principal
    ? getSmartImagenUrl(producto.imagen_principal, 'og')
    : null

  // Construcción del formato para WhatsApp y Telegram (Tarjeta / Bloque con enlace de foto)
  const lineasTexto: string[] = []

  // Línea 1: SKU y Familia/Modelo
  const skuFamilia = [producto.sku_base, producto.familia].filter(Boolean).join('  ')
  lineasTexto.push(`*${skuFamilia}*`)

  // Línea 2: Descripción / Nombre
  if (descripcionLimpia) {
    lineasTexto.push(descripcionLimpia)
  }

  // Línea 3: Empaque y Precio
  const detalles: string[] = []
  if (producto.pz_en_caja) {
    detalles.push(`📦 *${producto.pz_en_caja} pz/caja*`)
  }
  if (incluirPrecio && producto.precio_ec != null) {
    detalles.push(`💰 *${formatCurrency(producto.precio_ec)}*`)
  }
  if (detalles.length > 0) {
    lineasTexto.push(detalles.join('   '))
  }

  // Línea 4: Enlace directo a la foto (para que WhatsApp/Telegram genere la tarjeta visual y permita verla al tocar)
  if (directImageUrl && incluirLinkFoto) {
    lineasTexto.push(`\n📸 *Ver foto:*\n${directImageUrl}`)
  }

  const textoCompartir = lineasTexto.join('\n')

  /**
   * Acción Maestra: Comparte o Copia Foto + Texto en un solo paso
   */
  const handleShareOrCopyAll = async () => {
    setIsProcessingAll(true)
    try {
      const url = producto.imagen_principal
        ? getSmartImagenUrl(producto.imagen_principal, 'card_lg')
        : null

      let blob: Blob | null = null
      let file: File | null = null

      if (url) {
        try {
          const res = await getImageBlobAndFile(url, producto.sku_base)
          blob = res.blob
          file = res.file
        } catch (e) {
          console.warn('Error al procesar imagen para share combinado:', e)
        }
      }

      // 1. Intentar Web Share nativo con archivo + texto
      if (
        file &&
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: producto.sku_base,
            text: textoCompartir,
            files: [file],
          })
          toast.success('¡Compartido con éxito!')
          setIsProcessingAll(false)
          return
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            setIsProcessingAll(false)
            return
          }
        }
      }

      // 2. Copiar conjuntamente al Portapapeles (Imagen + Texto simultáneo)
      if (blob) {
        const textBlob = new Blob([textoCompartir], { type: 'text/plain' })
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
              'text/plain': textBlob,
            }),
          ])
          setCopiedAll(true)
          toast.success('¡Tarjeta y Foto copiadas juntas!', {
            description: 'Listo para pegar (Ctrl+V) en WhatsApp o Telegram con vista de tarjeta.',
          })
          setTimeout(() => setCopiedAll(false), 3000)
          setIsProcessingAll(false)
          return
        } catch (clipErr) {
          console.warn('Clipboard dual no soportado, copiando texto:', clipErr)
        }
      }

      // 3. Fallback: Copiar texto con link de imagen
      await navigator.clipboard.writeText(textoCompartir)
      setCopiedText(true)
      toast.success('Tarjeta de texto copiada al portapapeles')
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      toast.error('No se pudo completar el copiado')
    } finally {
      setIsProcessingAll(false)
    }
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textoCompartir)
      setCopiedText(true)
      toast.success('Tarjeta de texto copiada al portapapeles')
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      toast.error('No se pudo copiar el texto')
    }
  }

  const handleCopyImage = async () => {
    if (!producto.imagen_principal) {
      toast.error('Este producto no tiene imagen asignada')
      return
    }

    try {
      setCopyingImage(true)
      const url = getSmartImagenUrl(producto.imagen_principal, 'card_lg')
      const { blob } = await getImageBlobAndFile(url, producto.sku_base)
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ])
      setCopiedImage(true)
      toast.success('¡Imagen copiada al portapapeles!', {
        description: 'Pega con Ctrl+V directamente en WhatsApp o Telegram',
      })
      setTimeout(() => setCopiedImage(false), 2500)
    } catch (err) {
      console.error('Error al copiar imagen:', err)
      try {
        if (directImageUrl) {
          await navigator.clipboard.writeText(directImageUrl)
          toast.info('Enlace directo a la imagen copiado')
        }
      } catch {
        toast.error('No se pudo copiar la imagen')
      }
    } finally {
      setCopyingImage(false)
    }
  }

  const handleWhatsApp = () => {
    const encodedText = encodeURIComponent(textoCompartir)
    window.open(`https://wa.me/?text=${encodedText}`, '_blank')
  }

  const handleTelegram = () => {
    const encodedText = encodeURIComponent(textoCompartir)
    window.open(`https://t.me/share/url?url=&text=${encodedText}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 gap-4">
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Share2 className="h-4 w-4 text-primary" />
            Compartir Producto
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Envía o copia la tarjeta interactiva con foto y datos para WhatsApp y Telegram.
          </DialogDescription>
        </DialogHeader>

        {/* Tarjeta de previsualización compacta estilo bloque */}
        <div className="flex gap-3 p-3.5 rounded-xl bg-muted/50 dark:bg-slate-900/70 border border-border/80 items-center">
          <div className="relative w-16 h-20 bg-background rounded-lg border overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            {producto.imagen_principal ? (
              <Image
                src={getSmartImagenUrl(producto.imagen_principal, 'thumbnail')}
                alt={producto.sku_base}
                fill
                className="object-contain p-1"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-sm text-foreground">
                {skuFamilia}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                {producto.estado}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
              {descripcionLimpia || 'Sin descripción'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium pt-0.5">
              {producto.pz_en_caja && (
                <span className="bg-primary/10 text-primary font-semibold px-1.5 py-0.2 rounded text-[10px]">
                  {producto.pz_en_caja} pz/caja
                </span>
              )}
              {producto.precio_ec != null && (
                <span className="font-bold text-foreground">
                  {formatCurrency(producto.precio_ec)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Opciones y Vista previa del texto de la tarjeta */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Formato de mensaje:
            </span>
            <div className="flex items-center gap-2">
              {directImageUrl && (
                <button
                  type="button"
                  onClick={() => setIncluirLinkFoto(!incluirLinkFoto)}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  {incluirLinkFoto ? '✓ Link de foto' : '+ Link de foto'}
                </button>
              )}
              {producto.precio_ec != null && (
                <button
                  type="button"
                  onClick={() => setIncluirPrecio(!incluirPrecio)}
                  className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                >
                  {incluirPrecio ? '✓ Con precio' : '+ Precio'}
                </button>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-background border font-mono text-xs text-foreground select-all whitespace-pre-wrap break-words leading-relaxed shadow-xs max-h-32 overflow-y-auto">
            {textoCompartir}
          </div>
        </div>

        {/* BOTÓN PRINCIPAL 1-CLICK: FOTO + TEXTO */}
        <Button
          type="button"
          className="w-full h-10 gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98] cursor-pointer"
          onClick={handleShareOrCopyAll}
          disabled={isProcessingAll}
        >
          {isProcessingAll ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparando Tarjeta + Foto...</span>
            </>
          ) : copiedAll ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>¡Tarjeta y Foto Copiadas!</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Copiar Tarjeta Completa (Foto + Texto)</span>
            </>
          )}
        </Button>

        {/* Botones secundarios */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
            onClick={handleCopyText}
          >
            {copiedText ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">¡Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Solo Texto</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
            onClick={handleCopyImage}
            disabled={!producto.imagen_principal || copyingImage}
          >
            {copyingImage ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Copiando...</span>
              </>
            ) : copiedImage ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">¡Imagen Copiada!</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-3 w-3" />
                <span>Solo Imagen</span>
              </>
            )}
          </Button>
        </div>

        {/* Accesos directos a WhatsApp y Telegram */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/60">
          <Button
            type="button"
            className="flex-1 h-8 text-xs font-semibold gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs cursor-pointer"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5 fill-white" />
            <span>WhatsApp</span>
          </Button>
          <Button
            type="button"
            className="flex-1 h-8 text-xs font-semibold gap-1.5 bg-[#229ED9] hover:bg-[#1e8cc0] text-white shadow-xs cursor-pointer"
            onClick={handleTelegram}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Telegram</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
