// components/store/producto/ProductShareButtons.tsx
'use client'

import { useState } from 'react'
import { Share2, MessageCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProductShareButtonsProps {
  slug: string
  nombre: string
  sku?: string | null
  variant?: 'detail' | 'card'
  className?: string
}

export function ProductShareButtons({
  slug,
  nombre,
  sku,
  variant = 'detail',
  className,
}: ProductShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const getProductUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/shop/${slug}`
    }
    return `/shop/${slug}`
  }

  const handleGeneralShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const url = getProductUrl()
    const title = sku ? `${sku} - ${nombre}` : nombre

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Mira este producto: ${title}`,
          url,
        })
        return
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('¡Enlace del producto copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const url = getProductUrl()
    const title = sku ? `${sku} - ${nombre}` : nombre
    const text = encodeURIComponent(`¡Hola! Mira este producto: ${title}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (variant === 'card') {
    return (
      <div
        className={cn('flex items-center gap-1.5 z-10', className)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <button
          type="button"
          onClick={handleWhatsAppShare}
          title="Compartir por WhatsApp"
          className="h-7 w-7 rounded-full bg-slate-900/70 hover:bg-[#25D366] text-white flex items-center justify-center backdrop-blur-md shadow-md border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          <MessageCircle className="h-3.5 w-3.5 fill-white" />
        </button>
        <button
          type="button"
          onClick={handleGeneralShare}
          title="Compartir / Copiar enlace"
          className="h-7 w-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md shadow-md border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    )
  }

  // Variant: detail
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-[12px] font-medium text-store-ink3 font-sans mr-1">
        Compartir:
      </span>
      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 transition-all duration-200 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
        title="Compartir en WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5 fill-current" />
        <span>WhatsApp</span>
      </button>

      <button
        type="button"
        onClick={handleGeneralShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] hover:bg-muted text-store-ink border border-store-border transition-all duration-200 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
        title="Compartir enlace o copiar al portapapeles"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-emerald-600">¡Copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" />
            <span>Compartir</span>
          </>
        )}
      </button>
    </div>
  )
}
