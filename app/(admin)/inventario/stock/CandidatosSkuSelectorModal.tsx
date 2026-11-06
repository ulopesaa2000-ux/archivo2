// app/(admin)/inventario/stock/CandidatosSkuSelectorModal.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react'
import { buscarCandidatosSkuIndividualAction } from '@/modules/inventario/conteo-fisico-actions'
import type { CandidatoSkuSimple } from '@/modules/inventario/conteo-fisico-types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  skuOriginal: string
  estiloRaw: string
  onSelectCandidato: (candidato: CandidatoSkuSimple) => void
}

export function CandidatosSkuSelectorModal({
  open,
  onOpenChange,
  skuOriginal,
  estiloRaw,
  onSelectCandidato,
}: Props) {
  const [candidatos, setCandidatos] = useState<CandidatoSkuSimple[]>([])
  const [loading, setLoading] = useState(false)
  const [queryManual, setQueryManual] = useState('')
  const [busquedaManualResultados, setBusquedaManualResultados] = useState<CandidatoSkuSimple[]>([])
  const [loadingBusqueda, setLoadingBusqueda] = useState(false)

  useEffect(() => {
    if (!open) {
      setCandidatos([])
      setQueryManual('')
      setBusquedaManualResultados([])
      return
    }

    const buscarCandidatos = async () => {
      setLoading(true)
      const res = await buscarCandidatosSkuIndividualAction(skuOriginal || estiloRaw)
      if (res.success) {
        setCandidatos(res.data.candidatos)
      }
      setLoading(false)
    }

    buscarCandidatos()
  }, [open, skuOriginal, estiloRaw])

  const handleBuscarManual = async (q: string) => {
    setQueryManual(q)
    if (!q || q.trim().length < 1) {
      setBusquedaManualResultados([])
      return
    }

    setLoadingBusqueda(true)
    const res = await buscarCandidatosSkuIndividualAction(q)
    if (res.success) {
      setBusquedaManualResultados(res.data.candidatos)
    }
    setLoadingBusqueda(false)
  }

  const handleSeleccionar = (c: CandidatoSkuSimple) => {
    onSelectCandidato(c)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-amber-500" />
            Candidatos de SKU para "{estiloRaw || skuOriginal}"
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecciona la coincidencia exacta de catálogo para este producto manuscrito.
          </DialogDescription>
        </DialogHeader>

        {/* BUSCADOR MANUAL RÁPIDO */}
        <div className="relative">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar otro SKU o escribir código exacto..."
            value={queryManual}
            onChange={(e) => handleBuscarManual(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/40 font-mono"
          />
        </div>

        {/* LISTADO DE RESULTADOS */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {loading || loadingBusqueda ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-5 animate-spin text-blue-600" />
              Buscando coincidencias en el catálogo...
            </div>
          ) : (
            <>
              {/* Si hay búsqueda manual activa */}
              {queryManual.trim().length > 0 ? (
                busquedaManualResultados.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No se encontraron productos con "{queryManual}"
                  </div>
                ) : (
                  busquedaManualResultados.map((c) => (
                    <button
                      key={c.producto_id}
                      onClick={() => handleSeleccionar(c)}
                      className="w-full text-left p-2.5 rounded-lg border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-0.5 truncate flex-1 pr-2">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-foreground">
                          {c.sku}
                          {c.score > 0 && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-muted font-normal">
                              {Math.round(c.score * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.nombre || 'Sin descripción'}
                        </div>
                      </div>
                      <Check className="size-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))
                )
              ) : (
                /* Coincidencias automáticas de la IA */
                candidatos.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                    <AlertCircle className="size-6 text-amber-500 mx-auto opacity-70" />
                    <p>No se encontraron candidatos automáticos.</p>
                    <p className="text-[11px]">Escribe el código arriba para buscarlo manualmente.</p>
                  </div>
                ) : (
                  candidatos.map((c) => (
                    <button
                      key={c.producto_id}
                      onClick={() => handleSeleccionar(c)}
                      className="w-full text-left p-2.5 rounded-lg border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-0.5 truncate flex-1 pr-2">
                        <div className="flex items-center gap-2 font-mono font-bold text-xs text-foreground">
                          {c.sku}
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 h-4 font-semibold ${
                              c.score >= 0.8
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {Math.round(c.score * 100)}% coincidencia
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.nombre || 'Sin descripción'}
                        </div>
                      </div>
                      <Check className="size-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))
                )
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

