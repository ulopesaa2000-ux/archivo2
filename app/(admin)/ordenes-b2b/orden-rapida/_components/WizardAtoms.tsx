// app/(admin)/ordenes-b2b/orden-rapida/_components/WizardAtoms.tsx
'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronsUpDown, GripVertical, Loader2, Sparkles } from 'lucide-react'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { claveColor, dedupPorClave, filtrarColoresCatalogo } from '@/lib/color-match'
import type { CajaEditPayload } from '@/lib/orden-rapida-cajas'
import { cn } from '@/lib/utils'
import type { CatalogoItem } from '@/modules/catalogo/types'
import type { CatalogoColorOrdenRapida } from '@/modules/ordenes-b2b/actions'
import { buildCatalogoItemsFromStrings, wizardCajaToSharedCajaData } from '../_hooks/orden-rapida-n8n'
import type { ColorDraft, WizardCaja } from '../_hooks/orden-rapida-types'

export type AlertaCajaRow = {
  tipo?: string
  severidad?: string
  detalle?: string
  issue?: string
}

export type ColorMatchRow = { raw: string; found: boolean; via: string | null; nombre: string }

export type WizardCajaRowProps = {
  caja: WizardCaja
  cpTallas: string[]
  cpColores: string[]
  catalogo: CatalogoColorOrdenRapida[]
  matchColores: ColorMatchRow[]
  alertasCaja: AlertaCajaRow[]
  nDetalles: number
  modoArrastre: boolean
  esArrastrada: boolean
  onToggleArrastrada: (codigo: string) => void
  onDragStartArrastrada: (codigo: string, e: React.DragEvent) => void
  onDragEndArrastrada: () => void
  onEditCodigo: (codigo: string, data: CajaEditPayload) => Promise<void>
  onRemoveCodigo: (codigo: string) => void
  onAbrirColores: (raw?: string) => void
  mapaResueltos: Record<string, { id: number; nombre: string }>
}

