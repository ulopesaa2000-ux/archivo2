// app/(admin)/inventario/notas/nueva/_components/NotaHeaderCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Camera,
  ClipboardPaste,
  Package,
  RotateCcw,
  Scale,
  Trash2,
  Upload,
} from 'lucide-react'
import { TIPO_MOVIMIENTO_COLORS } from '@/lib/constants'
import { cn, todayMX } from '@/lib/utils'
import { NotaFechaPicker } from '@/components/admin/NotaFechaPicker'
import { OcrUploadModal } from '../../propuestas/OcrUploadModal'
import type { BodegaRow, TipoMovimientoRow } from '@/lib/types/tables'
import type { DraftNota } from '@/modules/inventario/types'
import type { ConfigInventario } from '@/modules/inventario/config-types'

const TIPO_MOV_ICONS_COMP = {
  ENT: ArrowDownLeft,
  SAL: ArrowUpRight,
  TRF: ArrowLeftRight,
  AJU: Scale,
  DEV: RotateCcw,
}

interface NotaHeaderCardProps {
  mode: 'create' | 'edit'
  draft: DraftNota
  tiposMovimientoVisibles: TipoMovimientoRow[]
  allTiposMovimiento: TipoMovimientoRow[]
  allowedBodegas: BodegaRow[]
  allBodegas: BodegaRow[]
  tipoSeleccionado: TipoMovimientoRow | undefined
  currentBodegaNombre: string | undefined
  puedeEditarTipo: boolean
  puedeEditarBodegaOrigen: boolean
  puedeEditarBodegaDestino: boolean
  todoBloqueado: boolean
  soloEditaDestino: boolean
  esAdmin: boolean
  config?: ConfigInventario
  showOpcionesOpcionales: boolean
  onToggleOpcionesOpcionales: () => void
  comprobantePreview: string | null
  isDraggingComprobante: boolean
  onRequestTipoChange: (id: number) => void
  onRequestBodegaOrigenChange: (id: number) => void
  onUpdateDraftField: <K extends keyof DraftNota>(field: K, value: DraftNota[K]) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onPasteClipboard: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  mismatchBanner?: React.ReactNode
}

