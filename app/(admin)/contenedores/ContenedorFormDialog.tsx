// app/(admin)/contenedores/ContenedorFormDialog.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Loader2, AlertCircle } from 'lucide-react'
import { crearContenedorAction, actualizarContenedorAction } from '@/modules/contenedores/actions'
import type { ContenedorRow } from '@/lib/types/tables'

type Props = {
  mode: 'create' | 'edit'
  contenedor?: ContenedorRow
}

export function ContenedorFormDialog({ mode, contenedor }: Props) {
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
        ? await crearContenedorAction(formData)
        : await actualizarContenedorAction(formData)

      if (!result.success) { setError(result.error ?? 'Error.'); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === 'create' ? (
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo Contenedor</Button>
          ) : (
            <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
          )
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Crear Contenedor' : 'Editar Contenedor'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}

        <form key={mode === 'edit' ? contenedor?.id ?? 'edit' : 'create'} onSubmit={handleSubmit} className="space-y-4">
          {mode === 'edit' && <input type="hidden" name="contenedor_id" value={contenedor?.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input name="codigo_contenedor" defaultValue={contenedor?.codigo_contenedor ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label>N° Contenedor</Label>
              <Input name="numero_contenedor" defaultValue={contenedor?.numero_contenedor ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Naviera</Label>
              <Input name="naviera" defaultValue={contenedor?.naviera ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>N° BL</Label>
              <Input name="numero_bl" defaultValue={contenedor?.numero_bl ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Buque</Label>
              <Input name="buque" defaultValue={contenedor?.buque ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Puerto Origen</Label>
              <Input name="puerto_origen" defaultValue={contenedor?.puerto_origen ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Puerto Destino</Label>
              <Input name="puerto_destino" defaultValue={contenedor?.puerto_destino ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>ETD</Label>
              <Input type="date" name="fecha_etd" defaultValue={contenedor?.fecha_etd?.slice(0, 10) ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>ETA</Label>
              <Input type="date" name="fecha_eta" defaultValue={contenedor?.fecha_eta?.slice(0, 10) ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Peso Total (kg)</Label>
              <Input type="number" step="0.01" name="peso_total_kg" defaultValue={contenedor?.peso_total_kg ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>CBM Total</Label>
              <Input type="number" step="0.001" name="cbm_total" defaultValue={contenedor?.cbm_total ?? ''} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Crear' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
