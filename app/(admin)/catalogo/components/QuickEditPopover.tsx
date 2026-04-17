'use client'

import React, { useState, useTransition } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
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
import { formatCurrency } from '@/lib/utils'

export type QuickEditConfig = {
  field: 'precio_ec' | 'estado' | 'marca_id' | 'descripcion' | 'familia'
  type: 'number' | 'estado' | 'marca' | 'text'
  label: string
}

type QuickEditPopoverProps = {
  config: QuickEditConfig
  value: any
  rowId: number
  selectedIds: Set<string | number>
  options?: { id: string | number; nombre: string }[] // Para marcas
  onSave: (ids: number[], payload: any) => Promise<void>
  children: React.ReactNode
}

export function QuickEditPopover({
  config,
  value,
  rowId,
  selectedIds,
  options = [],
  onSave,
  children,
}: QuickEditPopoverProps) {
  const [open, setOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editValue, setEditValue] = useState<any>(value)
  const [isPending, startTransition] = useTransition()

  // Si hay varios seleccionados Y la fila actual está en la selección, aplicar a todos.
  // De lo contrario, aplicar solo a la fila actual.
  const isBulk = selectedIds.size > 1 && selectedIds.has(rowId)
  const targetCount = isBulk ? selectedIds.size : 1
  const targetIds = isBulk ? Array.from(selectedIds).map(Number) : [rowId]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isBulk && !showConfirm) {
      setShowConfirm(true)
      return
    }
    
    let finalValue = editValue
    if (config.type === 'number') {
      finalValue = finalValue ? parseFloat(finalValue) : null
    }
    if (config.type === 'text') {
      finalValue = finalValue ? String(finalValue).trim() : null
    }

    startTransition(async () => {
      await onSave(targetIds, { [config.field]: finalValue })
      setOpen(false)
    })
  }

  // Prevenir que el click en el popover asalte eventos de la fila de tabla
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setEditValue(value) // reset al abrir
      setShowConfirm(false)
    }
    setOpen(newOpen)
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
        onClick={(e) => e.stopPropagation()} // detiene click propagation al row
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <PopoverHeader className="flex flex-row items-center justify-between">
            <PopoverTitle>Editar Rápido: {config.label}</PopoverTitle>
            {isBulk && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                {targetCount} SEL.
              </Badge>
            )}
          </PopoverHeader>

          {!showConfirm ? (
            <div className="space-y-2">
              <Label>Nuevo {config.label}</Label>
              
              {config.type === 'number' && (
                <Input
                  type="number"
                  step="0.01"
                  value={editValue ?? ''}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
              )}

              {config.type === 'text' && (
                <Input
                  type="text"
                  value={editValue ?? ''}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
              )}

              {config.type === 'estado' && (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="descontinuado">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {config.type === 'marca' && (
                <Select value={String(editValue || '')} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <span className="truncate flex flex-1 text-left">
                      {options.find(m => String(m.id) === String(editValue))?.nombre || "Sin marca"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                ¿Estás seguro de aplicar este cambio a <span className="font-bold underline text-sm">{targetCount} productos</span> seleccionados?
                <br />
                <span className="block mt-1 font-normal opacity-90">Esta acción actualizará todos los registros de forma masiva.</span>
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
            <Button type="submit" size="sm" variant={showConfirm ? "destructive" : "default"} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {showConfirm ? 'Confirmar cambios masivos' : isBulk ? 'Aplicar a seleccionados' : 'Aplicar'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
