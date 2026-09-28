// app/(admin)/inventario/stock/StockAuditoriaDrawer.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Route, ArrowRight, ArrowLeftRight, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fecha } from '@/components/shared/Fecha'
import type { BodegaRow } from '@/lib/types/tables'
import type { AuditoriaInversaFamilia, AuditoriaInversaProducto } from '@/modules/inventario/types'
import { ADMIN_ROUTES } from '@/lib/constants'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  modo: 'producto' | 'familia'
  productoId?: number | null
  familia?: string | null
  productoSku?: string | null
  bodegas: BodegaRow[]
  ciudadesFiltro?: string[]
  descripcion?: string | null
}

function efectoBadge(efecto: number) {
  if (efecto > 0)
    return <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-700 border-emerald-500/30">+{efecto}</Badge>
  return <Badge variant="outline" className="font-mono bg-rose-500/10 text-rose-700 border-rose-500/30">{efecto}</Badge>
}

export function StockAuditoriaDrawer({
  open,
  onOpenChange,
  modo,
  productoId,
  familia,
  productoSku,
  bodegas,
  ciudadesFiltro = [],
  descripcion,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataProd, setDataProd] = useState<AuditoriaInversaProducto | null>(null)
  const [dataFam, setDataFam] = useState<AuditoriaInversaFamilia | null>(null)

  const bodegaIds = useMemo(() => bodegas.map((b) => b.id), [bodegas])
  const ciudadLabel = ciudadesFiltro.length === 1 ? ciudadesFiltro[0] : ciudadesFiltro.length > 1 ? `${ciudadesFiltro.length} ciudades` : 'Todas las ciudades'

  useEffect(() => {
    if (!open) {
      setDataProd(null)
      setDataFam(null)
      setError(null)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const mod = await import('@/modules/inventario/queries')
        if (modo === 'producto' && productoId) {
          const res = await mod.fetchAuditoriaInversaPorProducto(productoId, { bodegaIds, limiteNotas: 50 }, bodegas)
          if (!cancelled) setDataProd(res)
        } else if (modo === 'familia' && familia) {
          const res = await mod.fetchAuditoriaInversaPorFamilia(familia, { bodegaIds, limiteNotas: 50 }, bodegas)
          if (!cancelled) setDataFam(res)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Error al cargar auditoría')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modo, productoId, familia])

  const titulo = modo === 'producto' ? `Auditoría ${productoSku || ''}` : `Auditoría familia ${familia || ''}`
  const kpis =
    modo === 'producto' && dataProd
      ? { inicial: dataProd.total_inicial, entradas: dataProd.total_entradas, salidas: dataProd.total_salidas, actual: dataProd.total_actual }
      : modo === 'familia' && dataFam
        ? { inicial: dataFam.total_inicial, entradas: dataFam.total_entradas, salidas: dataFam.total_salidas, actual: dataFam.total_actual }
        : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[85vw] lg:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            {titulo}
          </SheetTitle>
          <SheetDescription>
            Auditoría inversa con movimientos aceptados (CONF): stock actual − entradas + salidas = stock inicial.
            {' '}Ámbito: {ciudadLabel} · {bodegas.length} bodega{bodegas.length !== 1 ? 's' : ''}.
            {descripcion ? ` · ${descripcion}` : ''}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando movimientos CONF...
          </div>
        )}
        {error && <p className="text-sm text-destructive py-4">{error}</p>}

        {!loading && !error && kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-[11px] text-muted-foreground font-semibold uppercase">Inicial</p>
              <p className="text-xl font-black tabular-nums">{kpis.inicial.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
              <p className="text-[11px] text-emerald-700 font-semibold uppercase flex items-center gap-1"><TrendingUp className="h-3 w-3" />Entradas CONF</p>
              <p className="text-xl font-black tabular-nums text-emerald-700">+{kpis.entradas.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-lg border p-3 bg-rose-500/5 border-rose-500/20">
              <p className="text-[11px] text-rose-700 font-semibold uppercase flex items-center gap-1"><TrendingDown className="h-3 w-3" />Salidas CONF</p>
              <p className="text-xl font-black tabular-nums text-rose-700">−{kpis.salidas.toLocaleString('es-MX')}</p>
            </div>
            <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
              <p className="text-[11px] text-primary font-semibold uppercase flex items-center gap-1"><Package className="h-3 w-3" />Actual</p>
              <p className="text-xl font-black tabular-nums text-primary">{kpis.actual.toLocaleString('es-MX')}</p>
            </div>
          </div>
        )}

        {!loading && !error && modo === 'producto' && dataProd && (
          <div className="space-y-4">
            {dataProd.bodegas.map((b) => (
              <div key={b.bodega_id} className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                  <div className="text-sm font-bold">{b.bodega_nombre} <span className="text-xs font-normal text-muted-foreground">· {b.ciudad}</span></div>
                  <div className="text-xs font-mono text-muted-foreground">Inicial {b.stock_inicial_cajas} +{b.entradas_conf} −{b.salidas_conf} = <span className="font-bold text-foreground">{b.stock_actual_cajas}</span></div>
                </div>
                {b.notas.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">Sin movimientos CONF en el alcance.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="px-3 py-1.5">Nota</th>
                        <th className="px-3 py-1.5">Tipo</th>
                        <th className="px-3 py-1.5">Fecha</th>
                        <th className="px-3 py-1.5">Origen → Destino</th>
                        <th className="px-3 py-1.5 text-right">Efecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.notas.map((n) => (
                        <tr key={`${n.nota_id}-${b.bodega_id}`} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-1.5 font-mono">
                            <Link href={ADMIN_ROUTES.inventario.notaDetalle(n.nota_id)} className="hover:underline text-primary">{n.numero_nota}</Link>
                          </td>
                          <td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">{n.tipo_codigo}</Badge></td>
                          <td className="px-3 py-1.5 text-muted-foreground"><Fecha valor={n.fecha_nota} formato="fecha" /></td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[220px]" title={`${n.bodega_origen_nombre || '—'} → ${n.bodega_destino_nombre || '—'}`}>
                            {n.bodega_origen_nombre || '—'} → {n.bodega_destino_nombre || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right">{efectoBadge(n.efecto_cajas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/inventario/trazabilidad?ciudad=${encodeURIComponent(ciudadesFiltro[0] || '')}&q=${encodeURIComponent(productoSku || '')}&periodo=todo`}>
                  Abrir en trazabilidad <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && modo === 'familia' && dataFam && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{dataFam.productos.length} productos · {dataFam.total_notas} movimientos CONF en el alcance.</p>
            {dataFam.productos.map((p) => (
              <div key={p.producto_id} className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                  <div className="text-sm font-bold font-mono">{p.producto_sku} <span className="font-sans font-normal text-xs text-muted-foreground">· Inicial {p.total_inicial} +{p.total_entradas} −{p.total_salidas} = {p.total_actual}</span></div>
                  <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                    <Link href={ADMIN_ROUTES.inventario.notaDetalle(p.producto_id)} className="hidden">Ver</Link>
                  </Button>
                </div>
                <div className="divide-y">
                  {p.bodegas.filter((b) => b.notas.length > 0 || b.stock_actual_cajas !== 0).map((b) => (
                    <div key={b.bodega_id} className="px-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{b.bodega_nombre} <span className="font-normal text-muted-foreground">· {b.ciudad}</span></span>
                        <span className="font-mono text-muted-foreground">{b.stock_inicial_cajas} +{b.entradas_conf} −{b.salidas_conf} = <span className="font-bold text-foreground">{b.stock_actual_cajas}</span></span>
                      </div>
                      {b.notas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {b.notas.slice(0, 12).map((n) => (
                            <Link
                              key={`${n.nota_id}-${b.bodega_id}`}
                              href={ADMIN_ROUTES.inventario.notaDetalle(n.nota_id)}
                              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border bg-background hover:bg-muted font-mono"
                              title={`${n.numero_nota} · ${n.tipo_codigo} · ${n.bodega_origen_nombre || ''}→${n.bodega_destino_nombre || ''}`}
                            >
                              {n.numero_nota} <span className={n.efecto_cajas >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{n.efecto_cajas >= 0 ? `+${n.efecto_cajas}` : n.efecto_cajas}</span>
                            </Link>
                          ))}
                          {b.notas.length > 12 && <span className="text-[11px] text-muted-foreground">+{b.notas.length - 12} más</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/inventario/trazabilidad?familia=${encodeURIComponent(familia || '')}&periodo=todo${ciudadesFiltro[0] ? `&ciudad=${encodeURIComponent(ciudadesFiltro[0])}` : ''}`}>
                  <ArrowLeftRight className="mr-1 h-3.5 w-3.5" /> Abrir familia en trazabilidad
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
