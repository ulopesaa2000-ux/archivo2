// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\catalogo\familias\_components\DescripcionQuickEdit.tsx
'use client'

// Popover de edición rápida de descripción para el inspector de Familias.
// Inspirado en components/admin/DataTable/QuickEditPopover (no lo usa: ese
// exige DataTableProvider). Standalone: textarea + Auto-detectar +
// Prenda/Género/Marca + Guardar, con su propio open y target único.

import { useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Loader2, Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'
import {
  detectProductAttributesFromText,
  inferEdadFromGeneroAndText,
} from '@/modules/catalogo/utils/detector'
import {
  fetchAtributosDescripcionAction,
  updateDescripcionRapidaAction,
} from '@/modules/catalogo/actions/familias'

interface DescripcionQuickEditProps {
  productId: number
  descripcion: string | null
  catalogos: CatalogosParaFiltros
  /** Llamado tras guardar OK para reflejo optimista en memoria. */
  onSaved: (descripcion: string | null) => void
  className?: string
}

export function DescripcionQuickEdit({
  productId,
  descripcion,
  catalogos,
  onSaved,
  className,
}: DescripcionQuickEditProps) {
  const [open, setOpen] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [editValue, setEditValue] = useState(descripcion ?? '')
  const [extraPrenda, setExtraPrenda] = useState('')
  const [extraGenero, setExtraGenero] = useState('')
  const [extraEdad, setExtraEdad] = useState('')
  const [extraMarca, setExtraMarca] = useState('')
  const [isPending, startTransition] = useTransition()

  const prendaOptions = (catalogos.tipos_prenda || []).map(t => ({ id: t.id, label: t.nombre }))
  const generoOptions = catalogos.generos.map(g => ({ id: g.id, label: g.nombre }))
  const marcaOptions = catalogos.marcas.map(m => ({ id: m.id, label: m.nombre }))

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) return
    setEditValue(descripcion ?? '')
    setExtraPrenda('')
    setExtraGenero('')
    setExtraEdad('')
    setExtraMarca('')
    // Precargar atributos actuales para no pisarlos al guardar.
    setCargando(true)
    try {
      const res = await fetchAtributosDescripcionAction(productId)
      if (res.success && res.data) {
        if (res.data.descripcion) setEditValue(res.data.descripcion)
        if (res.data.tipo_prenda_id) setExtraPrenda(String(res.data.tipo_prenda_id))
        if (res.data.genero_id) setExtraGenero(String(res.data.genero_id))
        if (res.data.edad_id) setExtraEdad(String(res.data.edad_id))
        if (res.data.marca_id) setExtraMarca(String(res.data.marca_id))
      }
    } catch (err) {
      console.error('Error al cargar atributos:', err)
    } finally {
      setCargando(false)
    }
  }

  const handleGeneroChange = (val: string) => {
    const clean = val === 'none' || !val ? '' : val
    setExtraGenero(clean)
    const inferred = inferEdadFromGeneroAndText(clean, editValue, catalogos)
    if (inferred?.id) setExtraEdad(String(inferred.id))
  }

  const handleAutoDetect = () => {
    const text = editValue.trim()
    if (!text) {
      toast.info('Ingresa una descripción para auto-detectar atributos.')
      return
    }
    const detected = detectProductAttributesFromText(text, catalogos)
    if (detected.detectedCount === 0) {
      toast.info('No se detectaron coincidencias en el texto.')
      return
    }
    const names: string[] = []
    if (detected.tipo_prenda_id) {
      setExtraPrenda(String(detected.tipo_prenda_id))
      names.push(`Prenda: ${detected.tipo_prenda_nombre}`)
    }
    if (detected.genero_id) {
      setExtraGenero(String(detected.genero_id))
      names.push(`Género: ${detected.genero_nombre}`)
    }
    if (detected.edad_id) setExtraEdad(String(detected.edad_id))
    if (detected.marca_id) {
      setExtraMarca(String(detected.marca_id))
      names.push(`Marca: ${detected.marca_nombre}`)
    }
    toast.success(`Detectado (${detected.detectedCount}): ${names.join(', ')}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      let edadId = extraEdad ? Number(extraEdad) : null
      if (!edadId) {
        const autoEdad = inferEdadFromGeneroAndText(extraGenero, editValue, catalogos)
        if (autoEdad?.id) edadId = autoEdad.id
      }
      const cleanDesc = editValue.trim() === '' ? null : editValue.trim()
      const res = await updateDescripcionRapidaAction(productId, {
        descripcion: cleanDesc,
        tipo_prenda_id: extraPrenda ? Number(extraPrenda) : null,
        genero_id: extraGenero ? Number(extraGenero) : null,
        edad_id: edadId,
        marca_id: extraMarca ? Number(extraMarca) : null,
      })
      if (!res.success) {
        toast.error('Error al actualizar', { description: res.error })
        return
      }
      toast.success('Descripción actualizada')
      onSaved(cleanDesc)
      setOpen(false)
    })
  }

  const renderSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { id: number | string; label: string }[],
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v === 'none' || !v ? '' : v)}>
        <SelectTrigger className="h-8 text-xs">
          <span className="truncate text-left flex-1">
            {options.find(opt => String(opt.id) === String(value))?.label ?? 'Sin asignar'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs text-muted-foreground italic">
            Sin asignar
          </SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center justify-center rounded p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        title="Edición rápida de descripción"
      >
        <Pencil className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[480px] max-w-[94vw]"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Editar: Descripción</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary"
              onClick={handleAutoDetect}
              title="Detectar automáticamente Prenda, Género, Edad y Marca a partir del texto"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>Auto-detectar</span>
            </Button>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Cargando atributos...
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                rows={3}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Escriba la descripción..."
                className="resize-y min-h-[85px] text-sm leading-relaxed"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t mt-2">
                {renderSelect('Prenda', extraPrenda, setExtraPrenda, prendaOptions)}
                {renderSelect('Género', extraGenero, handleGeneroChange, generoOptions)}
                {renderSelect('Marca', extraMarca, setExtraMarca, marcaOptions)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending || cargando} className="min-w-24">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