export const WizardCajaRow = memo(function WizardCajaRow({
  caja,
  cpTallas,
  cpColores,
  catalogo,
  matchColores,
  alertasCaja,
  nDetalles,
  modoArrastre,
  esArrastrada,
  onToggleArrastrada,
  onDragStartArrastrada,
  onDragEndArrastrada,
  onEditCodigo,
  onRemoveCodigo,
  onAbrirColores,
  mapaResueltos,
}: WizardCajaRowProps) {
  const codTmp = String(caja.codigo_caja_temporal || '')
  const sharedCaja = useMemo(() => wizardCajaToSharedCajaData(caja, 0), [caja])
  const tallasCatalogo = useMemo(
    () => buildCatalogoItemsFromStrings(cpTallas.length > 0 ? cpTallas : caja.matriz?.tallas || caja.tallas || []),
    [cpTallas, caja]
  )
  const coloresCatalogo = useMemo((): CatalogoItem[] => {
    const reales: CatalogoItem[] = (catalogo || []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo ?? c.nombre,
      nombre_intern: c.nombre_intern ?? null,
    }))
    const cubiertas = new Set<string>()
    for (const c of reales) {
      cubiertas.add(claveColor(c.nombre))
      if (c.nombre_intern) cubiertas.add(claveColor(c.nombre_intern))
      if (c.codigo) cubiertas.add(claveColor(c.codigo))
    }
    const packingCols = (caja.matriz?.colores || caja.colores || []) as string[]
    const unionCols = dedupPorClave([...(cpColores.length > 0 ? cpColores : []), ...packingCols])
    const extra: CatalogoItem[] = []
    unionCols.forEach((col, idx) => {
      if (!cubiertas.has(claveColor(col))) {
        cubiertas.add(claveColor(col))
        extra.push({ id: -(200000 + idx), nombre: col, codigo: col })
      }
    })
    return [...reales, ...extra]
  }, [catalogo, cpColores, caja])
  const handleEditRow = useCallback(
    (_id: number, data: CajaEditPayload) => onEditCodigo(codTmp, data),
    [onEditCodigo, codTmp]
  )
  const handleRemoveRow = useCallback(() => onRemoveCodigo(codTmp), [onRemoveCodigo, codTmp])

  const recordCaja = caja as Record<string, unknown>

  return (
    <div
      key={caja.codigo_caja_temporal || caja.codigo_caja}
      className={`space-y-1.5 rounded-md p-1 transition-colors ${modoArrastre && esArrastrada ? 'ring-2 ring-primary bg-primary/5' : ''}`}
    >
      {modoArrastre && (
        <span
          draggable
          onDragStart={(e) => onDragStartArrastrada(codTmp, e)}
          onDragEnd={onDragEndArrastrada}
          onClick={(e) => {
            e.stopPropagation()
            onToggleArrastrada(codTmp)
          }}
          title="Arrastra a otro producto o tócala y luego toca el destino"
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold cursor-grab active:cursor-grabbing select-none ${esArrastrada ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/60 text-muted-foreground hover:text-foreground'}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
          {esArrastrada ? 'Moviendo… toca destino' : 'Mover'}
        </span>
      )}
      {(Boolean(recordCaja.piezas_heredadas) ||
        Boolean(recordCaja.piezas_estimadas) ||
        alertasCaja.length > 0 ||
        nDetalles > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {Boolean(recordCaja.piezas_heredadas) && (
            <Badge
              variant="outline"
              className="border-sky-400 bg-sky-50 text-sky-800 font-bold"
              title={`Piezas por caja heredadas de ${String(recordCaja.piezas_heredadas_de || 'principal')}`}
            >
              ↩ {Number(caja.piezas_por_caja || 0)} pz heredadas
            </Badge>
          )}
          {Boolean(recordCaja.piezas_estimadas) && (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-800 font-bold"
              title="1 pza/caja temporal (botón Fijar 1 pza). Corrige el valor real editando la caja."
            >
              ⚠ 1 pz estimada
            </Badge>
          )}
          {nDetalles > 0 && (
            <Badge variant="secondary" title="Renglones de desglose talla/color en esta caja">
              🧵 {nDetalles} detalle{nDetalles !== 1 ? 's' : ''}
            </Badge>
          )}
          {matchColores.map((mc, mi) => (
            <Badge
              key={`${mc.raw}-${mi}`}
              variant="outline"
              className={`font-bold ${mc.found ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300' : 'border-amber-400 bg-amber-50 text-amber-800'}`}
              title={
                mc.found
                  ? `"${mc.raw}" → ${mc.nombre} en catálogo (${mc.via ?? 'match'})`
                  : `"${mc.raw}" sin match en catálogo: se propone crear "${mc.nombre}". Abre el panel de colores.`
              }
              onClick={() => {
                if (!mc.found) onAbrirColores()
              }}
              style={mc.found ? undefined : { cursor: 'pointer' }}
            >
              {mc.found ? '✔' : '⚠'} {mc.raw}
              {mc.found && claveColor(mc.nombre) !== claveColor(mc.raw) ? ` → ${mc.nombre}` : ''}
            </Badge>
          ))}
          {alertasCaja.map((a, i) => (
            <Badge
              key={i}
              variant="outline"
              className={
                a.severidad === 'alta' ? 'border-red-400 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-800'
              }
              title={a.detalle || a.issue || a.tipo || 'aviso n8n'}
            >
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {a.tipo === 'ia_calidad' ? 'IA: ' : ''}
              {String(a.detalle || a.issue || a.tipo || '').slice(0, 90)}
            </Badge>
          ))}
        </div>
      )}
      <CajaCard
        caja={sharedCaja}
        layout="horizontal"
        canEdit={true}
        canDelete={true}
        canEditOrden={true}
        tallasDisponibles={tallasCatalogo}
        coloresDisponibles={coloresCatalogo}
        onAbrirColores={(raw) => onAbrirColores(raw)}
        mapaResueltos={mapaResueltos}
        onEdit={handleEditRow}
        onRemove={handleRemoveRow}
        isPending={false}
      />
    </div>
  )
})