export function NotaHeaderCard({
  mode,
  draft,
  tiposMovimientoVisibles,
  allTiposMovimiento,
  allowedBodegas,
  allBodegas,
  tipoSeleccionado,
  currentBodegaNombre,
  puedeEditarTipo,
  puedeEditarBodegaOrigen,
  puedeEditarBodegaDestino,
  todoBloqueado,
  soloEditaDestino,
  esAdmin,
  config,
  showOpcionesOpcionales,
  onToggleOpcionesOpcionales,
  comprobantePreview,
  isDraggingComprobante,
  onRequestTipoChange,
  onRequestBodegaOrigenChange,
  onUpdateDraftField,
  onFileChange,
  onClearFile,
  onPasteClipboard,
  onDragOver,
  onDragLeave,
  onDrop,
  mismatchBanner,
}: NotaHeaderCardProps) {
  return (
    <Card className="w-full shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/20 border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-black tracking-tight uppercase text-muted-foreground opacity-80">
          Detalles Generales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tipo de Movimiento *
          </Label>
          <div
            className={cn(
              'grid gap-2 sm:gap-3',
              tiposMovimientoVisibles.length === 1
                ? 'grid-cols-1'
                : tiposMovimientoVisibles.length === 2
                ? 'grid-cols-2'
                : tiposMovimientoVisibles.length === 3
                ? 'grid-cols-3'
                : tiposMovimientoVisibles.length === 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-5'
            )}
          >
            {tiposMovimientoVisibles.map((t) => {
              const Icon = TIPO_MOV_ICONS_COMP[t.codigo as keyof typeof TIPO_MOV_ICONS_COMP] || Package
              const isSelected = draft.tipo_movimiento_id === t.id
              const colorMap = TIPO_MOVIMIENTO_COLORS[t.codigo] || 'bg-primary text-primary-foreground'
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!puedeEditarTipo}
                  onClick={() => onRequestTipoChange(t.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border transition-all text-center gap-1.5 group min-h-[64px] sm:min-h-[72px]',
                    !puedeEditarTipo && 'opacity-50 cursor-not-allowed',
                    isSelected
                      ? cn(
                          'border-transparent font-bold shadow-lg shadow-black/10 scale-102 ring-2 ring-primary/20',
                          colorMap.split(' ')[0],
                          colorMap.split(' ')[1]
                        )
                      : 'bg-background hover:bg-muted/80 text-muted-foreground border-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-none">
                    {t.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {mismatchBanner}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fecha del Movimiento *
            </Label>
            <NotaFechaPicker
              value={draft.fecha_nota || todayMX()}
              onChange={(date) => onUpdateDraftField('fecha_nota', date)}
              disabled={todoBloqueado || soloEditaDestino}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bodega Origen *
            </Label>
            <Select
              value={draft.bodega_origen_id?.toString() ?? ''}
              onValueChange={(v) => v && onRequestBodegaOrigenChange(parseInt(v, 10))}
              disabled={!puedeEditarBodegaOrigen}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Seleccionar origen...">
                  {allowedBodegas.find((b) => String(b.id) === draft.bodega_origen_id?.toString())?.nombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allowedBodegas.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nombre}
                    {b.es_virtual && (
                      <Badge variant="secondary" className="ml-2 text-[9px] font-black uppercase leading-none">
                        Virtual
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tipoSeleccionado?.requiere_destino && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bodega Destino *
              </Label>
              <Select
                value={draft.bodega_destino_id?.toString() ?? ''}
                onValueChange={(v) => v && onUpdateDraftField('bodega_destino_id', parseInt(v, 10))}
                disabled={!puedeEditarBodegaDestino}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Seleccionar destino...">
                    {allBodegas.find((b) => String(b.id) === draft.bodega_destino_id?.toString())?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allBodegas
                    .filter((b) => b.id !== draft.bodega_origen_id && (esAdmin || !b.es_virtual))
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.nombre}
                        {b.es_virtual && (
                          <Badge variant="secondary" className="ml-2 text-[9px] font-black uppercase leading-none">
                            Virtual
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Referencia (opcional)
            </Label>
            <Input
              value={draft.nota_referencia}
              onChange={(e) => onUpdateDraftField('nota_referencia', e.target.value)}
              placeholder="Ej: OC-2026-043"
              maxLength={50}
              className="h-11 rounded-xl"
              disabled={todoBloqueado || soloEditaDestino}
            />
          </div>

          {(tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF') && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Costo Total de la Nota ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draft.costo_total || ''}
                onChange={(e) => onUpdateDraftField('costo_total', e.target.value ? parseFloat(e.target.value) : 0)}
                placeholder="Ej: 12500.00"
                className="h-11 rounded-xl"
                disabled={todoBloqueado || soloEditaDestino}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Observaciones (opcional)
          </Label>
          <Textarea
            value={draft.observaciones}
            onChange={(e) => onUpdateDraftField('observaciones', e.target.value)}
            placeholder="Ingresa notas, chofer, placas, etc..."
            rows={2}
            className="rounded-xl"
            disabled={todoBloqueado || soloEditaDestino}
          />
        </div>

        <div className="border border-dashed rounded-2xl p-4 bg-muted/20 space-y-3 mt-4">
          <button
            type="button"
            onClick={onToggleOpcionesOpcionales}
            className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>Herramientas Opcionales (Foto Comprobante / Escáner OCR)</span>
              {comprobantePreview && <Badge variant="secondary" className="text-[9px]">Foto adjunta</Badge>}
            </div>
            <span className="text-[10px] uppercase font-mono">
              {showOpcionesOpcionales ? '▲ Ocultar' : '▼ Desplegar'}
            </span>
          </button>

          {showOpcionesOpcionales && (
            <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Adjuntar Foto Comprobante
                </Label>
                {comprobantePreview ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      id="comprobante-uploader"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="comprobante-uploader"
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed hover:border-primary/50 cursor-pointer bg-background text-xs font-semibold"
                    >
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <span>Cambiar foto</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl text-xs font-bold"
                      onClick={onClearFile}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className="space-y-2">
                    <Input
                      type="file"
                      id="comprobante-uploader"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <div
                      className={cn(
                        'flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-2xl border-2 border-dashed transition-all',
                        isDraggingComprobante
                          ? 'border-primary bg-primary/10 scale-[1.01]'
                          : 'border-muted-foreground/30 hover:border-primary/50 bg-background hover:bg-muted/20'
                      )}
                    >
                      <Label
                        htmlFor="comprobante-uploader"
                        className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Upload className="h-4 w-4 text-primary" />
                        <span>{isDraggingComprobante ? '¡Suelta la imagen aquí!' : 'Subir archivo o arrastrar foto'}</span>
                      </Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onPasteClipboard}
                        className="h-8 text-[11px] font-bold gap-1 rounded-xl shrink-0"
                        title="Pegar imagen del portapapeles (Ctrl + V)"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        <span>Pegar Portapapeles</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'create' && (
                <div className="space-y-2 flex flex-col justify-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Escanear Nota Física con IA
                  </Label>
                  <OcrUploadModal
                    redirectToNueva
                    bodegaOrigenNombre={currentBodegaNombre}
                    priorizarIa={config?.ocr_priorizar_tipo_detectado !== false}
                    fechaNota={draft.fecha_nota}
                    defaultTipoCodigo={tipoSeleccionado?.codigo}
                    tiposMovimiento={allTiposMovimiento}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
