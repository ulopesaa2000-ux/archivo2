'use client'

// components/admin/DataTable/QuickEditPopover.tsx

import React, { useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useDataTableContext } from './DataTableProvider'
import type { QuickEditField } from './types'
import { detectProductAttributesFromText, inferEdadFromGeneroAndText, type DetectorCatalogos } from '@/modules/catalogo/utils/detector'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type CompanionOption = { id: number | string; label: string }

type Props = {
  field?: QuickEditField | null
  value: unknown
  rowId: string | number
  /** Si se provee un field.key en onSave global, usa ese; si no, usa field.key */
  onSaveGlobal?: (ids: number[], fieldKey: string, value: unknown) => Promise<void>
  onSaveRecord?: (ids: number[], updates: Record<string, unknown>) => Promise<void>
  companionFields?: {
    prenda?: { value: number | null; options: CompanionOption[] }
    genero?: { value: number | null; options: CompanionOption[] }
    edad?: { value: number | null; options: CompanionOption[] }
    marca?: { value: number | null; options: CompanionOption[] }
  }
  catalogos?: DetectorCatalogos
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function QuickEditPopover({
  field,
  value,
  rowId,
  onSaveGlobal,
  onSaveRecord,
  companionFields,
  catalogos,
  children,
  className,
  align = 'start',
}: Props) {
  const ctx = useDataTableContext()
  const [open, setOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editValue, setEditValue] = useState<unknown>(value)
  const [extraPrenda, setExtraPrenda] = useState<string>(companionFields?.prenda?.value ? String(companionFields.prenda.value) : '')
  const [extraGenero, setExtraGenero] = useState<string>(companionFields?.genero?.value ? String(companionFields.genero.value) : '')
  const [extraEdad, setExtraEdad] = useState<string>(companionFields?.edad?.value ? String(companionFields.edad.value) : '')
  const [extraMarca, setExtraMarca] = useState<string>(companionFields?.marca?.value ? String(companionFields.marca.value) : '')
  const [isPending, startTransition] = useTransition()

  if (!field) {
    return <>{children}</>
  }

  const isMultiline = field.type === 'textarea' || field.key === 'descripcion'

  const hasBulk = ctx.selectedIds.size > 1
  const isInSelection = ctx.selectedIds.has(rowId)
  const targetCount = hasBulk && isInSelection ? ctx.selectedIds.size : 1
  const targetIds = hasBulk && isInSelection
    ? Array.from(ctx.selectedIds).map(Number)
    : [Number(rowId)]

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setEditValue(value)
      setExtraPrenda(companionFields?.prenda?.value ? String(companionFields.prenda.value) : '')
      setExtraGenero(companionFields?.genero?.value ? String(companionFields.genero.value) : '')
      setExtraEdad(companionFields?.edad?.value ? String(companionFields.edad.value) : '')
      setExtraMarca(companionFields?.marca?.value ? String(companionFields.marca.value) : '')
      setShowConfirm(false)
    }
    setOpen(newOpen)
  }

  const handleGeneroChange = (newGenero: string | null) => {
    const val = newGenero === 'none' || !newGenero ? '' : newGenero
    setExtraGenero(val)
    if (catalogos) {
      const inferred = inferEdadFromGeneroAndText(val, String(editValue ?? ''), catalogos)
      if (inferred?.id) {
        setExtraEdad(String(inferred.id))
      }
    }
  }

  const handleAutoDetect = () => {
    const text = String(editValue ?? '').trim()
    if (!text) {
      toast.info('Ingresa una descripción para auto-detectar atributos.')
      return
    }
    if (!catalogos) return

    const detected = detectProductAttributesFromText(text, catalogos)
    if (detected.detectedCount === 0) {
      toast.info('No se detectaron coincidencias en el texto.')
      return
    }

    const detectedNames: string[] = []
    if (detected.tipo_prenda_id) {
      setExtraPrenda(String(detected.tipo_prenda_id))
      detectedNames.push(`Prenda: ${detected.tipo_prenda_nombre}`)
    }
    if (detected.genero_id) {
      setExtraGenero(String(detected.genero_id))
      detectedNames.push(`Género: ${detected.genero_nombre}`)
    }
    if (detected.edad_id) {
      setExtraEdad(String(detected.edad_id))
    }
    if (detected.marca_id) {
      setExtraMarca(String(detected.marca_id))
      detectedNames.push(`Marca: ${detected.marca_nombre}`)
    }

    toast.success(`Detectado (${detected.detectedCount}): ${detectedNames.join(', ')}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (hasBulk && !showConfirm) {
      setShowConfirm(true)
      return
    }

    const finalValue = normalizeValue(editValue, field.type)

    startTransition(async () => {
      if (companionFields && onSaveRecord) {
        const payload: Record<string, unknown> = {
          [field.key]: finalValue,
        }
        if (companionFields.prenda) {
          payload.tipo_prenda_id = extraPrenda ? Number(extraPrenda) : null
        }
        if (companionFields.genero) {
          payload.genero_id = extraGenero ? Number(extraGenero) : null
        }
        if (extraEdad) {
          payload.edad_id = Number(extraEdad)
        } else if (catalogos) {
          const { inferEdadFromGeneroAndText } = require('@/modules/catalogo/utils/detector')
          const autoEdad = inferEdadFromGeneroAndText(extraGenero, String(editValue ?? ''), catalogos)
          if (autoEdad?.id) payload.edad_id = autoEdad.id
        }
        if (companionFields.marca) {
          payload.marca_id = extraMarca ? Number(extraMarca) : null
        }
        await onSaveRecord(targetIds, payload)
      } else if (onSaveGlobal) {
        await onSaveGlobal(targetIds, field.key, finalValue)
      }
      setOpen(false)
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-muted/60 transition-colors",
          align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-between',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{children}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        className={cn(companionFields || isMultiline ? "w-[480px] max-w-[94vw]" : "w-80")}
        align={align === 'end' ? 'end' : align === 'center' ? 'center' : 'start'}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Editar: {field.label}</Label>
            {companionFields && catalogos && (
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
            )}
            {hasBulk && isInSelection && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {targetCount} SEL.
              </Badge>
            )}
          </div>

          {!showConfirm ? (
            <div className="space-y-3">
              {isMultiline ? (
                <Textarea
                  rows={3}
                  value={(editValue ?? '') as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={field.placeholder ?? 'Escriba la descripción...'}
                  className="resize-y min-h-[85px] text-sm leading-relaxed"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
              ) : field.type === 'text' ? (
                <Input
                  type="text"
                  value={(editValue ?? '') as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={field.placeholder}
                  autoFocus
                />
              ) : null}

              {companionFields && (
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t mt-2">
                  {companionFields.prenda && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">Prenda</Label>
                      <Select
                        value={extraPrenda}
                        onValueChange={(val) => setExtraPrenda(val === 'none' || !val ? '' : val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <span className="truncate text-left flex-1">
                            {companionFields.prenda.options.find(opt => String(opt.id) === String(extraPrenda))?.label ?? 'Sin asignar'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs text-muted-foreground italic">
                            Sin asignar
                          </SelectItem>
                          {companionFields.prenda.options.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {companionFields.genero && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">Género</Label>
                      <Select
                        value={extraGenero}
                        onValueChange={handleGeneroChange}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <span className="truncate text-left flex-1">
                            {companionFields.genero.options.find(opt => String(opt.id) === String(extraGenero))?.label ?? 'Sin asignar'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs text-muted-foreground italic">
                            Sin asignar
                          </SelectItem>
                          {companionFields.genero.options.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {companionFields.marca && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">Marca</Label>
                      <Select
                        value={extraMarca}
                        onValueChange={(val) => setExtraMarca(val === 'none' || !val ? '' : val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <span className="truncate text-left flex-1">
                            {companionFields.marca.options.find(opt => String(opt.id) === String(extraMarca))?.label ?? 'Sin asignar'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs text-muted-foreground italic">
                            Sin asignar
                          </SelectItem>
                          {companionFields.marca.options.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {field.type === 'number' && (
                <Input
                  type="number"
                  step="0.01"
                  value={String(editValue ?? '')}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
              )}

              {field.type === 'currency' && (
                <Input
                  type="number"
                  step="0.01"
                  value={String(editValue ?? '')}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              )}

              {field.type === 'select' && field.options && (
                <Select
                  value={String(editValue ?? '')}
                  onValueChange={(v) => setEditValue(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder ?? 'Seleccionar...'}>
                      {field.options.find(opt => String(opt.id) === String(editValue))?.label ?? field.placeholder ?? 'Seleccionar...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.id} value={String(opt.id)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === 'boolean' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(editValue as boolean) ?? false}
                    onChange={(e) => setEditValue(e.target.checked)}
                    className="h-4 w-4"
                    id={`bool-${field.key}-${rowId}`}
                  />
                  <Label htmlFor={`bool-${field.key}-${rowId}`} className="text-sm cursor-pointer">
                    {(editValue as boolean) ? 'Sí' : 'No'}
                  </Label>
                </div>
              )}

              {field.type === 'date' && (
                <Input
                  type="date"
                  value={(editValue ?? '') as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
              )}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                ¿Aplicar a <span className="font-bold underline">{targetCount}</span> registro{targetCount !== 1 ? 's' : ''}?
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={showConfirm ? 'destructive' : 'default'}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {showConfirm
                ? 'Confirmar'
                : hasBulk && isInSelection
                  ? 'Aplicar a todos'
                  : 'Aplicar'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normalizar valor según tipo de campo
// ─────────────────────────────────────────────────────────────────────────────
function normalizeValue(value: unknown, type: QuickEditField['type']): unknown {
  switch (type) {
    case 'number':
    case 'currency':
      return value !== null && value !== undefined && value !== ''
        ? parseFloat(String(value))
        : null
    case 'select':
      return value !== '' ? String(value) : null
    case 'boolean':
      return Boolean(value)
    case 'text':
    case 'textarea':
    case 'date':
    default:
      return typeof value === 'string' && value.trim() === '' ? null : value
  }
}