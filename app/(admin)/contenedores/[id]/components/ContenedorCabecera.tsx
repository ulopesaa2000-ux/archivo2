// app/(admin)/contenedores/[id]/components/ContenedorCabecera.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Pencil, Save, X, Loader2, AlertCircle, Warehouse, Check } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { formatCurrency } from '@/lib/utils'
import {
  ADMIN_ROUTES, ESTADO_CONTENEDOR_COLORS, ESTADO_CONTENEDOR_LABELS,
  TRANSICIONES_CONTENEDOR,
} from '@/lib/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  actualizarContenedorAction, cambiarEstadoContenedorAction,
  surtirContenedorAction,
} from '@/modules/contenedores/actions'
import type { ContenedorRow, BodegaRow } from '@/lib/types/tables'
import type { ContenedorResumen } from '@/modules/contenedores/types'

export function ContenedorCabecera({
  contenedor, resumen, bodegasVirtuales = [],
}: {
  contenedor: ContenedorRow
  resumen: ContenedorResumen | null
  bodegasVirtuales?: BodegaRow[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Surtir dialog
  const [surtirOpen, setSurtirOpen] = useState(false)
  const [bodegaVirtualId, setBodegaVirtualId] = useState<number | null>(null)
  const [surtiendo, setSurtiendo] = useState(false)

  const estadoColor = ESTADO_CONTENEDOR_COLORS[contenedor.estado ?? ''] ?? ''
  const transicionesPermitidas = TRANSICIONES_CONTENEDOR[contenedor.estado ?? ''] ?? []

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('contenedor_id', String(contenedor.id))

    startTransition(async () => {
      const result = await actualizarContenedorAction(fd)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      setIsEditing(false)
      router.refresh()
    })
  }

  const handleEstado = (nuevoEstado: string) => {
    startTransition(async () => {
      const result = await cambiarEstadoContenedorAction(contenedor.id, nuevoEstado)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  const handleSurtir = () => {
    if (!bodegaVirtualId) { setError('Selecciona una bodega virtual.'); return }
    setSurtiendo(true)
    setError(null)

    startTransition(async () => {
      const result = await surtirContenedorAction(contenedor.id, bodegaVirtualId)
      setSurtiendo(false)
      setSurtirOpen(false)

      if (!result.success) { setError(result.error ?? 'Error al surtir.'); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={ADMIN_ROUTES.contenedores.lista}
            className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Contenedores
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono">{contenedor.codigo_contenedor}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Estado con transiciones */}
          {transicionesPermitidas.length > 0 && (
            <Select onValueChange={(v: any) => { if (v) handleEstado(v) }} disabled={isPending}>
              <SelectTrigger data-testid="contenedor-estado-trigger" className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Cambiar estado..." />
              </SelectTrigger>
              <SelectContent>
                {transicionesPermitidas.map((e) => (
                  <SelectItem key={e} value={e}>
                    → {ESTADO_CONTENEDOR_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {contenedor.estado === 'en_bodega' && bodegasVirtuales.length > 0 && (
            <Button
              variant="default" size="sm"
              onClick={() => { setBodegaVirtualId(bodegasVirtuales[0]?.id ?? null); setSurtirOpen(true) }}
              disabled={isPending}
            >
              <Warehouse className="h-3.5 w-3.5 mr-1" /> Surtir a bodega virtual
            </Button>
          )}

          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          )}
        </div>
      </div>

      {/* Dialog: Surtir a bodega virtual */}
      <Dialog open={surtirOpen} onOpenChange={setSurtirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Surtir contenedor a bodega virtual</DialogTitle>
            <DialogDescription>
              Se creará una nota de entrada para convertir las cajas del contenedor
              en stock de la bodega virtual. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="bodega-virtual" className="text-sm font-medium">
              Bodega virtual destino
            </Label>
            <Select
              value={bodegaVirtualId ? String(bodegaVirtualId) : ''}
              onValueChange={(v) => setBodegaVirtualId(v ? parseInt(v) : null)}
            >
              <SelectTrigger id="bodega-virtual">
                <SelectValue placeholder="Seleccionar bodega virtual..." />
              </SelectTrigger>
              <SelectContent>
                {bodegasVirtuales.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nombre} ({b.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSurtirOpen(false)} disabled={surtiendo}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSurtir} disabled={!bodegaVirtualId || surtiendo}>
              {surtiendo && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Check className="h-3.5 w-3.5 mr-1" /> Confirmar surtido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isEditing ? (
            <form key={contenedor.id} onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-xs">Código</Label>
                  <Input name="codigo_contenedor" defaultValue={contenedor.codigo_contenedor} required className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">N° Contenedor</Label>
                  <Input name="numero_contenedor" defaultValue={contenedor.numero_contenedor ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Naviera</Label>
                  <Input name="naviera" defaultValue={contenedor.naviera ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">N° BL</Label>
                  <Input name="numero_bl" defaultValue={contenedor.numero_bl ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Buque</Label>
                  <Input name="buque" defaultValue={contenedor.buque ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Puerto Origen</Label>
                  <Input name="puerto_origen" defaultValue={contenedor.puerto_origen ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Puerto Destino</Label>
                  <Input name="puerto_destino" defaultValue={contenedor.puerto_destino ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">ETD</Label>
                  <Input type="date" name="fecha_etd" defaultValue={contenedor.fecha_etd?.slice(0, 10) ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">ETA</Label>
                  <Input type="date" name="fecha_eta" defaultValue={contenedor.fecha_eta?.slice(0, 10) ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Peso (kg)</Label>
                  <Input type="number" step="0.01" name="peso_total_kg" defaultValue={contenedor.peso_total_kg ?? ''} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">CBM Total</Label>
                  <Input type="number" step="0.001" name="cbm_total" defaultValue={contenedor.cbm_total ?? ''} className="h-9" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isPending}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold font-mono">{contenedor.numero_contenedor ?? contenedor.codigo_contenedor}</h2>
                <Badge className={estadoColor}>{ESTADO_CONTENEDOR_LABELS[contenedor.estado ?? ''] ?? contenedor.estado}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Naviera</span>
                  <p className="text-base font-bold text-foreground">{contenedor.naviera ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BL</span>
                  <p className="font-mono text-sm font-semibold">{contenedor.numero_bl ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Buque</span>
                  <p className="text-base font-semibold">{contenedor.buque ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ruta</span>
                  <p className="text-xs font-medium">{contenedor.puerto_origen ?? '?'} → {contenedor.puerto_destino ?? '?'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ETD</span>
                  <p className="text-base font-semibold"><Fecha valor={contenedor.fecha_etd} formato="fecha" /></p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ETA</span>
                  <p className="text-base font-semibold"><Fecha valor={contenedor.fecha_eta} formato="fecha" /></p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Peso (kg)</span>
                  <p className="text-base font-bold tabular-nums">{contenedor.peso_total_kg ? `${contenedor.peso_total_kg} kg` : '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CBM</span>
                  <p className="text-base font-bold tabular-nums italic">
                    {resumen?.cbm_ocupado ?? 0} / {contenedor.cbm_total ?? '?'}
                    {resumen?.pct_cbm_ocupado != null && <span className="text-muted-foreground ml-1 text-xs font-normal">({resumen.pct_cbm_ocupado}%)</span>}
                  </p>
                </div>
                {resumen && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Órdenes</span>
                      <p className="text-2xl font-black tabular-nums tracking-tight">{resumen.total_ordenes}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cajas</span>
                      <p className="text-2xl font-black tabular-nums tracking-tight">{resumen.cajas_totales}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Piezas</span>
                      <p className="text-2xl font-black tabular-nums tracking-tight">{resumen.piezas_totales}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Valor Total</span>
                      <p className="text-base font-bold text-primary">{resumen.valor_total_usd ? formatCurrency(resumen.valor_total_usd, 'USD') : '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
