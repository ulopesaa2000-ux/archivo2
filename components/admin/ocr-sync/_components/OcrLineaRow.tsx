// components/admin/ocr-sync/_components/OcrLineaRow.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Search, Trash2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotaOcrCandidatoSku, NotaOcrLineaSincronizada } from '@/modules/inventario/types'
import { SkuConDiff, OcrLineaVariantes } from './SkuConDiff'

interface OcrLineaRowProps {
  line: NotaOcrLineaSincronizada
  idx: number
  isSelected: boolean
  setInputRef: (el: HTMLInputElement | null) => void
  onSelectRow: (idx: number) => void
  onUpdateEstiloRaw: (idx: number, val: string) => void
  onBlurEstiloRaw: (idx: number) => void
  onUpdateCajas: (idx: number, cajas: number) => void
  onEnterOnRow: (idx: number) => void
  onAcceptProposal: (idx: number) => void
  onSelectCandidate: (idx: number, cand: NotaOcrCandidatoSku) => void
  onClearLineProduct: (idx: number) => void
  onOpenSearchForRow: (idx: number, query: string) => void
  onFilterByPrefix: (idx: number, prefijo: string) => void
  onRemoveLine: (idx: number) => void
}

export function OcrLineaRow({
  line,
  idx,
  isSelected,
  setInputRef,
  onSelectRow,
  onUpdateEstiloRaw,
  onBlurEstiloRaw,
  onUpdateCajas,
  onEnterOnRow,
  onAcceptProposal,
  onSelectCandidate,
  onClearLineProduct,
  onOpenSearchForRow,
  onFilterByPrefix,
  onRemoveLine,
}: OcrLineaRowProps) {
  const isConfirmed = line.encontrado && !!line.producto_sku
  const isProposal = !line.encontrado && line.es_propuesta && !!line.propuesta_producto_sku
  const isNotFound = !isConfirmed && !isProposal

  const dbPct = typeof line.score === 'number' ? Math.round(line.score * 100) : null
  const iaPct = Math.round((line.confianza ?? 0) * 100)
  const scorePct = dbPct ?? iaPct
  const deciderPct = line.decider_prob != null ? Math.round(line.decider_prob * 100) : null
  const scoreTitle = `IA ${iaPct}%${dbPct !== null ? ` · DB ${dbPct}%` : ''}${deciderPct !== null ? ` · Decider ${deciderPct}%` : ''}`

  const variantes = line.candidatos_sku ?? []
  const topVariante = variantes[0]
  const prefijos = line.prefijos_sugeridos ?? []
  const mostrarDescNota =
    Boolean(line.descripcion_raw) &&
    line.descripcion_raw?.trim().toUpperCase() !== line.estilo_raw.trim().toUpperCase()

  const minInputCh = Math.max(17, (line.estilo_raw?.length ?? 0) + 3)

  return (
    <tr
      onClick={() => onSelectRow(idx)}
      className={cn(
        'transition-colors cursor-pointer hover:bg-muted/50 align-top',
        isSelected ? 'bg-primary/10 border-l-4 border-l-primary font-semibold' : '',
        isConfirmed && !isSelected ? 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]' : '',
        isProposal && !isSelected ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.04]' : '',
        isNotFound && !isSelected ? 'border-l-4 border-l-destructive/60 bg-destructive/[0.04]' : ''
      )}
    >
      <td className="px-2.5 py-2.5 text-center font-mono font-bold text-muted-foreground">
        {idx + 1}
      </td>

      {/* Textbox grande de código SKU sin recorte incluso con zoom */}
      <td className="px-2.5 py-2 space-y-1.5 min-w-[220px] whitespace-nowrap">
        <Input
          ref={setInputRef}
          value={line.estilo_raw}
          onChange={(e) => onUpdateEstiloRaw(idx, e.target.value)}
          onBlur={() => onBlurEstiloRaw(idx)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnterOnRow(idx)
            }
          }}
          placeholder="Código SKU..."
          style={{ minWidth: `${minInputCh}ch` }}
          className="h-10 px-3 w-full font-mono text-[15px] sm:text-base font-extrabold tracking-wide uppercase rounded-lg bg-background"
        />
        {(mostrarDescNota || line.piezas_detectadas_ref != null) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight px-0.5 whitespace-normal">
            {mostrarDescNota && (
              <span className="truncate max-w-[185px]" title={line.descripcion_raw ?? ''}>
                {line.descripcion_raw}
              </span>
            )}
            {line.piezas_detectadas_ref != null && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono shrink-0">
                {line.piezas_detectadas_ref} pz
              </Badge>
            )}
          </div>
        )}
      </td>

      {/* Cajas */}
      <td className="px-2 py-2 text-center">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={line.cantidad_cajas}
          onChange={(e) =>
            onUpdateCajas(idx, Math.max(0, parseFloat(e.target.value) || 0))
          }
          className="h-10 w-16 text-center font-mono font-bold text-sm px-1 rounded-lg tabular-nums mx-auto bg-background"
        />
      </td>

      {/* Resolución en Catálogo: Match Verde grande y claro */}
      <td className="px-2.5 py-2 space-y-1.5">
        {isConfirmed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 flex-nowrap">
              <Badge
                variant="outline"
                className="bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono text-[15px] sm:text-base font-extrabold tracking-wide px-3 py-1.5 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>{line.producto_sku}</span>
              </Badge>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenSearchForRow(idx, line.producto_sku || '')
                  }}
                  className="h-7 px-2 text-xs font-bold text-muted-foreground hover:text-primary"
                >
                  Cambiar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearLineProduct(idx)
                  }}
                  className="h-7 w-7 p-0 text-xs text-muted-foreground hover:text-destructive"
                  title="Desvincular producto"
                >
                  ✕
                </Button>
              </div>
            </div>
            {(line.producto_nombre || line.producto_pz_en_caja != null) && (
              <p
                className="text-xs text-muted-foreground leading-snug truncate max-w-[420px]"
                title={line.producto_nombre ?? ''}
              >
                {line.producto_pz_en_caja != null ? `[${line.producto_pz_en_caja} pz] ` : ''}
                {line.producto_nombre}
              </p>
            )}
          </div>
        ) : isProposal ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono text-[15px] sm:text-base font-extrabold tracking-wide px-3 py-1.5 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span>Propuesta:</span>
                <SkuConDiff
                  ocrTexto={line.estilo_raw}
                  skuObjetivo={line.propuesta_producto_sku ?? ''}
                  diffIndices={topVariante?.diff_indices}
                />
              </Badge>
              {deciderPct != null && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary text-[10px] font-mono font-bold py-0.5 shrink-0"
                  title={line.decider_model ?? 'Perplexity Decider'}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Decider {deciderPct}%
                </Badge>
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAcceptProposal(idx)
                  }}
                  className="h-7 px-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md gap-1"
                  title="Aceptar esta propuesta (Enter)"
                >
                  <Check className="h-3 w-3" />
                  <span>Aceptar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenSearchForRow(idx, line.estilo_raw || '')
                  }}
                  className="h-7 px-2 text-xs font-bold rounded-md gap-1"
                >
                  <Search className="h-3 w-3" />
                  <span>Buscar</span>
                </Button>
              </div>
            </div>
            {(line.propuesta_producto_nombre || line.propuesta_producto_pz_en_caja != null) && (
              <p
                className="text-xs text-muted-foreground leading-snug truncate max-w-[420px]"
                title={line.propuesta_producto_nombre ?? ''}
              >
                {line.propuesta_producto_pz_en_caja != null ? `[${line.propuesta_producto_pz_en_caja} pz] ` : ''}
                {line.propuesta_producto_nombre}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-destructive/10 text-destructive border-destructive/30 text-xs font-bold uppercase py-1 px-2.5 shrink-0"
            >
              Sin coincidencia
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSearchForRow(idx, line.estilo_raw || '')
              }}
              className="h-7 px-2.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border-primary/30 rounded-md gap-1"
            >
              <Search className="h-3 w-3" />
              <span>Buscar en catálogo</span>
            </Button>
          </div>
        )}

        <OcrLineaVariantes
          estiloRaw={line.estilo_raw}
          isConfirmed={isConfirmed}
          score={line.score}
          productoId={line.producto_id}
          propuestaProductoId={line.propuesta_producto_id}
          variantes={variantes}
          prefijos={prefijos}
          onSelectCandidate={(cand) => onSelectCandidate(idx, cand)}
          onFilterByPrefix={(pref) => onFilterByPrefix(idx, pref)}
        />
      </td>

      <td className="px-2 py-2.5 text-center">
        <Badge
          variant="outline"
          title={scoreTitle}
          className={cn(
            'font-mono font-bold text-[10px] py-0.5 whitespace-nowrap',
            isConfirmed
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : isProposal
              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          )}
        >
          {dbPct !== null ? `DB ${scorePct}%` : `${scorePct}%`}
        </Badge>
      </td>

      <td className="px-2 py-2.5 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onRemoveLine(idx)
          }}
          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-full"
          title="Eliminar renglón"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
