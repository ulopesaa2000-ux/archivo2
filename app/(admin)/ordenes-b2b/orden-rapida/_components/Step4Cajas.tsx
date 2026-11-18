// app/(admin)/ordenes-b2b/orden-rapida/_components/Step4Cajas.tsx
'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Hand,
  Pencil,
  Plus,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { CajaEditPayload } from '@/lib/orden-rapida-cajas'
import type { CatalogoColorOrdenRapida } from '@/modules/ordenes-b2b/actions'
import { packKeyOf } from '../_hooks/use-orden-verificacion'
import type {
  AlertaN8nLocal,
  ColorDraft,
  ColorPorConfirmar,
  ContainerMock,
  WizardCaja,
  WizardParsedData,
  WizardProducto,
  WizardWarning,
} from '../_hooks/orden-rapida-types'
import { ComparisonBadge, WizardCajaRow, type ColorMatchRow } from './WizardAtoms'
import { Step4AuditoriaResumen } from './Step4AuditoriaResumen'
import { ColoresModal } from './ColoresModal'

interface Step4CajasProps {
  modoArrastre: boolean
  onToggleModoArrastre: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
  cajasAgrupadas: Array<{ producto: WizardProducto; cajas: WizardCaja[] }>
  totalCajasCount: number
  totalPiezasCount: number
  totalCbm: number
  totalPesoNeto: number
  totalPesoBruto: number
  parsedData: WizardParsedData | null
  overrideProductos: number | null
  onSetOverrideProductos: (v: number | null) => void
  overrideCajas: number | null
  onSetOverrideCajas: (v: number | null) => void
  overridePiezas: number | null
  onSetOverridePiezas: (v: number | null) => void
  overrideCbm: number | null
  onSetOverrideCbm: (v: number | null) => void
  overridePesoNeto: number | null
  onSetOverridePesoNeto: (v: number | null) => void
  overridePeso: number | null
  onSetOverridePeso: (v: number | null) => void
  onAbrirOverride: (
    key: 'productos' | 'cajas' | 'piezas' | 'cbm' | 'pesoNeto' | 'peso',
    label: string,
    actual: unknown
  ) => void
  huecosFisico: Array<{ key: string; sku: string; cajas: number; piezas: number }>
  huecosRellenados: string[]
  showHuecos: boolean
  onToggleShowHuecos: () => void
  onRellenarHuecos: () => void
  expandedProducts: Set<string>
  onToggleProduct: (sku: string) => void
  dragOverProducto: string | null
  onSetDragOverProducto: Dispatch<SetStateAction<string | null>>
  cajaArrastrada: string | null
  onMoverCaja: (codigoOrigen: string, skuDestino: string) => void
  jsonTotalesPorSku: Map<string, { piezas: number; cajas: number; cbm: number; peso: number; pesoNeto?: number }>
  alertasPorSku: Map<string, AlertaN8nLocal[]>
  alertasPorCaja: Map<string, AlertaN8nLocal[]>
  detallesPorCaja: Map<string, number>
  cajaPrincipalDe: (skuUpper: string, cajas: WizardCaja[]) => WizardCaja | null
  onSetPrincipalPorSku: Dispatch<SetStateAction<Record<string, string>>>
  lineaEsperada: (skuBase: string) => number
  lineaEditadaPorSku: Record<string, number>
  onSetLineaEditadaPorSku: Dispatch<SetStateAction<Record<string, number>>>
  editLineaSku: string | null
  onSetEditLineaSku: (sku: string | null) => void
  editLineaVal: string
  onSetEditLineaVal: (val: string) => void
  onCajaAdd: (producto: WizardProducto) => void
  lineaPackEsperada: (skuBase: string, pack: string) => number
  jsonPackTieneSku: (skuBase: string) => boolean
  lineaEditadaPorPack: Record<string, number>
  onSetLineaEditadaPorPack: Dispatch<SetStateAction<Record<string, number>>>
  editPackSku: string | null
  onSetEditPackSku: (key: string | null) => void
  editPackVal: string
  onSetEditPackVal: (val: string) => void
  editPackNombre: string | null
  onSetEditPackNombre: (key: string | null) => void
  editPackNombreVal: string
  onSetEditPackNombreVal: (val: string) => void
  onRenombrarPack: (skuBase: string, packViejo: string, packNuevo: string) => void
  onDividirPack: (skuBase: string, pack: string, cartonesSugeridos?: string[]) => void
  catalogoColores: CatalogoColorOrdenRapida[]
  matchColoresPorCaja: Map<string, ColorMatchRow[]>
  onToggleArrastrada: (codigo: string) => void
  onDragStartArrastrada: (codigo: string, e: React.DragEvent) => void
  onDragEndArrastrada: () => void
  onCajaEdit: (codigo: string, data: CajaEditPayload) => Promise<void>
  onCajaRemove: (codigo: string) => void
  onAbrirColoresRaw: (raw?: string) => void
  mapaNombres: Record<string, { id: number; nombre: string }>
  selectedContenedor: string
  newContainerCode: string
  newContainerNumber: string
  sortedContenedores: ContainerMock[]
  selectedContenedorObj: ContainerMock | undefined
  selectedContenedorEsSurtido: boolean
  warnings: WizardWarning[]
  showWarnings: boolean
  onToggleWarnings: () => void
  coloresNuevos: ColorPorConfirmar[]
  coloresOmitidos: ColorPorConfirmar[]
  coloresPorConfirmar: ColorPorConfirmar[]
  onEnsureDraftsAndOpenColores: () => void
  overrideModal: {
    key: 'productos' | 'cajas' | 'piezas' | 'cbm' | 'pesoNeto' | 'peso'
    label: string
  } | null
  onCloseOverrideModal: () => void
  overrideValor: string
  onOverrideValorChange: (val: string) => void
  onAplicarOverride: () => void
  coloresModalOpen: boolean
  onColoresModalOpenChange: (open: boolean) => void
  filtroPendientes: string
  onFiltroPendientesChange: (val: string) => void
  pendientesFiltrados: ColorPorConfirmar[]
  coloresAmbar: ColorPorConfirmar[]
  coloresAmbarDobles: ColorPorConfirmar[]
  colorDrafts: Record<string, ColorDraft>
  onSetColorDrafts: Dispatch<SetStateAction<Record<string, ColorDraft>>>
  hexSugiriendo: Set<string>
  ambarEditando: Set<string>
  onMapearColor: (raw: string, colorId: number | null) => void
  onCrearColorFila: (raw: string) => Promise<boolean>
  onCrearTodosColores: () => void
  onOmitirColor: (raw: string) => void
  onReabrirColor: (raw: string) => void
  onSugerirHex: (raw: string) => void
  onAbrirEditorAmbar: (raw: string) => void
  onCerrarEditorAmbar: (raw: string) => void
}

