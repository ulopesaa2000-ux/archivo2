// app/(admin)/inventario/stock/_components/ConteoFisicoRow.tsx
'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Eye, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotaOcrCandidatoSku } from '@/modules/inventario/types'
import type { CandidatoSkuSimple } from '@/modules/inventario/conteo-fisico-types'
import type { RenglonAplanado } from '../_hooks/use-conteo-fisico'
import { OcrLineaVariantes, SkuConDiff } from '@/components/admin/ocr-sync/_components/SkuConDiff'

interface ConteoFisicoRowProps {
  row: RenglonAplanado
  isSelected: boolean
  setInputRef: (el: HTMLInputElement | null) => void
  onSelectRow: (hojaId: string, renglonId: string) => void
  onCambiarSku: (hojaId: string, renglonId: string, nuevoSku: string) => void
  onBlurSku: (hojaId: string, renglonId: string) => void
  onEnterOnRow: (hojaId: string, renglonId: string) => void
  onAceptarPropuesta: (hojaId: string, renglonId: string) => void
  onSelectCandidato: (hojaId: string, renglonId: string, c: CandidatoSkuSimple) => void
  onDesvincularProducto: (hojaId: string, renglonId: string) => void
  onOpenSearchForRow: (hojaId: string, renglonId: string, query: string) => void
  onCambiarCajas: (hojaId: string, renglonId: string, cajas: number) => void
  onVerFoto: (url: string) => void
  onEliminar: (hojaId: string, renglonId: string) => void
}

function toNotaOcrCandidato(c: CandidatoSkuSimple): NotaOcrCandidatoSku {
  return {
    producto_id: c.producto_id,
    sku_base: c.sku,
    descripcion: c.nombre,
    pz_en_caja: c.pz_en_caja ?? null,
    score: c.score,
    metodo: c.metodo ?? null,
    familia: c.familia ?? null,
    proveedor_nombre: c.proveedor_nombre ?? null,
    razon: c.razon ?? null,
    diff_indices: c.diff_indices,
  }
}

