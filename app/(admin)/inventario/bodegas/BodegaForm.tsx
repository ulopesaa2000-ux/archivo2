// app/(admin)/inventario/bodegas/BodegaForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Loader2, AlertCircle } from 'lucide-react'
import { crearBodegaAction, actualizarBodegaAction } from '@/modules/inventario/actions'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  mode: 'create' | 'edit'
  bodega?: BodegaRow
}

export function BodegaForm({ mode, bodega }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = mode === 'create'
        ? await crearBodegaAction(formData)
        : await actualizarBodegaAction(formData)

      if (!result.success) {
        setError(result.error ?? 'Error desconocido.')
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        mode === 'create' ? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Bodega
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Bodega' : `Editar ${bodega?.nombre}`}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'edit' && (
            <input type="hidden" name="bodega_id" value={bodega?.id} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                name="codigo"
                defaultValue={bodega?.codigo ?? ''}
                required
                placeholder="SUC001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={bodega?.nombre ?? ''}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={bodega?.direccion ?? ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                name="ciudad"
                defaultValue={bodega?.ciudad ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                defaultValue={bodega?.telefono ?? ''}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="es_matriz"
                name="es_matriz"
                value="true"
                defaultChecked={bodega?.es_matriz ?? false}
              />
              <Label htmlFor="es_matriz" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                🏛️ Bodega Matriz (1 por ciudad)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="es_virtual"
                name="es_virtual"
                value="true"
                defaultChecked={bodega?.es_virtual ?? false}
              />
              <Label htmlFor="es_virtual" className="text-sm font-normal">
                Bodega virtual
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="activa"
                name="activa"
                value="true"
                defaultChecked={bodega?.activa ?? true}
              />
              <Label htmlFor="activa" className="text-sm font-normal">
                Activa
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {mode === 'create' ? 'Crear Bodega' : 'Guardar Cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
