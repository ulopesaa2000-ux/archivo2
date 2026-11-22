// components/admin/ocr-sync/_components/SkuConDiff.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { calcularDiffIndices } from '@/lib/inventario/sku-matcher'
import type { NotaOcrCandidatoSku } from '@/modules/inventario/types'

export function SkuConDiff({
  ocrTexto,
  skuObjetivo,
  diffIndices,
}: {
  ocrTexto: string
  skuObjetivo: string
  diffIndices?: number[]
}) {
  const indices =
    diffIndices && diffIndices.length > 0
      ? diffIndices
      : calcularDiffIndices(ocrTexto, skuObjetivo)
  if (indices.length === 0) return <span>{skuObjetivo}</span>

  const set = new Set(indices)
  return (
    <span>
      {Array.from(skuObjetivo).map((ch, i) =>
        set.has(i) ? (
          <span
            key={i}
            className="bg-amber-500/25 text-amber-900 dark:text-amber-200 rounded-[2px] px-[1px] underline decoration-amber-500/70"
          >
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  )
}

export function OcrLineaVariantes({
  estiloRaw,
  isConfirmed,
  score,
  productoId,
  propuestaProductoId,
  variantes,
  prefijos,
  onSelectCandidate,
  onFilterByPrefix,
}: {
  estiloRaw: string
  isConfirmed: boolean
  score?: number | null
  productoId?: number | null
  propuestaProductoId?: number | null
  variantes: NotaOcrCandidatoSku[]
  prefijos: Array<{ prefijo: string; total: number }>
  onSelectCandidate: (cand: NotaOcrCandidatoSku) => void
  onFilterByPrefix: (prefijo: string) => void
}) {
  // Ocultar chips redundantes cuando ya hay match exacto 100% confirmado
  const ocultarPorExacto = isConfirmed && (score ?? 0) >= 0.99
  const mostrarOpciones =
    !ocultarPorExacto && variantes.length > 0 && (variantes.length > 1 || !isConfirmed)

  return (
    <>
      {mostrarOpciones && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
            Opciones
          </span>
          {variantes.slice(0, 4).map((candidato) => {
            const seleccionado =
              productoId === candidato.producto_id ||
              propuestaProductoId === candidato.producto_id
            const candTitle = [
              candidato.descripcion || 'Sin descripción',
              candidato.pz_en_caja != null ? `${candidato.pz_en_caja} pz/caja` : null,
              candidato.proveedor_nombre ? `Prov: ${candidato.proveedor_nombre}` : null,
              candidato.decider_prob != null
                ? `Decider: ${Math.round(candidato.decider_prob * 100)}%`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <Button
                key={`${candidato.producto_id}-${candidato.sku_base}`}
                type="button"
                variant={seleccionado ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectCandidate(candidato)
                }}
                title={candTitle}
                className="h-auto min-h-6 py-0.5 px-2 whitespace-nowrap shrink-0 font-mono text-[11px] font-bold gap-1.5 rounded-md"
              >
                <SkuConDiff
                  ocrTexto={estiloRaw}
                  skuObjetivo={candidato.sku_base}
                  diffIndices={candidato.diff_indices}
                />
                <span className="opacity-75">{Math.round(candidato.score * 100)}%</span>
              </Button>
            )
          })}
        </div>
      )}

      {!isConfirmed && prefijos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {prefijos.map((p) => (
            <Button
              key={p.prefijo}
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onFilterByPrefix(p.prefijo)
              }}
              className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary gap-1 whitespace-nowrap shrink-0"
              title={`Filtrar catálogo por serie ${p.prefijo}*`}
            >
              <Filter className="h-2.5 w-2.5" />
              <span>Ver {p.prefijo}* ({p.total})</span>
            </Button>
          ))}
        </div>
      )}
    </>
  )
}