function ConteoFisicoRowInner({
  row,
  isSelected,
  setInputRef,
  onSelectRow,
  onCambiarSku,
  onBlurSku,
  onEnterOnRow,
  onAceptarPropuesta,
  onSelectCandidato,
  onDesvincularProducto,
  onOpenSearchForRow,
  onCambiarCajas,
  onVerFoto,
  onEliminar,
}: ConteoFisicoRowProps) {
  const isConfirmed = Boolean(row.producto_id && row.sku_match)
  const isProposal = !isConfirmed && Boolean(row.es_propuesta && row.propuesta_producto_id && row.propuesta_sku)
  const isNotFound = !isConfirmed && !isProposal

  const variantesSimples = row.candidatos ?? []
  const variantesNota = variantesSimples.map(toNotaOcrCandidato)
  const topVariante = variantesSimples[0]
  const prefijos = row.prefijos_sugeridos ?? []
  const tieneFormula = row.cajas_raw.includes('+') || row.cajas_raw.includes('.')
  const minInputCh = Math.max(14, (row.sku_candidato?.length ?? 0) + 2)

  return (
    <tr
      data-hoja-id={row.hoja_id}
      onClick={() => onSelectRow(row.hoja_id, row.id)}
      className={cn(
        'transition-colors cursor-pointer hover:bg-muted/40 align-top',
        isSelected && 'bg-primary/10 border-l-4 border-l-primary',
        isConfirmed && !isSelected && 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]',
        isProposal && !isSelected && 'border-l-4 border-l-amber-500 bg-amber-500/[0.04]',
        isNotFound && !isSelected && 'border-l-4 border-l-destructive/60 bg-destructive/[0.04]'
      )}
    >
      {/* Posición + Escrito en hoja */}
      <td className="py-2 px-2.5 font-mono whitespace-nowrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted border">
          H{row.hoja_numero}-{row.columna === 1 ? 'Izq' : 'Der'} R{row.renglon}
        </span>
        {row.estilo_raw && (
          <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[130px]" title={`Libreta: ${row.estilo_raw}`}>
            Hoja: <span className="font-semibold text-foreground/80">{row.estilo_raw}</span>
          </div>
        )}
      </td>

      {/* Input SKU editable */}
      <td className="py-2 px-2.5 min-w-[170px] whitespace-nowrap">
        <Input
          ref={setInputRef}
          value={row.sku_candidato}
          onChange={(e) => onCambiarSku(row.hoja_id, row.id, e.target.value)}
          onBlur={() => onBlurSku(row.hoja_id, row.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnterOnRow(row.hoja_id, row.id)
            }
          }}
          placeholder="SKU..."
          style={{ minWidth: `${minInputCh}ch` }}
          className="h-9 px-2.5 w-full font-mono text-xs sm:text-sm font-extrabold tracking-wide uppercase rounded-lg bg-background"
        />
      </td>

      {/* Resolución en Catálogo (inline: Confirmado / Propuesta con Diff / Sin match + Chips) */}
      <td className="py-2 px-2.5 space-y-1.5 min-w-[290px]">
        {isConfirmed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 flex-nowrap">
              <Badge
                variant="outline"
                className="bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono text-xs sm:text-sm font-extrabold px-2.5 py-1 whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{row.sku_match}</span>
              </Badge>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenSearchForRow(row.hoja_id, row.id, row.sku_match || '')
                  }}
                  className="h-6 px-2 text-[11px] font-bold text-muted-foreground hover:text-primary"
                >
                  Cambiar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDesvincularProducto(row.hoja_id, row.id)
                  }}
                  className="h-6 w-6 p-0 text-xs text-muted-foreground hover:text-destructive"
                  title="Desvincular producto"
                >
                  ✕
                </Button>
              </div>
            </div>
            {row.descripcion && (
              <p className="text-[11px] text-muted-foreground leading-snug truncate max-w-[380px]" title={row.descripcion}>
                {row.descripcion}
              </p>
            )}
          </div>
        ) : isProposal ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono text-xs sm:text-sm font-extrabold px-2.5 py-1 whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <span>Propuesta:</span>
                <SkuConDiff
                  ocrTexto={row.sku_candidato}
                  skuObjetivo={row.propuesta_sku ?? ''}
                  diffIndices={topVariante?.diff_indices}
                />
              </Badge>
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAceptarPropuesta(row.hoja_id, row.id)
                }}
                className="h-6 px-2 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md gap-1"
                title="Aceptar propuesta (Enter)"
              >
                <Check className="h-3 w-3" />
                Aceptar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenSearchForRow(row.hoja_id, row.id, row.sku_candidato || row.estilo_raw)
                }}
                className="h-6 px-2 text-[11px] font-bold rounded-md gap-1"
              >
                <Search className="h-3 w-3" />
                Buscar
              </Button>
            </div>
            {row.propuesta_descripcion && (
              <p
                className="text-[11px] text-muted-foreground leading-snug truncate max-w-[380px]"
                title={row.propuesta_descripcion}
              >
                {row.propuesta_descripcion}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] font-bold uppercase py-0.5 px-2 shrink-0"
            >
              Sin coincidencia
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSearchForRow(row.hoja_id, row.id, row.sku_candidato || row.estilo_raw)
              }}
              className="h-6 px-2 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border-primary/30 rounded-md gap-1"
            >
              <Search className="h-3 w-3" />
              Buscar en catálogo
            </Button>
          </div>
        )}

        <OcrLineaVariantes
          estiloRaw={row.sku_candidato}
          isConfirmed={isConfirmed}
          score={row.match_score}
          productoId={row.producto_id}
          propuestaProductoId={row.propuesta_producto_id}
          variantes={variantesNota}
          prefijos={prefijos}
          onSelectCandidate={(cand) => {
            const match = variantesSimples.find((v) => v.producto_id === cand.producto_id)
            if (match) {
              onSelectCandidato(row.hoja_id, row.id, match)
            } else {
              onSelectCandidato(row.hoja_id, row.id, {
                producto_id: cand.producto_id,
                sku: cand.sku_base,
                nombre: cand.descripcion,
                score: cand.score,
                metodo: cand.metodo ?? undefined,
                familia: cand.familia,
                pz_en_caja: cand.pz_en_caja,
              })
            }
          }}
          onFilterByPrefix={(pref) => onOpenSearchForRow(row.hoja_id, row.id, pref)}
        />
      </td>

      {/* Fórmula / Raw */}
      <td className="py-2 px-2 text-center font-mono whitespace-nowrap">
        {tieneFormula ? (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
            title={`Operación detectada en libreta: ${row.cajas_raw}`}
          >
            f(x) {row.cajas_raw}
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">{row.cajas_raw}</span>
        )}
      </td>

      {/* Cajas */}
      <td className="py-2 px-2 text-right">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={row.cajas}
          onChange={(e) => onCambiarCajas(row.hoja_id, row.id, parseFloat(e.target.value) || 0)}
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-16 px-1.5 text-right font-bold text-xs rounded-lg bg-background font-mono"
        />
      </td>

      {/* Acciones */}
      <td className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-0.5">
          {row.hoja_comprobante_url && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation()
                onVerFoto(row.hoja_comprobante_url!)
              }}
              title="Ver foto de la hoja en grande"
            >
              <Eye className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onEliminar(row.hoja_id, row.id)
            }}
            title="Eliminar renglón"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export const ConteoFisicoRow = memo(
  ConteoFisicoRowInner,
  (prev, next) => prev.row === next.row && prev.isSelected === next.isSelected
)