export const MapearColorCombobox = memo(function MapearColorCombobox({
  catalogo,
  onSelect,
}: {
  catalogo: CatalogoColorOrdenRapida[]
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const resultados = useMemo(() => filtrarColoresCatalogo(catalogo, q, 50), [catalogo, q])
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQ('')
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="h-7 w-44 justify-between text-[11px]"
          />
        }
      >
        <span className="truncate text-muted-foreground">Mapear a existente…</span>
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar color…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              Sin resultados para &quot;{q}&quot;.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onSelect(null)
                  setOpen(false)
                }}
              >
                <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                Sin mapear
              </CommandItem>
              {resultados.map((cc) => (
                <CommandItem
                  key={cc.id}
                  value={`${cc.nombre} ${cc.codigo ?? ''} ${cc.nombre_intern ?? ''}`}
                  onSelect={() => {
                    onSelect(cc.id)
                    setOpen(false)
                  }}
                >
                  <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span className="truncate">{cc.nombre}</span>
                  {cc.nombre_intern ? (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{cc.nombre_intern}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

export const CamposDraftColor = memo(function CamposDraftColor({
  d,
  setD,
  sugiriendo,
  onSugerirHex,
}: {
  d: ColorDraft
  setD: (patch: Partial<ColorDraft>) => void
  sugiriendo: boolean
  onSugerirHex: () => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre ES</Label>
        <Input
          value={d.nombre}
          onChange={(e) => setD({ nombre: e.target.value.toUpperCase() })}
          className="h-8 font-mono text-xs uppercase"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Interno EN</Label>
        <Input
          value={d.nombre_intern}
          onChange={(e) => setD({ nombre_intern: e.target.value.toUpperCase() })}
          className="h-8 font-mono text-xs uppercase"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Código</Label>
        <Input
          value={d.codigo}
          onChange={(e) => setD({ codigo: e.target.value.toUpperCase() })}
          className="h-8 font-mono text-xs uppercase"
          maxLength={20}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hex</Label>
        <div className="flex gap-1.5">
          <Input
            type="color"
            value={d.hex_code}
            onChange={(e) => setD({ hex_code: e.target.value })}
            className="w-10 h-8 p-1"
          />
          <Input
            value={d.hex_code.toUpperCase()}
            onChange={(e) => setD({ hex_code: e.target.value })}
            className="h-8 font-mono text-xs uppercase"
            maxLength={7}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Sugerir HEX (biblioteca → API → negro)"
            className="h-8 w-8 shrink-0 p-0"
            disabled={sugiriendo}
            onClick={onSugerirHex}
          >
            {sugiriendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
        <Select value={d.tipo_color} onValueChange={(v) => setD({ tipo_color: v || 'SOLIDO' })}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SOLIDO">SOLIDO</SelectItem>
            <SelectItem value="DOBLE">DOBLE</SelectItem>
            <SelectItem value="ESTAMPADO">ESTAMPADO</SelectItem>
            <SelectItem value="MEZCLA">MEZCLA</SelectItem>
            <SelectItem value="REFLECTANTE">REFLECTANTE</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

export function ComparisonBadge({
  calculated,
  json,
  onSync,
}: {
  calculated: number
  json: number
  label?: string
  onSync?: () => void
}) {
  if (!json && json !== 0) return null
  const diffVal = calculated - json
  const absDiff = Math.abs(diffVal)
  const match = absDiff < 0.001
  const color = match ? 'text-emerald-600 font-semibold' : absDiff <= 1 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] py-0 h-4 font-mono',
            match
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
              : 'border-amber-300 bg-amber-50 text-amber-900 font-bold'
          )}
        >
          {match ? '✓ Coincide con nota' : `Nota: ${json.toLocaleString(undefined, { maximumFractionDigits: 3 })}`}
        </Badge>
        {!match && onSync && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 px-1.5 text-[9px] text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 font-bold underline"
            onClick={(e) => {
              e.stopPropagation()
              onSync()
            }}
            title="Igualar valor objetivo de la nota al calculado en vivo por cajas"
          >
            Ajustar
          </Button>
        )}
      </div>
      {!match && (
        <span className={cn('text-[10px]', color)}>
          Diferencia:{' '}
          {diffVal > 0
            ? `+${diffVal.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
            : diffVal.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      )}
    </div>
  )
}

export const SkuEditCell = memo(function SkuEditCell({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const committedRef = useRef(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (inputRef.current && inputRef.current === document.activeElement) return
    committedRef.current = value
    setDraft(value)
  }, [value])
  return (
    <Textarea
      ref={inputRef}
      rows={2}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== committedRef.current) {
          committedRef.current = draft
          onCommit(draft)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(committedRef.current)
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  )
})
