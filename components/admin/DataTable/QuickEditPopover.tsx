'use client'

// components/admin/DataTable/QuickEditPopover.tsx

import React, { useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil } from 'lucide-react'
import { useDataTableContext } from './DataTableProvider'
import type { QuickEditField } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  field: QuickEditField
  value: unknown
  rowId: string | number
  /** Si se provee un field.key en onSave global, usa ese; si no, usa field.key */
  onSaveGlobal?: (ids: number[], fieldKey: string, value: unknown) => Promise<void>
  children: React.ReactNode
}

export function QuickEditPopover({
  field,
  value,
  rowId,
  onSaveGlobal,
  children,
}: Props) {
  const ctx = useDataTableContext()
  const [open, setOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editValue, setEditValue] = useState<unknown>(value)
  const [isPending, startTransition] = useTransition()

  const hasBulk = ctx.selectedIds.size > 1
  const isInSelection = ctx.selectedIds.has(rowId)
  const targetCount = hasBulk && isInSelection ? ctx.selectedIds.size : 1
  const targetIds = hasBulk && isInSelection
    ? Array.from(ctx.selectedIds).map(Number)
    : [Number(rowId)]

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setEditValue(value)
      setShowConfirm(false)
    }
    setOpen(newOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (hasBulk && !showConfirm) {
      setShowConfirm(true)
      return
    }

    const finalValue = normalizeValue(editValue, field.type)

    startTransition(async () => {
      if (onSaveGlobal) {
        await onSaveGlobal(targetIds, field.key, finalValue)
      }
      setOpen(false)
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 -mx-2 hover:bg-muted/60 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <span>{children}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <Label className="text-sm font-medium">Editar: {field.label}</Label>
            {hasBulk && isInSelection && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {targetCount} SEL.
              </Badge>
            )}
          </div>

          {!showConfirm ? (
            <div className="space-y-2">
              {field.type === 'text' && (
                <Input
                  type="text"
                  value={(editValue ?? '') as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={field.placeholder}
                  autoFocus
                />
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
                    <SelectValue placeholder={field.placeholder ?? 'Seleccionar...'} />
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
    case 'date':
    default:
      return typeof value === 'string' && value.trim() === '' ? null : value
  }
}