export function Step4Cajas(props: Step4CajasProps) {
  const {
    modoArrastre,
    onToggleModoArrastre,
    onExpandAll,
    onCollapseAll,
    cajasAgrupadas,
    totalCajasCount,
    totalPiezasCount,
    totalCbm,
    totalPesoNeto,
    totalPesoBruto,
    parsedData,
    overrideProductos,
    onSetOverrideProductos,
    overrideCajas,
    onSetOverrideCajas,
    overridePiezas,
    onSetOverridePiezas,
    overrideCbm,
    onSetOverrideCbm,
    overridePesoNeto,
    onSetOverridePesoNeto,
    overridePeso,
    onSetOverridePeso,
    onAbrirOverride,
    huecosFisico,
    huecosRellenados,
    showHuecos,
    onToggleShowHuecos,
    onRellenarHuecos,
    expandedProducts,
    onToggleProduct,
    dragOverProducto,
    onSetDragOverProducto,
    cajaArrastrada,
    onMoverCaja,
    jsonTotalesPorSku,
    alertasPorSku,
    alertasPorCaja,
    detallesPorCaja,
    cajaPrincipalDe,
    onSetPrincipalPorSku,
    lineaEsperada,
    lineaEditadaPorSku,
    onSetLineaEditadaPorSku,
    editLineaSku,
    onSetEditLineaSku,
    editLineaVal,
    onSetEditLineaVal,
    onCajaAdd,
    lineaPackEsperada,
    jsonPackTieneSku,
    lineaEditadaPorPack,
    onSetLineaEditadaPorPack,
    editPackSku,
    onSetEditPackSku,
    editPackVal,
    onSetEditPackVal,
    editPackNombre,
    onSetEditPackNombre,
    editPackNombreVal,
    onSetEditPackNombreVal,
    onRenombrarPack,
    onDividirPack,
    catalogoColores,
    matchColoresPorCaja,
    onToggleArrastrada,
    onDragStartArrastrada,
    onDragEndArrastrada,
    onCajaEdit,
    onCajaRemove,
    onAbrirColoresRaw,
    mapaNombres,
  } = props

  const ordenExtra = (parsedData?.orden ?? {}) as Record<string, unknown>

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">4. Cajas, logistica y confirmacion</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={modoArrastre ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[10px] gap-1 font-bold"
            onClick={onToggleModoArrastre}
            title="Modo arrastre: mover cajas entre productos (colapsa avisos)"
          >
            <Hand className="h-3.5 w-3.5" /> {modoArrastre ? 'Arrastre ON' : 'Arrastre'}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onExpandAll}>
            Expandir todo
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onCollapseAll}>
            Colapsar todo
          </Button>
        </div>
      </div>

      {/* 6 KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Productos</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() =>
                  onAbrirOverride('productos', 'Productos', overrideProductos ?? parsedData?.orden.total_productos ?? cajasAgrupadas.length)
                }
                title="Editar valor objetivo de la nota (Productos)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight">{cajasAgrupadas.length}</p>
            {(overrideProductos ?? parsedData?.orden.total_productos) != null && (
              <ComparisonBadge
                calculated={cajasAgrupadas.length}
                json={overrideProductos ?? parsedData!.orden.total_productos!}
                label="Productos"
                onSync={() => onSetOverrideProductos(cajasAgrupadas.length)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cajas</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() => onAbrirOverride('cajas', 'Cajas', overrideCajas ?? parsedData?.orden.total_cajas ?? totalCajasCount)}
                title="Editar valor objetivo de la nota (Cajas)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight">{totalCajasCount}</p>
            {(overrideCajas ?? parsedData?.orden.total_cajas) != null && (
              <ComparisonBadge
                calculated={totalCajasCount}
                json={overrideCajas ?? parsedData!.orden.total_cajas!}
                label="Cajas"
                onSync={() => onSetOverrideCajas(totalCajasCount)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Piezas</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() => onAbrirOverride('piezas', 'Piezas', overridePiezas ?? parsedData?.orden.total_piezas ?? totalPiezasCount)}
                title="Editar valor objetivo de la nota (Piezas)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight text-primary">{totalPiezasCount.toLocaleString()}</p>
            {(overridePiezas ?? parsedData?.orden.total_piezas) != null && (
              <ComparisonBadge
                calculated={totalPiezasCount}
                json={overridePiezas ?? parsedData!.orden.total_piezas!}
                label="Piezas"
                onSync={() => onSetOverridePiezas(totalPiezasCount)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CBM total</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() => onAbrirOverride('cbm', 'CBM Total', overrideCbm ?? parsedData?.orden.cbm_estimado ?? totalCbm.toFixed(3))}
                title="Editar valor objetivo de la nota (CBM)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight italic">{totalCbm.toFixed(3)}</p>
            {(overrideCbm ?? parsedData?.orden.cbm_estimado) != null && (
              <ComparisonBadge
                calculated={totalCbm}
                json={overrideCbm ?? parsedData!.orden.cbm_estimado!}
                label="CBM"
                onSync={() => onSetOverrideCbm(Number(totalCbm.toFixed(3)))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso neto</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() =>
                  onAbrirOverride(
                    'pesoNeto',
                    'Peso Neto Total (kg)',
                    overridePesoNeto ?? ordenExtra.peso_neto_total_kg ?? ordenExtra.peso_neto_estimado ?? totalPesoNeto.toFixed(1)
                  )
                }
                title="Editar valor objetivo de la nota (Peso Neto)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-200">{totalPesoNeto.toFixed(1)} kg</p>
            {(overridePesoNeto ?? ordenExtra.peso_neto_total_kg ?? ordenExtra.peso_neto_estimado) != null && (
              <ComparisonBadge
                calculated={totalPesoNeto}
                json={
                  overridePesoNeto ??
                  ((ordenExtra.peso_neto_total_kg as number | undefined) ||
                    (ordenExtra.peso_neto_estimado as number | undefined))!
                }
                label="Peso Neto"
                onSync={() => onSetOverridePesoNeto(Number(totalPesoNeto.toFixed(1)))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-muted/10 relative group">
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso bruto</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() =>
                  onAbrirOverride('peso', 'Peso Bruto Total (kg)', overridePeso ?? parsedData?.orden.peso_bruto_total_kg ?? totalPesoBruto.toFixed(1))
                }
                title="Editar valor objetivo de la nota (Peso Bruto)"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight">{totalPesoBruto.toFixed(1)} kg</p>
            {(overridePeso ?? parsedData?.orden.peso_bruto_total_kg) != null && (
              <ComparisonBadge
                calculated={totalPesoBruto}
                json={overridePeso ?? parsedData!.orden.peso_bruto_total_kg!}
                label="Peso Bruto"
                onSync={() => onSetOverridePeso(Number(totalPesoBruto.toFixed(1)))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cajas agrupadas + huecos */}
      <div className="space-y-4">
        {huecosFisico.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {huecosFisico.length} producto(s) con cajas físicas sin línea
              </span>
              <Button
                type="button"
                size="sm"
                onClick={onRellenarHuecos}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-6 text-[10px] ml-auto"
              >
                Rellenar desde físico
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onToggleShowHuecos}
                title={showHuecos ? 'Ocultar detalle' : 'Ver detalle'}
              >
                {showHuecos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            {showHuecos && (
              <div className="space-y-1">
                {huecosFisico.map((h) => (
                  <p key={h.key} className="text-xs font-mono text-amber-900 dark:text-amber-200">
                    {h.sku}: línea 0 → propuesta <strong>{h.cajas} cajas</strong> ({h.piezas.toLocaleString()} pz)
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        {huecosRellenados.length > 0 && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            ✓ {huecosRellenados.length} línea(s) rellenada(s) desde el físico — verifica el match antes de guardar.
          </p>
        )}

        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Cajas agrupadas por producto (editable)
        </h3>

        <div className="space-y-3">
          {cajasAgrupadas.map(({ producto, cajas: cajasGrupo }) => {
            const skuStr = producto.sku_base || ''
            const up = String(skuStr).trim().toUpperCase()
            const isExpanded = expandedProducts.has(skuStr || '__sin_sku__')
            const cajasReales = cajasGrupo.filter((c) => c.tipo_caja !== 'padre_resumen')
            const cpEntry = cajasGrupo.find((c) => c.tipo_caja === 'padre_resumen')
            const cpTallas = cpEntry?.tallas || []
            const cpColores = cpEntry?.colores || []
            const grupoPiezas = cajasReales.reduce(
              (s, c) => s + (c.total_piezas || c.piezas_por_caja * (c.cantidad_cajas || 1)),
              0
            )
            const grupoCajas = cajasReales.reduce((s, c) => s + (c.cantidad_cajas || 1), 0)
            const grupoCbm = cajasReales.reduce((s, c) => s + (c.cbm_total_linea || c.cbm * (c.cantidad_cajas || 1)), 0)
            const grupoPesoBruto = cajasReales.reduce((s, c) => {
              const pBrutoSingle = Number(c.peso_bruto_kg ?? 0)
              const qty = Number(c.cantidad_cajas || 1)
              const lineTotal = Number(c.peso_bruto_total_kg ?? pBrutoSingle * qty)
              return s + (isNaN(lineTotal) ? 0 : lineTotal)
            }, 0)
            const grupoPesoNeto = cajasReales.reduce((s, c) => {
              const rec = c as Record<string, unknown>
              const pNetoSingle = Number(c.peso_neto_kg ?? rec.peso_neto ?? 0)
              const qty = Number(c.cantidad_cajas || 1)
              const lineTotal = Number(c.peso_neto_total_kg ?? pNetoSingle * qty)
              return s + (isNaN(lineTotal) ? 0 : lineTotal)
            }, 0)
            const jsonSku = jsonTotalesPorSku.get(skuStr)
            const armadas = cajasReales.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
            const linea = lineaEsperada(skuStr)
            const editada = lineaEditadaPorSku[up] != null
            const nDetallesGrupo = cajasReales.reduce(
              (s, c) => s + (detallesPorCaja.get(String(c.codigo_caja_temporal || '')) ?? 0),
              0
            )
            const cuadra = linea === armadas
            const editando = editLineaSku === up
            const principal = cajaPrincipalDe(up, cajasReales)
            const alertas = alertasPorSku.get(up) ?? []

            return (
              <div
                key={skuStr}
                className={`rounded-lg border border-border/80 overflow-hidden transition-shadow ${modoArrastre && dragOverProducto === up ? 'ring-2 ring-primary shadow-lg' : ''}`}
                onDragOver={(e) => {
                  if (!modoArrastre) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  onSetDragOverProducto((prev) => (prev === up ? prev : up))
                }}
                onDragLeave={() => onSetDragOverProducto(null)}
                onDrop={(e) => {
                  if (!modoArrastre) return
                  e.preventDefault()
                  const cod = e.dataTransfer.getData('text/plain')
                  onSetDragOverProducto(null)
                  if (cod) onMoverCaja(cod, String(skuStr))
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (modoArrastre && cajaArrastrada) {
                      onMoverCaja(cajaArrastrada, String(skuStr))
                      return
                    }
                    onToggleProduct(skuStr || '__sin_sku__')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggleProduct(skuStr || '__sin_sku__')
                    }
                  }}
                  className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer select-none"
                  title={modoArrastre && cajaArrastrada ? `Soltar aquí la caja ${cajaArrastrada}` : undefined}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{skuStr}</span>
                        {producto.marca && <Badge variant="secondary" className="text-[10px]">{producto.marca}</Badge>}
                        {producto.es_nuevo && <Badge variant="default" className="bg-emerald-500 text-[10px]">NUEVO</Badge>}
                        {huecosRellenados.includes(up) && (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-700 dark:text-emerald-300">
                            Rellenado
                          </Badge>
                        )}
                        {(alertas.length > 0 || nDetallesGrupo > 0) && (
                          <span className="flex items-center gap-1">
                            {nDetallesGrupo > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                                title={`${nDetallesGrupo} renglones de desglose talla/color en sus cajas`}
                              >
                                🧵 {nDetallesGrupo} detalles
                              </Badge>
                            )}
                            {alertas.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-300"
                                title={alertas.map((a) => `• [${a.tipo ?? 'aviso'}] ${a.detalle || a.issue || ''}`).join('\n')}
                              >
                                <AlertTriangle className="h-3 w-3 mr-0.5" /> {alertas.length} en n8n
                              </Badge>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {producto.descripcion || producto.nombre || 'Sin descripcion'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase text-muted-foreground flex-wrap">
                    <span>
                      {cajasReales.length} {cajasReales.length === 1 ? 'caja' : 'cajas'} ({grupoCajas} und)
                    </span>
                    <span className="flex items-center gap-1">
                      {grupoPiezas.toLocaleString()} pz
                      {jsonSku && <ComparisonBadge calculated={grupoPiezas} json={jsonSku.piezas} label="Piezas" />}
                    </span>
                    <span className="flex items-center gap-1">
                      {grupoCbm.toFixed(3)} m3
                      {jsonSku && <ComparisonBadge calculated={grupoCbm} json={jsonSku.cbm} label="CBM" />}
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      Neto: {grupoPesoNeto.toFixed(1)} kg
                      {jsonSku?.pesoNeto != null ? (
                        <ComparisonBadge calculated={grupoPesoNeto} json={jsonSku.pesoNeto} label="P.Neto" />
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1">
                      Bruto: {grupoPesoBruto.toFixed(1)} kg
                      {jsonSku && <ComparisonBadge calculated={grupoPesoBruto} json={jsonSku.peso} label="P.Bruto" />}
                    </span>
                    {principal && (
                      <span className="flex items-center gap-1 normal-case" onClick={(e) => e.stopPropagation()}>
                        <span className="font-bold text-primary">
                          Principal: {String(principal.codigo_caja || principal.codigo_caja_temporal || '')} (
                          {Number(principal.piezas_por_caja || 0)} pz/caja)
                        </span>
                        {cajasReales.length > 1 && (
                          <Select
                            value={String(principal.codigo_caja || principal.codigo_caja_temporal || '')}
                            onValueChange={(v: string | null) => {
                              if (v) onSetPrincipalPorSku((prev) => ({ ...prev, [up]: v }))
                            }}
                          >
                            <SelectTrigger className="h-6 w-[130px] text-[10px] font-mono">
                              <SelectValue placeholder="Cambiar caja" />
                            </SelectTrigger>
                            <SelectContent>
                              {cajasReales.map((c) => {
                                const codeVal = String(c.codigo_caja || c.codigo_caja_temporal || '')
                                return (
                                  <SelectItem key={codeVal} value={codeVal}>
                                    {codeVal} ({Number(c.cantidad_cajas || 0)} cjs · {Number(c.piezas_por_caja || 0)} pz)
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold bg-primary/5 ml-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        toast.success(
                          `Recalculado SKU "${skuStr}": ${cajasReales.length} cajas (${grupoCajas} und), ${grupoPiezas.toLocaleString()} pz, ${grupoCbm.toFixed(3)} m³, ${grupoPesoNeto.toFixed(1)} kg neto, ${grupoPesoBruto.toFixed(1)} kg bruto.`
                        )
                      }}
                      title="Recalcular auditoría en vivo comparando cajas de este SKU vs Nota JSON"
                    >
                      <Calculator className="h-3 w-3" />
                      Recalcular
                    </Button>
                  </div>
                </div>

                {/* Línea del producto */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-2 text-xs">
                  <span className="font-semibold">
                    Línea: <strong className="font-mono">{linea}</strong> cjs pedidas
                    {editada && (
                      <Badge variant="outline" className="ml-1.5 text-[10px] border-primary/40 text-primary">
                        editada
                      </Badge>
                    )}
                  </span>
                  <span className="tabular-nums">
                    Suma cajas: <strong className={`font-mono ${cuadra ? 'text-emerald-600' : 'text-destructive'}`}>{armadas}</strong>
                    {cuadra ? (
                      <span className="ml-1.5 font-bold text-emerald-600">✓ match</span>
                    ) : (
                      <span className="ml-1.5 font-bold text-destructive">
                        dif {linea - armadas > 0 ? `+${linea - armadas}` : linea - armadas}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {cajasReales.length} caja(s) · {nDetallesGrupo} detalle(s) · {grupoPiezas.toLocaleString()} pz
                  </span>
                  <span className="sm:ml-auto flex items-center gap-1.5">
                    {editando ? (
                      <>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editLineaVal}
                          onChange={(e) => onSetEditLineaVal(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 w-20 text-right font-mono text-xs"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[11px] font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            const v = parseInt(editLineaVal, 10)
                            if (isNaN(v) || v < 0) {
                              toast.error('Ingresa un número válido de cajas (0 o más).')
                              return
                            }
                            onSetLineaEditadaPorSku((prev) => ({ ...prev, [up]: v }))
                            onSetEditLineaSku(null)
                            toast.success(`Línea de ${skuStr} fijada en ${v} cajas.`)
                          }}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetEditLineaSku(null)
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetEditLineaSku(up)
                            onSetEditLineaVal(String(linea))
                          }}
                          title="Editar línea de producto (la verdad es lo editado)"
                        >
                          <Pencil className="h-3 w-3" /> Editar línea
                        </Button>
                        {editada && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSetLineaEditadaPorSku((prev) => {
                                const next = { ...prev }
                                delete next[up]
                                return next
                              })
                              toast.info('Línea revertida al valor del JSON.')
                            }}
                            title="Volver al valor del JSON"
                          >
                            Revertir
                          </Button>
                        )}
                      </>
                    )}
                  </span>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t bg-background p-4">
                    {cpEntry && cpTallas.length > 0 && (
                      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary">
                          Variantes del SKU ({cpTallas.length} tallas × {cpColores.length} colores)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {cpTallas.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] py-0 h-5 font-mono">
                              {t}
                            </Badge>
                          ))}
                          <span className="text-[10px] text-muted-foreground mx-1">×</span>
                          {cpColores.map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px] py-0 h-5">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/10 font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCajaAdd(producto)
                          }}
                          title="Agregar manualmente una caja no detectada a este producto"
                        >
                          <Plus className="h-3 w-3" /> Agregar caja
                        </Button>
                      </div>
                      {(() => {
                        const grupos = new Map<string, WizardCaja[]>()
                        for (const c of cajasReales) {
                          const p = String(c.nombre_pack || 'PACK UNICO')
                          if (!grupos.has(p)) grupos.set(p, [])
                          grupos.get(p)!.push(c)
                        }
                        const listaGrupos = [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]))
                        const mostrarGrupo = listaGrupos.length > 1
                        return listaGrupos.map(([pack, items]) => {
                          const pk = packKeyOf(skuStr, pack)
                          const lineaP = lineaPackEsperada(skuStr, pack)
                          const armP = items.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
                          const piezasP = items.reduce(
                            (s, c) => s + Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0)),
                            0
                          )
                          const tieneLineaP = lineaP > 0 || jsonPackTieneSku(skuStr)
                          const okP = !tieneLineaP || lineaP === armP
                          const editadaP = lineaEditadaPorPack[pk] != null
                          const editandoP = editPackSku === pk
                          return (
                            <div key={pack} className="md:col-span-2 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                              {(mostrarGrupo || !okP) && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                  <Badge variant="secondary" className="font-mono font-bold text-[10px] self-start">
                                    📦 {pack}
                                  </Badge>
                                  <span className="tabular-nums">
                                    Línea pack: <strong className="font-mono">{lineaP}</strong>
                                    {editadaP && (
                                      <Badge variant="outline" className="ml-1 text-[9px] border-primary/40 text-primary">
                                        editada
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="tabular-nums">
                                    Suma: <strong className={`font-mono ${okP ? 'text-emerald-600' : 'text-destructive'}`}>{armP}</strong>
                                    {okP ? (
                                      <span className="ml-1 font-bold text-emerald-600">✓ match</span>
                                    ) : (
                                      <span className="ml-1 font-bold text-destructive">
                                        dif {lineaP - armP > 0 ? `+${lineaP - armP}` : lineaP - armP}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-muted-foreground tabular-nums">
                                    {items.length} caja(s) · {piezasP.toLocaleString()} pz
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onSetEditPackNombre(pk)
                                      onSetEditPackNombreVal(pack)
                                    }}
                                    title="Renombrar pack (corrige error de dedo PACK A/B)"
                                  >
                                    <Pencil className="h-3 w-3" /> pack
                                  </Button>
                                  {new Set(
                                    items
                                      .map((c) => String((c as Record<string, unknown>).carton_no_raw || '').trim())
                                      .filter(Boolean)
                                  ).size > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const wD = (alertasPorSku.get(up) ?? []).find(
                                          (a) => a.tipo === 'pack_duplicado_dudoso'
                                        ) as unknown as { cartones?: unknown } | undefined
                                        const wcD = Array.isArray(wD?.cartones)
                                          ? (wD!.cartones as unknown[]).map((x) => String(x))
                                          : undefined
                                        onDividirPack(skuStr, pack, wcD)
                                      }}
                                      title="Dividir pack en dos por rangos de cartón"
                                    >
                                      Dividir
                                    </Button>
                                  )}
                                  <span className="sm:ml-auto flex items-center gap-1.5">
                                    {editandoP ? (
                                      <>
                                        <Input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={editPackVal}
                                          onChange={(e) => onSetEditPackVal(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-7 w-20 text-right font-mono text-xs"
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-7 text-[11px] font-bold"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const v = parseInt(editPackVal, 10)
                                            if (isNaN(v) || v < 0) {
                                              toast.error('Ingresa un número válido de cajas (0 o más).')
                                              return
                                            }
                                            onSetLineaEditadaPorPack((prev) => ({ ...prev, [pk]: v }))
                                            onSetEditPackSku(null)
                                            toast.success(`Línea de ${skuStr} · ${pack} fijada en ${v} cajas.`)
                                          }}
                                        >
                                          Guardar
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[11px]"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onSetEditPackSku(null)
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[11px] gap-1 font-bold"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onSetEditPackSku(pk)
                                            onSetEditPackVal(String(lineaP))
                                          }}
                                          title="Editar línea de este pack (la verdad es lo editado)"
                                        >
                                          <Pencil className="h-3 w-3" /> Editar línea pack
                                        </Button>
                                        {editadaP && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              onSetLineaEditadaPorPack((prev) => {
                                                const next = { ...prev }
                                                delete next[pk]
                                                return next
                                              })
                                              toast.info('Línea de pack revertida al valor del JSON.')
                                            }}
                                            title="Volver al valor del JSON"
                                          >
                                            Revertir
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                              {editPackNombre === pk && (
                                <div className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5">
                                  <Input
                                    value={editPackNombreVal}
                                    onChange={(e) => onSetEditPackNombreVal(e.target.value.toUpperCase())}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-7 font-mono text-xs uppercase"
                                    placeholder="PACK A"
                                    autoFocus
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-[11px] font-bold"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onRenombrarPack(skuStr, pack, editPackNombreVal)
                                    }}
                                  >
                                    Guardar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onSetEditPackNombre(null)
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {items.map((caja) => {
                                  const codTmp = String(caja.codigo_caja_temporal || '')
                                  return (
                                    <WizardCajaRow
                                      key={caja.codigo_caja_temporal || caja.codigo_caja}
                                      caja={caja}
                                      cpTallas={cpTallas}
                                      cpColores={cpColores}
                                      catalogo={catalogoColores}
                                      matchColores={matchColoresPorCaja.get(codTmp) ?? []}
                                      alertasCaja={alertasPorCaja.get(codTmp) ?? []}
                                      nDetalles={detallesPorCaja.get(codTmp) ?? 0}
                                      modoArrastre={modoArrastre}
                                      esArrastrada={cajaArrastrada === codTmp}
                                      onToggleArrastrada={onToggleArrastrada}
                                      onDragStartArrastrada={onDragStartArrastrada}
                                      onDragEndArrastrada={onDragEndArrastrada}
                                      onEditCodigo={onCajaEdit}
                                      onRemoveCodigo={onCajaRemove}
                                      onAbrirColores={onAbrirColoresRaw}
                                      mapaResueltos={mapaNombres}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>

                    {cajasReales.length === 0 && (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-xs text-muted-foreground italic">No hay cajas reales (CC/CR) para este producto.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/10 font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCajaAdd(producto)
                          }}
                        >
                          <Plus className="h-3 w-3" /> Agregar caja manual
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      <Step4AuditoriaResumen
        selectedContenedor={props.selectedContenedor}
        newContainerCode={props.newContainerCode}
        newContainerNumber={props.newContainerNumber}
        sortedContenedores={props.sortedContenedores}
        selectedContenedorObj={props.selectedContenedorObj}
        selectedContenedorEsSurtido={props.selectedContenedorEsSurtido}
        parsedData={props.parsedData}
        cajasAgrupadasCount={props.cajasAgrupadas.length}
        totalCajasCount={props.totalCajasCount}
        totalPiezasCount={props.totalPiezasCount}
        totalCbm={props.totalCbm}
        totalPesoBruto={props.totalPesoBruto}
        totalPesoNeto={props.totalPesoNeto}
        overrideProductos={props.overrideProductos}
        onSetOverrideProductos={props.onSetOverrideProductos}
        overrideCajas={props.overrideCajas}
        onSetOverrideCajas={props.onSetOverrideCajas}
        overridePiezas={props.overridePiezas}
        onSetOverridePiezas={props.onSetOverridePiezas}
        overrideCbm={props.overrideCbm}
        onSetOverrideCbm={props.onSetOverrideCbm}
        overridePesoNeto={props.overridePesoNeto}
        onSetOverridePesoNeto={props.onSetOverridePesoNeto}
        overridePeso={props.overridePeso}
        onSetOverridePeso={props.onSetOverridePeso}
        warnings={props.warnings}
        showWarnings={props.showWarnings}
        onToggleWarnings={props.onToggleWarnings}
        coloresNuevos={props.coloresNuevos}
        coloresOmitidos={props.coloresOmitidos}
        coloresPorConfirmar={props.coloresPorConfirmar}
        onOpenColoresModal={props.onEnsureDraftsAndOpenColores}
        overrideModal={props.overrideModal}
        onCloseOverrideModal={props.onCloseOverrideModal}
        overrideValor={props.overrideValor}
        onOverrideValorChange={props.onOverrideValorChange}
        onAplicarOverride={props.onAplicarOverride}
      />

      <ColoresModal
        open={props.coloresModalOpen}
        onOpenChange={props.onColoresModalOpenChange}
        filtroPendientes={props.filtroPendientes}
        onFiltroPendientesChange={props.onFiltroPendientesChange}
        coloresNuevos={props.coloresNuevos}
        pendientesFiltrados={props.pendientesFiltrados}
        coloresOmitidos={props.coloresOmitidos}
        coloresAmbar={props.coloresAmbar}
        coloresAmbarDobles={props.coloresAmbarDobles}
        catalogoColores={props.catalogoColores}
        colorDrafts={props.colorDrafts}
        onSetColorDrafts={props.onSetColorDrafts}
        hexSugiriendo={props.hexSugiriendo}
        ambarEditando={props.ambarEditando}
        onMapearColor={props.onMapearColor}
        onCrearColorFila={props.onCrearColorFila}
        onCrearTodosColores={props.onCrearTodosColores}
        onOmitirColor={props.onOmitirColor}
        onReabrirColor={props.onReabrirColor}
        onSugerirHex={props.onSugerirHex}
        onAbrirEditorAmbar={props.onAbrirEditorAmbar}
        onCerrarEditorAmbar={props.onCerrarEditorAmbar}
      />
    </div>
  )
}
