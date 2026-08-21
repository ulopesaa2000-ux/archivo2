// components/admin/inventario/SustitutoFamiliaModal.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, AlertCircle, Check, Package, Boxes, Search } from 'lucide-react'
import type { ProductoSustitutoFamilia } from '@/modules/inventario/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface SustitutoFamiliaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productoId: number | null
  productoActualSku?: string | null
  productoActualNombre?: string | null
  bodegaOrigenId: number | null
  bodegaNombre?: string | null
  onSelectSustituto: (sustituto: ProductoSustitutoFamilia, productoOriginalSku: string, familia: string | null) => void
}

export function SustitutoFamiliaModal({
  open,
  onOpenChange,
  productoId,
  productoActualSku,
  productoActualNombre,
  bodegaOrigenId,
  bodegaNombre,
  onSelectSustituto,
}: SustitutoFamiliaModalProps) {
  const [loading, setLoading] = useState(false)
  const [familiaName, setFamiliaName] = useState<string | null>(null)
  const [sustitutos, setSustitutos] = useState<ProductoSustitutoFamilia[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!open || !productoId || !bodegaOrigenId) {
      setSustitutos([])
      setFamiliaName(null)
      setSearchTerm('')
      return
    }

    let isMounted = true
    setLoading(true)

    fetch(`/api/inventario/notas/nueva/sustitutos?producto_id=${productoId}&bodega_id=${bodegaOrigenId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        setFamiliaName(data.productoActual?.familia ?? null)
        setSustitutos(data.sustitutos ?? [])
      })
      .catch((err) => {
        console.error('Error al cargar sustitutos de la familia:', err)
        if (isMounted) setSustitutos([])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, productoId, bodegaOrigenId])

  const filteredSustitutos = sustitutos.filter((s) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      s.sku_base.toLowerCase().includes(term) ||
      (s.nombre && s.nombre.toLowerCase().includes(term)) ||
      (s.descripcion && s.descripcion.toLowerCase().includes(term)) ||
      (s.familia && s.familia.toLowerCase().includes(term))
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-primary/5 via-muted/30 to-background">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Asistente de Sustitución con Stock
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecciona un SKU alternativo con existencias en {bodegaNombre ? <strong>{bodegaNombre}</strong> : 'la bodega origen'} para evitar saldos negativos.
              </DialogDescription>
            </div>
          </div>

          {/* Tarjeta de Producto Solicitado Original */}
          <div className="mt-3 p-3 rounded-xl border bg-background/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Producto Solicitado:</span>
                <Badge variant="outline" className="font-mono text-xs font-bold text-destructive border-destructive/40 bg-destructive/5">
                  {productoActualSku ?? '—'}
                </Badge>
                {familiaName && (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Familia: {familiaName}
                  </Badge>
                )}
              </div>
              {productoActualNombre && (
                <p className="text-xs text-muted-foreground truncate max-w-[380px]">
                  {productoActualNombre}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg shrink-0">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Sin stock suficiente</span>
            </div>
          </div>
        </DialogHeader>

        {/* Buscador Rápido interno si hay muchas opciones */}
        {sustitutos.length > 3 && (
          <div className="p-3 border-b bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por SKU, nombre o familia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>
          </div>
        )}

        {/* Cuerpo del listado */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 min-h-[220px] max-h-[380px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Consultando existencias de la familia en bodega...</p>
            </div>
          ) : filteredSustitutos.length > 0 ? (
            filteredSustitutos.map((sust) => (
              <div
                key={sust.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-md",
                  sust.es_misma_familia
                    ? "bg-card border-primary/20 hover:border-primary/50"
                    : "bg-muted/10 border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {sust.sku_base}
                    </span>
                    {sust.es_misma_familia ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-semibold">
                        Misma Familia: {sust.familia}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Relacionado {sust.marca_nombre ? `(${sust.marca_nombre})` : ''}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {sust.pz_en_caja ?? '?'} pz/caja
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {sust.descripcion ?? sust.nombre ?? 'Sin descripción'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                  {/* Badge de Stock en Bodega */}
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <Boxes className="h-3.5 w-3.5" />
                      <span>{sust.cajas_disponibles} cajas</span>
                    </div>
                    {sust.piezas_disponibles > 0 && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        +{sust.piezas_disponibles} pz sueltas
                      </span>
                    )}
                  </div>

                  {/* Botón de Selección */}
                  <Button
                    type="button"
                    onClick={() => {
                      onSelectSustituto(sust, productoActualSku ?? '', familiaName || sust.familia)
                      onOpenChange(false)
                    }}
                    className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 shadow-sm active:scale-98"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Usar este</span>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground/80">No hay otros productos de la familia con existencias</p>
              <p className="text-xs max-w-sm">
                No se encontraron otros SKUs de la misma familia o relacionados con existencias mayores a 0 en esta bodega origen.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
