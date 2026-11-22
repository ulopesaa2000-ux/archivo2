// components/admin/ecommerce/ProductoWebSeoPopover.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generateSmartSeo, type GeneratedSeo } from '@/lib/ecommerce/seo-generator'
import { actualizarSeoRapidoProductoWebAction } from '@/modules/ecommerce/actions'
import type { ProductoWebExtendido, UnidadVenta } from '@/modules/ecommerce/types'

interface ProductoWebSeoPopoverProps {
  producto: ProductoWebExtendido
}

export function ProductoWebSeoPopover({ producto }: ProductoWebSeoPopoverProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [tituloSeo, setTituloSeo] = useState(producto.titulo_seo ?? '')
  const [descripcionSeo, setDescripcionSeo] = useState(producto.descripcion_seo ?? '')
  const [keywords, setKeywords] = useState(producto.keywords ?? '')
  const [unidadVenta, setUnidadVenta] = useState<UnidadVenta>(producto.unidad_venta || 'pieza')
  const [modoOverride, setModoOverride] = useState<'default' | 'catalogo' | 'ecommerce'>(
    producto.modo_override || 'default'
  )
  const [ordenDisplay, setOrdenDisplay] = useState(String(producto.orden_display ?? 0))

  // Notificación flotante inline de recomendación inteligente (sin modal que robe foco)
  const [suggestion, setSuggestion] = useState<GeneratedSeo | null>(null)

  const filledCount = [producto.titulo_seo, producto.descripcion_seo, producto.keywords].filter(
    (v) => Boolean(v && v.trim().length > 0)
  ).length

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTituloSeo(producto.titulo_seo ?? '')
      setDescripcionSeo(producto.descripcion_seo ?? '')
      setKeywords(producto.keywords ?? '')
      setUnidadVenta(producto.unidad_venta || 'pieza')
      setModoOverride(producto.modo_override || 'default')
      setOrdenDisplay(String(producto.orden_display ?? 0))
      setSuggestion(null)
    }
  }

  const handleRequestSuggestion = () => {
    const generated = generateSmartSeo({
      sku_base: producto.sku_base,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      tipo_prenda_nombre: producto.tipo_prenda_nombre,
      genero_nombre: producto.genero_nombre,
      marca_nombre: producto.marca_nombre,
      composicion: producto.composicion,
    })
    setSuggestion(generated)
  }

  const handleAcceptSuggestion = () => {
    if (!suggestion) return
    setTituloSeo(suggestion.titulo_seo)
    setDescripcionSeo(suggestion.descripcion_seo)
    setKeywords(suggestion.keywords)
    setSuggestion(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ordenNum = Number(ordenDisplay)
    if (!Number.isFinite(ordenNum) || ordenNum < 0) {
      toast.error('Orden display debe ser un número mayor o igual a 0.')
      return
    }

    startTransition(async () => {
      const res = await actualizarSeoRapidoProductoWebAction({
        productoId: producto.producto_id,
        productoWebId: producto.producto_web_id,
        titulo_seo: tituloSeo.trim() || null,
        descripcion_seo: descripcionSeo.trim() || null,
        keywords: keywords.trim() || null,
        unidad_venta: unidadVenta,
        modo_override: modoOverride,
        orden_display: Math.floor(ordenNum),
      })

      if (!res.success) {
        toast.error(res.error || 'No se pudo guardar la información SEO.')
        return
      }

      toast.success(`SEO y opciones web actualizados [${producto.sku_base}]`)
      setOpen(false)
      router.refresh()
    })
  }

  const pencilColorClass =
    filledCount === 3
      ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
      : filledCount > 0
        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10'
        : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'

  const pencilTitle =
    filledCount === 3
      ? 'SEO completo · Editar rápido'
      : filledCount > 0
        ? `SEO parcial (${filledCount}/3) · Editar rápido`
        : 'Sin SEO · Editar rápido'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        className={cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
          pencilColorClass
        )}
        title={pencilTitle}
        aria-label={`Editar SEO de ${producto.sku_base}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Pencil className="h-3.5 w-3.5" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[380px] sm:w-[420px] p-3.5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-3 relative">
          {/* Header con botón solo-icono de generar inteligente */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Edición rápida SEO · <span className="font-mono">{producto.sku_base}</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {producto.tipo_prenda_nombre || 'Prenda'}
                {producto.genero_nombre ? ` · ${producto.genero_nombre}` : ''}
                {producto.marca_nombre ? ` · ${producto.marca_nombre}` : ''}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
              onClick={handleRequestSuggestion}
              title="Generar sugerencia SEO inteligente"
              aria-label="Generar sugerencia SEO inteligente"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Notificación flotante inline para aceptar recomendaciones sin perder el foco */}
          {suggestion && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/40 p-2.5 space-y-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  ¿Deseas aplicar las recomendaciones SEO?
                </p>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cerrar recomendación"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[10px] space-y-0.5 text-muted-foreground leading-snug">
                <p className="truncate">
                  <strong className="text-foreground">Título:</strong> {suggestion.titulo_seo}
                </p>
                <p className="line-clamp-2">
                  <strong className="text-foreground">Desc:</strong> {suggestion.descripcion_seo}
                </p>
                <p className="truncate">
                  <strong className="text-foreground">Keywords:</strong> {suggestion.keywords}
                </p>
              </div>
              <div className="flex justify-end gap-1.5 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setSuggestion(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-6 px-2.5 text-[11px] bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white gap-1"
                  onClick={handleAcceptSuggestion}
                >
                  <Check className="h-3 w-3" />
                  Aceptar
                </Button>
              </div>
            </div>
          )}

          {/* Título SEO */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor={`seo-title-${producto.producto_id}`} className="text-[11px] font-medium">
                Título SEO
              </Label>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  tituloSeo.length > 60 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'
                )}
              >
                {tituloSeo.length}/60
              </span>
            </div>
            <Input
              id={`seo-title-${producto.producto_id}`}
              value={tituloSeo}
              onChange={(e) => setTituloSeo(e.target.value)}
              placeholder="Título para buscadores (máx 60 chars)"
              className="h-8 text-xs"
            />
          </div>

          {/* Descripción SEO */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor={`seo-desc-${producto.producto_id}`} className="text-[11px] font-medium">
                Descripción SEO
              </Label>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  descripcionSeo.length > 160 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'
                )}
              >
                {descripcionSeo.length}/160
              </span>
            </div>
            <Textarea
              id={`seo-desc-${producto.producto_id}`}
              value={descripcionSeo}
              onChange={(e) => setDescripcionSeo(e.target.value)}
              placeholder="Descripción para buscadores (máx 160 chars)"
              rows={2}
              className="text-xs resize-none min-h-[54px]"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1">
            <Label htmlFor={`seo-kw-${producto.producto_id}`} className="text-[11px] font-medium">
              Keywords
            </Label>
            <Input
              id={`seo-kw-${producto.producto_id}`}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="chamarra, invierno, hombre"
              className="h-8 text-xs"
            />
          </div>

          {/* Extras: Unidad de venta, Modo override y Orden display */}
          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-medium">Unidad venta</Label>
              <Select value={unidadVenta} onValueChange={(v) => setUnidadVenta(v as UnidadVenta)}>
                <SelectTrigger className="h-7 text-[11px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieza" className="text-xs">Pieza</SelectItem>
                  <SelectItem value="caja" className="text-xs">Caja</SelectItem>
                  <SelectItem value="ambas" className="text-xs">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-medium">Modo override</Label>
              <Select
                value={modoOverride}
                onValueChange={(v) => setModoOverride(v as 'default' | 'catalogo' | 'ecommerce')}
              >
                <SelectTrigger className="h-7 text-[11px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">Default</SelectItem>
                  <SelectItem value="catalogo" className="text-xs">Catálogo</SelectItem>
                  <SelectItem value="ecommerce" className="text-xs">Ecommerce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`orden-display-${producto.producto_id}`} className="text-[10px] text-muted-foreground font-medium">
                Orden display
              </Label>
              <Input
                id={`orden-display-${producto.producto_id}`}
                type="number"
                min="0"
                step="1"
                value={ordenDisplay}
                onChange={(e) => setOrdenDisplay(e.target.value)}
                className="h-7 text-[11px] px-2"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
