// app/(admin)/inventario/stock/_components/BarraBuscarReemplazar.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Replace, Search, Sparkles, Undo2, X } from 'lucide-react'
import type {
  AlcanceReemplazo,
  ModoReemplazo,
  PreviewReemplazo,
  ReglaReemplazo,
  SugerenciaReemplazo,
} from '@/lib/inventario/conteo-fisico-matcher'

interface BarraBuscarReemplazarProps {
  open: boolean
  onClose: () => void
  regla: ReglaReemplazo
  onChangeRegla: (next: ReglaReemplazo) => void
  preview: PreviewReemplazo | null
  previewDesactualizado: boolean
  sugerencias: SugerenciaReemplazo[]
  canUndo: boolean
  onBuscar: (reglaOverride?: ReglaReemplazo) => void
  onAplicar: () => void
  onDeshacer: () => void
}

export function BarraBuscarReemplazar({
  open,
  onClose,
  regla,
  onChangeRegla,
  preview,
  previewDesactualizado,
  sugerencias,
  canUndo,
  onBuscar,
  onAplicar,
  onDeshacer,
}: BarraBuscarReemplazarProps) {
  if (!open) return null

  const totalAfectados = preview && !previewDesactualizado ? preview.totalAfectados : 0

  return (
    <div className="p-3 rounded-xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Replace className="size-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
            Buscar y Reemplazar Códigos (estilo Excel)
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Presiona <kbd className="px-1 border rounded bg-background">Enter</kbd> o{' '}
            <strong>Buscar</strong> para calcular coincidencias al instante
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {canUndo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDeshacer}
              className="h-7 px-2 text-xs gap-1 border-amber-300 text-amber-800 dark:text-amber-300"
            >
              <Undo2 className="size-3.5" />
              Deshacer último
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Controles principales */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        <div className="sm:col-span-3">
          <Input
            value={regla.buscar}
            onChange={(e) => onChangeRegla({ ...regla, buscar: e.target.value.toUpperCase() })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onBuscar()
              }
            }}
            placeholder="Buscar (ej. AU0)"
            className="h-8 text-xs font-mono font-bold uppercase bg-background"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            value={regla.reemplazar}
            onChange={(e) => onChangeRegla({ ...regla, reemplazar: e.target.value.toUpperCase() })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onBuscar()
              }
            }}
            placeholder="Reemplazar (ej. AND)"
            className="h-8 text-xs font-mono font-bold uppercase bg-background"
          />
        </div>
        <div className="sm:col-span-2">
          <select
            value={regla.modo}
            onChange={(e) => {
              const next = { ...regla, modo: e.target.value as ModoReemplazo }
              onChangeRegla(next)
              if (next.buscar.trim()) onBuscar(next)
            }}
            className="h-8 w-full text-xs rounded-md border border-input bg-background px-2 font-medium"
          >
            <option value="prefijo">Prefijo (inicia con)</option>
            <option value="contiene">Contiene</option>
            <option value="sufijo">Sufijo (termina con)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <select
            value={regla.alcance}
            onChange={(e) => {
              const next = { ...regla, alcance: e.target.value as AlcanceReemplazo }
              onChangeRegla(next)
              if (next.buscar.trim()) onBuscar(next)
            }}
            className="h-8 w-full text-xs rounded-md border border-input bg-background px-2 font-medium"
          >
            <option value="sin_match">Solo sin match</option>
            <option value="hoja_actual">Hoja filtrada</option>
            <option value="todos">Todos los renglones</option>
          </select>
        </div>
        <div className="sm:col-span-3 flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!regla.buscar.trim()}
            onClick={() => onBuscar()}
            className="h-8 px-3 text-xs font-bold gap-1 bg-background shrink-0"
          >
            <Search className="size-3.5" />
            Buscar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={totalAfectados === 0}
            onClick={onAplicar}
            className="h-8 flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Reemplazar ({totalAfectados})
          </Button>
        </div>
      </div>

      {/* Chips sugeridos detectados */}
      {sugerencias.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-indigo-500" />
            Sugeridos:
          </span>
          {sugerencias.map((s) => (
            <Button
              key={`${s.buscar}-${s.reemplazar}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next: ReglaReemplazo = {
                  ...regla,
                  buscar: s.buscar,
                  reemplazar: s.reemplazar,
                  modo: s.modo,
                  alcance: 'sin_match',
                }
                onChangeRegla(next)
                onBuscar(next)
              }}
              className="h-6 px-2 text-[11px] font-mono gap-1 bg-background"
            >
              <span>{s.buscar}</span>
              <ArrowRight className="size-2.5" />
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.reemplazar}</span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {s.afectados}
                {s.potencialesMatches > 0 ? ` · ${s.potencialesMatches} match` : ''}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Vista previa bajo demanda */}
      {previewDesactualizado && regla.buscar.trim() ? (
        <div className="pt-1 border-t border-indigo-200/70 dark:border-indigo-900/60 text-[11px] text-muted-foreground">
          Patrón modificado: presiona <strong>Buscar</strong> o <kbd className="px-1 border rounded bg-background">Enter</kbd> para ver los renglones afectados.
        </div>
      ) : preview && !previewDesactualizado ? (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-200/70 dark:border-indigo-900/60 text-[11px]">
          <Badge variant="outline" className="bg-background font-mono">
            {preview.totalAfectados} renglones afectados
          </Badge>
          {preview.nuevosConfirmados > 0 && (
            <Badge
              variant="outline"
              className="bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold"
            >
              +{preview.nuevosConfirmados} pasan a Match Exacto
            </Badge>
          )}
          {preview.nuevasPropuestas > 0 && (
            <Badge
              variant="outline"
              className="bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-mono font-bold"
            >
              +{preview.nuevasPropuestas} a Propuesta
            </Badge>
          )}
          {preview.muestras.slice(0, 4).map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border font-mono text-[10px]"
            >
              <span className="text-muted-foreground line-through">{m.antes}</span>
              <ArrowRight className="size-2.5 text-muted-foreground" />
              <span className="font-bold">{m.despues}</span>
              {m.estadoNuevo === 'confirmado' && <span className="text-emerald-600">✓</span>}
              {m.estadoNuevo === 'propuesta' && <span className="text-amber-600">~</span>}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
