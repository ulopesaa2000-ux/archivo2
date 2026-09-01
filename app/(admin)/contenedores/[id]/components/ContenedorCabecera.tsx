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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Pencil, Save, X, Loader2, AlertCircle, Warehouse, Check, FileCheck, FileX, DollarSign, Calendar
} from 'lucide-react'
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

import { ResumenContenedorModal } from './ResumenContenedorModal'

const IMPORTADORES_SUGERIDOS = ['VARDIT', 'ABRAHAM', 'ILAN', 'ARIEL']

const DOC_KEYS = [
  { key: 'bl', label: 'B/L (Bill of Lading)' },
  { key: 'factura', label: 'Factura Comercial' },
  { key: 'packing_list', label: 'Packing List' },
  { key: 'telex', label: 'Télex Release' },
  { key: 'muestras', label: 'Muestras' },
]

export function ContenedorCabecera({
  contenedor, resumen, bodegasVirtuales = [],
  canEdit = true,
}: {
  contenedor: ContenedorRow
  resumen: ContenedorResumen | null
  bodegasVirtuales?: BodegaRow[]
  canEdit?: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Surtir dialog
  const [surtirOpen, setSurtirOpen] = useState(false)
  const [bodegaVirtualId, setBodegaVirtualId] = useState<number | null>(null)
  const [surtiendo, setSurtiendo] = useState(false)

  // Estado del checklist de documentos
  const [docsChecklist, setDocsChecklist] = useState<Record<string, boolean>>(() => {
    return (contenedor.documentos_checklist as Record<string, boolean>) || {
      bl: false,
      factura: false,
      packing_list: false,
      telex: false,
      muestras: false,
    }
  })

  const estadoColor = ESTADO_CONTENEDOR_COLORS[contenedor.estado ?? ''] ?? ''
  const transicionesPermitidas = TRANSICIONES_CONTENEDOR[contenedor.estado ?? ''] ?? []

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('contenedor_id', String(contenedor.id))
    fd.set('documentos_checklist', JSON.stringify(docsChecklist))

    startTransition(async () => {
      const result = await actualizarContenedorAction(fd)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      setIsEditing(false)
      router.refresh()
    })
  }

  const handleCancel = () => {
    setDocsChecklist((contenedor.documentos_checklist as Record<string, boolean>) || {
      bl: false,
      factura: false,
      packing_list: false,
      telex: false,
      muestras: false,
    })
    setIsEditing(false)
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Resumen / Exportar Tabla Excel */}
          <ResumenContenedorModal
            contenedorId={contenedor.id}
            codigoContenedor={contenedor.codigo_contenedor}
          />

          {/* Estado con transiciones */}
          {canEdit && transicionesPermitidas.length > 0 && (
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

          {canEdit && contenedor.estado === 'en_bodega' && bodegasVirtuales.length > 0 && (
            <Button
              variant="default" size="sm"
              onClick={() => { setBodegaVirtualId(bodegasVirtuales[0]?.id ?? null); setSurtirOpen(true) }}
              disabled={isPending}
            >
              <Warehouse className="h-3.5 w-3.5 mr-1" /> Surtir a bodega virtual
            </Button>
          )}

          {canEdit && !isEditing && (
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
                <SelectValue>
                  {bodegaVirtualId
                    ? (() => {
                        const selected = bodegasVirtuales.find((b) => b.id === bodegaVirtualId)
                        return selected ? `${selected.nombre} (${selected.codigo})` : 'Seleccionar bodega virtual...'
                      })()
                    : 'Seleccionar bodega virtual...'}
                </SelectValue>
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
            <form key={contenedor.id} onSubmit={handleSave} className="space-y-6">
              {/* Sección 1: Datos Base */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1">
                  Datos Base del Contenedor
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1"><Label className="text-xs">Código</Label>
                    <Input name="codigo_contenedor" defaultValue={contenedor.codigo_contenedor} required className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">N° Contenedor</Label>
                    <Input name="numero_contenedor" defaultValue={contenedor.numero_contenedor ?? ''} className="h-9" /></div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-primary">Importador</Label>
                    <Input
                      list="importadores-cabecera"
                      name="importador"
                      defaultValue={(contenedor.documentos_checklist as any)?.importador ?? ''}
                      placeholder="ej. VARDIT, ABRAHAM, ILAN..."
                      className="h-9"
                    />
                    <datalist id="importadores-cabecera">
                      {IMPORTADORES_SUGERIDOS.map((imp) => (
                        <option key={imp} value={imp} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-primary">Pagador</Label>
                    <Input
                      list="pagadores-cabecera"
                      name="pagador"
                      defaultValue={(contenedor.documentos_checklist as any)?.pagador ?? ''}
                      placeholder="ej. VARDIT, ABRAHAM..."
                      className="h-9"
                    />
                    <datalist id="pagadores-cabecera">
                      {IMPORTADORES_SUGERIDOS.map((imp) => (
                        <option key={imp} value={imp} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Naviera / Agente Aduanal</Label>
                    <Input name="naviera" defaultValue={contenedor.naviera ?? ''} placeholder="ej. VARDIT, SHENZHEN HYT..." className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">N° BL</Label>
                    <Input name="numero_bl" defaultValue={contenedor.numero_bl ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">Buque / Viaje</Label>
                    <Input name="buque" defaultValue={contenedor.buque ?? ''} placeholder="ej. NAVIOS JASMINE/614N" className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">Puerto Origen</Label>
                    <Input name="puerto_origen" defaultValue={contenedor.puerto_origen ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">Puerto Destino</Label>
                    <Input name="puerto_destino" defaultValue={contenedor.puerto_destino ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">ETD (Salida)</Label>
                    <Input type="date" name="fecha_etd" defaultValue={contenedor.fecha_etd?.slice(0, 10) ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">ETA (Llegada Est.)</Label>
                    <Input type="date" name="fecha_eta" defaultValue={contenedor.fecha_eta?.slice(0, 10) ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">Peso (kg)</Label>
                    <Input type="number" step="0.01" name="peso_total_kg" defaultValue={contenedor.peso_total_kg ?? ''} className="h-9" /></div>
                  <div className="space-y-1"><Label className="text-xs">CBM Total</Label>
                    <Input type="number" step="0.001" name="cbm_total" defaultValue={contenedor.cbm_total ?? ''} className="h-9" /></div>
                </div>
              </div>

              <Separator />

              {/* Sección 2: Logística y Costos */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1">
                  Logística y Costos Extra
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha de Llegada Real</Label>
                    <Input type="date" name="fecha_llegada_real" defaultValue={contenedor.fecha_llegada_real?.slice(0, 10) ?? ''} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo Flete Marítimo (USD)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" name="costo_flete_maritimo" defaultValue={contenedor.costo_flete_maritimo ?? ''} className="h-9 pl-8" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo Desaduanamiento / Pasada</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" name="costo_desaduanamiento" defaultValue={contenedor.costo_desaduanamiento ?? ''} className="h-9 pl-8" />
                    </div>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Detalles de Pago de Flete / Naviera</Label>
                    <Input name="pago_flete_detalles" defaultValue={contenedor.pago_flete_detalles ?? ''} className="h-9" placeholder="Ej. Pagado por transferencia el 12/03, saldo pendiente..." />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sección 3: Documentación & Comentarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Checklist de Documentación</h3>
                  <div className="space-y-2.5 bg-muted/40 p-4 rounded-lg border">
                    {DOC_KEYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={`switch-${key}`} className="text-xs font-medium cursor-pointer">
                          {label}
                        </Label>
                        <Switch
                          id={`switch-${key}`}
                          checked={!!docsChecklist[key]}
                          onCheckedChange={(checked) =>
                            setDocsChecklist((prev) => ({ ...prev, [key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Comentarios y Observaciones</h3>
                  <div className="space-y-1 h-full">
                    <Label className="text-xs shrink-0 block">Comentarios Generales</Label>
                    <Textarea
                      name="comentarios"
                      defaultValue={contenedor.comentarios ?? ''}
                      rows={6}
                      className="resize-none"
                      placeholder="Escribe comentarios sobre demoras, revisiones en aduana u observaciones adicionales..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  <Save className="h-3.5 w-3.5 mr-1" /> Guardar Cambios
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Encabezado */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold font-mono">{contenedor.numero_contenedor ?? contenedor.codigo_contenedor}</h2>
                <Badge className={estadoColor}>{ESTADO_CONTENEDOR_LABELS[contenedor.estado ?? ''] ?? contenedor.estado}</Badge>
                {(contenedor.documentos_checklist as any)?.importador && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Importador: {(contenedor.documentos_checklist as any).importador}
                  </Badge>
                )}
                {(contenedor.documentos_checklist as any)?.pagador && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Pagador: {(contenedor.documentos_checklist as any).pagador}
                  </Badge>
                )}
              </div>

              {/* Grid 1: Datos Base */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Importador</span>
                  <p className="text-base font-bold text-primary">{(contenedor.documentos_checklist as any)?.importador ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pagador</span>
                  <p className="text-base font-bold text-foreground">{(contenedor.documentos_checklist as any)?.pagador ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Naviera / Agente</span>
                  <p className="text-base font-bold text-foreground">{contenedor.naviera ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">BL</span>
                  <p className="font-mono text-sm font-semibold">{contenedor.numero_bl ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Buque / Viaje</span>
                  <p className="text-base font-semibold">{contenedor.buque ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ruta</span>
                  <p className="text-xs font-medium">{contenedor.puerto_origen ?? '?'} → {contenedor.puerto_destino ?? '?'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ETD (Salida)</span>
                  <p className="text-base font-semibold"><Fecha valor={contenedor.fecha_etd} formato="fecha" /></p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ETA (Llegada Est.)</span>
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

              <Separator />

              {/* Grid 2: Logística Avanzada y Costos */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Logística Avanzada y Costos Extra
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/20 p-4 rounded-lg border">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ETA de Llegada Real</span>
                    <p className="text-base font-semibold">
                      {contenedor.fecha_llegada_real ? <Fecha valor={contenedor.fecha_llegada_real} formato="fecha" /> : 'Sin registrar'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Costo Flete Marítimo</span>
                    <p className="text-base font-bold text-foreground">
                      {contenedor.costo_flete_maritimo != null ? formatCurrency(contenedor.costo_flete_maritimo, 'USD') : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Costo Desaduanamiento</span>
                    <p className="text-base font-bold text-foreground">
                      {contenedor.costo_desaduanamiento != null ? formatCurrency(contenedor.costo_desaduanamiento, 'USD') : '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-3 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Detalles de Pago de Flete</span>
                    <p className="text-sm font-medium text-foreground">{contenedor.pago_flete_detalles ?? 'Sin detalles de pago'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Grid 3: Checklist de Documentos & Comentarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Checklist */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Checklist de Documentos Recibidos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/10 p-3 rounded-lg border border-border/80">
                    {DOC_KEYS.map(({ key, label }) => {
                      const recibido = !!docsChecklist[key]
                      return (
                        <div key={key} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 transition-colors">
                          {recibido ? (
                            <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <FileX className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                          <span className={`text-xs ${recibido ? 'font-semibold text-foreground' : 'text-muted-foreground/70'}`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Comentarios */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Comentarios y Observaciones
                  </h3>
                  <div className="bg-muted/20 p-4 rounded-lg border min-h-[100px] flex flex-col justify-between">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {contenedor.comentarios || 'Sin comentarios registrados para este contenedor.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
